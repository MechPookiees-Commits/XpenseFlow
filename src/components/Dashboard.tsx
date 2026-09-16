import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Transaction, TargetUpiId, TimeFilter } from '../types';
import { FlipCounter } from './FlipCounter';
import { SpendingGraph } from './SpendingGraph';
import { formatINR, formatDisplayDate, formatDisplayTime } from '../utils/numberFormat';
import {
  Calendar,
  CreditCard,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Filter,
  Layers,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  targetUpiIds: TargetUpiId[];
  selectedFilter: TimeFilter;
  onSelectFilter: (f: TimeFilter) => void;
  customStartDate: string;
  customEndDate: string;
  onChangeCustomDates: (start: string, end: string) => void;
  selectedUpiFilter: string; // '' for all
  onSelectUpiFilter: (upi: string) => void;
  onNavigateToTransactions: () => void;
  onOpenManualEntry: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  targetUpiIds,
  selectedFilter,
  onSelectFilter,
  customStartDate,
  customEndDate,
  onChangeCustomDates,
  selectedUpiFilter,
  onSelectUpiFilter,
  onNavigateToTransactions,
  onOpenManualEntry,
}) => {
  // Calculations for current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const todayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  // Start of current week (Monday)
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);

  // Previous month calculation
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonthYear = prevMonthDate.getFullYear();
  const prevMonthIdx = prevMonthDate.getMonth();

  // Filter helper
  const filterTransactions = (txList: Transaction[], filter: TimeFilter) => {
    return txList.filter((tx) => {
      // UPI ID filter match
      if (selectedUpiFilter && tx.upiId.toLowerCase() !== selectedUpiFilter.toLowerCase()) {
        return false;
      }

      const txDate = new Date(tx.timestamp);

      switch (filter) {
        case 'today':
          return tx.date === todayStr;
        case 'week':
          return txDate >= startOfWeek;
        case 'month':
          return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
        case 'last_month':
          return (
            txDate.getFullYear() === prevMonthYear && txDate.getMonth() === prevMonthIdx
          );
        case 'custom':
          if (customStartDate && tx.date < customStartDate) return false;
          if (customEndDate && tx.date > customEndDate) return false;
          return true;
        case 'all':
        default:
          return true;
      }
    });
  };

  // Metrics computation
  const metrics = useMemo(() => {
    // Current month total (always computed for headline)
    const currentMonthTxs = transactions.filter((t) => {
      const d = new Date(t.timestamp);
      const matchesMonth = d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      const matchesUpi = !selectedUpiFilter || t.upiId.toLowerCase() === selectedUpiFilter.toLowerCase();
      return matchesMonth && matchesUpi;
    });
    const currentMonthTotal = currentMonthTxs.reduce((sum, t) => sum + t.amount, 0);

    // Today's total
    const todayTxs = transactions.filter((t) => {
      const matchesDay = t.date === todayStr;
      const matchesUpi = !selectedUpiFilter || t.upiId.toLowerCase() === selectedUpiFilter.toLowerCase();
      return matchesDay && matchesUpi;
    });
    const todayTotal = todayTxs.reduce((sum, t) => sum + t.amount, 0);

    // This week's total
    const weekTxs = transactions.filter((t) => {
      const d = new Date(t.timestamp);
      const matchesWeek = d >= startOfWeek;
      const matchesUpi = !selectedUpiFilter || t.upiId.toLowerCase() === selectedUpiFilter.toLowerCase();
      return matchesWeek && matchesUpi;
    });
    const weekTotal = weekTxs.reduce((sum, t) => sum + t.amount, 0);

    // Previous month total
    const prevMonthTxs = transactions.filter((t) => {
      const d = new Date(t.timestamp);
      const matchesPrev = d.getFullYear() === prevMonthYear && d.getMonth() === prevMonthIdx;
      const matchesUpi = !selectedUpiFilter || t.upiId.toLowerCase() === selectedUpiFilter.toLowerCase();
      return matchesPrev && matchesUpi;
    });
    const prevMonthTotal = prevMonthTxs.reduce((sum, t) => sum + t.amount, 0);

    // Active filtered transactions
    const activeFiltered = filterTransactions(transactions, selectedFilter);
    const activeTotal = activeFiltered.reduce((sum, t) => sum + t.amount, 0);
    const txCount = activeFiltered.length;
    const avgTransaction = txCount > 0 ? Math.round(activeTotal / txCount) : 0;
    const highestTransaction =
      txCount > 0 ? Math.max(...activeFiltered.map((t) => t.amount)) : 0;

    return {
      currentMonthTotal,
      todayTotal,
      weekTotal,
      prevMonthTotal,
      activeTotal,
      txCount,
      avgTransaction,
      highestTransaction,
      activeFiltered,
    };
  }, [
    transactions,
    selectedUpiFilter,
    selectedFilter,
    currentYear,
    currentMonth,
    todayStr,
    prevMonthYear,
    prevMonthIdx,
    customStartDate,
    customEndDate,
  ]);

  // UPI IDs breakdown cards
  const upiBreakdowns = useMemo(() => {
    return targetUpiIds.map((target) => {
      const upiTxs = transactions.filter(
        (t) => t.upiId.toLowerCase() === target.address.toLowerCase()
      );
      const total = upiTxs.reduce((acc, t) => acc + t.amount, 0);
      const count = upiTxs.length;
      return { ...target, total, count };
    });
  }, [transactions, targetUpiIds]);

  const filterButtons: { id: TimeFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'all', label: 'All Time' },
    { id: 'custom', label: 'Custom Range' },
  ];

  const currentMonthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Main Headline & Flip Counter */}
      <section className="relative rounded-3xl bg-gradient-to-b from-[#121520] via-[#0d0f16] to-[#090b10] border border-white/[0.08] p-6 sm:p-8 overflow-hidden shadow-2xl">
        {/* Subtle liquid glow effects */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-sky-500/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 bg-indigo-500/[0.05] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-xs font-semibold uppercase tracking-widest text-slate-400 font-mono">
                Canteen Spending
              </h1>
              {selectedUpiFilter && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {selectedUpiFilter}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-xs text-slate-400 font-medium">Current Month:</span>
              {/* Mechanical Odometer Flip-Counter (restrained, elegant) */}
              <div className="bg-[#08090d]/80 px-3 py-1.5 rounded-xl border border-white/[0.08] shadow-inner inline-flex items-center">
                <FlipCounter
                  value={metrics.currentMonthTotal}
                  size="xl"
                  className="text-white"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Tracking local transaction SMS for <span className="text-slate-200">{currentMonthName}</span>
            </p>
          </div>

          {/* Quick Target UPI filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onSelectUpiFilter('')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedUpiFilter === ''
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm'
                  : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/[0.05]'
              }`}
            >
              All UPIs
            </button>
            {targetUpiIds.map((target) => {
              const isSelected = selectedUpiFilter.toLowerCase() === target.address.toLowerCase();
              return (
                <button
                  key={target.id}
                  onClick={() => onSelectUpiFilter(isSelected ? '' : target.address)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40 shadow-sm'
                      : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/[0.05]'
                  }`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: target.color }}
                  />
                  <span>{target.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Spending Graph — Daily flow throughout the current month */}
      <section>
        <SpendingGraph
          transactions={transactions}
          selectedUpiFilter={selectedUpiFilter}
        />
      </section>

      {/* 3. Time Filter Selector */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Metric Period
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white/[0.02] p-1 rounded-2xl border border-white/[0.06]">
            {filterButtons.map((btn) => {
              const isActive = selectedFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  id={`filter-btn-${btn.id}`}
                  onClick={() => onSelectFilter(btn.id)}
                  className={`relative px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeFilterBg"
                      className="absolute inset-0 rounded-xl bg-white/[0.08] border border-white/10 shadow-sm"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom date range picker if custom selected */}
        {selectedFilter === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08]"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onChangeCustomDates(e.target.value, customEndDate)}
                className="px-2.5 py-1 rounded-lg bg-[#08090d] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-sky-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onChangeCustomDates(customStartDate, e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-[#08090d] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-sky-400"
              />
            </div>
          </motion.div>
        )}
      </section>

      {/* 4. Core Spending Breakdown Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Today's spending */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Today
          </span>
          <div className="mt-1">
            <FlipCounter value={metrics.todayTotal} size="md" />
          </div>
        </div>

        {/* This week's spending */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            This Week
          </span>
          <div className="mt-1">
            <FlipCounter value={metrics.weekTotal} size="md" />
          </div>
        </div>

        {/* Current month's spending */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            This Month
          </span>
          <div className="mt-1">
            <FlipCounter value={metrics.currentMonthTotal} size="md" />
          </div>
        </div>

        {/* Previous month's spending */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Last Month
          </span>
          <div className="mt-1">
            <FlipCounter value={metrics.prevMonthTotal} size="md" />
          </div>
        </div>

        {/* Number of transactions */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Txn Count
          </span>
          <div className="mt-1 flex items-baseline gap-1 font-mono font-semibold text-base text-white">
            <span>{metrics.txCount}</span>
            <span className="text-xs text-slate-500 font-normal">txns</span>
          </div>
        </div>

        {/* Average transaction value */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Average Txn
          </span>
          <div className="mt-1">
            <FlipCounter value={metrics.avgTransaction} size="md" />
          </div>
        </div>
      </section>

      {/* 5. UPI Breakdown & Highest Transaction Panel */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Configured UPI Accounts breakdown */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Spending by Configured UPI ID
              </h2>
            </div>
            <span className="text-xs text-slate-500">All-Time Cumulative</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upiBreakdowns.map((target) => (
              <div
                key={target.id}
                onClick={() =>
                  onSelectUpiFilter(
                    selectedUpiFilter === target.address ? '' : target.address
                  )
                }
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedUpiFilter === target.address
                    ? 'bg-sky-500/10 border-sky-500/30 shadow-[0_0_12px_rgba(56,189,248,0.1)]'
                    : 'bg-[#0b0d13]/70 border-white/[0.06] hover:border-white/15'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: target.color }}
                    />
                    <span className="text-xs font-medium text-slate-200">
                      {target.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {target.count} txns
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-400 truncate mb-1">
                  {target.address}
                </div>
                <div className="mt-2">
                  <FlipCounter value={target.total} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Transaction Card */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Highest Transaction
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Peak single payment in active filter:
            </p>
            <div className="p-3 rounded-xl bg-[#08090d]/80 border border-white/[0.06]">
              <FlipCounter value={metrics.highestTransaction} size="lg" />
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between text-xs text-slate-400">
            <span>Privacy Status</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Local Device
            </span>
          </div>
        </div>
      </section>

      {/* 6. Recent Activity Preview */}
      <section className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Recent Detected Transactions
            </h2>
          </div>
          <button
            onClick={onNavigateToTransactions}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors"
          >
            <span>View All Ledger</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No transactions detected yet. Click "Scan Messages" or add manually.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-4 hover:bg-white/[0.02] px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-mono text-slate-300">
                    ₹
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-200">
                        {tx.upiId}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          tx.source === 'auto_sms'
                            ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        }`}
                      >
                        {tx.source === 'auto_sms' ? 'SMS' : 'MANUAL'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {formatDisplayDate(tx.date)} at {formatDisplayTime(tx.time)}
                      {tx.referenceId && ` • Ref: ${tx.referenceId}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-sm font-semibold text-white">
                    ₹{formatINR(tx.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
