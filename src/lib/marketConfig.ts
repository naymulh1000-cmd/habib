import { db, isQuotaExceeded, isQuotaError } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_MARKETS, MarketPairConfig } from './defaultMarkets';
import { getLatestGoldPrice } from './goldLiveDataService';
import { realTimeLiveMarketService } from './realTimeLiveMarketService';
import { Candlestick } from '../types';

export type { MarketPairConfig };
export { DEFAULT_MARKETS };

import {
  getSyncedMarketPrice,
  getDeterministicBoundaryPrice,
  getDeterministicHistoricalCandle,
  getIntraCandlePriceActionNoise,
  getDeterministicActiveCandle,
  setMarketLiveExposure,
  getMarketLiveExposure,
  type MarketExposure
} from './deterministicMarketEngine';

export {
  getSyncedMarketPrice,
  getDeterministicBoundaryPrice,
  getDeterministicHistoricalCandle,
  getIntraCandlePriceActionNoise,
  getDeterministicActiveCandle,
  setMarketLiveExposure,
  getMarketLiveExposure,
  type MarketExposure
};

const LOCAL_MARKETS_KEY = 'forex_trading_markets_config';

let _marketConfigBroadcastChannel: BroadcastChannel | null = null;
function getMarketConfigBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    if (!_marketConfigBroadcastChannel) {
      try {
        _marketConfigBroadcastChannel = new BroadcastChannel('forex_markets_config_channel');
      } catch (_) {
        _marketConfigBroadcastChannel = null;
      }
    }
    return _marketConfigBroadcastChannel;
  }
  return null;
}

export function getStoredMarkets(): MarketPairConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_MARKETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged: MarketPairConfig[] = [];
        DEFAULT_MARKETS.forEach(dm => {
          const found = parsed.find((p: any) => p.id === dm.id || p.symbol === dm.symbol);
          if (found) {
            merged.push({
              ...dm,
              ...found,
              basePrice: dm.isRealMarket ? dm.basePrice : (found.basePrice ?? dm.basePrice),
              isRealMarket: dm.isRealMarket,
              payoutPercent: found.payoutPercent ?? dm.payoutPercent ?? 90
            });
          } else {
            merged.push(dm);
          }
        });
        return merged;
      }
    }
  } catch (_) {}
  return DEFAULT_MARKETS;
}

export function saveStoredMarkets(markets: MarketPairConfig[]) {
  try {
    localStorage.setItem(LOCAL_MARKETS_KEY, JSON.stringify(markets));
    window.dispatchEvent(new Event('forex_markets_config_updated'));
    const channel = getMarketConfigBroadcastChannel();
    if (channel) {
      channel.postMessage(markets);
    }
  } catch (_) {}

  try {
    fetch('/api/markets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markets })
    }).catch(() => {});
  } catch (_) {}

  try {
    setDoc(doc(db, 'config', 'trading_markets'), {
      markets,
      updatedAt: new Date().toISOString()
    }).catch(() => {});
  } catch (_) {}
}

export async function fetchRemoteMarkets(): Promise<MarketPairConfig[] | null> {
  try {
    const res = await fetch('/api/markets');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.markets) && data.markets.length > 0) {
        localStorage.setItem(LOCAL_MARKETS_KEY, JSON.stringify(data.markets));
        window.dispatchEvent(new Event('forex_markets_config_updated'));
        return data.markets;
      }
    }
  } catch (_) {}

  try {
    const snap = await getDoc(doc(db, 'config', 'trading_markets'));
    if (snap.exists() && snap.data()?.markets) {
      const remote = snap.data().markets as MarketPairConfig[];
      if (Array.isArray(remote) && remote.length > 0) {
        localStorage.setItem(LOCAL_MARKETS_KEY, JSON.stringify(remote));
        window.dispatchEvent(new Event('forex_markets_config_updated'));
        return remote;
      }
    }
  } catch (_) {}
  return null;
}

export function subscribeToMarketConfig(callback: (markets: MarketPairConfig[]) => void) {
  // Cross-tab broadcast listener
  const handleBroadcast = (event: MessageEvent) => {
    if (Array.isArray(event.data) && event.data.length > 0) {
      try {
        localStorage.setItem(LOCAL_MARKETS_KEY, JSON.stringify(event.data));
      } catch (_) {}
      callback(event.data);
    }
  };

  const channel = getMarketConfigBroadcastChannel();
  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  // Periodic server polling to ensure 100% global consistency across devices
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/markets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.markets) && data.markets.length > 0) {
          callback(data.markets);
        }
      }
    } catch (_) {}
  }, 4000);

  if (isQuotaExceeded()) {
    return () => {
      clearInterval(pollTimer);
      const ch = getMarketConfigBroadcastChannel();
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  }

  try {
    const unsub = onSnapshot(doc(db, 'config', 'trading_markets'), (snap) => {
      if (snap.exists() && snap.data()?.markets) {
        const remote = snap.data().markets as MarketPairConfig[];
        if (Array.isArray(remote) && remote.length > 0) {
          try {
            localStorage.setItem(LOCAL_MARKETS_KEY, JSON.stringify(remote));
          } catch (_) {}
          window.dispatchEvent(new Event('forex_markets_config_updated'));
          callback(remote);
        }
      } else {
        // Initialize default markets if missing in Firestore
        setDoc(doc(db, 'config', 'trading_markets'), {
          markets: DEFAULT_MARKETS,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    }, (err) => {
      if (!isQuotaError(err)) {
        console.warn('Market config snapshot listener error:', err);
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsub();
      const ch = getMarketConfigBroadcastChannel();
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  } catch (_) {
    return () => {
      clearInterval(pollTimer);
      const ch = getMarketConfigBroadcastChannel();
      if (ch) {
        ch.removeEventListener('message', handleBroadcast);
      }
    };
  }
}

export function hashSymbol(sym: string): number {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) {
    hash = ((hash << 5) - hash) + sym.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 100;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Master Multi-Pattern Rhythm Sequences per symbol archetype
export const SYMBOL_PATTERN_TEMPLATES: Record<string, ('GREEN' | 'RED')[]> = {
  // Forex Primary (EUR/USD, GBP/USD, etc.) - Balanced natural flow with swings
  forex_standard: [
    'GREEN', 'GREEN',
    'RED', 'RED',
    'RED', 'RED', 'RED',
    'GREEN', 'GREEN',
    'RED', 'RED', 'RED',
    'GREEN',
    'RED',
    'GREEN', 'GREEN',
    'GREEN', 'GREEN', 'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN',
    'RED', 'RED', 'RED',
    'GREEN', 'GREEN',
    'RED', 'GREEN', 'RED', 'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN',
    'RED', 'RED', 'RED',
    'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN'
  ],
  // Forex High Momentum / JPY - Swift waves & pullbacks
  forex_momentum: [
    'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN',
    'RED',
    'GREEN', 'GREEN',
    'RED', 'RED', 'RED',
    'GREEN', 'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN', 'GREEN',
    'RED', 'RED',
    'GREEN',
    'RED', 'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN',
    'RED', 'GREEN', 'RED',
    'GREEN', 'GREEN',
    'RED', 'RED', 'RED'
  ],
  // Binary OTC Pairs - High liquidity micro-waves with independent distinct patterns
  binary_otc_primary: [
    'GREEN', 'GREEN', 'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN',
    'RED', 'RED', 'RED',
    'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN',
    'RED', 'RED',
    'GREEN',
    'RED', 'RED', 'RED',
    'GREEN', 'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN',
    'RED', 'GREEN', 'GREEN',
    'RED', 'RED', 'RED'
  ],
  // Crypto OTC Pairs - Trend waves & channel consolidations
  crypto_otc: [
    'RED', 'RED', 'RED',
    'GREEN', 'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN',
    'RED',
    'GREEN', 'GREEN',
    'RED', 'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN',
    'RED', 'RED', 'RED',
    'GREEN',
    'RED', 'RED',
    'GREEN', 'GREEN', 'GREEN'
  ]
};

/**
 * Calculates deterministic candlestick metrics for any timeframe bucket.
 * Implements:
 * 1. Independent per-symbol seed and profile (Forex != Binary OTC).
 * 2. Natural variation (e.g. 2 Red, 2 Green, 3 Red, 1 small Green, 1 Red, 2 Green).
 * 3. Strict TradingView/MT5 styling with clean body and short-to-medium wicks (no long spikes).
 * 4. Admin Overrides: UP (80% Green), DOWN (80% Red), SIDEWAYS/RANGING (tight channels), REVERSAL.
 */
export interface CandlePredictionMetrics {
  time: number;
  direction: 'GREEN' | 'RED';
  sizeMultiplier: number;
  bodyDelta: number;
  wickHighDelta: number;
  wickLowDelta: number;
  phaseName: 'Impulse Rally' | 'Momentum Drop' | 'Pullback Retrace' | 'Breakout Expansion' | 'Consolidation Doji' | 'Exhaustion Reversal';
  confidence: number;
  isBreakout: boolean;
  predictedOpen?: number;
  predictedClose?: number;
  predictedHigh?: number;
  predictedLow?: number;
}

/**
 * Multi-Phase Market Physics Engine for Ultra-Realistic OTC & Synthetic Candlesticks.
 * Implements:
 * 1. Multi-Wave Elliott / Wyckoff Structure (Impulse -> Pullback -> Breakout -> Climax Rejection -> Consolidation).
 * 2. Real price-action wick dynamics (Judas swing open tests, rejection tails, dojis at swing extremes).
 * 3. 100% Deterministic global-clock seed synchronization across all mobile & desktop clients.
 * 4. Deterministic future candle roadmap for Admin radar prediction.
 */
export function getCandleBucketMetrics(
  market: MarketPairConfig,
  bucketTime: number,
  timeframeSecs: number = 60
): CandlePredictionMetrics {
  const base = market.basePrice || 100;
  const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);
  const symHash = hashSymbol(market.symbol || 'EUR/USD');
  const isOTC = market.category === 'otc' || (market.symbol || '').includes('OTC');
  const bucketIdx = Math.floor(bucketTime / (timeframeSecs * 1000));

  const volSetting = market.volatility || 'SMOOTH';
  const volMult = volSetting === 'EXTREME' ? 1.6 : volSetting === 'VOLATILE' ? 1.3 : volSetting === 'MODERATE' ? 1.0 : 0.95;
  const wickSetting = market.wickSize || 'NATURAL';
  const wickMult = wickSetting === 'SMALL' ? 0.65 : wickSetting === 'LONG' ? 1.35 : 1.0;

  // Calibrate healthy medium-to-large pip base units per asset class (crisp, prominent candles)
  let baseUnit = 0.00180; // 18 pips base for 5-digit pairs (EUR/USD, GBP/USD, AUD/USD)
  if (precision >= 4) {
    if ((market.symbol || '').includes('GBP')) {
      baseUnit = 0.00220; // 22 pips for GBP
    } else {
      baseUnit = 0.00180; // 18 pips for EUR/USD, AUD/USD
    }
  } else if (precision === 3) {
    baseUnit = 0.220; // 22 pips for USD/JPY
  } else if ((market.symbol || '').includes('XAU') || (market.symbol || '').includes('GOLD')) {
    baseUnit = 4.80; // $4.80 for Gold
  } else if ((market.symbol || '').includes('BTC')) {
    baseUnit = Math.max(120, Number((base * 0.0018).toFixed(precision))); // $120+ for BTC
  } else if ((market.symbol || '').includes('ETH')) {
    baseUnit = Math.max(9.50, Number((base * 0.0028).toFixed(precision))); // $9.50 for ETH
  } else {
    baseUnit = Math.max(Math.pow(10, -precision) * 16, Number((base * 0.0016).toFixed(precision)));
  }

  baseUnit = baseUnit * volMult;
  // Per-symbol deterministic pseudo-random seed generator
  const seed = (symHash * 37) + bucketIdx + (isOTC ? 9187 : 0);
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 29);
  const r3 = seededRandom(seed + 61);
  const r4 = seededRandom(seed + 103);

  // 1. Determine Market Phase & Direction
  const effectiveMode = market.controlMode || market.trendBias || 'AUTO';
  let direction: 'GREEN' | 'RED' = 'GREEN';
  let phaseName: CandlePredictionMetrics['phaseName'] = 'Impulse Rally';
  let sizeMultiplier = 1.0;
  let isBreakout = false;
  let confidence = 88;

  if (effectiveMode === 'UP') {
    // Bullish Admin Mode: ~82% Green, 18% shallow pullbacks with organic variety
    const upPattern: ('GREEN' | 'RED')[] = ['GREEN', 'GREEN', 'GREEN', 'RED', 'GREEN', 'GREEN', 'GREEN', 'GREEN', 'RED', 'GREEN', 'GREEN'];
    direction = upPattern[Math.abs(bucketIdx + (symHash % 7)) % upPattern.length];
    phaseName = direction === 'GREEN' ? 'Impulse Rally' : 'Pullback Retrace';
    sizeMultiplier = direction === 'GREEN' ? (0.90 + r2 * 0.55) : (0.45 + r2 * 0.30);
    confidence = 94;
  } else if (effectiveMode === 'DOWN') {
    // Bearish Admin Mode: ~82% Red, 18% shallow relief bounces with organic variety
    const downPattern: ('GREEN' | 'RED')[] = ['RED', 'RED', 'RED', 'GREEN', 'RED', 'RED', 'RED', 'RED', 'GREEN', 'RED', 'RED'];
    direction = downPattern[Math.abs(bucketIdx + (symHash % 7)) % downPattern.length];
    phaseName = direction === 'RED' ? 'Momentum Drop' : 'Pullback Retrace';
    sizeMultiplier = direction === 'RED' ? (0.90 + r2 * 0.55) : (0.45 + r2 * 0.30);
    confidence = 94;
  } else if (effectiveMode === 'SIDEWAYS' || effectiveMode === 'RANDOM') {
    // Orderly Support & Resistance Range Box
    direction = ((bucketIdx + (symHash % 2)) % 2 === 0) ? 'GREEN' : 'RED';
    phaseName = 'Consolidation Doji';
    sizeMultiplier = 0.35 + (r2 * 0.40);
    confidence = 82;
  } else {
    // PURE REALISTIC PRICE ACTION & MARKET STRUCTURE (48-Candle Wave Cycle)
    // Structure: Impulse (HH/HL) -> FVG Imbalance -> Retest / Order Block -> Breakout -> S/R Reversal -> Bearish Impulse -> Range Box
    const waveLength = 48;
    const offset = Math.abs(symHash % waveLength);
    const waveStep = Math.abs(bucketIdx + offset) % waveLength;

    if (waveStep < 12) {
      // Phase 1: Bullish Impulse Expansion & Fair Value Gap (FVG)
      // 3 Green Expansion candles -> 1 shallow pullback into FVG -> 2 Green Breakout candles
      const subPattern = ['GREEN', 'GREEN', 'GREEN', 'RED', 'GREEN', 'GREEN', 'RED', 'GREEN', 'GREEN', 'GREEN', 'RED', 'GREEN'];
      direction = subPattern[waveStep % subPattern.length] as 'GREEN' | 'RED';

      if (waveStep === 1 || waveStep === 2 || waveStep === 8) {
        phaseName = 'Breakout Expansion';
        sizeMultiplier = 1.35 + (r2 * 0.40); // Large powerful expansion candle (1.35x - 1.75x)
        isBreakout = true;
      } else if (direction === 'RED') {
        phaseName = 'Pullback Retrace'; // Measured 50% retest into FVG
        sizeMultiplier = 0.45 + (r2 * 0.25); // Small healthy pullback candle
      } else {
        phaseName = 'Impulse Rally';
        sizeMultiplier = 0.85 + (r2 * 0.40); // Medium trend continuation candle
      }
      confidence = 92;
    } else if (waveStep < 18) {
      // Phase 2: Higher High (HH) Formation & Resistance Retest
      const subPattern = ['GREEN', 'RED', 'RED', 'GREEN', 'GREEN', 'RED'];
      direction = subPattern[(waveStep - 12) % subPattern.length] as 'GREEN' | 'RED';
      if (direction === 'RED') {
        phaseName = 'Pullback Retrace';
        sizeMultiplier = 0.50 + (r2 * 0.25);
      } else {
        phaseName = 'Impulse Rally';
        sizeMultiplier = 0.90 + (r2 * 0.35);
      }
      confidence = 88;
    } else if (waveStep < 24) {
      // Phase 3: Major Resistance Key Level Reversal (Exhaustion Pin-Bar)
      if (waveStep === 23) {
        direction = 'RED';
        phaseName = 'Exhaustion Reversal'; // Shooting star / rejection pin-bar at resistance (small body, massive wick)
        sizeMultiplier = 0.40 + (r2 * 0.15);
      } else {
        const subPattern = ['GREEN', 'GREEN', 'RED', 'GREEN', 'RED'];
        direction = subPattern[(waveStep - 18) % subPattern.length] as 'GREEN' | 'RED';
        phaseName = direction === 'GREEN' ? 'Impulse Rally' : 'Consolidation Doji';
        sizeMultiplier = direction === 'GREEN' ? (0.80 + r2 * 0.30) : (0.30 + r2 * 0.20);
      }
      confidence = 90;
    } else if (waveStep < 36) {
      // Phase 4: Bearish Impulse Wave (LL / LH) & Bearish Fair Value Gap
      const subPattern = ['RED', 'RED', 'RED', 'GREEN', 'RED', 'RED', 'GREEN', 'RED', 'RED', 'RED', 'GREEN', 'RED'];
      direction = subPattern[(waveStep - 24) % subPattern.length] as 'GREEN' | 'RED';

      if (waveStep === 25 || waveStep === 26 || waveStep === 32) {
        phaseName = 'Breakout Expansion';
        sizeMultiplier = 1.35 + (r2 * 0.40); // Large powerful bearish expansion
        isBreakout = true;
      } else if (direction === 'GREEN') {
        phaseName = 'Pullback Retrace'; // Relief bounce into bearish FVG
        sizeMultiplier = 0.45 + (r2 * 0.25);
      } else {
        phaseName = 'Momentum Drop';
        sizeMultiplier = 0.85 + (r2 * 0.40);
      }
      confidence = 93;
    } else if (waveStep < 42) {
      // Phase 5: Key Support Level Bounce (Bullish Hammer / Support Rejection)
      if (waveStep === 36) {
        direction = 'GREEN';
        phaseName = 'Exhaustion Reversal'; // Hammer pin-bar rejecting support (small body, massive bottom wick)
        sizeMultiplier = 0.40 + (r2 * 0.15);
      } else {
        const subPattern = ['GREEN', 'GREEN', 'RED', 'GREEN', 'RED', 'GREEN'];
        direction = subPattern[(waveStep - 36) % subPattern.length] as 'GREEN' | 'RED';
        phaseName = direction === 'GREEN' ? 'Impulse Rally' : 'Pullback Retrace';
        sizeMultiplier = 0.75 + (r2 * 0.35);
      }
      confidence = 89;
    } else {
      // Phase 6: Support / Resistance Consolidation Range (Horizontal Box Accumulation)
      direction = ((waveStep % 2) === 0) ? 'GREEN' : 'RED';
      phaseName = 'Consolidation Doji';
      sizeMultiplier = 0.30 + (r2 * 0.30);
      confidence = 84;
    }
  }

  // 2. Realistic Dynamic Candle Body Delta with Organic Buyer-Seller Volume Variety
  const minPip = Math.max(Math.pow(10, -precision) * 4, Number((baseUnit * 0.25).toFixed(precision)));
  const bodyDelta = Math.max(minPip, Number((baseUnit * sizeMultiplier).toFixed(precision)));

  // 3. Realistic Dynamic Wicks (Quotex / TradingView / MT5 Real Market Shadows)
  let wickHighDelta = 0;
  let wickLowDelta = 0;

  if (phaseName === 'Exhaustion Reversal') {
    // Single-sided clean rejection pin-bar wick at Support or Resistance (Huge visible rejection shadow!)
    if (direction === 'RED') {
      // Shooting star at Resistance: long top wick (140% - 220% of body), tiny bottom wick
      wickHighDelta = Number((bodyDelta * (1.40 + r3 * 0.60) * wickMult).toFixed(precision));
      wickLowDelta = Number((bodyDelta * (0.08 + r4 * 0.10) * wickMult).toFixed(precision));
    } else {
      // Hammer at Support: long bottom wick (140% - 220% of body), tiny top wick
      wickLowDelta = Number((bodyDelta * (1.40 + r3 * 0.60) * wickMult).toFixed(precision));
      wickHighDelta = Number((bodyDelta * (0.08 + r4 * 0.10) * wickMult).toFixed(precision));
    }
  } else if (phaseName === 'Consolidation Doji') {
    // Symmetrical prominent wicks on both sides of small body (70% - 130% of body)
    const dojiWick = Number((bodyDelta * (0.75 + r3 * 0.45) * wickMult).toFixed(precision));
    wickHighDelta = dojiWick;
    wickLowDelta = dojiWick;
  } else if (phaseName === 'Breakout Expansion') {
    // Strong momentum bar: dominant body, healthy clean wicks (18% - 32% of body)
    if (direction === 'GREEN') {
      wickLowDelta = Number((bodyDelta * (0.20 + r3 * 0.12) * wickMult).toFixed(precision));
      wickHighDelta = Number((bodyDelta * (0.16 + r4 * 0.12) * wickMult).toFixed(precision));
    } else {
      wickHighDelta = Number((bodyDelta * (0.20 + r3 * 0.12) * wickMult).toFixed(precision));
      wickLowDelta = Number((bodyDelta * (0.16 + r4 * 0.12) * wickMult).toFixed(precision));
    }
  } else {
    // Standard healthy trend & pullback candles:
    // Natural prominent visible wicks (28% - 50% of body on entry, 22% - 40% on close):
    // Bullish candle: prominent lower test wick (28-48%), healthy upper wick (22-38%)
    // Bearish candle: prominent upper test wick (28-48%), healthy lower wick (22-38%)
    if (direction === 'GREEN') {
      wickLowDelta = Number((bodyDelta * (0.30 + r3 * 0.18) * wickMult).toFixed(precision));
      wickHighDelta = Number((bodyDelta * (0.24 + r4 * 0.16) * wickMult).toFixed(precision));
    } else {
      wickHighDelta = Number((bodyDelta * (0.30 + r3 * 0.18) * wickMult).toFixed(precision));
      wickLowDelta = Number((bodyDelta * (0.24 + r4 * 0.16) * wickMult).toFixed(precision));
    }
  }

  return {
    time: bucketTime,
    direction,
    sizeMultiplier,
    bodyDelta,
    wickHighDelta,
    wickLowDelta,
    phaseName,
    confidence,
    isBreakout
  };
}

/**
 * Pre-calculates exact future candles for the Admin Radar.
 * Because all algorithms are 100% deterministic from (market, timestamp),
 * this provides the exact upcoming candle trajectory that the engine will execute.
 */
export function getUpcomingCandlePredictions(
  market: MarketPairConfig,
  currentTimeMs: number,
  count: number = 5,
  timeframeSecs: number = 60
): CandlePredictionMetrics[] {
  const timeStepMs = timeframeSecs * 1000;
  const currentBucketTime = Math.floor(currentTimeMs / timeStepMs) * timeStepMs;

  const predictions: CandlePredictionMetrics[] = [];

  for (let i = 1; i <= count; i++) {
    const futureBucketTime = currentBucketTime + (i * timeStepMs);
    const candle = getDeterministicHistoricalCandle(market, futureBucketTime, timeframeSecs);
    const isUp = candle.close >= candle.open;
    const bodyDelta = Math.abs(candle.close - candle.open);
    const wickHighDelta = Math.max(0, candle.high - Math.max(candle.open, candle.close));
    const wickLowDelta = Math.max(0, Math.min(candle.open, candle.close) - candle.low);

    predictions.push({
      time: futureBucketTime,
      direction: isUp ? 'GREEN' : 'RED',
      sizeMultiplier: 1.0,
      bodyDelta,
      wickHighDelta,
      wickLowDelta,
      phaseName: isUp ? 'Impulse Rally' : 'Momentum Drop',
      confidence: 98,
      isBreakout: false,
      predictedOpen: candle.open,
      predictedClose: candle.close,
      predictedHigh: candle.high,
      predictedLow: candle.low,
    });
  }

  return predictions;
}






/**
 * Generates Future Deterministic Forecast Candles for Admin View (e.g. Next 5 Candles)
 */
export function getFutureCandlesForecast(
  market: MarketPairConfig,
  currentBucketTimeMs: number,
  tfSecs: number = 60,
  count: number = 5
): Array<{
  index: number;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  direction: 'UP' | 'DOWN';
  delta: number;
  confidence: number;
}> {
  const timeStepMs = tfSecs * 1000;
  const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);
  const forecast: Array<{
    index: number;
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    direction: 'UP' | 'DOWN';
    delta: number;
    confidence: number;
  }> = [];

  for (let i = 1; i <= count; i++) {
    const bucketTime = currentBucketTimeMs + (i * timeStepMs);
    const candle = getDeterministicHistoricalCandle(market, bucketTime, tfSecs);
    const isUp = candle.close >= candle.open;
    forecast.push({
      index: i,
      time: bucketTime,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      direction: isUp ? 'UP' : 'DOWN',
      delta: Number((candle.close - candle.open).toFixed(precision)),
      confidence: 97 + ((bucketTime % 30) / 10)
    });
  }

  return forecast;
}



/**
 * International Standard CFD Contract Size per 1.00 Lot:
 * - Forex Standard Currency Pairs (EUR/USD, GBP/USD, etc.): 100,000 units
 * - Forex JPY Pairs (USD/JPY, etc.): 1,000 units (scaled for direct USD conversion)
 * - Gold Commodities (XAU/USD, GOLD OTC): 100 troy ounces per lot
 * - Silver Commodities (XAG/USD): 5,000 troy ounces per lot
 * - Crude Oil / Energies (USOIL, UKOIL, BRENT): 100 barrels per lot
 * - Crypto (BTC/USD, ETH/USD, SOL/USD, etc.): 1 coin per lot
 */
export function getMarketContractUnits(symbol: string): number {
  if (!symbol) return 100000;
  const sym = symbol.toUpperCase();

  // Crypto: 1 coin/token per lot (BTC, ETH, SOL, etc.)
  if (
    sym.includes('BTC') ||
    sym.includes('ETH') ||
    sym.includes('SOL') ||
    sym.includes('DOGE') ||
    sym.includes('XRP') ||
    sym.includes('CRYPTO')
  ) {
    return 1;
  }

  // Gold: 1 Lot = 100 Troy Ounces (XAU/USD, GOLD OTC)
  if (sym.includes('XAU') || sym.includes('GOLD')) {
    return 100;
  }

  // Silver: 1 Lot = 5000 Troy Ounces
  if (sym.includes('XAG') || sym.includes('SILVER')) {
    return 5000;
  }

  // Crude Oil / Energy: 1 Lot = 100 Barrels
  if (sym.includes('OIL') || sym.includes('WTI') || sym.includes('BRENT')) {
    return 100;
  }

  // JPY Currency Pairs
  if (sym.includes('JPY')) {
    return 1000;
  }

  // Standard Forex Currencies
  return 100000;
}

export function calculateForexPnl(
  trade: { symbol: string; lotSize?: number; type: string; entryPrice: number },
  currentPrice: number
): number {
  const lot = trade.lotSize || 0.01;
  const contractUnits = getMarketContractUnits(trade.symbol);
  const direction = trade.type === 'BUY' || trade.type === 'UP' ? 1 : -1;
  const priceDiff = currentPrice - trade.entryPrice;
  return Number((priceDiff * contractUnits * lot * direction).toFixed(2));
}

export function getCanonicalAnchorPrice(market: MarketPairConfig, timestamp: number, tfSecs: number = 60): number {
  if (market.symbol === 'XAU/USD' || market.id === 'xau_usd') {
    const liveGold = realTimeLiveMarketService.getLatestPrice('XAU/USD');
    if (liveGold && liveGold > 0) {
      return Number(liveGold.toFixed(market.precision || 2));
    }
  }

  const basePrice = getSyncedMarketPrice(market, timestamp, tfSecs);
  const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);
  return Number(basePrice.toFixed(precision));
}

export function getTimeframeSeconds(tf: string): number {
  if (!tf) return 60;
  switch (tf.toUpperCase()) {
    case 'S1':
    case '1S': return 1;
    case 'S5':
    case '5S': return 5;
    case 'S10':
    case '10S': return 10;
    case 'S15':
    case '15S': return 15;
    case 'S30':
    case '30S': return 30;
    case 'M1':
    case '1M': return 60;
    case 'M5':
    case '5M': return 300;
    case 'M15':
    case '15M': return 900;
    case 'M30':
    case '30M': return 1800;
    case 'H1':
    case '1H': return 3600;
    case 'H4':
    case '4H': return 14400;
    case 'D1':
    case '1D': return 86400;
    default: return 60;
  }
}
