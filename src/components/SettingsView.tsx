import React, { useState } from 'react';
import { TargetUpiId, AppSettings } from '../types';
import {
  Plus,
  Trash2,
  Check,
  Shield,
  Smartphone,
  HardDrive,
  RefreshCw,
  Info,
  Sliders,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onResetData: () => void;
  onRescanAll: () => void;
  totalTransactionsCount: number;
}

const COLOR_PRESETS = [
  '#38bdf8', // sky
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f472b6', // pink
  '#a78bfa', // purple
  '#fb923c', // orange
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
  onRescanAll,
  totalTransactionsCount,
}) => {
  const [newUpiAddress, setNewUpiAddress] = useState('');
  const [newUpiLabel, setNewUpiLabel] = useState('');
  const [newUpiColor, setNewUpiColor] = useState(COLOR_PRESETS[0]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleAddUpi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUpiAddress.trim()) return;

    let address = newUpiAddress.trim().toLowerCase();
    if (!address.includes('@')) {
      address = `${address}@upi`;
    }

    const label = newUpiLabel.trim() || address.split('@')[0].toUpperCase();

    const newTarget: TargetUpiId = {
      id: `upi-${Date.now()}`,
      address,
      label,
      color: newUpiColor,
      active: true,
    };

    onUpdateSettings({
      ...settings,
      targetUpiIds: [...settings.targetUpiIds, newTarget],
    });

    setNewUpiAddress('');
    setNewUpiLabel('');
  };

  const handleToggleUpi = (id: string) => {
    const updated = settings.targetUpiIds.map((t) =>
      t.id === id ? { ...t, active: !t.active } : t
    );
    onUpdateSettings({ ...settings, targetUpiIds: updated });
  };

  const handleDeleteUpi = (id: string) => {
    if (settings.targetUpiIds.length <= 1) {
      alert('You must have at least one target UPI ID configured.');
      return;
    }
    const updated = settings.targetUpiIds.filter((t) => t.id !== id);
    onUpdateSettings({ ...settings, targetUpiIds: updated });
  };

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* 1. Target UPI ID Configuration */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Target UPI Recipients
            </h2>
            <p className="text-xs text-slate-400">
              Configure UPI addresses (e.g. <code className="text-sky-300">canteen@upi</code>, <code className="text-sky-300">mess@upi</code>). Only debit transactions sent to these IDs will be recorded.
            </p>
          </div>
        </div>

        {/* List of Configured UPI IDs */}
        <div className="space-y-2">
          {settings.targetUpiIds.map((target) => (
            <div
              key={target.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={target.active}
                  onChange={() => handleToggleUpi(target.id)}
                  className="w-4 h-4 rounded bg-[#090b10] border-white/20 text-sky-500 focus:ring-0 focus:outline-none cursor-pointer"
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: target.color }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      {target.label}
                    </span>
                    {!target.active && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-500">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-sky-400">
                    {target.address}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteUpi(target.id)}
                  title="Remove UPI ID"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New UPI ID Form */}
        <form onSubmit={handleAddUpi} className="p-4 rounded-xl bg-[#090b10] border border-white/[0.08] space-y-3">
          <span className="text-xs font-medium text-slate-300 block">
            Add New Target UPI ID
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              placeholder="e.g. canteen@upi"
              value={newUpiAddress}
              onChange={(e) => setNewUpiAddress(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />
            <input
              type="text"
              placeholder="Label (e.g. Campus Mess)"
              value={newUpiLabel}
              onChange={(e) => setNewUpiLabel(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
            />

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                {COLOR_PRESETS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setNewUpiColor(color)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      newUpiColor === color ? 'scale-125 ring-2 ring-white/60' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/30 text-xs font-medium inline-flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Message Scanning Settings */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Scanning & Refresh Mechanism
          </h2>
        </div>

        <div className="space-y-4 pt-1">
          {/* Automatic Refresh Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <div className="text-xs font-semibold text-slate-200">
                Automatic Background Refresh
              </div>
              <div className="text-[11px] text-slate-400">
                Periodically scan for newly arrived SMS transaction messages without manual action.
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoScanEnabled}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, autoScanEnabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* Refresh Frequency */}
          {settings.autoScanEnabled && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <span className="text-xs text-slate-300">Scan Frequency Interval</span>
              <select
                value={settings.autoScanIntervalSeconds}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    autoScanIntervalSeconds: parseInt(e.target.value, 10),
                  })
                }
                className="px-3 py-1 rounded-lg bg-[#090b10] border border-white/10 text-xs text-slate-200 focus:outline-none"
              >
                <option value={15}>Every 15 seconds</option>
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 1 minute</option>
                <option value={120}>Every 2 minutes</option>
              </select>
            </div>
          )}

          {/* Re-scan All Button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-400">
              Added new target UPI IDs? Re-scan existing inbox to extract missed past transactions.
            </div>
            <button
              onClick={onRescanAll}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 inline-flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Re-scan Messages</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Privacy & Permission Information (macOS & Android) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            100% Local Privacy & Permission Guide
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-400">
          {/* Android Permissions Card */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Android Message Access</span>
            </div>
            <p>
              On Android, SMS access is protected by the <code className="text-sky-300">READ_SMS</code> and <code className="text-sky-300">RECEIVE_SMS</code> permissions.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>XpenseFlow reads transaction SMS in <strong>read-only mode</strong>.</li>
              <li>Never alters, sends, or deletes anything in your messaging database.</li>
              <li>All parsing runs on-device using local regular expression patterns.</li>
              <li>Zero network egress: no telemetry, no cloud servers.</li>
            </ul>
          </div>

          {/* macOS Full Disk Access Card */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>macOS Full Disk Access</span>
            </div>
            <p>
              When running on macOS or reading the native Messages database (<code className="text-indigo-300 font-mono text-[11px]">~/Library/Messages/chat.db</code>):
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>macOS requires <strong>Full Disk Access</strong> in System Settings &gt; Privacy &amp; Security.</li>
              <li>This allows read-only SQLite connection to parse UPI messages.</li>
              <li>The connection is strictly opened with SQLite URI <code className="text-indigo-300">immutable=1</code> (read-only) flag to guarantee message integrity.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Local Storage Location & Diagnostics */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Data Storage & Reset
            </h2>
            <p className="text-xs text-slate-400">
              All transactions are stored strictly in client-side persistent storage on this device.
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {totalTransactionsCount} Local Records
          </span>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-white/[0.06]">
          <div className="text-xs text-slate-400">
            Reset database to default initial message feeds and wipe custom edits.
          </div>

          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Database</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300">Are you sure?</span>
              <button
                onClick={() => {
                  onResetData();
                  setShowResetConfirm(false);
                }}
                className="px-2.5 py-1 rounded-lg text-xs bg-red-600 text-white hover:bg-red-700"
              >
                Yes, Reset
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-2.5 py-1 rounded-lg text-xs bg-white/10 text-slate-300 hover:bg-white/20"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
