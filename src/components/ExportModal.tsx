import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, TargetUpiId } from '../types';
import { formatINR, formatDisplayDate, formatDisplayTime } from '../utils/numberFormat';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Calendar,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  targetUpiIds: TargetUpiId[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  targetUpiIds,
}) => {
  const [selectedRange, setSelectedRange] = useState<'all' | 'month' | 'last_month'>('month');
  const printRef = useRef<HTMLDivElement>(null);

  // Filter transactions for export
  const filteredTxs = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    return transactions.filter((t) => {
      if (selectedRange === 'all') return true;
      const d = new Date(t.timestamp);
      if (selectedRange === 'month') {
        return d.getFullYear() === curYear && d.getMonth() === curMonth;
      }
      if (selectedRange === 'last_month') {
        const prevM = new Date(curYear, curMonth - 1, 1);
        return d.getFullYear() === prevM.getFullYear() && d.getMonth() === prevM.getMonth();
      }
      return true;
    });
  }, [transactions, selectedRange]);

  // Statistics for PDF report
  const stats = useMemo(() => {
    const total = filteredTxs.reduce((sum, t) => sum + t.amount, 0);
    const count = filteredTxs.length;
    const avg = count > 0 ? Math.round(total / count) : 0;

    // Daily summary
    const dailyMap = new Map<string, { total: number; count: number }>();
    filteredTxs.forEach((t) => {
      const cur = dailyMap.get(t.date) || { total: 0, count: 0 };
      cur.total += t.amount;
      cur.count += 1;
      dailyMap.set(t.date, cur);
    });

    const dailySummary = Array.from(dailyMap.entries())
      .map(([date, val]) => ({ date, ...val }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return { total, count, avg, dailySummary };
  }, [filteredTxs]);

  // Generate and download CSV
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Time',
      'Amount (INR)',
      'UPI ID',
      'Reference ID',
      'Source',
      'Original Message',
    ];

    const escapeCsv = (str: string | undefined | null) => {
      if (!str) return '""';
      const clean = str.replace(/"/g, '""').replace(/\r?\n|\r/g, ' ');
      return `"${clean}"`;
    };

    const rows = filteredTxs.map((t) => [
      escapeCsv(t.date),
      escapeCsv(t.time),
      t.amount.toFixed(2),
      escapeCsv(t.upiId),
      escapeCsv(t.referenceId || 'N/A'),
      escapeCsv(t.source === 'auto_sms' ? 'SMS' : 'MANUAL'),
      escapeCsv(t.originalMessage || ''),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `XpenseFlow_Canteen_Expenses_${selectedRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print PDF
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm no-print"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0d0f16] border border-white/10 p-6 shadow-2xl z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] no-print">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-wide">
                  Export Expense Statements
                </h2>
                <p className="text-xs text-slate-400">
                  Export transactions locally as RFC-compliant CSV or professional PDF statement.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-white/[0.06] no-print">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Period:</span>
                <select
                  value={selectedRange}
                  onChange={(e) => setSelectedRange(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-[#07080c] border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="month">Current Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="all">All Time Records</option>
                </select>
                <span className="text-xs text-slate-500 font-mono">
                  ({filteredTxs.length} txns selected)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-medium text-slate-200 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export as CSV</span>
                </button>

                <button
                  onClick={handlePrintPDF}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-medium text-sky-200 transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            </div>

            {/* Printable PDF Statement View */}
            <div
              ref={printRef}
              className="overflow-y-auto my-3 p-6 rounded-xl bg-white text-slate-900 font-sans print-container"
            >
              {/* Statement Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                      XF
                    </div>
                    <span className="font-bold text-base tracking-tight text-slate-900">
                      XpenseFlow
                    </span>
                  </div>
                  <h1 className="text-lg font-bold text-slate-800 mt-2">
                    Canteen Expense Statement
                  </h1>
                  <p className="text-xs text-slate-500">
                    Local Device Ledger • Generated on {new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>

                <div className="text-right text-xs space-y-1">
                  <div className="font-semibold text-slate-700 uppercase tracking-wide text-[10px]">
                    Statement Period
                  </div>
                  <div className="font-medium text-slate-900">
                    {selectedRange === 'month'
                      ? 'Current Month'
                      : selectedRange === 'last_month'
                      ? 'Previous Month'
                      : 'All Time Activity'}
                  </div>
                  <div className="text-slate-500 text-[10px] font-mono">
                    ID: XF-{Date.now().toString().slice(-6)}
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 my-5">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Total Spending
                  </div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                    ₹{formatINR(stats.total)}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Transaction Count
                  </div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                    {stats.count}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                    Average / Transaction
                  </div>
                  <div className="text-lg font-bold text-slate-900 font-mono mt-1">
                    ₹{formatINR(stats.avg)}
                  </div>
                </div>
              </div>

              {/* Daily Spending Summary Table */}
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Daily Spending Summary
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Transactions</th>
                        <th className="py-2 px-3 text-right">Daily Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.dailySummary.slice(0, 7).map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-3 font-mono">{formatDisplayDate(d.date)}</td>
                          <td className="py-1.5 px-3 text-slate-600">{d.count} transactions</td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-900">
                            ₹{formatINR(d.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Complete Transaction Table */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Complete Transaction Breakdown
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Date &amp; Time</th>
                        <th className="py-2 px-3">UPI ID</th>
                        <th className="py-2 px-3">Reference / UTR</th>
                        <th className="py-2 px-3">Source</th>
                        <th className="py-2 px-3 text-right">Amount (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTxs.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-mono text-[11px]">
                            {t.date} {t.time}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-800">{t.upiId}</td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                            {t.referenceId || 'N/A'}
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono">
                              {t.source === 'auto_sms' ? 'SMS' : 'MANUAL'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{formatINR(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-8 pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Verified 100% on-device local calculation by XpenseFlow</span>
                <span>Confidential Personal Expense Report</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end no-print">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
