/**
 * Formats a number according to the Indian Numbering System (Lakhs and Crores)
 * Example: 1250 -> "1,250", 12450 -> "12,450", 102500 -> "1,02,500"
 */
export function formatINR(amount: number, includeDecimals = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let integerPart = Math.floor(absAmount).toString();
  const decimalPart = (absAmount % 1).toFixed(2).substring(2);

  // Indian number grouping: last 3 digits, then groups of 2 digits
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    integerPart = formattedOther + ',' + lastThree;
  }

  const prefix = isNegative ? '-' : '';
  if (includeDecimals && decimalPart !== '00') {
    return `${prefix}${integerPart}.${decimalPart}`;
  }
  return `${prefix}${integerPart}`;
}

export function formatCurrency(amount: number, includeDecimals = false): string {
  return `₹${formatINR(amount, includeDecimals)}`;
}

/**
 * Format a Date or timestamp into YYYY-MM-DD
 */
export function formatDateISO(date: Date | number): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date or timestamp into HH:mm (24 hour)
 */
export function formatTime24(date: Date | number): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format readable date like "16 Sep 2024"
 */
export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return dateStr;
}

/**
 * Format readable time like "02:45 PM"
 */
export function formatDisplayTime(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${String(formattedHour).padStart(2, '0')}:${minute} ${ampm}`;
  }
  return timeStr;
}
