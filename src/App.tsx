/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Transaction,
  RawMessage,
  AppSettings,
  ScanDiagnostic,
  TimeFilter,
} from './types';
import {
  initLocalDb,
  scanMessages,
  addManualTransaction,
  updateTransaction,
  deleteTransaction,
  resetToDefaults,
  injectRawMessage,
  saveStorage,
} from './utils/db';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TransactionLedger } from './components/TransactionLedger';
import { Analytics } from './components/Analytics';
import { SettingsView } from './components/SettingsView';
import { ManualTransactionModal } from './components/ManualTransactionModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { ExportModal } from './components/ExportModal';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

export default function App() {
  // Core application state
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'transactions' | 'analytics' | 'settings'>(
    'dashboard'
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [messages, setMessages] = useState<RawMessage[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<ScanDiagnostic | null>(null);

  // Scanning & background state
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState<{
    text: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Dashboard filter state
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedUpiFilter, setSelectedUpiFilter] = useState('');

  // Modals state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const showToast = useCallback(
    (text: string, type: 'success' | 'info' | 'warning' = 'info') => {
      setToast({ text, type });
      setTimeout(() => {
        setToast((current) => (current?.text === text ? null : current));
      }, 3500);
    },
    []
  );

  // Initialize DB on mount
  useEffect(() => {
    const data = initLocalDb();
    setTransactions(data.transactions);
    setMessages(data.messages);
    setSettings(data.settings);
    setDiagnostics(data.diagnostics);
  }, []);

  // Message scan execution
  const handleScan = useCallback(() => {
    if (!settings) return;
    setIsScanning(true);

    setTimeout(() => {
      try {
        const result = scanMessages(settings.targetUpiIds);
        setTransactions(result.allTransactions);
        setDiagnostics(result.diagnostics);

        if (result.stats.detected > 0) {
          showToast(
            `Scanned ${result.stats.scanned} SMS: Added ${result.stats.detected} new canteen transactions!`,
            'success'
          );
        } else if (result.stats.duplicates > 0) {
          showToast(
            `Scan complete: ${result.stats.duplicates} duplicates caught and ignored.`,
            'info'
          );
        } else {
          showToast('Inbox up to date. No new canteen transactions found.', 'info');
        }
      } catch (err) {
        console.error('Scan error:', err);
        showToast('Scan failed to complete.', 'warning');
      } finally {
        setIsScanning(false);
      }
    }, 400); // realistic slight mechanical feel
  }, [settings, showToast]);

  // Automatic Background Refresh Interval
  useEffect(() => {
    if (!settings?.autoScanEnabled) return;

    const intervalSec = Math.max(settings.autoScanIntervalSeconds || 30, 10);
    const timer = setInterval(() => {
      if (!isScanning) {
        handleScan();
      }
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [settings?.autoScanEnabled, settings?.autoScanIntervalSeconds, handleScan, isScanning]);

  // Save manual or edited transaction
  const handleSaveManual = (txData: {
    amount: number;
    date: string;
    time: string;
    upiId: string;
    referenceId?: string;
    notes?: string;
    category?: string;
  }) => {
    if (editingTransaction) {
      const updated: Transaction = {
        ...editingTransaction,
        ...txData,
      };
      const res = updateTransaction(updated);
      if (res.success) {
        setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        showToast('Transaction updated successfully.', 'success');
      }
    } else {
      const res = addManualTransaction(txData);
      if (res.success) {
        setTransactions((prev) => [res.transaction, ...prev]);
        if (res.isDuplicate) {
          showToast(`Recorded (Notice: Potential duplicate detected — ${res.reason})`, 'warning');
        } else {
          showToast('Manual transaction added to ledger.', 'success');
        }
      }
    }
    setEditingTransaction(null);
  };

  // Delete transaction
  const handleDeleteTx = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction from your local ledger?')) {
      const success = deleteTransaction(id);
      if (success) {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        showToast('Transaction removed from local ledger.', 'info');
      }
    }
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStorage('xf_settings_v1', newSettings);
    showToast('Settings saved locally.', 'success');
  };

  // Reset Data to defaults
  const handleResetData = () => {
    const reset = resetToDefaults();
    setTransactions(reset.transactions);
    setMessages(reset.messages);
    setSettings(reset.settings);
    setDiagnostics(reset.diagnostics);
    showToast('Database reset to default message feed.', 'info');
  };

  // Rescan all messages (clears processed state)
  const handleRescanAll = () => {
    if (!settings) return;
    setIsScanning(true);

    const rawMsgs = (messages.length > 0 ? messages : initLocalDb().messages).map((m) => ({
      ...m,
      processed: false,
    }));
    saveStorage('xf_raw_messages_v1', rawMsgs);
    setMessages(rawMsgs);

    setTimeout(() => {
      const result = scanMessages(settings.targetUpiIds);
      setTransactions(result.allTransactions);
      setDiagnostics(result.diagnostics);
      setIsScanning(false);
      showToast(
        `Re-scanned all messages: ${result.allTransactions.length} total active transactions recorded.`,
        'success'
      );
    }, 500);
  };

  // Inject SMS from sandbox and scan
  const handleInjectAndScan = (body: string, sender = 'Android SMS') => {
    if (!settings) return;
    injectRawMessage(body, sender);
    handleScan();
  };

  // Count unread raw messages
  const unprocessedCount = messages.filter((m) => !m.processed).length;

  if (!settings || !diagnostics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090d] text-slate-400 font-mono text-xs">
        Initializing local ledger...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-[#edf0f5] flex flex-col selection:bg-sky-500/20 selection:text-sky-300">
      {/* Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onScan={handleScan}
        isScanning={isScanning}
        onOpenManualEntry={() => {
          setEditingTransaction(null);
          setIsManualModalOpen(true);
        }}
        onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
        unprocessedCount={unprocessedCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        <AnimatePresence mode="wait">
          {currentTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Dashboard
                transactions={transactions}
                targetUpiIds={settings.targetUpiIds}
                selectedFilter={selectedFilter}
                onSelectFilter={setSelectedFilter}
                customStartDate={customStartDate}
                customEndDate={customEndDate}
                onChangeCustomDates={(start, end) => {
                  setCustomStartDate(start);
                  setCustomEndDate(end);
                }}
                selectedUpiFilter={selectedUpiFilter}
                onSelectUpiFilter={setSelectedUpiFilter}
                onNavigateToTransactions={() => setCurrentTab('transactions')}
                onOpenManualEntry={() => {
                  setEditingTransaction(null);
                  setIsManualModalOpen(true);
                }}
              />
            </motion.div>
          )}

          {currentTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <TransactionLedger
                transactions={transactions}
                targetUpiIds={settings.targetUpiIds}
                onEditTransaction={(tx) => {
                  setEditingTransaction(tx);
                  setIsManualModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTx}
                onOpenManualEntry={() => {
                  setEditingTransaction(null);
                  setIsManualModalOpen(true);
                }}
                onOpenExport={() => setIsExportModalOpen(true)}
              />
            </motion.div>
          )}

          {currentTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Analytics
                transactions={transactions}
                targetUpiIds={settings.targetUpiIds}
              />
            </motion.div>
          )}

          {currentTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <SettingsView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onResetData={handleResetData}
                onRescanAll={handleRescanAll}
                totalTransactionsCount={transactions.length}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Manual / Edit Transaction Modal */}
      <ManualTransactionModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveManual}
        editingTransaction={editingTransaction}
        targetUpiIds={settings.targetUpiIds}
      />

      {/* Developer Diagnostics & Parser Sandbox Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        diagnostics={diagnostics}
        targetUpiIds={settings.targetUpiIds}
        existingTransactions={transactions}
        onInjectAndScanMessage={handleInjectAndScan}
      />

      {/* Export Modal (CSV & PDF) */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        targetUpiIds={settings.targetUpiIds}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`fixed bottom-5 right-5 z-50 max-w-sm p-3.5 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-medium backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-[#0f1715]/90 border-emerald-500/30 text-emerald-200'
                : toast.type === 'warning'
                ? 'bg-[#18140f]/90 border-amber-500/30 text-amber-200'
                : 'bg-[#0f121a]/90 border-sky-500/30 text-sky-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
            <span>{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
