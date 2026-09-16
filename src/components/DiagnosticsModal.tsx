import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanDiagnostic, TargetUpiId, Transaction } from '../types';
import { parseTransactionMessage, isDuplicateTransaction } from '../utils/parser';
import { formatINR } from '../utils/numberFormat';
import {
  X,
  Terminal,
  Clock,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Play,
  FileCode,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: ScanDiagnostic;
  targetUpiIds: TargetUpiId[];
  existingTransactions: Transaction[];
  onInjectAndScanMessage: (body: string, sender: string) => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  diagnostics,
  targetUpiIds,
  existingTransactions,
  onInjectAndScanMessage,
}) => {
  const [testSmsText, setTestSmsText] = useState(
    'Rs 65.00 debited from A/c **4921 on 16-Sep-24 to VPA canteen@upi (UPI Ref no 426099182736).'
  );
  const [testSender, setTestSender] = useState('VM-HDFCBK');
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestParser = () => {
    const mockMsg = {
      id: `test-${Date.now()}`,
      sender: testSender,
      body: testSmsText,
      timestamp: Date.now(),
      processed: false,
    };

    const res = parseTransactionMessage(mockMsg, targetUpiIds);
    let dupCheck = null;
    if (res.success && res.transaction) {
      dupCheck = isDuplicateTransaction(res.transaction, existingTransactions);
    }

    setTestResult({ ...res, dupCheck });
  };

  const handleInjectAndScan = () => {
    if (!testSmsText.trim()) return;
    onInjectAndScanMessage(testSmsText, testSender);
    onClose();
  };

  const samplePresets = [
    {
      label: 'HDFC Canteen',
      text: 'Rs 45.00 debited from a/c **1234 on 16-09-24 to VPA canteen@upi (UPI Ref no 426019283719).',
    },
    {
      label: 'SBI Canteen',
      text: 'Dear SBI User, your A/c ending 1234 has been debited by Rs.85.00 on 16/09/24 by UPI txn to canteen@upi ref no 426010294812.',
    },
    {
      label: 'GPay Chai',
      text: 'Paid ₹25 to chai@upi using State Bank of India **1234. UPI transaction ID: 425981293841.',
    },
    {
      label: 'Paytm Mess',
      text: 'Money sent: Rs.320 to mess@upi using Paytm Payments Bank A/c. UPI Ref: 425891238491.',
    },
    {
      label: 'ICICI Canteen',
      text: 'ICICI Bank Acct XX789 debited for Rs 160.00 on 16-Sep-24. Info: UPI/425901239841/canteen@upi/Lunch.',
    },
    {
      label: 'Ignored OTP',
      text: '492102 is your Secret OTP for online banking login at HDFC Bank. Do not share OTP with anyone.',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-[#0d0f16] border border-white/10 p-6 shadow-2xl z-10 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-semibold text-white tracking-wide">
                  Developer &amp; Parser Diagnostics
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 py-4 pr-1">
              {/* 1. Diagnostic Stats Cards */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Scanner Telemetry (Strictly Local)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">
                      Last Scan Time
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-200 mt-0.5 block">
                      {diagnostics.lastScanTime
                        ? new Date(diagnostics.lastScanTime).toLocaleTimeString('en-IN')
                        : 'Never'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">
                      Messages Scanned
                    </span>
                    <span className="font-mono text-xs font-semibold text-white mt-0.5 block">
                      {diagnostics.messagesScanned}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] text-emerald-400 uppercase font-mono block">
                      Transactions Detected
                    </span>
                    <span className="font-mono text-xs font-semibold text-emerald-300 mt-0.5 block">
                      {diagnostics.transactionsDetected}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block">
                      Messages Ignored
                    </span>
                    <span className="font-mono text-xs font-semibold text-slate-300 mt-0.5 block">
                      {diagnostics.ignoredCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] text-amber-400 uppercase font-mono block">
                      Duplicates Caught
                    </span>
                    <span className="font-mono text-xs font-semibold text-amber-300 mt-0.5 block">
                      {diagnostics.duplicateCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <span className="text-[10px] text-red-400 uppercase font-mono block">
                      Parsing Failures
                    </span>
                    <span className="font-mono text-xs font-semibold text-red-300 mt-0.5 block">
                      {diagnostics.failedParseCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Interactive SMS Parser Sandbox */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                      Live SMS Parser Sandbox
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Paste real SMS from phone
                  </span>
                </div>

                {/* Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {samplePresets.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTestSmsText(preset.text);
                        setTestResult(null);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] text-slate-300 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Sender Header (e.g. VM-HDFCBK)"
                      value={testSender}
                      onChange={(e) => setTestSender(e.target.value)}
                      className="w-1/3 px-2.5 py-1.5 rounded-lg bg-[#07080c] border border-white/10 text-xs font-mono text-white focus:outline-none"
                    />
                    <button
                      onClick={handleTestParser}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-xs font-medium text-sky-200 inline-flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>Test Parse Message</span>
                    </button>
                    <button
                      onClick={handleInjectAndScan}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-xs font-medium text-emerald-200 transition-colors"
                    >
                      <span>Inject &amp; Scan Now</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={testSmsText}
                    onChange={(e) => setTestSmsText(e.target.value)}
                    placeholder="Paste transaction SMS text..."
                    className="w-full p-2.5 rounded-xl bg-[#07080c] border border-white/10 font-mono text-xs text-slate-200 focus:outline-none focus:border-sky-400/50 leading-relaxed"
                  />
                </div>

                {/* Test Result Inspector */}
                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-[#07080c] border border-white/[0.08] text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">Parser Output:</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] ${
                          testResult.success
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : testResult.ignored
                            ? 'bg-slate-500/20 text-slate-400'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {testResult.success ? 'PARSED SUCCESSFULLY' : testResult.ignored ? 'IGNORED' : 'FAILED'}
                      </span>
                    </div>

                    {testResult.success && testResult.transaction && (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
                        <div>Amount: <span className="text-emerald-300 font-bold">₹{formatINR(testResult.transaction.amount)}</span></div>
                        <div>UPI ID: <span className="text-sky-300">{testResult.transaction.upiId}</span></div>
                        <div>Ref ID: <span className="text-amber-300">{testResult.transaction.referenceId || 'N/A'}</span></div>
                        <div>Extracted Date: <span>{testResult.transaction.date} {testResult.transaction.time}</span></div>
                        {testResult.dupCheck && (
                          <div className="col-span-2 text-[11px] pt-1 border-t border-white/5">
                            Duplicate check: {testResult.dupCheck.isDuplicate ? (
                              <span className="text-amber-400">⚠️ Duplicate detected! ({testResult.dupCheck.reason})</span>
                            ) : (
                              <span className="text-emerald-400">✅ New unique transaction</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {!testResult.success && (
                      <div className="text-red-400 text-[11px]">
                        Reason: {testResult.reason}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* 3. Scan Activity Logs */}
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                  Recent Scan Activity Logs
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {diagnostics.logs.length === 0 ? (
                    <div className="text-xs text-slate-500 italic p-3 text-center">
                      No scan activity logs recorded yet.
                    </div>
                  ) : (
                    diagnostics.logs.map((log) => {
                      const colors = {
                        success: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
                        ignored: 'text-slate-400 border-white/5 bg-white/[0.01]',
                        duplicate: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
                        parse_fail: 'text-red-400 border-red-500/20 bg-red-500/5',
                      };

                      return (
                        <div
                          key={log.id}
                          className={`p-2 rounded-lg border text-xs font-mono space-y-0.5 ${colors[log.type]}`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold uppercase tracking-wide">
                              [{log.type}]
                            </span>
                            <span className="text-slate-500">
                              {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                            </span>
                          </div>
                          <div className="text-slate-200 text-[11px]">{log.summary}</div>
                          <div className="text-slate-500 text-[10px] truncate">
                            {log.rawSnippet}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex justify-end">
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
