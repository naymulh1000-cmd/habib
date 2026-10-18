import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Pencil, RotateCcw, Check, Sparkles, ShieldCheck, DollarSign } from 'lucide-react';

interface EditDemoBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSave: (newBalance: number) => void;
}

const PRESET_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];

export const EditDemoBalanceModal: React.FC<EditDemoBalanceModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onSave,
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(String(currentBalance || 10000));
      setError(null);
    }
  }, [isOpen, currentBalance]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const num = parseFloat(inputValue.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount greater than $0');
      return;
    }
    if (num > 10000000) {
      setError('Maximum demo balance is $10,000,000 USD');
      return;
    }

    onSave(Number(num.toFixed(2)));
    onClose();
  };

  const handlePresetSelect = (amt: number) => {
    setInputValue(String(amt));
    setError(null);
  };

  const handleResetDefault = () => {
    setInputValue('10000');
    setError(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        {/* Backdrop dismiss */}
        <div
          className="fixed inset-0"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#0D1220] border border-[#F5B301]/40 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 z-10 text-white"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-900/90 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5B301]/15 border border-[#F5B301]/40 flex items-center justify-center text-[#F5B301] shrink-0 shadow-inner">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                  Edit Demo Balance
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#F5B301]/20 text-[#F5B301] border border-[#F5B301]/40">
                  Virtual Wallet
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Set custom practice capital. Persists permanently across sessions.
              </p>
            </div>
          </div>

          {/* Current Balance Display Banner */}
          <div className="p-3 rounded-xl bg-gray-950/80 border border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Current Demo Balance</span>
            <span className="text-base font-black font-mono text-[#F5B301]">
              ${(currentBalance || 10000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Numeric Input Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>New Balance Amount (USD)</span>
              <button
                type="button"
                onClick={handleResetDefault}
                className="text-[10px] text-[#F5B301] hover:underline flex items-center gap-1 cursor-pointer font-normal"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset $10,000</span>
              </button>
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <DollarSign className="w-5 h-5 text-[#F5B301]" />
              </div>
              <input
                type="number"
                step="any"
                min="1"
                max="10000000"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirm();
                  }
                }}
                placeholder="10000"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950 border border-white/20 focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] text-white font-mono text-lg font-bold outline-none transition-all"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 font-medium mt-1">
                {error}
              </p>
            )}
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Quick Preset Amounts
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = parseFloat(inputValue) === amt;
                return (
                  <button
                    key={`preset-${amt}`}
                    type="button"
                    onClick={() => handlePresetSelect(amt)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border text-center ${
                      isSelected
                        ? 'bg-[#F5B301] text-gray-950 border-[#F5B301] shadow-md shadow-[#F5B301]/20 scale-105'
                        : 'bg-gray-900/90 text-gray-300 border-white/10 hover:border-[#F5B301]/50 hover:text-white'
                    }`}
                  >
                    ${amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strict Isolation Notice */}
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-200/90 leading-tight">
              <strong>Strict Scope:</strong> This edit applies <span className="text-white font-bold underline">only</span> to the Virtual Demo Wallet. Your Live and Bonus balances remain 100% secure and untouched.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#F5B301] hover:bg-[#ffc21a] text-gray-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-[#F5B301]/25 hover:shadow-[#F5B301]/40 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Save</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
