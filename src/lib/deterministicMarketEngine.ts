import { MarketPairConfig } from './defaultMarkets';
import { Candlestick } from '../types';
import { realTimeLiveMarketService } from './realTimeLiveMarketService';

export function hashSymbol(sym: string): number {
  let hash = 0;
  for (let i = 0; i < sym.length; i++) {
    hash = ((hash << 5) - hash) + sym.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) + 100;
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

export interface CandlePredictionMetrics {
  time: number;
  direction: 'GREEN' | 'RED';
  sizeMultiplier: number;
  bodyDelta: number;
  wickHighDelta: number;
  wickLowDelta: number;
  phaseName: string;
  confidence: number;
  isBreakout: boolean;
  predictedOpen?: number;
  predictedClose?: number;
  predictedHigh?: number;
  predictedLow?: number;
}

export interface MarketExposure {
  symbol: string;
  upVolume: number;
  downVolume: number;
  netExposure: number;
  biasDirection: 'UP' | 'DOWN' | 'NEUTRAL';
  activeOrdersCount?: number;
  heavySide?: 'UP' | 'DOWN' | 'NONE';
  heavyEntryPrice?: number;
  minRemainingSec?: number;
  enabled?: boolean;
}

const liveExposureStore: Map<string, MarketExposure> = new Map();

export function setMarketLiveExposure(symbol: string, exposure: MarketExposure) {
  if (!symbol) return;
  liveExposureStore.set(symbol.toUpperCase(), exposure);
}

export function getMarketLiveExposure(symbol: string): MarketExposure | undefined {
  if (!symbol) return undefined;
  const exp = liveExposureStore.get(symbol.toUpperCase());
  if (!exp) return undefined;
  if (exp.enabled === false || exp.biasDirection === 'NEUTRAL') {
    return undefined;
  }
  return exp;
}

// ─────────────────────────────────────────────────────────────
// STOCHASTIC PROCESS ENGINE: GBM WITH MEAN REVERSION (ORNSTEIN-UHLENBECK)
// dS_t = theta * (mu - S_t) * dt + sigma * S_t * dW_t
// - theta: Reversal force when price approaches Key Support/Resistance levels
// - mu: Long-term mean / trend direction (70% Trending/Pullback, 30% Ranging/Consolidation)
// - sigma: Volatility governing natural wicks, micro-spikes, and order-flow impulses
// ─────────────────────────────────────────────────────────────

export interface VirtualMarketRegime {
  sessionCycleIndex: number;
  regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING_CONSOLIDATION';
  keyResistance: number;
  keySupport: number;
  equilibriumPrice: number;
  theta: number; // Reversal force at S/R levels
  mu: number;    // Mean drift
  sigma: number; // Volatility
}

export function getVirtualMarketRegime(
  market: MarketPairConfig,
  tSec: number
): VirtualMarketRegime {
  const base = market.basePrice || 100;
  const symHash = hashSymbol(market.symbol || 'EUR/USD');
  const sessionDurationSec = 2400; // 40-minute dynamic market regime cycle
  const sessionIndex = Math.floor(tSec / sessionDurationSec);
  const sessionSeed = (symHash ^ (sessionIndex * 2654435761)) >>> 0;

  const isCrypto = (market.symbol || '').includes('BTC') || (market.symbol || '').includes('ETH');
  const isGold = (market.symbol || '').includes('XAU') || (market.symbol || '').includes('GOLD');
  const isJpy = (market.symbol || '').includes('JPY');

  const volSetting = market.volatility || 'SMOOTH';
  const volMultiplier = volSetting === 'EXTREME' ? 1.30 : volSetting === 'VOLATILE' ? 1.15 : volSetting === 'MODERATE' ? 1.0 : 0.85;

  const sigma = isCrypto
    ? base * 0.0016 * volMultiplier
    : isGold
      ? base * 0.00075 * volMultiplier
      : isJpy
        ? base * 0.0009 * volMultiplier
        : base * 0.00065 * volMultiplier;

  // 70% Trending (Up or Down), 30% Ranging (Consolidation)
  const regimeRandom = ((Math.sin(sessionSeed * 43.123) * 10000) % 1 + 1) % 1;
  let regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING_CONSOLIDATION';
  if (regimeRandom < 0.35) {
    regime = 'TRENDING_UP';
  } else if (regimeRandom < 0.70) {
    regime = 'TRENDING_DOWN';
  } else {
    regime = 'RANGING_CONSOLIDATION';
  }

  // Key Support & Resistance Levels established per 30-60 min cycle
  const bandMultiplier = regime === 'RANGING_CONSOLIDATION' ? 1.25 : 1.85;
  const band = sigma * bandMultiplier;
  const equilibriumPrice = base;
  const keyResistance = base + band;
  const keySupport = base - band;
  const theta = regime === 'RANGING_CONSOLIDATION' ? 0.42 : 0.22;

  return {
    sessionCycleIndex: sessionIndex,
    regime,
    keyResistance,
    keySupport,
    equilibriumPrice,
    theta,
    mu: equilibriumPrice,
    sigma
  };
}

function mix32(n: number): number {
  let h = (n ^ 0x61C88647) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

function gradSlope(seed: number, i: number): number {
  const m = mix32(seed + Math.imul(i, 374761393));
  return ((m / 4294967295) * 2 - 1);
}

// C2-continuous Quintic Perlin Noise (zero second-derivative acceleration jump)
// Guarantees 100% organic, continuous curves with zero mechanical/robotic jitter!
function perlinSmooth1D(seed: number, t: number): number {
  const i0 = Math.floor(t);
  const i1 = i0 + 1;
  const f = t - i0;
  // Quintic smootherstep: 6f^5 - 15f^4 + 10f^3
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  const g0 = gradSlope(seed, i0);
  const g1 = gradSlope(seed, i1);
  return (g0 * f * (1 - u)) + (g1 * (f - 1) * u);
}

function fractalPriceAction(symSeed: number, tSec: number, market?: MarketPairConfig): number {
  // Multi-scale continuous Wiener noise process W_t
  const o1 = perlinSmooth1D(symSeed + 101, tSec / 900); // 15-min macro session wave
  const o2 = perlinSmooth1D(symSeed + 203, tSec / 300); // 5-min trend channel
  const o3 = perlinSmooth1D(symSeed + 307, tSec / 120); // 2-min impulse swing
  const o4 = perlinSmooth1D(symSeed + 419, tSec / 45);  // 45s candle momentum

  const rawWiener = (o1 * 0.35) + (o2 * 0.35) + (o3 * 0.20) + (o4 * 0.10);

  if (!market) return rawWiener;

  // Mean Reversion Dynamics toward Virtual Key Support & Resistance
  const regime = getVirtualMarketRegime(market, tSec);
  const normalizedDev = rawWiener;
  let meanReversionDrift = 0;
  if (normalizedDev > 0.8) {
    // Near Resistance -> natural downward rejection pressure
    meanReversionDrift = -regime.theta * (normalizedDev - 0.8);
  } else if (normalizedDev < -0.8) {
    // Near Support -> natural upward bounce pressure
    meanReversionDrift = -regime.theta * (normalizedDev + 0.8);
  }

  return rawWiener + meanReversionDrift;
}

export function getSyncedMarketPrice(market: MarketPairConfig, timeMs: number, timeframeSecs: number = 60): number {
  const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);

  if (market.isRealMarket || market.category !== 'otc') {
    const live = realTimeLiveMarketService.getLatestPrice(market.symbol);
    if (live && live > 0) {
      return Number(live.toFixed(precision));
    }
  }

  const base = market.basePrice || 100;
  const symHash = hashSymbol(market.symbol || 'EUR/USD');
  const symSeed = (symHash % 1000) + 1;
  const tSec = timeMs / 1000;

  // 1. TARGET PRICE NAVIGATION (if admin manually set target price)
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
        const microNoise = fractalPriceAction(symSeed, tSec) * (base * 0.0001);
        return Number((mainTrajectory + microNoise).toFixed(precision));
      } else {
        const timeSinceReached = elapsedSec - targetDurationSec;
        const action = market.targetReachedAction || 'REVERSE';
        if (action === 'REVERSE') {
          const revProgress = Math.min(1.0, timeSinceReached / (targetDurationSec * 0.8));
          const smoothRev = (1 - Math.cos(revProgress * Math.PI)) / 2;
          const revAmplitude = totalDelta * 0.35;
          const revWave = Math.sin(timeSinceReached * 0.10) * (revAmplitude * 0.10);
          const reversalOffset = -(revAmplitude * smoothRev) + revWave;
          const currentPrice = targetPrice + reversalOffset + (fractalPriceAction(symSeed, tSec) * base * 0.00008);
          return Number(currentPrice.toFixed(precision));
        } else {
          const rangeOsc = fractalPriceAction(symSeed, tSec) * (base * 0.0001);
          return Number((targetPrice + rangeOsc).toFixed(precision));
        }
      }
    }
  }

  // 2. REALISTIC MULTI-FRACTAL STOCHASTIC PRICE ACTION (QUOTEX / EXNESS CALIBRATED)
  // Perfectly calibrated amplitude: 1-minute bars move 1 - 3 pips on Forex, $0.30 - $0.90 on Gold, $15 - $40 on BTC
  const volSetting = market.volatility || 'SMOOTH';
  const volMult = volSetting === 'EXTREME' ? 1.25 : volSetting === 'VOLATILE' ? 1.12 : volSetting === 'MODERATE' ? 1.0 : 0.88;
  const isCrypto = (market.symbol || '').includes('BTC') || (market.symbol || '').includes('ETH');
  const isGold = (market.symbol || '').includes('XAU') || (market.symbol || '').includes('GOLD');
  const isJpy = (market.symbol || '').includes('JPY');
  
  const amplitude = isCrypto
    ? base * 0.0018 * volMult
    : isGold
      ? base * 0.0008 * volMult
      : isJpy
        ? base * 0.0012 * volMult
        : base * 0.0010 * volMult;

  const effectiveMode = market.controlMode || market.trendBias || 'AUTO';
  let trendBiasOffset = 0;
  const strSetting = market.trendStrength || 'MODERATE';
  const strMult = strSetting === 'STRONG' ? 1.20 : strSetting === 'WEAK' ? 0.80 : 1.0;

  if (effectiveMode === 'UP') {
    const trendProgress = (tSec / 3600) % 24;
    const trendRamp = Math.min(1.0, trendProgress * 0.25);
    trendBiasOffset = (trendRamp * 0.5 + 0.25) * amplitude * 1.1 * strMult;
  } else if (effectiveMode === 'DOWN') {
    const trendProgress = (tSec / 3600) % 24;
    const trendRamp = Math.min(1.0, trendProgress * 0.25);
    trendBiasOffset = -(trendRamp * 0.5 + 0.25) * amplitude * 1.1 * strMult;
  }

  // Generate fractal price action with Mean Reversion
  const fractalWalk = fractalPriceAction(symSeed, tSec, market) * amplitude;
  const finalPrice = base + trendBiasOffset + fractalWalk;
  return Number(finalPrice.toFixed(precision));
}

export function getDeterministicBoundaryPrice(
  market: MarketPairConfig,
  timestampMs: number,
  tfSecs: number = 60
): number {
  return getSyncedMarketPrice(market, timestampMs, tfSecs);
}

export function getDeterministicHistoricalCandle(
  market: MarketPairConfig,
  bucketTimeMs: number,
  tfSecs: number = 60,
  forcedOpen?: number
): Candlestick {
  const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);
  const timeStepMs = tfSecs * 1000;
  const pipStep = Math.pow(10, -precision);

  const rawBoundaryOpen = getDeterministicBoundaryPrice(market, bucketTimeMs, tfSecs);
  const rawBoundaryClose = getDeterministicBoundaryPrice(market, bucketTimeMs + timeStepMs, tfSecs);
  const open = typeof forcedOpen === 'number' && Number.isFinite(forcedOpen) ? forcedOpen : rawBoundaryOpen;

  const isCrypto = (market.symbol || '').includes('BTC') || (market.symbol || '').includes('ETH');
  const isGold = (market.symbol || '').includes('XAU') || (market.symbol || '').includes('GOLD');
  const isJpy = (market.symbol || '').includes('JPY');
  const base = market.basePrice || 100;

  const symHash = hashSymbol(market.symbol || 'EUR/USD');
  const candleIndex = Math.floor(bucketTimeMs / timeStepMs);
  const candleSeed = (symHash ^ (candleIndex * 2654435761)) >>> 0;
  
  // Deterministic pseudo-random numbers in [0, 1) for this specific candle
  const r1 = ((Math.sin(candleSeed * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const r2 = ((Math.sin((candleSeed + 17) * 78.233) * 43758.5453) % 1 + 1) % 1;
  const rSize = ((Math.sin((candleSeed + 31) * 91.137) * 43758.5453) % 1 + 1) % 1;

  // Natural mix of small, standard, and large momentum candles across OTC markets:
  // 25% momentum expansion candles (1.25x - 1.60x)
  // 25% small pullback / consolidation candles (0.45x - 0.70x)
  // 50% standard trend candles (0.80x - 1.15x)
  const sizeMultiplier = rSize > 0.75
    ? 1.25 + (rSize - 0.75) * 1.4
    : rSize < 0.25
      ? 0.45 + rSize * 1.0
      : 0.80 + (rSize - 0.25) * 0.7;

  const baseMaxDelta = isGold
    ? 0.28
    : isCrypto
      ? base * 0.00028
      : isJpy
        ? pipStep * 15.0
        : pipStep * 16.5;

  const maxNaturalDelta = baseMaxDelta * sizeMultiplier;
  const rawDelta = rawBoundaryClose - rawBoundaryOpen;
  const clampedDelta = Math.max(-maxNaturalDelta, Math.min(maxNaturalDelta, rawDelta));
  const close = Number((open + clampedDelta).toFixed(precision));

  // Authentic natural candle proportions matching Gold/BTC:
  // - Candle body is ~70% to 80% of total candle height (High - Low)
  // - Wick is ~10% to 15% with natural single primary test/rejection wick
  // - Completely eliminates artificial double whiskers on both sides
  const rawBodySize = Math.abs(close - open);
  const isDoji = rawBodySize < pipStep * 0.8;
  const bodySize = isDoji ? pipStep * 0.8 : rawBodySize;

  let naturalUpper = 0;
  let naturalLower = 0;

  if (isDoji) {
    // Subtle balanced wick for consolidation/doji
    naturalUpper = Math.max(pipStep * 0.35, bodySize * (0.12 + r1 * 0.08));
    naturalLower = Math.max(pipStep * 0.35, bodySize * (0.12 + r2 * 0.08));
  } else if (close > open) {
    // Bullish candle: primary upper test/rejection wick (12% - 17% of total range)
    // subtle or shaved lower entry wick (0% - 5% of total range)
    naturalUpper = Math.max(pipStep * 0.45, bodySize * (0.16 + r1 * 0.08));
    naturalLower = r2 > 0.40 ? bodySize * (0.02 + r2 * 0.05) : 0;
  } else {
    // Bearish candle: primary lower test/rejection wick (12% - 17% of total range)
    // subtle or shaved upper entry wick (0% - 5% of total range)
    naturalLower = Math.max(pipStep * 0.45, bodySize * (0.16 + r1 * 0.08));
    naturalUpper = r2 > 0.40 ? bodySize * (0.02 + r2 * 0.05) : 0;
  }

  const high = Number((Math.max(open, close) + naturalUpper).toFixed(precision));
  const low = Number((Math.min(open, close) - naturalLower).toFixed(precision));

  const seed = symHash + Math.floor(bucketTimeMs / 1000);
  const rVol = Math.abs(Math.sin(seed * 0.13));
  const volume = Math.floor(80 + rVol * 160 + (bodySize / ((market.basePrice || 100) * 0.00005)));

  return {
    time: bucketTimeMs,
    timestamp: bucketTimeMs,
    open,
    high,
    low,
    close,
    volume
  };
}

/**
 * 100% Deterministic Real-Market Price Action Intra-Candle Dynamics:
 * Generates natural order-flow micro-impulses, bid/ask spread bounces,
 * micro-pullbacks and organic liquidity pauses that mimic real exchange movements.
 */
export function getIntraCandlePriceActionNoise(
  symbol: string,
  basePrice: number,
  precision: number,
  nowMs: number,
  currentBucketTimeMs: number,
  timeStepMs: number
): number {
  const elapsed = Math.max(0, Math.min(timeStepMs, nowMs - currentBucketTimeMs));
  const progress = elapsed / timeStepMs;

  if (progress <= 0 || progress >= 1.0) return 0;
  const elapsedSec = elapsed / 1000;
  const totalSec = timeStepMs / 1000;
  // C2-continuous smooth Hermite envelope: ensures 0 velocity and 0 displacement at exact open/close boundary,
  // transitioning within 0.7s so candle actively breathes immediately without sitting still!
  const openProgress = Math.min(1.0, elapsedSec / 0.75);
  const closeProgress = Math.min(1.0, (totalSec - elapsedSec) / 0.65);
  const startEase = openProgress * openProgress * (3 - 2 * openProgress);
  const endEase = closeProgress * closeProgress * (3 - 2 * closeProgress);
  const envelope = startEase * endEase;

  const symHash = hashSymbol(symbol || 'EUR/USD');
  const symSeed = (symHash % 1000) + 1;
  const tSec = nowMs / 1000;
  const pipStep = Math.pow(10, -precision);

  // Multi-frequency natural order-flow harmonic waves matching Gold/Crypto:
  // Balanced harmonic waves for lively, fast, continuous micro-tick breathing
  // Fluid and responsive without exaggerated spikes or wild jumps!
  const n1 = perlinSmooth1D(symSeed + 719, tSec / 2.2);   // 2.2s primary order-flow swing
  const n2 = perlinSmooth1D(symSeed + 823, tSec / 1.1);   // 1.1s natural impulse wave
  const n3 = perlinSmooth1D(symSeed + 941, tSec / 0.50);  // 0.50s micro-tick heartbeat
  const n4 = perlinSmooth1D(symSeed + 1051, tSec / 0.22); // 0.22s responsive tick vibration

  const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
  const isGold = symbol.includes('XAU') || symbol.includes('GOLD');
  const isJpy = symbol.includes('JPY');

  // Calibrated organic tick amplitude:
  // Exactly like Gold OTC (0.075 = ~7.5 units) and BTC OTC (base * 0.000065),
  // Forex OTC pairs now have proportional micro-ticks (3.8 - 4.2 units of pipStep)
  // so the last decimal constantly pulses and updates every 50-100ms with zero 2-3s pauses!
  const amp = isCrypto
    ? basePrice * 0.000065
    : isGold
      ? 0.075
      : isJpy
        ? pipStep * 4.2
        : pipStep * 3.8;

  const rawPA = (n1 * 0.28 + n2 * 0.32 + n3 * 0.25 + n4 * 0.15) * amp * envelope;
  return rawPA;
}

export function getDeterministicActiveCandle(
  market: MarketPairConfig,
  currentBucketTimeMs: number,
  nowMs: number,
  tfSecs: number = 60,
  stableOpen?: number,
  stableHigh?: number,
  stableLow?: number
): { livePrice: number; activeCandle: Candlestick } {
  const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);
  const timeStepMs = tfSecs * 1000;
  const pipStep = Math.pow(10, -precision);
  const base = market.basePrice || 100;
  const isCrypto = (market.symbol || '').includes('BTC') || (market.symbol || '').includes('ETH');
  const isGold = (market.symbol || '').includes('XAU') || (market.symbol || '').includes('GOLD');
  const isJpy = (market.symbol || '').includes('JPY');

  const candleOpen = typeof stableOpen === 'number' && Number.isFinite(stableOpen)
    ? stableOpen
    : getDeterministicBoundaryPrice(market, currentBucketTimeMs, tfSecs);

  const rawBoundaryOpen = getDeterministicBoundaryPrice(market, currentBucketTimeMs, tfSecs);
  const rawBoundaryClose = getDeterministicBoundaryPrice(market, currentBucketTimeMs + timeStepMs, tfSecs);

  const symHash = hashSymbol(market.symbol || 'EUR/USD');
  const candleIndex = Math.floor(currentBucketTimeMs / timeStepMs);
  const candleSeed = (symHash ^ (candleIndex * 2654435761)) >>> 0;
  const r1 = ((Math.sin(candleSeed * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const r2 = ((Math.sin((candleSeed + 17) * 78.233) * 43758.5453) % 1 + 1) % 1;
  const rSize = ((Math.sin((candleSeed + 31) * 91.137) * 43758.5453) % 1 + 1) % 1;

  // Natural mix of small, standard, and large momentum candles across OTC markets:
  // 25% momentum expansion candles (1.25x - 1.60x)
  // 25% small pullback / consolidation candles (0.45x - 0.70x)
  // 50% standard trend candles (0.80x - 1.15x)
  const sizeMultiplier = rSize > 0.75
    ? 1.25 + (rSize - 0.75) * 1.4
    : rSize < 0.25
      ? 0.45 + rSize * 1.0
      : 0.80 + (rSize - 0.25) * 0.7;

  const baseMaxDelta = isGold
    ? 0.28
    : isCrypto
      ? base * 0.00028
      : isJpy
        ? pipStep * 15.0
        : pipStep * 16.5;

  // Max natural single-candle body drift with mixed sizing
  const maxNaturalDelta = baseMaxDelta * sizeMultiplier;

  const rawDelta = rawBoundaryClose - rawBoundaryOpen;
  const clampedDelta = Math.max(-maxNaturalDelta, Math.min(maxNaturalDelta, rawDelta));
  const targetClose = Number((candleOpen + clampedDelta).toFixed(precision));

  const progress = Math.max(0, Math.min(1.0, (nowMs - currentBucketTimeMs) / timeStepMs));
  // Smooth cubic ease: starts exactly at candleOpen (slope=0), glides towards targetClose
  const smoothProgress = progress * progress * (3 - 2 * progress);

  // 4. SMART SMOOTHING LOSS ENGINE (Adaptive Risk Mitigation)
  // Strictly applies ONLY to LIVE trades with heavy volume side (DEMO is 100% untouched)
  const exposure = getMarketLiveExposure(market.symbol);
  let effectiveTargetClose = targetClose;

  if (exposure && exposure.enabled === true && exposure.biasDirection !== 'NEUTRAL') {
    // Decisive subtle delta guaranteeing clean loss closure (1.6 pips on Forex, $0.70 on Gold, $25 on BTC)
    const subtleDelta = isGold
      ? 0.70
      : isCrypto
        ? base * 0.00035
        : isJpy
          ? pipStep * 20
          : pipStep * 16;

    const maxAllowedBody = isGold
      ? 1.80
      : isCrypto
        ? base * 0.0012
        : isJpy
          ? pipStep * 45
          : pipStep * 40;

    let targetShift = 0;
    if (exposure.biasDirection === 'DOWN') {
      // Heavier volume on UP -> Steer market DOWN below entry price so UP trades settle in loss
      let desired = candleOpen - subtleDelta;
      if (exposure.heavyEntryPrice && Number.isFinite(exposure.heavyEntryPrice)) {
        desired = Math.min(desired, exposure.heavyEntryPrice - subtleDelta);
      }
      desired = Math.max(candleOpen - maxAllowedBody, desired);
      targetShift = desired - targetClose;
    } else if (exposure.biasDirection === 'UP') {
      // Heavier volume on DOWN -> Steer market UP above entry price so DOWN trades settle in loss
      let desired = candleOpen + subtleDelta;
      if (exposure.heavyEntryPrice && Number.isFinite(exposure.heavyEntryPrice)) {
        desired = Math.max(desired, exposure.heavyEntryPrice + subtleDelta);
      }
      desired = Math.min(candleOpen + maxAllowedBody, desired);
      targetShift = desired - targetClose;
    }

    // Natural progressive cosine ease:
    // Seamlessly glides price across the entire candle duration with ZERO jumps or abrupt snapping
    const smoothEase = (1 - Math.cos(progress * Math.PI)) / 2;
    effectiveTargetClose = targetClose + (targetShift * smoothEase);
  }

  // Smooth base trajectory glides toward effectiveTargetClose
  const baseLivePrice = candleOpen + (effectiveTargetClose - candleOpen) * smoothProgress;

  // Organic order-flow micro-ticks (bell envelope ensures strictly 0 at open and 0 at close)
  const paOffset = getIntraCandlePriceActionNoise(market.symbol, base, precision, nowMs, currentBucketTimeMs, timeStepMs);
  const livePrice = Number((baseLivePrice + paOffset).toFixed(precision));

  // Natural High and Low strictly track the actual price excursions traded during the candle
  // Completely eliminates artificial ghost wicks ("কোন অযথা উইক হবে না")!
  const rawHigh = typeof stableHigh === 'number' && Number.isFinite(stableHigh)
    ? Math.max(stableHigh, candleOpen, livePrice)
    : Math.max(candleOpen, livePrice);

  const rawLow = typeof stableLow === 'number' && Number.isFinite(stableLow)
    ? Math.min(stableLow, candleOpen, livePrice)
    : Math.min(candleOpen, livePrice);

  const curHigh = Number(rawHigh.toFixed(precision));
  const curLow = Number(rawLow.toFixed(precision));

  const volume = 60 + Math.floor(progress * 90);

  const activeCandle: Candlestick = {
    time: currentBucketTimeMs,
    timestamp: currentBucketTimeMs,
    open: candleOpen,
    high: curHigh,
    low: curLow,
    close: livePrice,
    volume
  };

  return { livePrice, activeCandle };
}

/**
 * Deterministic Next 5-Candle Prediction for Admin Radar Ghost View
 * Chained with rollingOpen = previous.close so all 5 future ghost candles are 100% gapless.
 */
export function getUpcoming5CandlesPrediction(
  market: MarketPairConfig,
  currentTimeMs: number,
  timeframeSecs: number = 60
): CandlePredictionMetrics[] {
  const timeStepMs = timeframeSecs * 1000;
  const currentBucketTime = Math.floor(currentTimeMs / timeStepMs) * timeStepMs;
  const currentBoundary = getDeterministicHistoricalCandle(market, currentBucketTime, timeframeSecs);
  let rollingOpen = currentBoundary.close;

  const predictions: CandlePredictionMetrics[] = [];
  for (let i = 1; i <= 5; i++) {
    const futureBucketTime = currentBucketTime + (i * timeStepMs);
    const candle = getDeterministicHistoricalCandle(market, futureBucketTime, timeframeSecs, rollingOpen);
    rollingOpen = candle.close;
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
      phaseName: isUp ? 'Bullish Impulse' : 'Bearish Drop',
      confidence: 99,
      isBreakout: false,
      predictedOpen: candle.open,
      predictedClose: candle.close,
      predictedHigh: candle.high,
      predictedLow: candle.low
    });
  }
  return predictions;
}

