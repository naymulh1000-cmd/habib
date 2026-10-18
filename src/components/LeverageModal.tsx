import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Gauge, ShieldCheck, Zap, AlertCircle, ArrowUpRight } from 'lucide-react';
import { getMarketContractUnits } from '../lib/marketConfig';

interface LeverageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLeverage: number;
  onSelectLeverage: (newLeverage: number) => void;
  balance: number;
  floatingPnl: number;
  activeLotSize: number;
  currentPrice: number;
  symbol: string;
  activeAccount?: string;
  openTradesTotalMargin?: number;
}

export const LEVERAGE_OPTIONS = [
  {
    value: 100,
    label: '1:100',
    desc: 'Standard Margin (Conservative)',
    badge: 'Standard',
    color: 'border-blue-500/40 text-blue-300',
    activeBg: 'bg-blue-600/20 border-blue-500',
  },
  {
    value: 200,
    label: '1:200',
    desc: 'Moderate Margin (Recommended)',
    badge: 'Moderate',
    color: 'border-cyan-500/40 text-cyan-300',
    activeBg: 'bg-cyan-600/20 border-cyan-500',
  },
  {
    value: 500,
    label: '1:500',
    desc: 'High Leverage (Flexible Margin)',
    badge: 'Popular',
    color: 'border-emerald-500/40 text-emerald-300',
    activeBg: 'bg-emerald-600/20 border-emerald-500',
  },
  {
    value: 1000,
    label: '1:1000',
    desc: 'Ultra High Leverage (Low Margin)',
    badge: 'Pro Trader',
    color: 'border-purple-500/40 text-purple-300',
    activeBg: 'bg-purple-600/20 border-purple-500',
  },
  {
    value: 2000,
    label: '1:2000',
    desc: 'Maximum Leverage (Lowest Margin)',
    badge: 'Maximum',
    color: 'border-amber-500/40 text-amber-300',
    activeBg: 'bg-amber-600/25 border-amber-500 shadow-amber-500/20',
  },
];

export const LeverageModal: React.FC<LeverageModalProps> = ({
  isOpen,
  onClose,
  currentLeverage,
  onSelectLeverage,
  balance,
  floatingPnl,
  activeLotSize,
  currentPrice,
  symbol,
  activeAccount = 'live',
  openTradesTotalMargin = 0,
}) => {
  const [selectedLeverage, setSelectedLeverage] = useState<number>(currentLeverage || 100);

  useEffect(() => {
    if (isOpen) {
      setSelectedLeverage(currentLeverage || 100);
    }
  }, [isOpen, currentLeverage]);

  if (!isOpen) return null;

  const contractUnits = getMarketContractUnits(symbol);
  const safeLot = Math.max(0.01, activeLotSize || 0.10);
  const safePrice = currentPrice > 0 ? currentPrice : 1.0;

  // Real-time calculations based on selected leverage
  const requiredMargin = Number(((safePrice * contractUnits * safeLot) / selectedLeverage).toFixed(2));
  const equity = Number((Math.max(0, balance + floatingPnl)).toFixed(2));
  
  // Recalculate used margin proportionally to selected leverage vs base
  const leverageRatio = currentLeverage > 0 ? (currentLeverage / selectedLeverage) : 1;
  const estimatedUsedMargin = Number((openTradesTotalMargin * leverageRatio).toFixed(2));
  const freeMargin = Number((Math.max(0, equity - estimatedUsedMargin)).toFixed(2));
  const marginLevel = estimatedUsedMargin > 0 ? ((equity / estimatedUsedMargin) * 100) : 0;

  const handleConfirm = () => {
    onSelectLeverage(selectedLeverage);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-gray-950/95 border border-white/15 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-gray-900 to-gray-950">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Leverage Settings</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold border border-blue-500/30">
                    1:{selectedLeverage}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  Select leverage ratio for {activeAccount.toUpperCase()} account
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
            {/* Real-time Margin Preview Dashboard */}
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-950 rounded-xl p-3.5 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] border-b border-white/5 pb-2">
                <span className="text-gray-400 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Account Equity
                </span>
                <span className="font-mono font-black text-white text-xs">${equity.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                  <span className="text-gray-400 block text-[10px]">Required Margin ({safeLot} Lot)</span>
                  <span className="font-mono font-black text-amber-300 text-xs">${requiredMargin.toFixed(2)}</span>
                </div>
                <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                  <span className="text-gray-400 block text-[10px]">Free Margin</span>
                  <span className="font-mono font-black text-emerald-400 text-xs">${freeMargin.toFixed(2)}</span>
                </div>
                <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                  <span className="text-gray-400 block text-[10px]">Used Margin</span>
                  <span className="font-mono font-bold text-gray-300 text-xs">${estimatedUsedMargin.toFixed(2)}</span>
                </div>
                <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                  <span className="text-gray-400 block text-[10px]">Margin Level</span>
                  <span className="font-mono font-black text-cyan-300 text-xs">
                    {estimatedUsedMargin > 0 ? `${marginLevel.toFixed(1)}%` : '∞ Safe'}
                  </span>
                </div>
              </div>
            </div>

            {/* Leverage Tier Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Choose Leverage Ratio
              </label>

              <div className="space-y-2">
                {LEVERAGE_OPTIONS.map((opt) => {
                  const isSelected = selectedLeverage === opt.value;
                  const reqMarginForOpt = Number(((safePrice * contractUnits * safeLot) / opt.value).toFixed(2));

                  return (
                    <button
                      key={`lev-${opt.value}`}
                      type="button"
                      onClick={() => setSelectedLeverage(opt.value)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? `${opt.activeBg} border-blue-500 shadow-md`
                          : 'bg-gray-900/50 hover:bg-gray-900 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-blue-400 bg-blue-500 text-white'
                              : 'border-gray-600 bg-transparent'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white font-mono">
                              {opt.label}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${opt.color} bg-white/5`}>
                              {opt.badge}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 block">
                            {opt.desc}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] text-gray-400 block">Req. Margin</span>
                        <span className="text-xs font-bold text-amber-300">
                          ${reqMarginForOpt.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Risk Notice */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Higher leverage (e.g. 1:1000 or 1:2000) significantly lowers the required margin per trade, giving you greater purchasing power. Use responsible risk management.
              </span>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 border-t border-white/10 bg-gray-900/60 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Confirm 1:{selectedLeverage}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
