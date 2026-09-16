import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, TargetUpiId } from '../types';
import { formatINR, formatDisplayDate, formatDisplayTime } from '../utils/numberFormat';
import {
  Search,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Download,
  Copy,
  Check,
  Plus,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface TransactionLedgerProps {
  transactions: Transaction[];
  targetUpiIds: TargetUpiId[];
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenManualEntry: () => void;
  onOpenExport: () => void;
}

type SortField = 'date' | 'amount' | 'upiId';
type SortOrder = 'asc' | 'desc';

export const TransactionLedger: React.FC<TransactionLedgerProps> = ({
  transactions,
  targetUpiIds,
  onEditTransaction,
  onDeleteTransaction,
  onOpenManualEntry,
  onOpenExport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUpi, setSelectedUpi] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'auto_sms' | 'manual'>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting and filtering
  const filteredAndSortedTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Search term matching
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchesUpi = tx.upiId.toLowerCase().includes(term);
          const matchesRef = tx.referenceId?.toLowerCase().includes(term);
          const matchesMsg = tx.originalMessage?.toLowerCase().includes(term);
          const matchesAmount = tx.amount.toString().includes(term);
          const matchesNotes = tx.notes?.toLowerCase().includes(term);
          if (!matchesUpi && !matchesRef && !matchesMsg && !matchesAmount && !matchesNotes) {
            return false;
          }
        }

        // UPI filter
        if (selectedUpi !== 'all') {
          if (tx.upiId.toLowerCase() !== selectedUpi.toLowerCase()) {
            return false;
          }
        }

        // Source filter
        if (selectedSource !== 'all') {
          if (tx.source !== selectedSource) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let compare = 0;
        if (sortField === 'date') {
          compare = a.timestamp - b.timestamp;
        } else if (sortField === 'amount') {
          compare = a.amount - b.amount;
        } else if (sortField === 'upiId') {
          compare = a.upiId.localeCompare(b.upiId);
        }
        return sortOrder === 'desc' ? -compare : compare;
      });
  }, [transactions, searchTerm, selectedUpi, selectedSource, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalFilteredAmount = useMemo(() => {
    return filteredAndSortedTransactions.reduce((acc, t) => acc + t.amount, 0);
  }, [filteredAndSortedTransactions]);

  return (
    <div className="space-y-4 pb-12">
      {/* Control Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] p-4 sm:p-5 rounded-2xl border border-white/[0.06]">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">
            Transaction Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Showing {filteredAndSortedTransactions.length} of {transactions.length} records • Total: ₹
            {formatINR(totalFilteredAmount)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="ledger-add-tx-btn"
            onClick={onOpenManualEntry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Add Transaction</span>
          </button>

          <button
            id="ledger-export-btn"
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/30 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by UPI ID, Ref, amount, or text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-400/50 transition-colors"
          />
        </div>

        {/* Filter UPI */}
        <div>
          <select
            value={selectedUpi}
            onChange={(e) => setSelectedUpi(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#090b10] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-sky-400/50 transition-colors"
          >
            <option value="all">All UPI Addresses</option>
            {targetUpiIds.map((target) => (
              <option key={target.id} value={target.address}>
                {target.label} ({target.address})
              </option>
            ))}
          </select>
        </div>

        {/* Filter Source */}
        <div>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl bg-[#090b10] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-sky-400/50 transition-colors"
          >
            <option value="all">All Sources</option>
            <option value="auto_sms">Auto Detected (SMS)</option>
            <option value="manual">Manually Added</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 uppercase tracking-wider font-mono text-[10px]">
                <th className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                  <div className="flex items-center gap-1.5">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('upiId')}>
                  <div className="flex items-center gap-1.5">
                    <span>UPI ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredAndSortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No transactions match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedTransactions.map((tx) => {
                  const isExpanded = expandedId === tx.id;
                  const isAuto = tx.source === 'auto_sms';

                  return (
                    <React.Fragment key={tx.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                        className={`group cursor-pointer transition-colors ${
                          isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formatDisplayDate(tx.date)}
                        </td>

                        {/* Time */}
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {formatDisplayTime(tx.time)}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-white">
                          ₹{formatINR(tx.amount)}
                        </td>

                        {/* UPI ID */}
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-300">
                            {tx.upiId}
                          </span>
                        </td>

                        {/* Reference ID */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {tx.referenceId ? (
                            <span title={tx.referenceId}>{tx.referenceId}</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Source Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono tracking-tight border ${
                              isAuto
                                ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            }`}
                          >
                            {isAuto ? 'AUTO (SMS)' : 'MANUAL'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div
                            className="inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => onEditTransaction(tx)}
                              title="Edit transaction"
                              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTransaction(tx.id)}
                              title="Delete transaction"
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                              title={isExpanded ? 'Collapse' : 'Expand'}
                              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Row for Original Message and Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr className="bg-[#0b0d14]/90 border-y border-white/[0.06]">
                            <td colSpan={7} className="p-4">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                      Original SMS / Transaction Log
                                    </span>
                                  </div>
                                  {tx.originalMessage && (
                                    <button
                                      onClick={() => handleCopy(tx.originalMessage!, tx.id)}
                                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]"
                                    >
                                      {copiedId === tx.id ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span>Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy Message</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>

                                <div className="p-3 rounded-xl bg-[#07080c] border border-white/[0.08] font-mono text-xs text-slate-300 leading-relaxed break-words whitespace-pre-wrap">
                                  {tx.originalMessage || (
                                    <span className="text-slate-500 italic">
                                      Manually added transaction. No original SMS message body.
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-mono pt-1">
                                  <span>Internal ID: {tx.id}</span>
                                  {tx.notes && <span>Notes: {tx.notes}</span>}
                                  <span>Timestamp: {new Date(tx.timestamp).toLocaleString('en-IN')}</span>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
