import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, Zap, ChevronRight, Globe, BarChart2 } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface TradeChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'forex' | 'binary') => void;
  currentMode?: 'forex' | 'binary';
}

export const TradeChoiceModal: React.FC<TradeChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  currentMode
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] sm:max-w-sm bg-white rounded-3xl shadow-2xl p-5 sm:p-6 text-gray-900 border border-gray-100 relative overflow-hidden"
          >
            {/* Top Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header: Logo & Clean Title */}
            <div className="flex flex-col items-center text-center space-y-2 pt-1 pb-4">
              <div className="p-2.5 rounded-2xl bg-gray-50 border border-gray-100 shadow-sm">
                <BrandLogo className="h-6 w-auto" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  Select Trading Terminal
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Choose your market mode to continue
                </p>
              </div>
            </div>

            {/* Centered Options: Binary & Forex */}
            <div className="space-y-3 pt-1">
              {/* 1. Forex Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectMode('forex');
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98] ${
                  currentMode === 'forex'
                    ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-gray-50/90 hover:bg-blue-50/50 border-gray-200 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
                    <BarChart2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                        Forex
                      </span>
                      {currentMode === 'forex' && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium">
                      Currencies, Commodities & Indices
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 group-hover:border-blue-400 flex items-center justify-center text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>

              {/* 2. Binary Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectMode('binary');
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.98] ${
                  currentMode === 'binary'
                    ? 'bg-amber-50/80 border-[#F5B301] shadow-md ring-2 ring-[#F5B301]/20'
                    : 'bg-gray-50/90 hover:bg-amber-50/50 border-gray-200 hover:border-[#F5B301]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#F5B301] to-amber-600 flex items-center justify-center text-gray-950 shadow-md shadow-[#F5B301]/25 shrink-0 group-hover:scale-105 transition-transform">
                    <Zap className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-gray-900 group-hover:text-amber-600 transition-colors">
                        Binary
                      </span>
                      {currentMode === 'binary' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium">
                      High-yield Fast Timeframe Contracts
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border border-gray-200 group-hover:border-[#F5B301] flex items-center justify-center text-gray-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            </div>

            {/* Subtle Footer */}
            <div className="pt-4 text-center">
              <span className="text-[11px] text-gray-400">
                Switch between Forex and Binary anytime
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
