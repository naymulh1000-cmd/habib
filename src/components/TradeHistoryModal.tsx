import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  X,
  Search,
  Filter
} from 'lucide-react';
import { ActiveTrade, AccountType } from '../types';
import { TradeHistoryList } from './TradeHistoryList';

interface TradeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  closedTrades: ActiveTrade[];
  activeAccount?: AccountType;
  userEmail?: string;
  initialMode?: 'forex' | 'otc';
}

export const TradeHistoryModal: React.FC<TradeHistoryModalProps> = ({
  isOpen,
  onClose,
  closedTrades,
  activeAccount,
  userEmail,
  initialMode = 'otc'
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        key="trade-history-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          key="trade-history-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.16 }}
          className="w-full max-w-3xl bg-[#0B0F1A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[88vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-[#0F1423] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#F5B301]/10 border border-[#F5B301]/30 text-[#F5B301]">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-2">
                  <span>Trade History</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black uppercase">
                    Audit Log
                  </span>
                </h2>
                <p className="text-[10px] text-gray-400">
                  Click any trade row to view full price execution & settlement breakdown
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Trade History List Container (fits 8-9 items directly, scrollable for remainder) */}
          <div className="p-3 sm:p-4 overflow-hidden flex flex-col flex-1">
            <TradeHistoryList
              trades={closedTrades}
              activeAccount={activeAccount}
              initialMode={initialMode}
              showModeSwitch={true}
              maxContainerHeight="max-h-[55vh]"
            />
          </div>

          {/* Footer info */}
          <div className="px-4 py-2.5 bg-[#0F1423] border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400 shrink-0 font-mono">
            <span>Total Records: {closedTrades.length}</span>
            <span className="text-emerald-400 font-bold">● Permanent Storage Sync</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
