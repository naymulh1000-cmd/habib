import React, { useState, useMemo } from 'react';
import {
  Globe,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Search,
  CheckCircle2,
  XCircle,
  Percent,
  SlidersHorizontal
} from 'lucide-react';
import { ActiveTrade, AccountType } from '../types';

const TradeDetailModal = React.lazy(() => import('./TradeDetailModal').then(m => ({ default: m.TradeDetailModal })));

export interface TradeHistoryListProps {
  trades: ActiveTrade[];
  activeAccount?: AccountType;
  initialMode?: 'forex' | 'otc';
  showModeSwitch?: boolean;
  onTradeClick?: (trade: ActiveTrade) => void;
  className?: string;
  maxContainerHeight?: string;
}

export const TradeHistoryList: React.FC<TradeHistoryListProps> = ({
  trades = [],
  activeAccount,
  initialMode = 'otc',
  showModeSwitch = true,
  onTradeClick,
  className = '',
  maxContainerHeight = 'max-h-[390px]'
}) => {
  const [activeTab, setActiveTab] = useState<'forex' | 'otc'>(initialMode);
  const [selectedTrade, setSelectedTrade] = useState<ActiveTrade | null>(null);
  const [accountFilter, setAccountFilter] = useState<'all' | AccountType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Always work on sanitized array of valid trade items
  const safeTrades = useMemo(() => {
    return Array.isArray(trades) ? trades.filter(Boolean) : [];
  }, [trades]);

  // Sync initialMode if prop updates
  React.useEffect(() => {
    if (initialMode) {
      setActiveTab(initialMode);
    }
  }, [initialMode]);

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return safeTrades.filter((trd) => {
      if (!trd) return false;
      const mode = trd.tradingMode || (trd.category === 'binary' ? 'otc' : 'forex');
      const isForex = mode === 'forex' || (!trd.tradingMode && !trd.expirySeconds && trd.category !== 'binary');
      const isBinary = mode === 'otc' || trd.category === 'binary' || (!!trd.expirySeconds && trd.expirySeconds > 0);

      if (activeTab === 'forex' && !isForex) return false;
      if (activeTab === 'otc' && !isBinary) return false;

      if (accountFilter !== 'all') {
        const tradeAcc = trd.accountType || 'live';
        if (tradeAcc !== accountFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSymbol = (trd.symbol || trd.pair || '').toLowerCase().includes(q);
        const matchId = (trd.id || '').toLowerCase().includes(q);
        if (!matchSymbol && !matchId) return false;
      }

      return true;
    });
  }, [safeTrades, activeTab, accountFilter, searchQuery]);

  // Overall Statistics for current mode
  const { totalCount, winsCount, lossesCount, winRate, totalPnl } = useMemo(() => {
    const list = safeTrades.filter((trd) => {
      if (!trd) return false;
      const mode = trd.tradingMode || (trd.category === 'binary' ? 'otc' : 'forex');
      const isForex = mode === 'forex' || (!trd.tradingMode && !trd.expirySeconds && trd.category !== 'binary');
      const isBinary = mode === 'otc' || trd.category === 'binary' || (!!trd.expirySeconds && trd.expirySeconds > 0);
      return activeTab === 'forex' ? isForex : isBinary;
    });

    const total = list.length;
    const wins = list.filter((t) => (Number(t.pnl) || 0) >= 0 || t.status === 'WON').length;
    const losses = list.filter((t) => (Number(t.pnl) || 0) < 0 || t.status === 'LOST').length;
    const pnl = list.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
    const rate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

    return {
      totalCount: total,
      winsCount: wins,
      lossesCount: losses,
      winRate: rate,
      totalPnl: pnl
    };
  }, [safeTrades, activeTab]);

  const handleRowClick = (trd: ActiveTrade) => {
    if (onTradeClick) {
      onTradeClick(trd);
    } else {
      setSelectedTrade(trd);
    }
  };

  const forexTradesCount = safeTrades.filter(
    (t) => t && (t.tradingMode || (t.category === 'binary' ? 'otc' : 'forex')) === 'forex' && !t.expirySeconds
  ).length;

  const binaryTradesCount = safeTrades.filter(
    (t) => t && ((t.tradingMode || 'forex') === 'otc' || t.category === 'binary' || (!!t.expirySeconds && t.expirySeconds > 0))
  ).length;

  return (
    <div className={`flex flex-col font-sans select-none ${className}`}>
      {/* Top Controls: Small Forex & Binary Switcher */}
      {showModeSwitch && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
          {/* Small Mode Selector Tabs */}
          <div className="flex items-center p-0.5 bg-gray-950 rounded-xl border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('forex')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'forex'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-300" />
              <span>Forex</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                {forexTradesCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('otc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'otc'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-gray-950" />
              <span>Binary</span>
              <span className="px-1.5 py-0.2 rounded-full bg-gray-900/40 text-[10px] font-mono">
                {binaryTradesCount}
              </span>
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <div className="px-2.5 py-1 rounded-lg bg-gray-950 border border-white/10 text-gray-300 flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Win Rate:</span>
              <span className="text-[#F5B301] font-black">{winRate}%</span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-gray-950 border border-white/10 flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Net P/L:</span>
              <span className={`font-black ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnl >= 0 ? '+' : '-'}${Math.abs(totalPnl).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Slim Sleek Trade Items List (fits 8-9 items directly on screen) */}
      <div
        className={`overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10 ${maxContainerHeight}`}
      >
        {filteredTrades.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Clock className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-xs font-bold text-gray-400">
              No closed {activeTab === 'forex' ? 'Forex' : 'Binary'} trades found
            </p>
            <p className="text-[10px] text-gray-600">
              {activeTab === 'forex'
                ? 'Closed BUY and SELL Forex positions will appear here.'
                : 'Settled UP and DOWN Binary Option contracts will appear here.'}
            </p>
          </div>
        ) : (
          filteredTrades.map((trd, idx) => {
            const isForex = activeTab === 'forex';
            const isWon = trd.pnl >= 0 || trd.status === 'WON';
            const isUp = trd.type === 'BUY' || trd.type === 'UP' || trd.type === 'CALL';
            const formattedTime = trd.closeTime
              ? trd.closeTime.split(' ')[1] || trd.closeTime
              : trd.timestamp
              ? trd.timestamp.split(' ')[1] || trd.timestamp
              : 'Closed';

            return (
              <div
                key={`hist-row-${trd.id || 'trd'}-${idx}`}
                onClick={() => handleRowClick(trd)}
                className="h-[43px] px-2.5 sm:px-3 flex items-center justify-between hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors cursor-pointer group"
                title="Click to view full trade execution details"
              >
                {/* Left: Direction Icon + Pair Symbol + Time */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                      isUp
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-black text-white tracking-tight truncate max-w-[130px] sm:max-w-[180px]">
                      {trd.symbol || trd.pair}
                    </span>

                    <span className="text-[10px] text-gray-400 font-mono hidden sm:inline-block">
                      {formattedTime}
                    </span>
                  </div>
                </div>

                {/* Middle: Duration / Lot + Direction indicator */}
                <div className="hidden xs:flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
                  {isForex ? (
                    <span>{trd.lotSize || 0.01} Lot</span>
                  ) : (
                    <span>{trd.expirySeconds ? `${trd.expirySeconds}s` : '60s'}</span>
                  )}
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-300 font-bold">${trd.amount}</span>
                </div>

                {/* Right: Return PnL + WIN/LOSS Status Badge + Chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-xs font-black font-mono tracking-tight block ${
                        isWon ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isWon ? '+' : '-'}${Math.abs(trd.pnl).toFixed(2)}
                    </span>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${
                      isWon
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {isWon ? 'WIN' : 'LOSS'}
                  </span>

                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-amber-400 transition-colors shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Internal Trade Detail Modal (when clicked) */}
      <React.Suspense fallback={null}>
        {selectedTrade && (
          <TradeDetailModal
            trade={selectedTrade}
            onClose={() => setSelectedTrade(null)}
          />
        )}
      </React.Suspense>
    </div>
  );
};
