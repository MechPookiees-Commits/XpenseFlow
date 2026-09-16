import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div className="flex items-center gap-2.5 select-none group">
      {/* Clean, Simple, Aesthetic Dark Themed XF Emblem */}
      <div
        className={`relative ${iconSizes[size]} rounded-xl flex items-center justify-center font-mono font-bold tracking-tighter text-slate-100 bg-gradient-to-br from-[#1a1d27] via-[#10131a] to-[#0a0c11] border border-white/10 shadow-[0_0_15px_rgba(56,189,248,0.07)] transition-all duration-300 group-hover:border-white/20 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]`}
      >
        {/* Subtle internal liquid flow accent ring */}
        <div className="absolute inset-0 rounded-xl bg-radial from-sky-500/10 via-transparent to-transparent opacity-80" />

        {/* Text Glyph "XF" */}
        <span className="relative z-10 flex items-center">
          <span className="text-slate-100">X</span>
          <span className="text-sky-400 font-light ml-[0.5px]">F</span>
        </span>

        {/* Fluid corner micro-dot */}
        <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-emerald-400/80 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm md:text-base font-semibold tracking-tight text-white">
              Xpense<span className="text-sky-400 font-medium">Flow</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white/5 border border-white/10 text-slate-400">
              LOCAL
            </span>
          </div>
          <span className="text-[11px] text-slate-500 tracking-wide font-normal">
            Canteen Expense Ledger
          </span>
        </div>
      )}
    </div>
  );
};
