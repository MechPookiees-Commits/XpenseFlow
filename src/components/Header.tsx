import React from 'react';
import { Logo } from './Logo';
import { RefreshCw, Plus, ShieldCheck, Terminal, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface HeaderProps {
  currentTab: 'dashboard' | 'transactions' | 'analytics' | 'settings';
  onSelectTab: (tab: 'dashboard' | 'transactions' | 'analytics' | 'settings') => void;
  onScan: () => void;
  isScanning: boolean;
  onOpenManualEntry: () => void;
  onOpenDiagnostics: () => void;
  unprocessedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onScan,
  isScanning,
  onOpenManualEntry,
  onOpenDiagnostics,
  unprocessedCount,
}) => {
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard' },
    { id: 'transactions' as const, label: 'Transactions' },
    { id: 'analytics' as const, label: 'Analytics' },
    { id: 'settings' as const, label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#08090d]/80 border-b border-white/[0.06] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Logo size="md" />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 rounded-lg bg-white/[0.08] border border-white/10 shadow-sm"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Privacy & Diagnostics indicator */}
          <button
            id="header-diagnostics-btn"
            onClick={onOpenDiagnostics}
            title="Open Diagnostics & Sandbox"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Diagnostics</span>
          </button>

          {/* Manual Entry Button */}
          <button
            id="header-manual-entry-btn"
            onClick={onOpenManualEntry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] transition-all hover:border-white/20 active:scale-98"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>

          {/* Scan Messages Button */}
          <button
            id="header-scan-messages-btn"
            onClick={onScan}
            disabled={isScanning}
            className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 border border-sky-500/30 hover:border-sky-400/50 shadow-[0_0_12px_rgba(56,189,248,0.15)] transition-all active:scale-98 disabled:opacity-60`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-sky-400 ${isScanning ? 'animate-spin' : ''}`}
            />
            <span>{isScanning ? 'Scanning...' : 'Scan Messages'}</span>

            {unprocessedCount > 0 && !isScanning && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-white/[0.05] px-2 py-1.5 bg-[#08090d]">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                isActive ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
