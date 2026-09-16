export type TransactionSource = 'auto_sms' | 'manual';

export interface Transaction {
  id: string;
  amount: number; // in INR
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timestamp: number; // Unix epoch in ms
  upiId: string; // recipient UPI ID (e.g. canteen@upi)
  referenceId?: string; // Bank UTR or UPI Ref ID
  source: TransactionSource;
  originalMessage?: string; // Raw SMS text if auto-detected
  notes?: string;
  category?: string;
}

export interface RawMessage {
  id: string;
  sender: string; // e.g. "VM-HDFCBK", "AD-SBIINB", "VK-AXISBK", "Google Pay"
  body: string;
  timestamp: number; // Unix epoch in ms
  processed: boolean;
}

export interface TargetUpiId {
  id: string;
  address: string; // e.g. "canteen@upi"
  label: string; // e.g. "Main Canteen"
  color: string; // e.g. "#38bdf8"
  active: boolean;
}

export interface ScanDiagnostic {
  lastScanTime: number | null;
  messagesScanned: number;
  transactionsDetected: number;
  ignoredCount: number;
  duplicateCount: number;
  failedParseCount: number;
  lastScannedMessageId: string | null;
  logs: DiagnosticLogEntry[];
}

export interface DiagnosticLogEntry {
  id: string;
  timestamp: number;
  type: 'success' | 'ignored' | 'duplicate' | 'parse_fail';
  summary: string;
  rawSnippet: string;
  details?: string;
}

export type TimeFilter = 'today' | 'week' | 'month' | 'last_month' | 'custom' | 'all';

export interface AppSettings {
  targetUpiIds: TargetUpiId[];
  autoScanEnabled: boolean;
  autoScanIntervalSeconds: number; // e.g. 30
  macOSPermissionAcknowledged: boolean;
  androidPermissionAcknowledged: boolean;
}
