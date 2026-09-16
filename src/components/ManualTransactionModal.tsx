import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, TargetUpiId } from '../types';
import { formatDateISO, formatTime24 } from '../utils/numberFormat';
import { X, Check, AlertCircle } from 'lucide-react';

interface ManualTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (txData: {
    amount: number;
    date: string;
    time: string;
    upiId: string;
    referenceId?: string;
    notes?: string;
    category?: string;
  }) => void;
  editingTransaction?: Transaction | null;
  targetUpiIds: TargetUpiId[];
}

export const ManualTransactionModal: React.FC<ManualTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  targetUpiIds,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [upiId, setUpiId] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTransaction) {
      setAmountStr(editingTransaction.amount.toString());
      setDate(editingTransaction.date);
      setTime(editingTransaction.time);
      setUpiId(editingTransaction.upiId);
      setReferenceId(editingTransaction.referenceId || '');
      setNotes(editingTransaction.notes || '');
      setError(null);
    } else {
      const now = new Date();
      setAmountStr('');
      setDate(formatDateISO(now));
      setTime(formatTime24(now));
      setUpiId(targetUpiIds[0]?.address || 'canteen@upi');
      setReferenceId('');
      setNotes('');
      setError(null);
    }
  }, [editingTransaction, isOpen, targetUpiIds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (!date) {
      setError('Please select a date');
      return;
    }
    if (!upiId.trim()) {
      setError('Please provide a UPI ID');
      return;
    }

    onSave({
      amount: parsedAmount,
      date,
      time: time || '12:00',
      upiId: upiId.trim().toLowerCase(),
      referenceId: referenceId.trim() || undefined,
      notes: notes.trim() || undefined,
      category: 'Canteen',
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md rounded-2xl bg-[#0e1017] border border-white/10 p-6 shadow-2xl z-10 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                {editingTransaction ? 'Edit Transaction' : 'Record Manual Transaction'}
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Amount */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Amount in INR (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="45.00"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#07080c] border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#07080c] border border-white/10 text-white focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#07080c] border border-white/10 text-white focus:outline-none focus:border-sky-400 transition-colors"
                  />
                </div>
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Recipient UPI ID *
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="canteen@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#07080c] border border-white/10 text-white font-mono focus:outline-none focus:border-sky-400 transition-colors"
                  />
                  {/* Quick preset buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {targetUpiIds.map((target) => (
                      <button
                        type="button"
                        key={target.id}
                        onClick={() => setUpiId(target.address)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-mono transition-colors ${
                          upiId === target.address
                            ? 'bg-sky-500/20 text-sky-200 border-sky-400/40'
                            : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:text-slate-200'
                        }`}
                      >
                        {target.address}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reference ID */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Bank Reference / UTR ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 426019283719"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#07080c] border border-white/10 text-white font-mono focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Notes / Meal Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Samosa & Tea, Lunch thali"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#07080c] border border-white/10 text-white focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium shadow-md transition-all active:scale-98"
                >
                  {editingTransaction ? 'Save Changes' : 'Add to Ledger'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
