import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Zap, 
  BarChart2, 
  Activity, 
  SlidersHorizontal,
  Flame,
  Globe2,
  Coins,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';
import { getStoredMarkets, subscribeToMarketConfig, MarketPairConfig, getSyncedMarketPrice } from '../lib/marketConfig';
import { customMarketEngine } from '../lib/customMarketEngine';

interface MarketsViewProps {
  onSelectMarket: (marketId: string, mode: 'trade' | 'binary') => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({ onSelectMarket }) => {
  const [markets, setMarkets] = useState<MarketPairConfig[]>(getStoredMarkets());
  const [activeCategory, setActiveCategory] = useState<'all' | 'forex' | 'otc' | 'crypto' | 'commodities'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; dir: 'up' | 'down' | 'neutral' }>>({});

  // Sync markets from configuration / storage
  useEffect(() => {
    const handleUpdate = () => {
      setMarkets(getStoredMarkets());
    };
    const unsub = subscribeToMarketConfig((updated) => {
      if (updated && updated.length > 0) {
        setMarkets(updated);
      }
    });
    window.addEventListener('forex_markets_config_updated', handleUpdate);
    return () => {
      unsub();
      window.removeEventListener('forex_markets_config_updated', handleUpdate);
    };
  }, []);

  // Subscribe to live price ticks for every market
  useEffect(() => {
    const initialMap: Record<string, { price: number; dir: 'up' | 'down' | 'neutral' }> = {};
    const now = Date.now();
    markets.forEach(m => {
      const p = customMarketEngine.getCurrentPrice(m.symbol) || getSyncedMarketPrice(m, now);
      initialMap[m.symbol] = { price: p, dir: 'neutral' };
    });
    setLivePrices(initialMap);

    const unsubs = markets.map(m => {
      return customMarketEngine.subscribeToTicker(m.symbol, (ticker) => {
        setLivePrices(prev => {
          const old = prev[m.symbol]?.price ?? ticker.price;
          const dir = ticker.price > old ? 'up' : ticker.price < old ? 'down' : (prev[m.symbol]?.dir || 'neutral');
          return {
            ...prev,
            [m.symbol]: { price: ticker.price, dir }
          };
        });
      });
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [markets]);

  // Periodic poll to ensure zero-lag price synchronization
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLivePrices(prev => {
        let changed = false;
        const next = { ...prev };
        markets.forEach(m => {
          const current = customMarketEngine.getCurrentPrice(m.symbol) || getSyncedMarketPrice(m, now);
          const old = prev[m.symbol]?.price;
          if (old === undefined || Math.abs(current - old) > 0.000001) {
            const dir = old !== undefined ? (current > old ? 'up' : 'down') : 'neutral';
            next[m.symbol] = { price: current, dir };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [markets]);

  // Filtered market list
  const filteredMarkets = useMemo(() => {
    return markets.filter(m => {
      if (!m.isActive) return false;

      // Category filter
      if (activeCategory === 'forex' && m.category !== 'forex') return false;
      if (activeCategory === 'otc' && m.category !== 'otc') return false;
      if (activeCategory === 'crypto' && m.category !== 'crypto') return false;
      if (activeCategory === 'commodities' && m.category !== 'commodities') return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchSymbol = m.symbol.toLowerCase().includes(query);
        const matchName = m.name.toLowerCase().includes(query);
        const matchCategory = m.category.toLowerCase().includes(query);
        return matchSymbol || matchName || matchCategory;
      }
      return true;
    });
  }, [markets, activeCategory, searchQuery]);

  const categories = [
    { id: 'all', label: 'All Markets', icon: Globe2 },
    { id: 'forex', label: 'Forex Pairs', icon: Activity },
    { id: 'otc', label: 'OTC Binary', icon: Zap },
    { id: 'crypto', label: 'Crypto', icon: Coins },
    { id: 'commodities', label: 'Commodities', icon: Flame },
  ] as const;

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0E1526] via-[#111A30] to-[#0A0F1C] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Feed
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {filteredMarkets.length} Available Pairs
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mt-1 font-sans">
              Trading Markets
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Real-time prices, spreads, and high-frequency OTC binary rates
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pairs (e.g. EUR, BTC, Gold)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#F5B301] text-gray-950 shadow-md shadow-[#F5B301]/25 scale-105 font-black'
                  : 'bg-[#111722] text-gray-400 hover:text-white hover:bg-slate-800 border border-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-gray-950' : 'text-gray-400'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Market Cards Grid */}
      {filteredMarkets.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0E1526] border border-white/10 text-center space-y-3">
          <SlidersHorizontal className="w-8 h-8 text-gray-500 mx-auto" />
          <h3 className="text-sm font-bold text-gray-300">No matching markets found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            No instruments found for "{searchQuery}". Try searching for another currency or asset.
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
            className="px-4 py-2 rounded-xl bg-[#F5B301] text-gray-950 font-bold text-xs hover:bg-[#e0a000] transition-all cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMarkets.map((market) => {
            const isOtc = market.category === 'otc';
            const priceData = livePrices[market.symbol];
            const livePrice = priceData?.price ?? market.basePrice;
            const priceDir = priceData?.dir ?? 'neutral';
            const precision = market.precision ?? (market.symbol.includes('JPY') ? 3 : market.symbol.includes('BTC') ? 2 : 5);
            const isPositiveChange = (market.change24h || 0) >= 0;

            return (
              <div
                key={market.id}
                onClick={() => onSelectMarket(market.id, isOtc ? 'binary' : 'trade')}
                className="group p-4 rounded-2xl bg-[#0D1322] hover:bg-[#131B30] border border-slate-800 hover:border-[#F5B301]/40 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-[#F5B301]/5 flex flex-col justify-between gap-3 cursor-pointer relative overflow-hidden"
              >
                {/* Background ambient flash when price changes */}
                <div 
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-0 ${
                    priceDir === 'up' ? 'bg-emerald-500/10 opacity-100' : priceDir === 'down' ? 'bg-rose-500/10 opacity-100' : ''
                  }`} 
                />

                {/* Top Row: Symbol, Name & Category Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-white font-mono group-hover:text-[#F5B301] transition-colors">
                        {market.symbol}
                      </span>
                      {isOtc && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          OTC
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate max-w-[170px]">
                      {market.name}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono inline-flex items-center gap-0.5 ${
                    isPositiveChange 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                  }`}>
                    {isPositiveChange ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isPositiveChange ? '+' : ''}{(market.change24h || 0).toFixed(2)}%
                  </span>
                </div>

                {/* Middle Row: Live Price & Key Metrics */}
                <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/80">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Live Price</span>
                    <div className={`text-lg font-black font-mono tracking-tight transition-colors duration-200 ${
                      priceDir === 'up' ? 'text-emerald-400' : priceDir === 'down' ? 'text-rose-400' : 'text-white'
                    }`}>
                      {livePrice.toFixed(precision)}
                    </div>
                  </div>

                  <div className="text-right space-y-0.5">
                    {isOtc ? (
                      <>
                        <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">Payout</span>
                        <div className="text-sm font-black font-mono text-emerald-400">
                          {market.payoutPercent ?? 90}%
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Spread</span>
                        <div className="text-xs font-bold font-mono text-gray-300">
                          {(market.spread * 10000).toFixed(1)} pips
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Action CTA Button */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium group-hover:text-gray-200 flex items-center gap-1">
                    Tap to open chart
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMarket(market.id, isOtc ? 'binary' : 'trade');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isOtc
                        ? 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/30'
                        : 'bg-[#F5B301]/20 hover:bg-[#F5B301] text-[#F5B301] hover:text-black border border-[#F5B301]/30'
                    }`}
                  >
                    {isOtc ? <Zap className="w-3.5 h-3.5" /> : <BarChart2 className="w-3.5 h-3.5" />}
                    <span>{isOtc ? 'Trade OTC' : 'Trade'}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
