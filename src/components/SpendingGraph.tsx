import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Transaction } from '../types';
import { formatINR, formatDisplayDate } from '../utils/numberFormat';

interface SpendingGraphProps {
  transactions: Transaction[];
  selectedUpiFilter?: string;
}

interface DayData {
  day: number;
  dateStr: string;
  total: number;
  count: number;
}

export const SpendingGraph: React.FC<SpendingGraphProps> = ({
  transactions,
  selectedUpiFilter,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<DayData | null>(null);

  // Compute daily spending for the current month
  const { dailyData, maxSpent, currentMonthName, totalMonthSpent } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const currentMonthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Filter transactions to current month & optional UPI
    const monthTxs = transactions.filter((t) => {
      const parts = t.date.split('-');
      if (parts.length < 3) return false;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const matchesMonth = y === currentYear && m === currentMonth;
      const matchesUpi = !selectedUpiFilter || t.upiId.toLowerCase() === selectedUpiFilter.toLowerCase();
      return matchesMonth && matchesUpi;
    });

    const dayMap = new Map<number, { total: number; count: number }>();
    for (let d = 1; d <= daysInMonth; d++) {
      dayMap.set(d, { total: 0, count: 0 });
    }

    let totalMonthSpent = 0;
    monthTxs.forEach((t) => {
      const d = parseInt(t.date.split('-')[2], 10);
      if (dayMap.has(d)) {
        const cur = dayMap.get(d)!;
        cur.total += t.amount;
        cur.count += 1;
        totalMonthSpent += t.amount;
      }
    });

    const dailyData: DayData[] = [];
    let max = 100; // minimum ceiling
    for (let d = 1; d <= daysInMonth; d++) {
      const { total, count } = dayMap.get(d)!;
      if (total > max) max = total;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyData.push({ day: d, dateStr, total, count });
    }

    return { dailyData, maxSpent: max, currentMonthName, totalMonthSpent };
  }, [transactions, selectedUpiFilter]);

  // SVG dimensions
  const width = 800;
  const height = 180;
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 30;

  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingTop - paddingBottom;

  // Calculate coordinates
  const points = useMemo(() => {
    return dailyData.map((d, index) => {
      const x = paddingX + (index / (dailyData.length - 1)) * graphWidth;
      const y = paddingTop + graphHeight - (d.total / (maxSpent * 1.15)) * graphHeight;
      return { x, y, data: d };
    });
  }, [dailyData, maxSpent, graphWidth, graphHeight]);

  // Construct smooth cubic bezier path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length < 2) return { linePath: '', areaPath: '' };

    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlX = (current.x + next.x) / 2;
      line += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    const last = points[points.length - 1];
    const first = points[0];
    const area = `${line} L ${last.x} ${paddingTop + graphHeight} L ${first.x} ${paddingTop + graphHeight} Z`;

    return { linePath: line, areaPath: area };
  }, [points, paddingTop, graphHeight]);

  return (
    <div className="relative rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-5 overflow-hidden">
      {/* Background fluid glow */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-sky-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Daily Flow — {currentMonthName}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            (Total: ₹{formatINR(totalMonthSpent)})
          </span>
        </div>

        {/* Hovered point detail */}
        <div className="h-5">
          {hoveredPoint ? (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 text-xs font-mono text-sky-300"
            >
              <span>{formatDisplayDate(hoveredPoint.dateStr)}:</span>
              <span className="font-semibold text-white">₹{formatINR(hoveredPoint.total)}</span>
              <span className="text-slate-400">({hoveredPoint.count} txns)</span>
            </motion.span>
          ) : (
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              Hover to inspect daily spending
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas with Fluid Flow Path */}
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 select-none touch-none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Fluid Vertical Gradient Fill */}
            <linearGradient id="liquidFlowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#08090d" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="liquidLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>

          {/* Horizontal guidelines */}
          <line
            x1={paddingX}
            y1={paddingTop}
            x2={width - paddingX}
            y2={paddingTop}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={paddingTop + graphHeight / 2}
            x2={width - paddingX}
            y2={paddingTop + graphHeight / 2}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={paddingTop + graphHeight}
            x2={width - paddingX}
            y2={paddingTop + graphHeight}
            stroke="rgba(255,255,255,0.08)"
          />

          {/* Liquid area path */}
          <motion.path
            d={areaPath}
            fill="url(#liquidFlowGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Fluid curve line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="url(#liquidLineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          />

          {/* Data Points and Interaction Circles */}
          {points.map((pt, idx) => {
            const hasSpending = pt.data.total > 0;
            const isHovered = hoveredPoint?.day === pt.data.day;

            return (
              <g key={idx}>
                {hasSpending && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 4.5 : 2.5}
                    fill={isHovered ? '#ffffff' : '#38bdf8'}
                    stroke="#08090d"
                    strokeWidth="1.5"
                    className="transition-all duration-200"
                  />
                )}

                {/* Invisible wider hit target for smooth hover */}
                <rect
                  x={pt.x - graphWidth / (dailyData.length * 2)}
                  y={0}
                  width={graphWidth / dailyData.length}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt.data)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* X Axis Day Labels */}
          {points
            .filter((p) => p.data.day === 1 || p.data.day % 5 === 0 || p.data.day === dailyData.length)
            .map((p, idx) => (
              <text
                key={idx}
                x={p.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fill="#64748b"
              >
                {p.data.day}
              </text>
            ))}
        </svg>
      </div>
    </div>
  );
};
