import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Transaction, TargetUpiId } from '../types';
import { FlipCounter } from './FlipCounter';
import { formatINR, formatDisplayDate } from '../utils/numberFormat';
import { BarChart3, TrendingUp, Calendar, Clock, PieChart, Layers } from 'lucide-react';

interface AnalyticsProps {
  transactions: Transaction[];
  targetUpiIds: TargetUpiId[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ transactions, targetUpiIds }) => {
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');

  // Core metrics
  const totalExpenditure = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const txCount = transactions.length;
  const avgTx = txCount > 0 ? Math.round(totalExpenditure / txCount) : 0;
  const maxTx = txCount > 0 ? Math.max(...transactions.map((t) => t.amount)) : 0;

  // Day breakdown (last 14 active days or recent days)
  const dayBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    const now = new Date();
    // Generate last 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      map.set(key, { total: 0, count: 0 });
    }

    transactions.forEach((tx) => {
      if (map.has(tx.date)) {
        const item = map.get(tx.date)!;
        item.total += tx.amount;
        item.count += 1;
      }
    });

    const list: { key: string; label: string; total: number; count: number }[] = [];
    map.forEach((val, key) => {
      const d = new Date(key);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      list.push({ key, label, total: val.total, count: val.count });
    });
    return list;
  }, [transactions]);

  // Week breakdown (last 6 calendar weeks)
  const weekBreakdown = useMemo(() => {
    const weeks: { label: string; total: number; count: number }[] = [];
    const now = new Date();

    for (let w = 5; w >= 0; w--) {
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7);
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (w + 1) * 7 + 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      let total = 0;
      let count = 0;

      transactions.forEach((tx) => {
        if (tx.timestamp >= start.getTime() && tx.timestamp <= end.getTime()) {
          total += tx.amount;
          count++;
        }
      });

      const label = `W-${5 - w === 0 ? 'Now' : `-${w}`}`;
      weeks.push({ label, total, count });
    }

    return weeks;
  }, [transactions]);

  // Month breakdown
  const monthBreakdown = useMemo(() => {
    const monthsMap = new Map<string, { total: number; count: number }>();
    const now = new Date();

    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsMap.set(key, { total: 0, count: 0 });
    }

    transactions.forEach((tx) => {
      const key = tx.date.substring(0, 7); // YYYY-MM
      if (monthsMap.has(key)) {
        const item = monthsMap.get(key)!;
        item.total += tx.amount;
        item.count++;
      }
    });

    const list: { key: string; label: string; total: number; count: number }[] = [];
    monthsMap.forEach((val, key) => {
      const parts = key.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      list.push({ key, label, total: val.total, count: val.count });
    });

    return list;
  }, [transactions]);

  // UPI recipient breakdown
  const upiDistribution = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    transactions.forEach((tx) => {
      const key = tx.upiId.toLowerCase();
      const cur = map.get(key) || { total: 0, count: 0 };
      cur.total += tx.amount;
      cur.count += 1;
      map.set(key, cur);
    });

    const list: { address: string; label: string; total: number; count: number; color: string; pct: number }[] =
      [];
    map.forEach((val, address) => {
      const target = targetUpiIds.find((t) => t.address.toLowerCase() === address);
      const label = target ? target.label : address;
      const color = target ? target.color : '#94a3b8';
      const pct = totalExpenditure > 0 ? (val.total / totalExpenditure) * 100 : 0;
      list.push({ address, label, total: val.total, count: val.count, color, pct });
    });

    return list.sort((a, b) => b.total - a.total);
  }, [transactions, targetUpiIds, totalExpenditure]);

  // Time-of-day spending distribution (Breakfast 7-11, Lunch 11-16, Tea/Snacks 16-19, Dinner 19-24)
  const timeOfDayStats = useMemo(() => {
    const buckets = [
      { label: 'Morning (Breakfast)', range: '07:00 - 11:00', total: 0, count: 0 },
      { label: 'Afternoon (Lunch)', range: '11:00 - 16:00', total: 0, count: 0 },
      { label: 'Evening (Tea & Snacks)', range: '16:00 - 19:30', total: 0, count: 0 },
      { label: 'Night (Dinner/Late)', range: '19:30 - 24:00', total: 0, count: 0 },
    ];

    transactions.forEach((tx) => {
      const hour = parseInt(tx.time.split(':')[0], 10) || 12;
      if (hour >= 7 && hour < 11) {
        buckets[0].total += tx.amount;
        buckets[0].count++;
      } else if (hour >= 11 && hour < 16) {
        buckets[1].total += tx.amount;
        buckets[1].count++;
      } else if (hour >= 16 && hour < 19.5) {
        buckets[2].total += tx.amount;
        buckets[2].count++;
      } else {
        buckets[3].total += tx.amount;
        buckets[3].count++;
      }
    });

    return buckets;
  }, [transactions]);

  // Current active dataset for chart
  const currentChartData =
    activeTab === 'day' ? dayBreakdown : activeTab === 'week' ? weekBreakdown : monthBreakdown;
  const maxChartVal = Math.max(...currentChartData.map((d) => d.total), 50);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Total Expenditure
          </span>
          <div className="mt-1">
            <FlipCounter value={totalExpenditure} size="md" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Transactions
          </span>
          <div className="mt-1 font-mono font-semibold text-base text-white">
            {txCount} <span className="text-xs text-slate-500 font-normal">total</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Average Size
          </span>
          <div className="mt-1">
            <FlipCounter value={avgTx} size="md" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block mb-1">
            Most Expensive
          </span>
          <div className="mt-1">
            <FlipCounter value={maxTx} size="md" />
          </div>
        </div>
      </div>

      {/* 2. Interactive Spending Rhythm (Day / Week / Month) */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Spending Distribution
            </h2>
          </div>

          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
            <button
              onClick={() => setActiveTab('day')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'day' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Day
            </button>
            <button
              onClick={() => setActiveTab('week')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'week' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Week
            </button>
            <button
              onClick={() => setActiveTab('month')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'month' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              By Month
            </button>
          </div>
        </div>

        {/* Minimal Liquid-Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="h-48 flex items-end gap-2 sm:gap-3 px-2 border-b border-white/[0.06]">
            {currentChartData.map((item, idx) => {
              const heightPct = Math.max(Math.round((item.total / maxChartVal) * 100), item.total > 0 ? 6 : 2);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 px-2 py-1 rounded bg-[#13161f] border border-white/10 text-[10px] font-mono text-white whitespace-nowrap shadow-lg">
                    ₹{formatINR(item.total)} ({item.count} txns)
                  </div>

                  {/* Fluid Vertical Bar */}
                  <div className="w-full max-w-[36px] bg-white/[0.02] rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.02 }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-sky-500/30 to-indigo-400/40 group-hover:from-sky-400/50 group-hover:to-indigo-300/60 transition-colors"
                    />
                  </div>

                  {/* Label */}
                  <span className="mt-2 text-[10px] font-mono text-slate-500 group-hover:text-slate-300 truncate w-full text-center">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Breakdown by UPI Destination & Meal Time Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recipient Share */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Share by UPI Recipient
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            {upiDistribution.map((dest) => (
              <div key={dest.address} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dest.color }} />
                    <span className="font-medium text-slate-200">{dest.label}</span>
                    <span className="text-[11px] text-slate-500 font-mono">({dest.address})</span>
                  </div>
                  <div className="font-mono text-slate-200 font-semibold">
                    ₹{formatINR(dest.total)}{' '}
                    <span className="text-slate-500 text-[10px] font-normal">
                      ({dest.pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Percentage progress bar */}
                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${dest.pct}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: dest.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Meal / Time-of-Day Trend */}
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Spending by Time of Day
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            {timeOfDayStats.map((bucket, idx) => {
              const pct = totalExpenditure > 0 ? (bucket.total / totalExpenditure) * 100 : 0;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-slate-200">{bucket.label}</span>
                      <span className="ml-1.5 text-[10px] font-mono text-slate-500">
                        {bucket.range}
                      </span>
                    </div>
                    <div className="font-mono text-slate-200 font-semibold">
                      ₹{formatINR(bucket.total)}{' '}
                      <span className="text-slate-500 text-[10px] font-normal">
                        ({bucket.count} txns)
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                      className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-sky-400/70"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
