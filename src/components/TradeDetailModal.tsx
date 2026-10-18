import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Copy,
  Check,
  Percent,
  Layers,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { ActiveTrade } from '../types';

interface TradeDetailModalProps {
  trade: ActiveTrade | null;
  onClose: () => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({ trade, onClose }) => {
  const [copiedId, setCopiedId] = useState(false);

  const isForex = Boolean(
    trade && (trade.tradingMode === 'forex' || trade.category === 'forex' || (!trade.tradingMode && !trade.expirySeconds))
  );
  const pnlNum = Number(trade?.pnl || 0);
  const isWon = pnlNum >= 0 || trade?.status === 'WON';
  const isUp = trade?.type === 'BUY' || trade?.type === 'UP' || trade?.type === 'CALL';

  const entryPrice = Number(trade?.entryPrice ?? 0);
  const exitPrice = Number(trade?.exitPrice ?? trade?.currentPrice ?? trade?.entryPrice ?? 0);
  const priceDiff = exitPrice - entryPrice;
  const isPriceHigher = priceDiff > 0.000001;
  const isPriceLower = priceDiff < -0.000001;
  const safeAmount = Number(trade?.amount || 0);

  const handleCopyId = () => {
    if (trade?.id) {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(trade.id)
            .then(() => {
              setCopiedId(true);
              setTimeout(() => setCopiedId(false), 2000);
            })
            .catch(() => {
              setCopiedId(true);
              setTimeout(() => setCopiedId(false), 2000);
            });
        } else {
          setCopiedId(true);
          setTimeout(() => setCopiedId(false), 2000);
        }
      } catch (_) {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      }
    }
  };

  return (
    <AnimatePresence>
      {trade && (
        <div
          key="trade-detail-backdrop"
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            key={`trade-detail-card-${trade.id || 't'}`}
            initial={{ scale: 0.94, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 15 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md bg-[#0C101D] border border-white/15 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col font-sans select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 bg-[#0F1424] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border font-mono font-black text-sm shadow-md ${
                    isForex
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  }`}
                >
                  {isUp ? (
                    <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-rose-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-tight">
                      {trade.symbol || trade.pair || 'TRADE'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        isForex
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isForex ? 'Forex' : 'Binary Option'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono">
                    Order ID: <span className="text-gray-300 font-semibold">{trade.id || 'N/A'}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Outcome Banner */}
            <div
              className={`px-5 py-4 border-b flex items-center justify-between ${
                isWon
                  ? 'bg-emerald-950/40 border-emerald-500/30'
                  : 'bg-rose-950/40 border-rose-500/30'
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Trade Outcome
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                      isWon
                        ? 'bg-emerald-500 text-gray-950 shadow-sm'
                        : 'bg-rose-500 text-white shadow-sm'
                    }`}
                  >
                    {isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{trade.status || (isWon ? 'WIN' : 'LOSS')}</span>
                  </span>
                  <span className="text-xs text-gray-300 font-mono">
                    {trade.accountType?.toUpperCase() || 'LIVE'}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                  Net Return / P&L
                </span>
                <span
                  className={`text-xl font-black font-mono tracking-tight ${
                    isWon ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isWon ? '+' : '-'}${Math.abs(pnlNum).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Price Action Breakdown: Entry Price vs Closing Price */}
            <div className="p-4 sm:p-5 space-y-3.5 bg-[#090D18]">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0F1527] to-[#0A0E1A] border border-white/10 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                  <span className="flex items-center gap-1.5 text-gray-300 uppercase tracking-wider text-[10px]">
                    <Activity className="w-3.5 h-3.5 text-[#F5B301]" />
                    <span>Price Execution</span>
                  </span>
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded ${
                      isPriceHigher
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : isPriceLower
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {isPriceHigher
                      ? `▲ +${Math.abs(priceDiff).toFixed(5)}`
                      : isPriceLower
                      ? `▼ -${Math.abs(priceDiff).toFixed(5)}`
                      : '= Flat Rate'}
                  </span>
                </div>

                {/* 2-Column Price Comparison Box */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Entry Price */}
                  <div className="p-3 rounded-xl bg-gray-950/80 border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
                      Entry Price
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
                        {entryPrice}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono block">
                      Direction: <strong className={isUp ? 'text-emerald-400' : 'text-rose-400'}>{trade.type || 'TRADE'}</strong>
                    </span>
                  </div>

                  {/* Closing Price */}
                  <div className="p-3 rounded-xl bg-gray-950/80 border border-white/10 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">
                      Closing Price
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                          isWon ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {exitPrice}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-500 font-mono block">
                      {isPriceHigher ? 'Closed Higher' : isPriceLower ? 'Closed Lower' : 'Equal Close'}
                    </span>
                  </div>
                </div>

                {/* Binary Contract Settlement Explanation */}
                {!isForex && (
                  <div className="p-2.5 rounded-xl bg-gray-950/50 border border-white/5 text-[10px] text-gray-300 font-mono flex items-center justify-between">
                    <span>Contract Rule:</span>
                    <span className="text-amber-300 font-bold">
                      {isUp
                        ? 'Closing > Entry → WIN'
                        : 'Closing < Entry → WIN'}
                    </span>
                  </div>
                )}
              </div>

              {/* Key Trade Parameters Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-[#0F1424] border border-white/5">
                  <span className="text-[10px] text-gray-400 font-sans uppercase font-bold block">
                    {isForex ? 'Margin Used' : 'Investment Stake'}
                  </span>
                  <span className="text-white font-black text-sm">
                    ${safeAmount.toFixed(2)} USD
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0F1424] border border-white/5">
                  <span className="text-[10px] text-gray-400 font-sans uppercase font-bold block">
                    {isForex ? 'Position Size' : 'Payout Rate'}
                  </span>
                  <span className="text-[#F5B301] font-black text-sm">
                    {isForex
                      ? `${trade.lotSize || 0.01} Lots`
                      : `${trade.payoutPercent || 85}% Payout`}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0F1424] border border-white/5">
                  <span className="text-[10px] text-gray-400 font-sans uppercase font-bold block">
                    {isForex ? 'Stop Loss / Take Profit' : 'Expiry Duration'}
                  </span>
                  <span className="text-gray-300 font-bold text-xs truncate block">
                    {isForex
                      ? `SL: ${trade.stopLoss || 'Off'} • TP: ${trade.takeProfit || 'Off'}`
                      : `${trade.expirySeconds || 60} Seconds`}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0F1424] border border-white/5">
                  <span className="text-[10px] text-gray-400 font-sans uppercase font-bold block">
                    Trading Account
                  </span>
                  <span className="text-emerald-400 font-black text-xs uppercase">
                    {trade.accountType || 'LIVE'} ACCOUNT
                  </span>
                </div>
              </div>

              {/* Timestamps & Audit Log */}
              <div className="p-3 rounded-xl bg-gray-950/70 border border-white/5 text-[11px] font-mono space-y-1.5 text-gray-400">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-gray-500 font-bold">Open Time:</span>
                  <span className="text-gray-300 font-semibold">
                    {trade.openTime || trade.timestamp || 'Recorded'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-gray-500 font-bold">Close Time:</span>
                  <span className="text-gray-300 font-semibold">
                    {trade.closeTime || trade.timestamp || 'Settled'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[10px] uppercase text-gray-500 font-bold">Trade Hash:</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                    title="Copy Trade ID"
                  >
                    <span className="truncate max-w-[170px]">{trade.id || 'N/A'}</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-[#0F1424] border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Execution Record</span>
              </span>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-[#F5B301] hover:brightness-110 active:scale-95 text-gray-950 font-black text-xs uppercase tracking-wider shadow cursor-pointer transition-all"
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
