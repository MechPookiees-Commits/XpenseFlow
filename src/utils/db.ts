import {
  Transaction,
  RawMessage,
  AppSettings,
  ScanDiagnostic,
  DiagnosticLogEntry,
  TargetUpiId,
} from '../types';
import { DEFAULT_TARGET_UPI_IDS, generateInitialMessages } from './sampleData';
import { parseTransactionMessage, isDuplicateTransaction } from './parser';

const STORAGE_KEYS = {
  TRANSACTIONS: 'xf_transactions_v1',
  MESSAGES: 'xf_raw_messages_v1',
  SETTINGS: 'xf_settings_v1',
  DIAGNOSTICS: 'xf_diagnostics_v1',
};

export const DEFAULT_SETTINGS: AppSettings = {
  targetUpiIds: DEFAULT_TARGET_UPI_IDS,
  autoScanEnabled: false,
  autoScanIntervalSeconds: 30,
  macOSPermissionAcknowledged: false,
  androidPermissionAcknowledged: false,
};

export const INITIAL_DIAGNOSTICS: ScanDiagnostic = {
  lastScanTime: null,
  messagesScanned: 0,
  transactionsDetected: 0,
  ignoredCount: 0,
  duplicateCount: 0,
  failedParseCount: 0,
  lastScannedMessageId: null,
  logs: [],
};

// Safe localStorage Helpers
export function loadStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Failed to read ${key} from storage`, err);
    return defaultValue;
  }
}

export function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to write ${key} to storage`, err);
  }
}

/**
 * Initialize local database on first launch
 */
export function initLocalDb(): {
  transactions: Transaction[];
  messages: RawMessage[];
  settings: AppSettings;
  diagnostics: ScanDiagnostic;
} {
  let settings = loadStorage<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  if (!settings.targetUpiIds || settings.targetUpiIds.length === 0) {
    settings = { ...DEFAULT_SETTINGS };
    saveStorage(STORAGE_KEYS.SETTINGS, settings);
  }

  let messages = loadStorage<RawMessage[]>(STORAGE_KEYS.MESSAGES, []);
  if (messages.length === 0) {
    messages = generateInitialMessages();
    saveStorage(STORAGE_KEYS.MESSAGES, messages);
  }

  let diagnostics = loadStorage<ScanDiagnostic>(STORAGE_KEYS.DIAGNOSTICS, INITIAL_DIAGNOSTICS);
  let transactions = loadStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);

  // If initial launch with no transactions yet, perform first incremental scan
  if (transactions.length === 0 && messages.some((m) => !m.processed)) {
    const scanRes = executeMessageScanInternal(messages, transactions, settings.targetUpiIds, diagnostics);
    transactions = scanRes.updatedTransactions;
    messages = scanRes.updatedMessages;
    diagnostics = scanRes.updatedDiagnostics;

    saveStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    saveStorage(STORAGE_KEYS.MESSAGES, messages);
    saveStorage(STORAGE_KEYS.DIAGNOSTICS, diagnostics);
  }

  return { transactions, messages, settings, diagnostics };
}

/**
 * Core scanning pipeline logic
 */
function executeMessageScanInternal(
  messages: RawMessage[],
  existingTransactions: Transaction[],
  targetUpiIds: TargetUpiId[],
  currentDiagnostics: ScanDiagnostic
): {
  updatedTransactions: Transaction[];
  updatedMessages: RawMessage[];
  updatedDiagnostics: ScanDiagnostic;
  newTransactions: Transaction[];
  stats: {
    scanned: number;
    detected: number;
    ignored: number;
    duplicates: number;
    failed: number;
  };
} {
  // Sort messages chronologically by timestamp
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  const newTransactions: Transaction[] = [];
  const updatedTransactions = [...existingTransactions];
  const newLogs: DiagnosticLogEntry[] = [];

  let scanned = 0;
  let detected = 0;
  let ignored = 0;
  let duplicates = 0;
  let failed = 0;
  let lastId = currentDiagnostics.lastScannedMessageId;

  const updatedMessages = sortedMessages.map((msg) => {
    // Only process unread or new messages
    if (msg.processed) {
      return msg;
    }

    scanned++;
    lastId = msg.id;

    const parseResult = parseTransactionMessage(msg, targetUpiIds);

    if (parseResult.success && parseResult.transaction) {
      // Check duplicate
      const dupCheck = isDuplicateTransaction(parseResult.transaction, updatedTransactions);

      if (dupCheck.isDuplicate) {
        duplicates++;
        newLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          type: 'duplicate',
          summary: `Duplicate detected: ${parseResult.transaction.upiId} (₹${parseResult.transaction.amount})`,
          rawSnippet: msg.body.substring(0, 90),
          details: dupCheck.reason,
        });
      } else {
        detected++;
        const newTx: Transaction = {
          ...parseResult.transaction,
          id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        };
        updatedTransactions.unshift(newTx);
        newTransactions.push(newTx);

        newLogs.unshift({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          type: 'success',
          summary: `Extracted ₹${newTx.amount} to ${newTx.upiId}`,
          rawSnippet: msg.body.substring(0, 90),
          details: `Ref: ${newTx.referenceId || 'N/A'} | ${newTx.date} ${newTx.time}`,
        });
      }
    } else if (parseResult.ignored) {
      ignored++;
      newLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        type: 'ignored',
        summary: `Ignored: ${parseResult.reason || 'Not a canteen UPI transaction'}`,
        rawSnippet: msg.body.substring(0, 90),
      });
    } else {
      failed++;
      newLogs.unshift({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        type: 'parse_fail',
        summary: `Parsing failed: ${parseResult.reason || 'Unknown format'}`,
        rawSnippet: msg.body.substring(0, 90),
      });
    }

    return { ...msg, processed: true };
  });

  // Keep max 100 logs
  const combinedLogs = [...newLogs, ...currentDiagnostics.logs].slice(0, 100);

  const updatedDiagnostics: ScanDiagnostic = {
    lastScanTime: Date.now(),
    messagesScanned: currentDiagnostics.messagesScanned + scanned,
    transactionsDetected: currentDiagnostics.transactionsDetected + detected,
    ignoredCount: currentDiagnostics.ignoredCount + ignored,
    duplicateCount: currentDiagnostics.duplicateCount + duplicates,
    failedParseCount: currentDiagnostics.failedParseCount + failed,
    lastScannedMessageId: lastId,
    logs: combinedLogs,
  };

  return {
    updatedTransactions,
    updatedMessages,
    updatedDiagnostics,
    newTransactions,
    stats: { scanned, detected, ignored, duplicates, failed },
  };
}

/**
 * Triggered by the user or auto-scan to process messages
 */
export function scanMessages(
  targetUpiIds: TargetUpiId[]
): {
  newTransactions: Transaction[];
  allTransactions: Transaction[];
  diagnostics: ScanDiagnostic;
  stats: { scanned: number; detected: number; ignored: number; duplicates: number; failed: number };
} {
  const messages = loadStorage<RawMessage[]>(STORAGE_KEYS.MESSAGES, []);
  const transactions = loadStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  const diagnostics = loadStorage<ScanDiagnostic>(STORAGE_KEYS.DIAGNOSTICS, INITIAL_DIAGNOSTICS);

  const result = executeMessageScanInternal(messages, transactions, targetUpiIds, diagnostics);

  saveStorage(STORAGE_KEYS.TRANSACTIONS, result.updatedTransactions);
  saveStorage(STORAGE_KEYS.MESSAGES, result.updatedMessages);
  saveStorage(STORAGE_KEYS.DIAGNOSTICS, result.updatedDiagnostics);

  return {
    newTransactions: result.newTransactions,
    allTransactions: result.updatedTransactions,
    diagnostics: result.updatedDiagnostics,
    stats: result.stats,
  };
}

/**
 * Add a new raw message into the local messages pool (from manual paste or test feed)
 */
export function injectRawMessage(body: string, sender = 'Android SMS'): RawMessage {
  const messages = loadStorage<RawMessage[]>(STORAGE_KEYS.MESSAGES, []);
  const newMsg: RawMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    sender,
    body: body.trim(),
    timestamp: Date.now(),
    processed: false,
  };
  messages.push(newMsg);
  saveStorage(STORAGE_KEYS.MESSAGES, messages);
  return newMsg;
}

export interface ManualTransactionInput {
  amount: number;
  date: string;
  time: string;
  upiId: string;
  referenceId?: string;
  notes?: string;
  category?: string;
  timestamp?: number;
}

/**
 * Add manual transaction
 */
export function addManualTransaction(
  tx: ManualTransactionInput
): { success: boolean; transaction: Transaction; isDuplicate: boolean; reason?: string } {
  const transactions = loadStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);

  const computedTimestamp =
    tx.timestamp ||
    (() => {
      try {
        const d = new Date(`${tx.date}T${tx.time || '12:00'}:00`);
        return !isNaN(d.getTime()) ? d.getTime() : Date.now();
      } catch {
        return Date.now();
      }
    })();

  const candidate: Omit<Transaction, 'id'> = {
    amount: tx.amount,
    date: tx.date,
    time: tx.time,
    upiId: tx.upiId,
    referenceId: tx.referenceId,
    notes: tx.notes,
    category: tx.category,
    timestamp: computedTimestamp,
    source: 'manual',
  };

  const dupCheck = isDuplicateTransaction(candidate, transactions);

  const newTransaction: Transaction = {
    ...candidate,
    id: `tx-man-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };

  transactions.unshift(newTransaction);
  saveStorage(STORAGE_KEYS.TRANSACTIONS, transactions);

  return {
    success: true,
    transaction: newTransaction,
    isDuplicate: dupCheck.isDuplicate,
    reason: dupCheck.reason,
  };
}

/**
 * Edit existing transaction
 */
export function updateTransaction(
  updated: Transaction
): { success: boolean; transaction: Transaction } {
  const transactions = loadStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  const idx = transactions.findIndex((t) => t.id === updated.id);
  if (idx !== -1) {
    transactions[idx] = updated;
    saveStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
    return { success: true, transaction: updated };
  }
  return { success: false, transaction: updated };
}

/**
 * Delete a transaction
 */
export function deleteTransaction(id: string): boolean {
  const transactions = loadStorage<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
  const filtered = transactions.filter((t) => t.id !== id);
  saveStorage(STORAGE_KEYS.TRANSACTIONS, filtered);
  return filtered.length !== transactions.length;
}

/**
 * Reset / Re-seed all local test data
 */
export function resetToDefaults(): {
  transactions: Transaction[];
  messages: RawMessage[];
  settings: AppSettings;
  diagnostics: ScanDiagnostic;
} {
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEYS.MESSAGES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.DIAGNOSTICS);

  return initLocalDb();
}
