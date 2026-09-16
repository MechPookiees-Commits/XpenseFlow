import { Transaction, RawMessage, TargetUpiId } from '../types';
import { formatDateISO, formatTime24 } from './numberFormat';

export interface ParseResult {
  success: boolean;
  transaction?: Omit<Transaction, 'id'>;
  reason?: string;
  ignored?: boolean;
  extractedAmount?: number;
  extractedUpi?: string;
  extractedRef?: string;
}

export function normalizeUpi(upi: string): string {
  return upi.trim().toLowerCase();
}

/**
 * Common UPI ID Regex
 */
const UPI_REGEX = /([a-zA-Z0-9.\-_]{2,50}@[a-zA-Z0-9]{2,30})/gi;

/**
 * Extracts all UPI IDs found in a text string
 */
export function extractAllUpiIds(text: string): string[] {
  const matches = text.match(UPI_REGEX);
  if (!matches) return [];
  return Array.from(new Set(matches.map(normalizeUpi)));
}

/**
 * Checks if message is a non-transaction SMS (OTP, login, balance inquiry, credit)
 */
export function isIgnoredMessageType(text: string): boolean {
  const lower = text.toLowerCase();

  // If it's an OTP / verification code
  if (
    lower.includes('otp') ||
    lower.includes('verification code') ||
    lower.includes('one time password') ||
    lower.includes('secret code') ||
    lower.includes('do not share')
  ) {
    return true;
  }

  // If it's an explicit credit / deposit without debit
  if (
    (lower.includes('credited to') ||
      lower.includes('received rs') ||
      lower.includes('received inr') ||
      lower.includes('cashback of')) &&
    !lower.includes('debited') &&
    !lower.includes('paid')
  ) {
    return true;
  }

  // Promotional or bill reminder
  if (
    (lower.includes('bill is due') || lower.includes('pre-approved') || lower.includes('apply for')) &&
    !lower.includes('debited')
  ) {
    return true;
  }

  return false;
}

/**
 * Extract monetary amount in INR from SMS text
 */
export function extractAmount(text: string): number | null {
  // Regex variations for Indian SMS
  // 1. Rs. 45.00 or Rs 45 or INR 45.50 or ₹45.00
  // 2. Debited by 45.00
  // 3. Paid ₹45
  const patterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /debited\s*(?:by|for|with|of)?\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /paid\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /sent\s*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:debited|deducted|spent)/i,
    /(?:vpa|to)\s+[^\s]+\s+(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0 && parsed < 10000000) {
        return parsed;
      }
    }
  }

  return null;
}

/**
 * Extract Bank Reference / UTR / UPI Ref ID
 */
export function extractReferenceId(text: string): string | undefined {
  const refPatterns = [
    /(?:upi\s*ref(?:\s*no)?|ref\s*no|ref|utr|txn\s*id|transaction\s*id|rrn)[:\s]+([0-9a-zA-Z]{6,25})/i,
    /(?:upi\/)([0-9]{10,14})/i,
    /(?:ref:\s*)([0-9a-zA-Z]{6,25})/i,
  ];

  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Extract Date and Time from message text, falling back to message metadata
 */
export function extractDateTime(
  text: string,
  fallbackTimestamp: number
): { date: string; time: string; timestamp: number } {
  // Try to find date in text like "16-Sep-24", "16/09/2024", "16-09-2024"
  const dateMatch = text.match(/(\d{1,2})[-/](\d{1,2}|[A-Za-z]{3})[-/](\d{2,4})/);
  const timeMatch = text.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);

  const fallbackDate = new Date(fallbackTimestamp);
  let resolvedDate = formatDateISO(fallbackDate);
  let resolvedTime = formatTime24(fallbackDate);
  let resolvedTs = fallbackTimestamp;

  if (dateMatch) {
    try {
      const day = parseInt(dateMatch[1], 10);
      const monthPart = dateMatch[2];
      let year = parseInt(dateMatch[3], 10);
      if (year < 100) year += 2000;

      let month = 0;
      if (isNaN(Number(monthPart))) {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const mIdx = monthNames.indexOf(monthPart.toLowerCase().slice(0, 3));
        month = mIdx !== -1 ? mIdx : fallbackDate.getMonth();
      } else {
        month = parseInt(monthPart, 10) - 1;
      }

      let hour = fallbackDate.getHours();
      let minute = fallbackDate.getMinutes();

      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[4]?.toLowerCase();
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        hour = h;
        minute = m;
      }

      const d = new Date(year, month, day, hour, minute);
      if (!isNaN(d.getTime())) {
        resolvedDate = formatDateISO(d);
        resolvedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        resolvedTs = d.getTime();
      }
    } catch {
      // Keep fallback
    }
  }

  return { date: resolvedDate, time: resolvedTime, timestamp: resolvedTs };
}

/**
 * Main parser function to test an SMS message against target UPI IDs
 */
export function parseTransactionMessage(
  message: RawMessage,
  targetUpiIds: TargetUpiId[]
): ParseResult {
  const text = message.body;

  // 1. Check if non-transaction / OTP / Credit
  if (isIgnoredMessageType(text)) {
    return {
      success: false,
      ignored: true,
      reason: 'Non-transaction message (OTP, promotional, or credit alert)',
    };
  }

  // 2. Extract UPI IDs from message
  const foundUpis = extractAllUpiIds(text);
  const activeTargets = targetUpiIds.filter((t) => t.active).map((t) => normalizeUpi(t.address));

  // Also check if any target UPI is mentioned literally in the text
  let matchedUpi: string | null = null;
  for (const target of activeTargets) {
    if (text.toLowerCase().includes(target)) {
      matchedUpi = target;
      break;
    }
  }

  // If no literal match, check if any found UPI in text matches any active target
  if (!matchedUpi) {
    for (const upi of foundUpis) {
      if (activeTargets.includes(upi)) {
        matchedUpi = upi;
        break;
      }
    }
  }

  // If not matched to any target UPI, check if it's a general UPI debit to somewhere else
  if (!matchedUpi) {
    return {
      success: false,
      ignored: true,
      reason: `Message does not target configured UPI IDs (${activeTargets.join(', ') || 'none configured'})`,
      extractedUpi: foundUpis[0],
    };
  }

  // 3. Extract Amount
  const amount = extractAmount(text);
  if (!amount) {
    return {
      success: false,
      reason: 'Could not extract valid monetary amount in INR',
      extractedUpi: matchedUpi,
    };
  }

  // 4. Extract Reference ID
  const refId = extractReferenceId(text);

  // 5. Extract Date & Time
  const dt = extractDateTime(text, message.timestamp);

  return {
    success: true,
    extractedAmount: amount,
    extractedUpi: matchedUpi,
    extractedRef: refId,
    transaction: {
      amount,
      date: dt.date,
      time: dt.time,
      timestamp: dt.timestamp,
      upiId: matchedUpi,
      referenceId: refId,
      source: 'auto_sms',
      originalMessage: text,
      notes: `Detected from ${message.sender}`,
      category: 'Canteen',
    },
  };
}

/**
 * Intelligent Duplicate Detection
 * 1. Checks exact referenceId match
 * 2. If no refId, checks composite similarity: same UPI + same amount + within 20 minutes on same date
 */
export function isDuplicateTransaction(
  candidate: Omit<Transaction, 'id'>,
  existingTransactions: Transaction[]
): { isDuplicate: boolean; duplicateId?: string; reason?: string } {
  for (const tx of existingTransactions) {
    // Check reference ID first
    if (candidate.referenceId && tx.referenceId) {
      if (candidate.referenceId.trim().toLowerCase() === tx.referenceId.trim().toLowerCase()) {
        return {
          isDuplicate: true,
          duplicateId: tx.id,
          reason: `Matching Reference ID: ${candidate.referenceId}`,
        };
      }
    }

    // Check composite match: same UPI + same amount (within ₹0.01)
    if (
      normalizeUpi(candidate.upiId) === normalizeUpi(tx.upiId) &&
      Math.abs(candidate.amount - tx.amount) < 0.01
    ) {
      // Check timestamp proximity: within 15 minutes (900,000 ms)
      const timeDiff = Math.abs(candidate.timestamp - tx.timestamp);
      if (timeDiff <= 15 * 60 * 1000) {
        return {
          isDuplicate: true,
          duplicateId: tx.id,
          reason: `Matching UPI ID, Amount (₹${candidate.amount}) and timestamp proximity (${Math.round(
            timeDiff / 60000
          )}m)`,
        };
      }

      // If timestamps might be slightly off but exact same original message text
      if (
        candidate.originalMessage &&
        tx.originalMessage &&
        candidate.originalMessage.trim() === tx.originalMessage.trim()
      ) {
        return {
          isDuplicate: true,
          duplicateId: tx.id,
          reason: 'Identical message text and amount',
        };
      }
    }
  }

  return { isDuplicate: false };
}
