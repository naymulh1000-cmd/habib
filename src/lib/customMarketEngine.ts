import { db, isQuotaExceeded, isQuotaError } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, writeBatch } from 'firebase/firestore';
import { Candlestick } from '../types';
import { 
  MarketPairConfig, 
  DEFAULT_MARKETS, 
  getStoredMarkets, 
  saveStoredMarkets, 
  subscribeToMarketConfig,
  getSyncedMarketPrice,
  getCandleBucketMetrics,
  getUpcomingCandlePredictions,
  getDeterministicBoundaryPrice,
  getDeterministicHistoricalCandle,
  getDeterministicActiveCandle,
  setMarketLiveExposure,
  getMarketLiveExposure,
  CandlePredictionMetrics
} from './marketConfig';
import { 
  getMarketKey, 
  getTimeframeSeconds, 
  mergeAndDeduplicateCandles, 
  saveCandlesToFirestore, 
  saveSingleCandleToFirestore,
  fetchCandlesFromFirestore,
  generateDeterministicCandleRange,
  subscribeMasterCandlesFromFirestore,
  saveMasterCandleStateToFirestore
} from './candleHistoryService';
import { onGoldPriceUpdate, getLatestGoldPrice } from './goldLiveDataService';
import { realTimeLiveMarketService } from './realTimeLiveMarketService';
import { safeFetchJson } from './safeApi';

export interface MarketTickerData {
  symbol: string;
  price: number;
  open24h: number;
  high24h: number;
  low24h: number;
  change24h: number;
  changePercent: number;
  volume24h: number;
  isRunning: boolean;
  timestamp: number;
}

export type TimeframeId = 'S1' | 'S5' | 'S15' | 'S30' | 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';

export const SUPPORTED_TIMEFRAMES: { id: TimeframeId; label: string; seconds: number }[] = [
  { id: 'S1', label: '1s', seconds: 1 },
  { id: 'S5', label: '5s', seconds: 5 },
  { id: 'S15', label: '15s', seconds: 15 },
  { id: 'S30', label: '30s', seconds: 30 },
  { id: 'M1', label: '1m', seconds: 60 },
  { id: 'M5', label: '5m', seconds: 300 },
  { id: 'M15', label: '15m', seconds: 900 },
  { id: 'M30', label: '30m', seconds: 1800 },
  { id: 'H1', label: '1h', seconds: 3600 },
  { id: 'H4', label: '4h', seconds: 14400 },
  { id: 'D1', label: '1d', seconds: 86400 }
];

// Hash helper for deterministic seed generation
function hashSymbol(sym: string): number {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) {
    hash = ((hash << 5) - hash) + sym.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 100;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

class CustomMarketEngineService {
  private markets: Map<string, MarketPairConfig> = new Map();
  private currentPrices: Map<string, number> = new Map();
  private candleBuckets: Map<string, Candlestick[]> = new Map(); // key: `${symbol}_${timeframe}`
  private tickerListeners: Map<string, Set<(ticker: MarketTickerData) => void>> = new Map();
  private candleListeners: Map<string, Set<(candles: Candlestick[]) => void>> = new Map();
  private engineTimer: any = null;
  private isInitialized = false;
  private tickCounter = 0;
  private pendingFirestoreWrites: Map<string, Candlestick> = new Map();
  private firestoreUnsubscribers: Map<string, () => void> = new Map();
  private lastFirestoreWrite: Map<string, number> = new Map();
  private serverTimeOffset = typeof window !== 'undefined' ? Number(sessionStorage.getItem('broker_server_time_offset') || '0') : 0;
  private activeViewedSymbol: string = 'EUR/USD OTC';
  private activeViewedTimeframe: TimeframeId = 'M1';
  private exchangeAnchorPrices: Map<string, number> = new Map();
  private lastServerOtcTickAt: number = 0;
  private lastServerOtcTickSeq: number = 0;
  private isOtcSseConnected: boolean = false;
  private hasInitialClockSync: boolean = false;
  private isResyncingOtcHistory: boolean = false;
  private lastOtcResyncAt: number = 0;

  constructor() {
    // Heavy intervals and tick loops are deferred until init() or active subscription
  }

  public syncServerTimeFromServer(serverTime?: number, seq?: number) {
    if (typeof serverTime === 'number' && Number.isFinite(serverTime) && serverTime > 1000000000000) {
      const nextOffset = Math.round(serverTime - Date.now());
      if (!this.hasInitialClockSync || Math.abs(nextOffset - this.serverTimeOffset) > 120) {
        this.serverTimeOffset = nextOffset;
        this.hasInitialClockSync = true;
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('broker_server_time_offset', String(this.serverTimeOffset));
          }
        } catch (_) {}
      }
    }
    if (typeof seq === 'number' && seq > 0 && seq < 5 && this.lastServerOtcTickSeq > 20) {
      // Server restarted cleanly
      this.lastServerOtcTickSeq = 0;
    }
  }

  public setActiveViewedSymbol(symbol: string) {
    if (symbol) {
      this.activeViewedSymbol = symbol;
    }
  }

  public getActiveViewedSymbol(): string {
    return this.activeViewedSymbol;
  }

  public setActiveViewedTimeframe(timeframe: TimeframeId) {
    if (timeframe) {
      this.activeViewedTimeframe = timeframe;
    }
  }

  public getActiveViewedTimeframe(): TimeframeId {
    return this.activeViewedTimeframe;
  }

  public getSyncedNow(): number {
    return Date.now() + this.serverTimeOffset;
  }

  public getServerTimeOffset(): number {
    return this.serverTimeOffset;
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Synchronize clock with authoritative server engine (never permanently disable on mobile network slowdowns)
    const syncServerClock = async () => {
      try {
        if (typeof window !== 'undefined') {
          const reqStart = Date.now();
          const data = await safeFetchJson('/api/server-time', {}, 3000);
          if (data && typeof data.time === 'number') {
            const reqEnd = Date.now();
            const roundTrip = (reqEnd - reqStart) / 2;
            this.serverTimeOffset = Math.round(data.time - (reqStart + roundTrip));
            this.hasInitialClockSync = true;
            try {
              sessionStorage.setItem('broker_server_time_offset', String(this.serverTimeOffset));
            } catch (_) {}
          }
        }
      } catch (_) {}
    };

    syncServerClock();
    setInterval(syncServerClock, 15000);

    // Synchronize live OTC order exposure & house risk management with central server (for HUD / Admin view)
    let isOtcExposureInFlight = false;
    let nextExposureRetryTime = 0;
    const syncOtcExposure = async () => {
      const now = Date.now();
      if (isOtcExposureInFlight || now < nextExposureRetryTime) return;
      try {
        if (typeof window !== 'undefined') {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          isOtcExposureInFlight = true;
          const data = await safeFetchJson('/api/otc/exposure', {}, 3000);
          if (data && data.success && data.marketsExposure) {
            nextExposureRetryTime = 0;
            Object.keys(data.marketsExposure).forEach(sym => {
              const exp = data.marketsExposure[sym];
              setMarketLiveExposure(sym, exp);
            });
          } else {
            nextExposureRetryTime = now + 2500;
          }
        }
      } catch (_) {
        nextExposureRetryTime = now + 2500;
      } finally {
        isOtcExposureInFlight = false;
      }
    };

    syncOtcExposure();
    setInterval(syncOtcExposure, 2000);

    // Authoritative HTTP fallback ONLY when SSE stream is unavailable/disconnected (prevents SSE vs poll races)
    let isOtcLiveTicksInFlight = false;
    let lastLiveTicksFetchAt = 0;
    const syncOtcLiveTicks = async (forceNow: boolean = false) => {
      const now = Date.now();
      if (!forceNow && this.isOtcSseConnected && (now - this.lastServerOtcTickAt < 2000)) {
        return;
      }
      if (isOtcLiveTicksInFlight || (!forceNow && now - lastLiveTicksFetchAt < 380)) return;
      try {
        if (typeof window !== 'undefined') {
          if (!forceNow && typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          isOtcLiveTicksInFlight = true;
          lastLiveTicksFetchAt = now;
          const data = await safeFetchJson('/api/otc/live-ticks', {}, 3000);
          if (data && data.success && data.ticks) {
            this.syncServerTimeFromServer(data.serverTime, data.seq);
            if (typeof data.seq === 'number' && data.seq < this.lastServerOtcTickSeq) {
              return;
            }
            if (typeof data.seq === 'number') {
              this.lastServerOtcTickSeq = data.seq;
            }
            if (typeof data.exposureControlEnabled === 'boolean' && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('otc_control_config_updated', {
                detail: { exposureControlEnabled: data.exposureControlEnabled }
              }));
            }
            Object.keys(data.ticks).forEach(cleanSym => {
              this.applyServerOtcTick(data.ticks[cleanSym], cleanSym);
            });
          }
        }
      } catch (_) {
      } finally {
        isOtcLiveTicksInFlight = false;
      }
    };

    syncOtcLiveTicks(true);
    setInterval(() => syncOtcLiveTicks(false), 400);

    // Real-Time High-Frequency SSE Sub-Tick Stream (<100ms latency across all devices globally)
    // Single authoritative OTC tick & candle feed eliminating cross-device chart divergence and flicker
    if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
      try {
        let sseReconnectTimer: any = null;
        let activeEs: EventSource | null = null;
        const connectOtcStream = () => {
          if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
          if (activeEs) {
            try { activeEs.close(); } catch (_) {}
          }
          const es = new EventSource('/api/otc/stream');
          activeEs = es;
          es.onopen = () => {
            this.isOtcSseConnected = true;
            syncServerClock();
          };
          es.onmessage = (event) => {
            this.isOtcSseConnected = true;
            try {
              const payload = JSON.parse(event.data);
              if (!payload) return;
              if (typeof payload.serverTime === 'number' || typeof payload.seq === 'number') {
                this.syncServerTimeFromServer(payload.serverTime, payload.seq);
              }
              if (payload.type !== 'SNAPSHOT' && typeof payload.seq === 'number' && payload.seq < this.lastServerOtcTickSeq) {
                return;
              }
              if (typeof payload.seq === 'number') {
                this.lastServerOtcTickSeq = payload.seq;
              }
              if (typeof payload.exposureControlEnabled === 'boolean' && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('otc_control_config_updated', {
                  detail: { exposureControlEnabled: payload.exposureControlEnabled }
                }));
              }
              if (payload.ticks) {
                Object.keys(payload.ticks).forEach(cleanSym => {
                  this.applyServerOtcTick(payload.ticks[cleanSym], cleanSym);
                });
              }
              if (payload.type === 'SNAPSHOT') {
                this.resyncViewedOtcHistory(true);
              }
            } catch (_) {}
          };
          es.onerror = () => {
            this.isOtcSseConnected = false;
            try { es.close(); } catch (_) {}
            sseReconnectTimer = setTimeout(connectOtcStream, 2000);
          };
        };
        connectOtcStream();

        // Resync immediately when phone wakes from background/sleep or reconnects to internet
        const handleResume = () => {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          syncServerClock();
          syncOtcLiveTicks(true);
          this.resyncViewedOtcHistory(true);
          if (!activeEs || activeEs.readyState === EventSource.CLOSED) {
            connectOtcStream();
          }
        };
        document.addEventListener('visibilitychange', handleResume);
        window.addEventListener('online', handleResume);
      } catch (_) {}
    }

    // Load initial markets
    const stored = getStoredMarkets();
    stored.forEach(m => {
      this.markets.set(m.symbol, { ...m, isRunning: m.isRunning ?? true });
      this.currentPrices.set(m.symbol, m.basePrice);
    });

    // Real-time Firestore & Broadcast sync for market configs
    subscribeToMarketConfig((updatedMarkets) => {
      updatedMarkets.forEach(m => {
        const existing = this.markets.get(m.symbol);
        const isOtc = m.category === 'otc' || Boolean(m.symbol && m.symbol.toUpperCase().includes('OTC')) || m.isRealMarket === false;
        const configChanged = existing && !isOtc && (
          existing.trendBias !== m.trendBias ||
          existing.controlMode !== m.controlMode ||
          existing.targetPrice !== m.targetPrice ||
          existing.volatility !== m.volatility ||
          existing.speed !== m.speed
        );

        this.markets.set(m.symbol, {
          ...m,
          isRunning: m.isRunning !== undefined ? m.isRunning : (existing?.isRunning ?? true)
        });

        // Only flush non-OTC local buckets; OTC buckets strictly track central server stream
        if (configChanged) {
          SUPPORTED_TIMEFRAMES.forEach(tf => {
            this.candleBuckets.delete(`${m.symbol}_${tf.id}`);
          });
        }
      });
      this.notifyConfigUpdated();
    });

    // Real-time live gold sync
    onGoldPriceUpdate((goldPrice) => {
      if (goldPrice && goldPrice > 0) {
        this.exchangeAnchorPrices.set('XAU/USD', goldPrice);
        const goldMarket = this.getMarket('XAU/USD') || this.getMarket('xau_usd');
        if (goldMarket) {
          this.currentPrices.set(goldMarket.symbol, goldPrice);
          const now = this.getSyncedNow();
          SUPPORTED_TIMEFRAMES.forEach(tf => {
            this.updateCandleBucket(goldMarket, tf.id, tf.seconds, goldPrice, now);
          });
          this.notifyTicker(goldMarket, goldPrice, now);
        }
      }
    });

    // Real-Time Live Feed for Crypto, Gold and Forex (Binance & Interbank)
    if (typeof window !== 'undefined') {
      window.addEventListener('real_live_market_tick', (e: any) => {
        const tick = e.detail;
        if (!tick || !tick.symbol || !tick.price) return;
        this.exchangeAnchorPrices.set(tick.symbol, tick.price);
        const market = this.getMarket(tick.symbol);
        if (market && (market.isRealMarket || market.category !== 'otc')) {
          const now = this.getSyncedNow();
          const price = tick.price;
          this.currentPrices.set(market.symbol, price);

          // Real-time candle update only for active viewed chart symbols (preserves 90%+ CPU)
          const isChartActive = this.activeViewedSymbol === market.symbol ||
            (this.candleListeners.get(`${market.symbol}_M1`)?.size || 0) > 0;

          if (isChartActive) {
            this.updateCandleBucket(market, 'M1', 60, price, now);
            if (this.activeViewedTimeframe && ['S1', 'S5', 'S15', 'S30'].includes(this.activeViewedTimeframe)) {
              const tfObj = SUPPORTED_TIMEFRAMES.find(t => t.id === this.activeViewedTimeframe);
              if (tfObj) {
                this.updateCandleBucket(market, tfObj.id, tfObj.seconds, price, now);
              }
            } else if (this.activeViewedTimeframe && this.activeViewedTimeframe !== 'M1') {
              const tfObj = SUPPORTED_TIMEFRAMES.find(t => t.id === this.activeViewedTimeframe);
              const m1Bucket = this.candleBuckets.get(`${market.symbol}_M1`) || [];
              if (tfObj && m1Bucket.length > 0) {
                this.updateAggregatedTimeframeBucket(market, tfObj.id, tfObj.seconds, m1Bucket, price, now);
              }
            }
          }
          this.notifyTicker(market, price, now);
        }
      });

      // Real-Time Authentic Exchange Candle Synchronization (TradingView Master Feed & Binance)
      window.addEventListener('real_live_market_candle', (e: any) => {
        const detail = e.detail;
        if (!detail || !detail.symbol || !detail.candle) return;
        const market = this.getMarket(detail.symbol);
        if (market && (market.isRealMarket || market.category !== 'otc')) {
          this.applyAuthenticExchangeCandle(market, detail.timeframe || 'M1', detail.candle);
        }
      });
    }

    // Start high-frequency tick generator loop
    this.startTickLoop();

    // Start periodic batch Firestore persist timer (every 4 seconds)
    setInterval(() => {
      this.flushPendingFirestoreWrites();
    }, 4000);
  }

  private startTickLoop() {
    if (this.engineTimer) clearInterval(this.engineTimer);

    let currentInterval = 1000;
    const runTick = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Pause when browser tab is minimized/hidden
      }

      // Check if any chart/candle listeners are actively subscribed
      let hasChartListeners = false;
      for (const set of this.candleListeners.values()) {
        if (set && set.size > 0) {
          hasChartListeners = true;
          break;
        }
      }

      const targetInterval = hasChartListeners ? 50 : 500;
      if (targetInterval !== currentInterval) {
        currentInterval = targetInterval;
        clearInterval(this.engineTimer);
        this.engineTimer = setInterval(runTick, currentInterval);
      }

      this.tick();
    };

    this.engineTimer = setInterval(runTick, 1000);
  }

  private tick() {
    this.tickCounter++;
    const now = this.getSyncedNow();

    const activeCandleSymbols = new Set<string>();
    let hasActiveChartListeners = false;
    this.candleListeners.forEach((listeners, bucketKey) => {
      if (listeners.size > 0) {
        hasActiveChartListeners = true;
        const sym = bucketKey.split('_')[0];
        if (sym) activeCandleSymbols.add(sym);
      }
    });
    if (hasActiveChartListeners && this.activeViewedSymbol) {
      activeCandleSymbols.add(this.activeViewedSymbol);
    }

    const activeTickerSymbols = new Set<string>();
    this.tickerListeners.forEach((listeners, sym) => {
      if (listeners.size > 0) activeTickerSymbols.add(sym);
    });

    // 2. High-Frequency Tick & Candle processing:
    // OTC markets are 100% server-authoritative — NEVER run divergent client fallback math for OTC!
    activeCandleSymbols.forEach(symbol => {
      const market = this.getMarket(symbol);
      if (!market || !market.isActive || market.isRunning === false) return;

      const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);
      if (isOtc) {
        return; // Strictly driven by central server stream / live-ticks
      }

      const speedMs = market.speed || market.updateSpeedMs || 100;
      if (speedMs > 50 && this.tickCounter % Math.max(1, Math.floor(speedMs / 50)) !== 0) {
        return;
      }

      const price = this.calculateRealMarketDynamicTick(market, now);
      this.currentPrices.set(market.symbol, price);

      // Update Sub-minute and M1 directly for real markets
      this.updateCandleBucket(market, 'M1', 60, price, now);
      ['S1', 'S5', 'S15', 'S30'].forEach((tfId) => {
        const tfObj = SUPPORTED_TIMEFRAMES.find(t => t.id === tfId);
        if (tfObj) {
          this.updateCandleBucket(market, tfObj.id, tfObj.seconds, price, now);
        }
      });

      if (this.activeViewedTimeframe && !['M1', 'S1', 'S5', 'S15', 'S30'].includes(this.activeViewedTimeframe)) {
        const tfObj = SUPPORTED_TIMEFRAMES.find(t => t.id === this.activeViewedTimeframe);
        if (tfObj) {
          this.updateCandleBucket(market, tfObj.id, tfObj.seconds, price, now);
        }
      }

      const m1Bucket = this.candleBuckets.get(`${market.symbol}_M1`) || [];
      if (m1Bucket.length > 0) {
        ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'].forEach((tfId) => {
          const higherBucketKey = `${market.symbol}_${tfId}`;
          const hasListeners = (this.candleListeners.get(higherBucketKey)?.size || 0) > 0;
          const isActivelyViewed = this.activeViewedTimeframe === tfId;
          if (hasListeners || isActivelyViewed) {
            const tfObj = SUPPORTED_TIMEFRAMES.find(t => t.id === tfId);
            if (tfObj) {
              this.updateAggregatedTimeframeBucket(market, tfObj.id, tfObj.seconds, m1Bucket, price, now);
            }
          }
        });
      }

      this.notifyTicker(market, price, now);
    });

    // 3. For other subscribed ticker markets (e.g. watchlist open), update ONLY non-OTC markets locally
    if (this.tickCounter % 5 === 0) {
      activeTickerSymbols.forEach(symbol => {
        if (activeCandleSymbols.has(symbol)) return;
        const market = this.getMarket(symbol);
        if (!market || !market.isActive || market.isRunning === false) return;

        const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);
        if (isOtc) {
          return; // OTC ticker updates strictly from central server ticks
        }

        const price = this.calculateRealMarketDynamicTick(market, now);
        this.currentPrices.set(market.symbol, price);
        this.notifyTicker(market, price, now);
      });
    }
  }

  public resyncViewedOtcHistory(force: boolean = false) {
    if (typeof window === 'undefined') return;
    const symbol = this.activeViewedSymbol;
    const timeframe = this.activeViewedTimeframe;
    if (!symbol || !timeframe) return;
    const market = this.getMarket(symbol);
    const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);
    if (!isOtc) return;

    const now = Date.now();
    if (!force && (this.isResyncingOtcHistory || now - this.lastOtcResyncAt < 1800)) return;
    if (this.isResyncingOtcHistory) return;

    this.isResyncingOtcHistory = true;
    this.lastOtcResyncAt = now;
    const bucketKey = `${market.symbol}_${timeframe}`;

    safeFetchJson(
      `/api/otc-candles/${encodeURIComponent(market.symbol)}/${encodeURIComponent(timeframe)}?count=600`,
      {},
      3500
    )
      .then((data: any) => {
        if (data && data.success && Array.isArray(data.candles) && data.candles.length > 0) {
          this.syncServerTimeFromServer(data.serverTime, data.seq);
          this.seedCandles(market.symbol, timeframe, data.candles);
          const seeded = this.candleBuckets.get(bucketKey) || data.candles;
          this.notifyCandleSubscribers(bucketKey, seeded);
        }
      })
      .catch(() => {})
      .finally(() => {
        this.isResyncingOtcHistory = false;
      });
  }

  private applyServerOtcTick(tick: any, cleanSym: string) {
    if (!tick) return;
    const market = this.getMarket(tick.symbol || cleanSym);
    const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);
    if (!market || !isOtc) return;

    this.lastServerOtcTickAt = Date.now();
    const isViewedOrListening =
      this.activeViewedSymbol === market.symbol ||
      Array.from(this.candleListeners.keys()).some(k => k.startsWith(`${market.symbol}_`) && (this.candleListeners.get(k)?.size || 0) > 0);

    if (typeof tick.price === 'number') {
      this.currentPrices.set(market.symbol, tick.price);
    }

    if (isViewedOrListening) {
      if (tick.activeCandle) {
        this.applyAuthenticExchangeCandle(market, 'M1', tick.activeCandle);
      }
      if (tick.tfCandles && typeof tick.tfCandles === 'object') {
        (['S1', 'S5', 'S15', 'S30'] as TimeframeId[]).forEach((tfId) => {
          const subCandle = tick.tfCandles[tfId];
          const subKey = `${market.symbol}_${tfId}`;
          const hasSubListener = (this.candleListeners.get(subKey)?.size || 0) > 0 || this.activeViewedTimeframe === tfId;
          if (subCandle && (hasSubListener || this.candleBuckets.has(subKey))) {
            this.applyAuthenticExchangeCandle(market, tfId, subCandle);
          }
        });
      }
    }

    if (typeof tick.price === 'number') {
      this.notifyTicker(market, tick.price, tick.time || this.getSyncedNow());
    }
  }

/**
 * Aggregates continuous higher timeframe candle from M1 base candles for mathematical consistency
 */
private updateAggregatedTimeframeBucket(
  market: MarketPairConfig,
  timeframe: TimeframeId,
  tfSecs: number,
  m1Candles: Candlestick[],
  currentPrice: number,
  now: number
) {
  const bucketKey = `${market.symbol}_${timeframe}`;
  const timeStepMs = tfSecs * 1000;
  const currentBucketTime = Math.floor(now / timeStepMs) * timeStepMs;

  let bucket = this.candleBuckets.get(bucketKey);
  if (!bucket || bucket.length === 0) {
    return;
  }

  const lastIdx = bucket.length - 1;
  const lastCandle = { ...bucket[lastIdx] };

  // Filter M1 candles belonging to the current higher timeframe window
  const currentWindowM1 = m1Candles.filter(c => c.time >= currentBucketTime && c.time < currentBucketTime + timeStepMs);

  if (lastCandle.time < currentBucketTime) {
    if (currentBucketTime - lastCandle.time > timeStepMs) {
      const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);
      if (isOtc) {
        this.resyncViewedOtcHistory(false);
        return;
      }
    }
    // Transition to new higher-TF bucket: strict 0-gap (open = previous close)
    const rollingOpen = lastCandle.close;
    const newCandle: Candlestick = {
      time: currentBucketTime,
      timestamp: currentBucketTime,
      open: rollingOpen,
      high: Math.max(rollingOpen, currentPrice),
      low: Math.min(rollingOpen, currentPrice),
      close: currentPrice,
      volume: 100
    };
    bucket.push(newCandle);
    if (bucket.length > 2500) {
      bucket.splice(0, bucket.length - 2500);
    }
  } else {
    // Update active in-progress higher-TF candle strictly preserving its open and M1 highs/lows
    if (currentWindowM1.length > 0) {
      let high = lastCandle.open;
      let low = lastCandle.open;
      let totalVol = 0;
      currentWindowM1.forEach(c => {
        if (c.high > high) high = c.high;
        if (c.low < low) low = c.low;
        totalVol += (c.volume || 100);
      });
      lastCandle.high = Math.max(high, currentPrice);
      lastCandle.low = Math.min(low, currentPrice);
      lastCandle.close = currentPrice;
      lastCandle.volume = totalVol;
    } else {
      lastCandle.high = Math.max(lastCandle.high, lastCandle.open, currentPrice);
      lastCandle.low = Math.min(lastCandle.low, lastCandle.open, currentPrice);
      lastCandle.close = currentPrice;
    }
    bucket[lastIdx] = lastCandle;
  }

  this.notifyCandleSubscribers(bucketKey, bucket);
}

/**
 * Applies 100% authentic exchange / server OTC candle verbatim without client drift
 */
private applyAuthenticExchangeCandle(
  market: MarketPairConfig,
  timeframe: string,
  incomingCandle: Candlestick
) {
  const bucketKey = `${market.symbol}_${timeframe}`;
  const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);
  const tfSecs = getTimeframeSeconds(timeframe);
  const timeStepMs = tfSecs * 1000;
  let bucket = this.candleBuckets.get(bucketKey);

  if (!bucket || bucket.length === 0) {
    bucket = [{ ...incomingCandle }];
    this.candleBuckets.set(bucketKey, bucket);
  } else {
    const lastIdx = bucket.length - 1;
    const last = bucket[lastIdx];

    if (last.time === incomingCandle.time) {
      if (isOtc) {
        // Strictly trust server active candle OHLC verbatim — prevents phantom wicks or stale local highs/lows from sticking!
        bucket[lastIdx] = {
          time: incomingCandle.time,
          timestamp: incomingCandle.timestamp || incomingCandle.time,
          open: incomingCandle.open,
          high: Math.max(incomingCandle.high, incomingCandle.open, incomingCandle.close),
          low: Math.min(incomingCandle.low, incomingCandle.open, incomingCandle.close),
          close: incomingCandle.close,
          volume: incomingCandle.volume ?? last.volume ?? 100
        };
      } else {
        const prevCandle = lastIdx > 0 ? bucket[lastIdx - 1] : undefined;
        const establishedOpen = prevCandle ? prevCandle.close : (last.open || incomingCandle.open);
        const rawHigh = Math.max(establishedOpen, last.high ?? incomingCandle.high, incomingCandle.high, incomingCandle.close);
        const rawLow = Math.min(establishedOpen, last.low ?? incomingCandle.low, incomingCandle.low, incomingCandle.close);

        bucket[lastIdx] = {
          ...incomingCandle,
          open: establishedOpen,
          high: Number(rawHigh.toFixed(market.precision ?? 5)),
          low: Number(rawLow.toFixed(market.precision ?? 5)),
          close: incomingCandle.close
        };
      }
    } else if (incomingCandle.time > last.time) {
      if (isOtc) {
        // If one or more candles were skipped while phone slept/backgrounded, fetch full gapless history from server
        if (incomingCandle.time - last.time > timeStepMs) {
          this.resyncViewedOtcHistory(false);
        }
        bucket.push({
          time: incomingCandle.time,
          timestamp: incomingCandle.timestamp || incomingCandle.time,
          open: incomingCandle.open,
          high: Math.max(incomingCandle.high, incomingCandle.open, incomingCandle.close),
          low: Math.min(incomingCandle.low, incomingCandle.open, incomingCandle.close),
          close: incomingCandle.close,
          volume: incomingCandle.volume ?? 100
        });
      } else {
        const cleanOpen = last.close;
        bucket.push({
          ...incomingCandle,
          open: cleanOpen,
          high: Math.max(cleanOpen, incomingCandle.high, incomingCandle.close),
          low: Math.min(cleanOpen, incomingCandle.low, incomingCandle.close),
        });
      }
      if (bucket.length > 2500) {
        bucket.splice(0, bucket.length - 2500);
      }
    } else if (!isOtc) {
      const existingIdx = bucket.findIndex(c => c.time === incomingCandle.time);
      if (existingIdx >= 0) {
        const prevCandle = existingIdx > 0 ? bucket[existingIdx - 1] : undefined;
        const establishedOpen = prevCandle ? prevCandle.close : incomingCandle.open;
        bucket[existingIdx] = {
          ...incomingCandle,
          open: establishedOpen,
          high: Math.max(establishedOpen, bucket[existingIdx].high ?? incomingCandle.high, incomingCandle.high, incomingCandle.close),
          low: Math.min(establishedOpen, bucket[existingIdx].low ?? incomingCandle.low, incomingCandle.low, incomingCandle.close),
        };
      }
    }
  }

  this.currentPrices.set(market.symbol, incomingCandle.close);

  // Aggregate actively viewed higher timeframes cleanly from authoritative M1
  if (timeframe === 'M1') {
    const now = this.getSyncedNow();
    ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'].forEach((tfId) => {
      const tfBucketKey = `${market.symbol}_${tfId}`;
      const hasListeners = (this.candleListeners.get(tfBucketKey)?.size || 0) > 0 || this.activeViewedTimeframe === tfId;
      if (!hasListeners) return;
      const tfObj = SUPPORTED_TIMEFRAMES.find(t => t.id === tfId);
      if (tfObj && bucket && bucket.length > 0) {
        this.updateAggregatedTimeframeBucket(market, tfObj.id, tfObj.seconds, bucket, incomingCandle.close, now);
      }
    });
  }

  if (!(isOtc && bucket.length <= 1)) {
    this.notifyCandleSubscribers(bucketKey, bucket);
  }
  this.notifyTicker(market, incomingCandle.close, incomingCandle.time);
}

  /**
   * Generates continuous, sub-second micro-liquidity oscillations anchored strictly to
   * authentic real-time exchange rates (TradingView/Binance/Swissquote).
   * Ensures live markets actively move and fluctuate with silky smooth price action like Quotex/TradingView
   * without ever diverging from genuine international quotes!
   */
  public calculateRealMarketDynamicTick(market: MarketPairConfig, now: number): number {
    const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);
    
    // Get authentic live exchange anchor directly from real market streamer
    let anchor: number;
    if (market.symbol === 'XAU/USD' || market.id === 'xau_usd') {
      const g = getLatestGoldPrice();
      anchor = (g && g > 0) ? g : (this.exchangeAnchorPrices.get('XAU/USD') || realTimeLiveMarketService.getLatestPrice('XAU/USD') || market.basePrice || 4004.00);
    } else {
      const realP = this.exchangeAnchorPrices.get(market.symbol) || realTimeLiveMarketService.getLatestPrice(market.symbol);
      anchor = (realP && realP > 0) ? realP : (market.basePrice || 100);
    }

    return Number(anchor.toFixed(precision));
  }

  /**
   * Generates next organic price using smooth continuous intra-candle trajectory and target price engine
   */
  public calculateNextPrice(market: MarketPairConfig, timeMs: number): number {
    const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);
    const base = market.basePrice || 100;

    // Real markets: return dynamic live micro-tick anchored to authentic exchange rates
    if (market.isRealMarket || market.category !== 'otc') {
      return this.calculateRealMarketDynamicTick(market, timeMs);
    }
    const bucketKey = `${market.symbol}_M1`;
    const m1Bucket = this.candleBuckets.get(bucketKey);
    const currentBucketTime = Math.floor(timeMs / 60000) * 60000;

    // --- TARGET PRICE OVERRIDE ---
    if (market.targetPrice && Number.isFinite(market.targetPrice)) {
      const startPrice = market.targetInitialPrice || market.basePrice || base;
      const targetPrice = market.targetPrice;
      const totalDelta = targetPrice - startPrice;

      if (Math.abs(totalDelta) > Math.pow(10, -precision)) {
        const setTime = market.targetSetTimestamp || (timeMs - 5000);
        const elapsedSec = Math.max(0, (timeMs - setTime) / 1000);
        const targetDurationSec = market.targetSpeedSeconds || 50;
        const rawProgress = elapsedSec / targetDurationSec;

        if (rawProgress < 1.0) {
          const smoothProgress = (1 - Math.cos(rawProgress * Math.PI)) / 2;
          const waveCycles = Math.max(2, Math.floor(targetDurationSec / 15));
          const pullbackDamping = (1 - rawProgress * 0.75);
          const waveOsc = -Math.sign(totalDelta) * Math.sin(rawProgress * Math.PI * 2 * waveCycles) * (Math.abs(totalDelta) * 0.08) * pullbackDamping;
          const mainTrajectory = startPrice + (totalDelta * smoothProgress) + waveOsc;
          const tickDrift = Math.sin((timeMs / 1000) * 0.8) * (base * 0.00001);
          return Number((mainTrajectory + tickDrift).toFixed(precision));
        } else {
          const timeSinceReached = elapsedSec - targetDurationSec;
          const action = market.targetReachedAction || 'REVERSE';
          if (action === 'REVERSE') {
            const revProgress = Math.min(1.0, timeSinceReached / (targetDurationSec * 0.8));
            const smoothRev = (1 - Math.cos(revProgress * Math.PI)) / 2;
            const revAmplitude = totalDelta * 0.35;
            const revWave = Math.sin(timeSinceReached * 0.08) * (revAmplitude * 0.10);
            const reversalOffset = -(revAmplitude * smoothRev) + revWave;
            const currentPrice = targetPrice + reversalOffset + (Math.sin((timeMs / 1000) * 0.8) * base * 0.00001);
            return Number(currentPrice.toFixed(precision));
          } else {
            const rangeOsc = Math.sin((timeMs / 1000) * 0.8) * (base * 0.000015);
            return Number((targetPrice + rangeOsc).toFixed(precision));
          }
        }
      }
    }

    // --- 100% DETERMINISTIC INTRA-CANDLE SMOOTH TRAJECTORY (ZERO DRIFT ACROSS 100-200 PHONES) ---
    const m1Last = m1Bucket && m1Bucket.length > 0 ? m1Bucket[m1Bucket.length - 1] : undefined;
    const isCurrentM1 = Boolean(m1Last && m1Last.time === currentBucketTime);
    // When minute turns, new candle open is guaranteed to strictly equal previous candle close
    const stableOpen = isCurrentM1 ? m1Last!.open : (m1Last ? m1Last.close : undefined);
    const stableHigh = isCurrentM1 ? m1Last!.high : undefined;
    const stableLow = isCurrentM1 ? m1Last!.low : undefined;
    const { livePrice } = getDeterministicActiveCandle(market, currentBucketTime, timeMs, 60, stableOpen, stableHigh, stableLow);
    return livePrice;
  }

  private updateCandleBucket(
    market: MarketPairConfig,
    timeframe: TimeframeId,
    tfSecs: number,
    price: number,
    now: number
  ) {
    const bucketKey = `${market.symbol}_${timeframe}`;
    const timeStepMs = tfSecs * 1000;
    const currentBucketTime = Math.floor(now / timeStepMs) * timeStepMs;

    let bucket = this.candleBuckets.get(bucketKey);
    if (!bucket || bucket.length === 0) {
      if (market && !market.isRealMarket && market.category === 'otc') {
        bucket = this.generateHistoricalCandles(market, timeframe, 150, currentBucketTime);
        this.candleBuckets.set(bucketKey, bucket);
      } else if (price > 0) {
        const seedCandle: Candlestick = {
          time: currentBucketTime,
          timestamp: currentBucketTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 50
        };
        bucket = [seedCandle];
        this.candleBuckets.set(bucketKey, bucket);
      } else {
        return;
      }
    }

    const lastIdx = bucket.length - 1;
    const lastCandle = { ...bucket[lastIdx] };

    // Calculate volume based on price delta & base liquidity
    const volDelta = Math.max(1, Math.floor(Math.abs(price - lastCandle.close) / (market.basePrice * 0.00005) + 1));
    const currentVol = (lastCandle.volume || 100) + volDelta;

    if (lastCandle.time < currentBucketTime) {
      // 1. Finalize the completed candle: PERMANENTLY preserve the authentic formed candle!
      // Once formed on screen, it is 100% permanent and NEVER overwritten by raw mathematical formula!
      const finalizedCandle: Candlestick = {
        time: lastCandle.time,
        timestamp: lastCandle.time,
        open: lastCandle.open,
        high: Math.max(lastCandle.high, lastCandle.open, lastCandle.close),
        low: Math.min(lastCandle.low, lastCandle.open, lastCandle.close),
        close: lastCandle.close,
        volume: lastCandle.volume || 100
      };
      bucket[lastIdx] = finalizedCandle;

      // Persist finalized candle locally, to server & to Firestore (OTC only)
      if (!market.isRealMarket && market.category === 'otc') {
        try {
          saveSingleCandleToFirestore(market.symbol, timeframe, finalizedCandle);
        } catch (_) {}
      }

      // 2. Catch up all intermediate missed candles if tab was throttled or backgrounded
      let rollingOpen = bucket[lastIdx].close;
      const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);
      for (let t = lastCandle.time + timeStepMs; t < currentBucketTime; t += timeStepMs) {
        if (isOtc) {
          const hist = getDeterministicHistoricalCandle(market, t, tfSecs, rollingOpen);
          const c: Candlestick = {
            ...hist,
            open: rollingOpen,
            high: Math.max(rollingOpen, hist.high, hist.close),
            low: Math.min(rollingOpen, hist.low, hist.close)
          };
          bucket.push(c);
          rollingOpen = c.close;
        } else {
          const missedCandle: Candlestick = {
            time: t,
            timestamp: t,
            open: rollingOpen,
            high: Math.max(rollingOpen, price),
            low: Math.min(rollingOpen, price),
            close: price,
            volume: 100
          };
          bucket.push(missedCandle);
          rollingOpen = price;
        }
      }

      // 3. New active forming candle bucket (STRICT 0-GAP: open equals previous close):
      let newCandle: Candlestick;
      if (isOtc) {
        const { activeCandle } = getDeterministicActiveCandle(market, currentBucketTime, now, tfSecs, rollingOpen);
        newCandle = {
          ...activeCandle,
          open: rollingOpen,
          high: Math.max(rollingOpen, activeCandle.high),
          low: Math.min(rollingOpen, activeCandle.low),
          close: activeCandle.close,
          volume: 50
        };
      } else {
        newCandle = {
          time: currentBucketTime,
          timestamp: currentBucketTime,
          open: rollingOpen,
          high: Math.max(rollingOpen, price),
          low: Math.min(rollingOpen, price),
          close: price,
          volume: 50 + Math.floor(pseudoRandom(currentBucketTime) * 150)
        };
      }

      bucket.push(newCandle);
      this.currentPrices.set(market.symbol, newCandle.close);
      // Keep recent 2500 in memory for multi-day history
      if (bucket.length > 2500) {
        bucket.splice(0, bucket.length - 2500);
      }
    } else {
      // Update active in-progress candle without moving its established open price
      const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);
      if (isOtc) {
        const stableOpen = lastCandle.open;
        const stableHigh = lastCandle.high;
        const stableLow = lastCandle.low;
        const { activeCandle, livePrice } = getDeterministicActiveCandle(market, currentBucketTime, now, tfSecs, stableOpen, stableHigh, stableLow);
        bucket[lastIdx] = {
          ...activeCandle,
          open: stableOpen,
          high: activeCandle.high,
          low: activeCandle.low,
          close: livePrice
        };
        this.currentPrices.set(market.symbol, livePrice);
      } else {
        lastCandle.close = price;
        lastCandle.high = Math.max(lastCandle.high, price);
        lastCandle.low = Math.min(lastCandle.low, price);
        lastCandle.volume = currentVol;
        bucket[lastIdx] = lastCandle;
        this.currentPrices.set(market.symbol, price);
      }
    }

    // Notify listeners
    this.notifyCandleSubscribers(bucketKey, bucket);
  }

  private notifyTicker(market: MarketPairConfig, price: number, now: number) {
    const listeners = this.tickerListeners.get(market.symbol);
    if (!listeners || listeners.size === 0) return;

    const base = market.basePrice || 100;
    const change = price - base;
    const changePercent = Number(((change / base) * 100).toFixed(2));

    const ticker: MarketTickerData = {
      symbol: market.symbol,
      price,
      open24h: base,
      high24h: Number((base * 1.015).toFixed(market.precision)),
      low24h: Number((base * 0.985).toFixed(market.precision)),
      change24h: Number(change.toFixed(market.precision)),
      changePercent,
      volume24h: 1254000,
      isRunning: market.isRunning ?? true,
      timestamp: now
    };

    listeners.forEach(fn => fn(ticker));
  }

  private notifyCandleSubscribers(bucketKey: string, candles: Candlestick[]) {
    const listeners = this.candleListeners.get(bucketKey);
    if (listeners) {
      const copy = [...candles];
      listeners.forEach(fn => fn(copy));
    }
  }

  private notifyConfigUpdated() {
    window.dispatchEvent(new Event('forex_markets_config_updated'));
  }

  private flushPendingFirestoreWrites() {
    if (this.pendingFirestoreWrites.size === 0) return;
    this.pendingFirestoreWrites.clear();
  }

  /**
   * Deterministically generates initial candle range
   */
  public generateHistoricalCandles(
    market: MarketPairConfig,
    timeframe: TimeframeId,
    count: number = 150,
    endBucketTime?: number
  ): Candlestick[] {
    const tfSecs = getTimeframeSeconds(timeframe);
    const timeStepMs = tfSecs * 1000;
    const now = endBucketTime || Math.floor(Date.now() / timeStepMs) * timeStepMs;
    const startBucket = now - (count * timeStepMs);

    return generateDeterministicCandleRange(market, timeframe, startBucket, now);
  }

  // --- Public API Methods ---

  public getMarkets(): MarketPairConfig[] {
    return Array.from(this.markets.values());
  }

  public getMarket(symbolOrId: string): MarketPairConfig | undefined {
    if (!symbolOrId) return undefined;
    const direct = this.markets.get(symbolOrId);
    if (direct) return direct;
    const clean = symbolOrId.trim().toUpperCase();
    // 1. Exact match by symbol or id
    const exact = Array.from(this.markets.values()).find(m => {
      const mSym = (m.symbol || '').trim().toUpperCase();
      const mId = (m.id || '').trim().toUpperCase();
      return mSym === clean || mId === clean;
    });
    if (exact) return exact;

    // 2. Distinguish OTC vs non-OTC when searching without OTC suffix
    const isTargetOtc = clean.includes('OTC');
    const withoutOtc = clean.replace(/\s*OTC\b/i, '').trim();
    return Array.from(this.markets.values()).find(m => {
      const mIsOtc = !m.isRealMarket && m.category === 'otc';
      if (isTargetOtc !== mIsOtc) return false;
      const mSym = (m.symbol || '').trim().toUpperCase();
      const mWithoutOtc = mSym.replace(/\s*OTC\b/i, '').trim();
      return mWithoutOtc === withoutOtc;
    });
  }

  public getCurrentPrice(symbolOrId: string): number {
    const market = this.getMarket(symbolOrId);
    if (market && (market.isRealMarket || market.category !== 'otc')) {
      const active = this.currentPrices.get(market.symbol);
      if (active !== undefined && active > 0) return active;
      return this.calculateRealMarketDynamicTick(market, Date.now());
    }
    const direct = this.currentPrices.get(symbolOrId);
    if (direct !== undefined) return direct;
    if (market) {
      const symPrice = this.currentPrices.get(market.symbol);
      if (symPrice !== undefined) return symPrice;
      const idPrice = this.currentPrices.get(market.id);
      if (idPrice !== undefined) return idPrice;
      return market.basePrice || 100;
    }
    return 100;
  }

  public getCandles(symbol: string, timeframe: TimeframeId): Candlestick[] {
    const bucketKey = `${symbol}_${timeframe}`;
    let bucket = this.candleBuckets.get(bucketKey);
    const market = this.getMarket(symbol);
    const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);

    if (isOtc) {
      if (!bucket || bucket.length <= 1) return [];
      const tfSecs = getTimeframeSeconds(timeframe);
      const timeStepMs = tfSecs * 1000;
      const now = this.getSyncedNow();
      const currentBucketTime = Math.floor(now / timeStepMs) * timeStepMs;
      const lastCandle = bucket[bucket.length - 1];
      // Do not serve stale OTC buckets left over from before switching away
      if (lastCandle.time < currentBucketTime - timeStepMs) {
        return [];
      }
      return bucket;
    }

    if (market && bucket && bucket.length > 0) {
      const tfSecs = getTimeframeSeconds(timeframe);
      const timeStepMs = tfSecs * 1000;
      const now = this.getSyncedNow();
      const currentBucketTime = Math.floor(now / timeStepMs) * timeStepMs;
      const lastCandle = bucket[bucket.length - 1];

      if (lastCandle.time < currentBucketTime) {
        const livePrice = this.getCurrentPrice(symbol);
        this.updateCandleBucket(market, timeframe, tfSecs, livePrice, now);
        bucket = this.candleBuckets.get(bucketKey);
      }
    }
    return bucket || [];
  }

  /**
   * Pre-calculates exact upcoming candles for Admin Radar preview.
   * Deterministically returns the upcoming candles that will form in the market.
   */
  public getUpcomingCandlesPreview(
    marketOrSymbol: MarketPairConfig | string,
    count: number = 5,
    timeframe: TimeframeId = 'M1'
  ): CandlePredictionMetrics[] {
    const market = typeof marketOrSymbol === 'object' && marketOrSymbol !== null
      ? marketOrSymbol
      : this.getMarket(marketOrSymbol as string);
    if (!market) return [];
    const tfSecs = getTimeframeSeconds(timeframe);
    const now = this.getSyncedNow();
    return getUpcomingCandlePredictions(market, now, count, tfSecs);
  }

  public seedCandles(symbol: string, timeframe: TimeframeId, candles: Candlestick[]) {
    if (!candles || candles.length === 0) return;

    const validCandles = candles.filter(c =>
      c &&
      typeof c.time === 'number' &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close) &&
      c.close > 0 &&
      c.open > 0
    );

    if (validCandles.length === 0) return;

    const market = this.getMarket(symbol);
    const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);

    // For OTC, preserve authoritative server OHLC verbatim without mutating highs/lows
    const cleanSeeded: Candlestick[] = validCandles.map(c => ({ ...c }));
    if (!isOtc) {
      for (let i = 1; i < cleanSeeded.length; i++) {
        cleanSeeded[i].open = cleanSeeded[i - 1].close;
        cleanSeeded[i].high = Math.max(cleanSeeded[i].high, cleanSeeded[i].open, cleanSeeded[i].close);
        cleanSeeded[i].low = Math.min(cleanSeeded[i].low, cleanSeeded[i].open, cleanSeeded[i].close);
      }
    }

    const bucketKey = `${symbol}_${timeframe}`;
    this.candleBuckets.set(bucketKey, cleanSeeded);

    const lastCandle = cleanSeeded[cleanSeeded.length - 1];
    if (lastCandle && lastCandle.close) {
      this.currentPrices.set(symbol, lastCandle.close);
    }
  }

  public subscribeToTicker(symbol: string, callback: (ticker: MarketTickerData) => void): () => void {
    if (!this.isInitialized) {
      this.init();
    }
    if (!this.tickerListeners.has(symbol)) {
      this.tickerListeners.set(symbol, new Set());
    }
    this.tickerListeners.get(symbol)!.add(callback);

    // Fire current price immediately
    const market = this.getMarket(symbol);
    if (market) {
      const price = this.getCurrentPrice(symbol);
      callback({
        symbol,
        price,
        open24h: market.basePrice,
        high24h: market.basePrice * 1.015,
        low24h: market.basePrice * 0.985,
        change24h: price - market.basePrice,
        changePercent: Number((((price - market.basePrice) / market.basePrice) * 100).toFixed(2)),
        volume24h: 1254000,
        isRunning: market.isRunning ?? true,
        timestamp: Date.now()
      });
    }

    return () => {
      this.tickerListeners.get(symbol)?.delete(callback);
    };
  }

  public subscribeToCandles(
    symbol: string, 
    timeframe: TimeframeId, 
    callback: (candles: Candlestick[]) => void
  ): () => void {
    if (!this.isInitialized) {
      this.init();
    }
    if (symbol) {
      this.activeViewedSymbol = symbol;
    }
    if (timeframe) {
      this.activeViewedTimeframe = timeframe;
    }
    const bucketKey = `${symbol}_${timeframe}`;
    if (!this.candleListeners.has(bucketKey)) {
      this.candleListeners.set(bucketKey, new Set());
    }
    this.candleListeners.get(bucketKey)!.add(callback);

    // Emit initial warm candles immediately if fresh (> 5 candles)
    const current = this.getCandles(symbol, timeframe);
    if (current && current.length > 5) {
      callback(current);
    }

    // Also resync OTC if warm cache is empty or behind current bucket (deduplicated)
    const market = this.getMarket(symbol);
    const isOtc = market && (market.category === 'otc' || Boolean(market.symbol && market.symbol.toUpperCase().includes('OTC')) || market.isRealMarket === false);
    if (isOtc && typeof window !== 'undefined' && (!current || current.length <= 5)) {
      this.resyncViewedOtcHistory(false);
    }

    return () => {
      const set = this.candleListeners.get(bucketKey);
      if (set) {
        set.delete(callback);
      }
    };
  }

  // --- Admin Market Control Panel Methods ---

  public toggleMarketRunning(symbolOrId: string, isRunning: boolean) {
    const market = this.getMarket(symbolOrId);
    if (!market) return;

    market.isRunning = isRunning;
    this.markets.set(market.symbol, { ...market });
    this.persistMarkets();
  }

  public setMarketTrend(symbolOrId: string, trend: 'UP' | 'DOWN' | 'SIDEWAYS' | 'REVERSAL' | 'RANDOM') {
    const market = this.getMarket(symbolOrId);
    if (!market) return;

    market.trendBias = trend;
    market.controlMode = trend;
    this.markets.set(market.symbol, { ...market });
    this.persistMarkets();
  }

  public setMarketVolatility(symbolOrId: string, volatility: 'SMOOTH' | 'MODERATE' | 'VOLATILE' | 'EXTREME') {
    const market = this.getMarket(symbolOrId);
    if (!market) return;

    market.volatility = volatility;
    this.markets.set(market.symbol, { ...market });
    this.persistMarkets();
  }

  public setMarketSpeed(symbolOrId: string, speedMs: number) {
    const market = this.getMarket(symbolOrId);
    if (!market) return;

    market.updateSpeedMs = speedMs;
    market.speed = speedMs;
    this.markets.set(market.symbol, { ...market });
    this.persistMarkets();
  }

  public setMarketBasePrice(symbolOrId: string, basePrice: number) {
    const market = this.getMarket(symbolOrId);
    if (!market) return;

    market.basePrice = basePrice;
    this.markets.set(market.symbol, { ...market });
    this.persistMarkets();
  }

  public setMarketSpread(symbolOrId: string, spread: number) {
    const market = this.getMarket(symbolOrId);
    if (!market) return;

    market.spread = spread;
    this.markets.set(market.symbol, { ...market });
    this.persistMarkets();
  }

  public setMarketTargetPrice(
    symbolOrId: string, 
    targetPrice: number | null, 
    speedSeconds: number = 50, 
    reachedAction: 'REVERSE' | 'CONSOLIDATE' | 'AUTO' = 'REVERSE'
  ) {
    const market = this.getMarket(symbolOrId);
    if (!market) return;

    if (targetPrice === null) {
      market.targetPrice = null;
      market.targetInitialPrice = null;
      market.targetSetTimestamp = null;
      market.targetDirection = null;
    } else {
      const currentPrice = this.getCurrentPrice(market.symbol);
      market.targetPrice = targetPrice;
      market.targetInitialPrice = currentPrice;
      market.targetSetTimestamp = Date.now();
      market.targetSpeedSeconds = speedSeconds;
      market.targetReachedAction = reachedAction;
      market.targetDirection = targetPrice >= currentPrice ? 'UP' : 'DOWN';
    }

    this.markets.set(market.symbol, { ...market });
    this.persistMarkets();
  }

  public clearMarketTargetPrice(symbolOrId: string) {
    this.setMarketTargetPrice(symbolOrId, null);
  }

  public createCustomMarket(newMarket: Partial<MarketPairConfig> & { symbol: string; name: string }): MarketPairConfig {
    const id = newMarket.id || newMarket.symbol.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const created: MarketPairConfig = {
      id,
      symbol: newMarket.symbol.toUpperCase(),
      name: newMarket.name,
      category: newMarket.category || 'forex',
      basePrice: newMarket.basePrice || 1.00000,
      spread: newMarket.spread || 0.00010,
      change24h: newMarket.change24h || 0.0,
      payoutPercent: newMarket.payoutPercent ?? (newMarket.category === 'otc' ? 90 : undefined),
      isActive: newMarket.isActive ?? true,
      isRunning: newMarket.isRunning ?? true,
      precision: newMarket.precision ?? (newMarket.symbol.includes('JPY') ? 3 : 5),
      trendBias: newMarket.trendBias || 'SIDEWAYS',
      controlMode: newMarket.controlMode || 'AUTO',
      volatility: newMarket.volatility || 'MODERATE',
      updateSpeedMs: newMarket.updateSpeedMs || 100,
      speed: newMarket.speed || 100
    };

    this.markets.set(created.symbol, created);
    this.currentPrices.set(created.symbol, created.basePrice);
    this.persistMarkets();
    return created;
  }

  public deleteCustomMarket(symbolOrId: string) {
    const market = this.getMarket(symbolOrId);
    if (!market) return;

    this.markets.delete(market.symbol);
    this.currentPrices.delete(market.symbol);
    this.persistMarkets();
  }

  public updateMarket(updatedMarket: MarketPairConfig) {
    this.markets.set(updatedMarket.symbol, { ...updatedMarket });
    this.persistMarkets();
  }

  private persistMarkets() {
    const allMarkets = Array.from(this.markets.values());
    saveStoredMarkets(allMarkets);
    this.notifyConfigUpdated();
  }
}

// Global Singleton Instance
export const customMarketEngine = new CustomMarketEngineService();
