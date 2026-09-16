import { RawMessage, TargetUpiId } from '../types';

export const DEFAULT_TARGET_UPI_IDS: TargetUpiId[] = [
  {
    id: 'upi-1',
    address: 'canteen@upi',
    label: 'Main Canteen',
    color: '#38bdf8', // sky
    active: true,
  },
  {
    id: 'upi-2',
    address: 'mess@upi',
    label: 'Campus Mess',
    color: '#34d399', // emerald
    active: true,
  },
  {
    id: 'upi-3',
    address: 'chai@upi',
    label: 'Chai & Snacks',
    color: '#fbbf24', // amber
    active: true,
  },
];

// Helper to calculate relative timestamp (days ago, hours ago)
function getRelativeTime(daysAgo: number, hoursAgo = 0, minutesAgo = 0): number {
  const now = new Date();
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysAgo,
    now.getHours() - hoursAgo,
    now.getMinutes() - minutesAgo
  );
  return d.getTime();
}

/**
 * Realistic local Android Messages database mock feed.
 * Contains authentic Indian bank SMS messages:
 * - Canteen UPI payments (SBI, HDFC, ICICI, Axis, Paytm, GPay)
 * - Mess payments
 * - Chai payments
 * - Ignored messages (OTPs, non-target payments e.g. swiggy@upi, salary credit)
 * - Duplicate SMS (e.g. telecom resend / retry) to test duplicate protection!
 */
export function generateInitialMessages(): RawMessage[] {
  return [
    {
      id: 'msg-01',
      sender: 'VM-HDFCBK',
      body: 'Rs 45.00 debited from A/c **4921 on 16-Sep-24 to VPA canteen@upi (UPI Ref no 426019283719). Call 18002586161 if not done by you.',
      timestamp: getRelativeTime(0, 1, 15), // Today 1h 15m ago
      processed: false,
    },
    {
      id: 'msg-02',
      sender: 'AD-SBIINB',
      body: 'Dear SBI User, your A/c ending 1234 has been debited by Rs.85.00 on 16/09/24 10:30:12 by UPI txn to canteen@upi ref no 426010294812.',
      timestamp: getRelativeTime(0, 4, 30), // Today breakfast
      processed: false,
    },
    {
      id: 'msg-03',
      sender: 'Google Pay',
      body: 'Paid ₹25 to chai@upi using State Bank of India **1234. UPI transaction ID: 425981293841. Paid on 15 Sep 2024.',
      timestamp: getRelativeTime(1, 6, 10), // Yesterday
      processed: false,
    },
    {
      id: 'msg-04',
      sender: 'VK-ICICIB',
      body: 'ICICI Bank Acct XX789 debited for Rs 160.00 on 15-Sep-24. Info: UPI/425901239841/canteen@upi/Lunch. Avl Bal: INR 14,210.50.',
      timestamp: getRelativeTime(1, 2, 0),
      processed: false,
    },
    {
      id: 'msg-05',
      sender: 'Paytm',
      body: 'Money sent: Rs.320 to mess@upi using Paytm Payments Bank A/c. UPI Ref: 425891238491.',
      timestamp: getRelativeTime(2, 3, 45),
      processed: false,
    },
    {
      id: 'msg-06',
      sender: 'VM-HDFCBK',
      body: 'Paid ₹45 to canteen@upi from HDFC Bank A/c **4921. UPI Ref: 425781293012. Bal: Rs 12,300.',
      timestamp: getRelativeTime(3, 1, 20),
      processed: false,
    },
    {
      id: 'msg-07',
      sender: 'AD-SBIINB',
      body: 'Dear SBI User, your A/c ending 1234 has been debited by Rs.120.00 on 12/09/24 13:45:00 by UPI txn to canteen@upi ref no 425612849102.',
      timestamp: getRelativeTime(4, 2, 10),
      processed: false,
    },
    {
      id: 'msg-08',
      sender: 'VK-AXISBK',
      body: 'INR 30.00 debited from A/c no. XX3456 on 11-09-2024 17:15:30. Paid to chai@upi. UPI Ref: 425510293841.',
      timestamp: getRelativeTime(5, 5, 5),
      processed: false,
    },
    {
      id: 'msg-09',
      sender: 'VM-HDFCBK',
      body: 'Rs 220.00 debited from A/c **4921 on 09-09-24 to VPA mess@upi (UPI Ref no 425310294819).',
      timestamp: getRelativeTime(7, 4, 0),
      processed: false,
    },
    {
      id: 'msg-10',
      sender: 'AD-SBIINB',
      body: 'Your A/C ending 1234 debited for Rs 75.00 on 08-09-24 by UPI ref no 425219283401. Info: canteen@upi.',
      timestamp: getRelativeTime(8, 3, 20),
      processed: false,
    },
    {
      id: 'msg-11',
      sender: 'PhonePe',
      body: 'UPI payment of INR 55 to canteen@upi successful. Bank Ref: 425102938471.',
      timestamp: getRelativeTime(10, 2, 40),
      processed: false,
    },
    {
      id: 'msg-12',
      sender: 'VK-ICICIB',
      body: 'ICICI Bank Acct XX789 debited for Rs 90.00 on 05-09-24. UPI:canteen@upi.Ref:424810293841.',
      timestamp: getRelativeTime(11, 1, 10),
      processed: false,
    },
    {
      id: 'msg-13',
      sender: 'VM-HDFCBK',
      body: 'Paid ₹450 to mess@upi from HDFC Bank A/c **4921. UPI Ref: 424510293819.',
      timestamp: getRelativeTime(12, 5, 0),
      processed: false,
    },
    {
      id: 'msg-14',
      sender: 'AD-SBIINB',
      body: 'Your A/C ending 1234 debited for Rs 40.00 on 03-09-24 by UPI ref no 424219283401. Info: chai@upi.',
      timestamp: getRelativeTime(13, 6, 0),
      processed: false,
    },
    {
      id: 'msg-15',
      sender: 'VM-HDFCBK',
      body: 'Rs 130.00 debited from A/c **4921 on 02-09-24 to VPA canteen@upi (UPI Ref no 424019283719).',
      timestamp: getRelativeTime(14, 2, 30),
      processed: false,
    },
    // Previous Month SMS transactions
    {
      id: 'msg-16',
      sender: 'AD-SBIINB',
      body: 'Dear SBI User, your A/c ending 1234 has been debited by Rs.110.00 on 28/08/24 by UPI txn to canteen@upi ref no 423512849102.',
      timestamp: getRelativeTime(22, 2, 10),
      processed: false,
    },
    {
      id: 'msg-17',
      sender: 'VK-ICICIB',
      body: 'ICICI Bank Acct XX789 debited for Rs 85.00 on 24-08-24. UPI:canteen@upi.Ref:423110293841.',
      timestamp: getRelativeTime(26, 3, 15),
      processed: false,
    },
    {
      id: 'msg-18',
      sender: 'Paytm',
      body: 'Money sent: Rs.350 to mess@upi using Paytm Payments Bank A/c. UPI Ref: 422891238491.',
      timestamp: getRelativeTime(28, 4, 0),
      processed: false,
    },
    {
      id: 'msg-19',
      sender: 'VM-HDFCBK',
      body: 'Paid ₹60 to canteen@upi from HDFC Bank A/c **4921. UPI Ref: 422481293012.',
      timestamp: getRelativeTime(32, 1, 40),
      processed: false,
    },
    // Ignored Messages (Testing real scanner behavior)
    {
      id: 'msg-20',
      sender: 'BP-HDFCBK',
      body: '492102 is your Secret OTP for online banking login at HDFC Bank. Do not share OTP with anyone.',
      timestamp: getRelativeTime(0, 5, 0),
      processed: false,
    },
    {
      id: 'msg-21',
      sender: 'VK-AXISBK',
      body: 'INR 420.00 debited from A/c XX3456 to VPA swiggy@icici on 14-09-2024. UPI Ref: 425710293841.',
      timestamp: getRelativeTime(2, 8, 0),
      processed: false,
    },
    {
      id: 'msg-22',
      sender: 'AD-SBIINB',
      body: 'Your A/c 1234 is credited with INR 35,000.00 on 01-09-24 by NEFT salary transfer. Avl Bal: INR 48,920.',
      timestamp: getRelativeTime(15, 9, 0),
      processed: false,
    },
    // DUPLICATE test message (Identical to msg-01 ref no 426019283719, e.g. network resend)
    {
      id: 'msg-23',
      sender: 'VM-HDFCBK',
      body: 'Rs 45.00 debited from A/c **4921 on 16-Sep-24 to VPA canteen@upi (UPI Ref no 426019283719). Call 18002586161 if not done by you.',
      timestamp: getRelativeTime(0, 1, 10),
      processed: false,
    },
  ];
}
