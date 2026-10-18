import { MarketPairConfig } from './defaultMarkets';
import { Candlestick } from '../types';

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
// QUOTEX-GRADE CONTINUOUS MULTI-FRACTAL STOCHASTIC NOISE ENGINE
// Generates authentic market swings, trends, pullbacks, and realistic
// candlestick bodies with natural upper and lower rejection wicks.
// ─────────────────────────────────────────────────────────────

function gradNoise1D(seed: number, t: number): number {
  const i0 = Math.floor(t);
  const i1 = i0 + 1;
  const f = t - i0;
  // Smooth cubic Hermite S-curve
  const s = f * f * (3 - 2 * f);

  // Deterministic pseudo-random gradient slopes at integer nodes
  const h0 = ((Math.sin(seed + i0 * 127.135) * 43758.5453123) % 1) * 2 - 1;
  const h1 = ((Math.sin(seed + i1 * 127.135) * 43758.5453123) % 1) * 2 - 1;

  const g0 = h0 * f;
  const g1 = h1 * (f - 1);

  return g0 + s * (g1 - g0);
}

function fractalPriceAction(symSeed: number, tSec: number): number {
  // Multi-frequency Quotex-grade market cycles:
  // 1. Macro regime (~25 min cycle): broad market trend
  const o1 = gradNoise1D(symSeed + 101, tSec / 1500);
  // 2. Intermediate wave (~6 min cycle): 6-candle swing legs
  const o2 = gradNoise1D(symSeed + 203, tSec / 360);
  // 3. Short trend (~2.5 min cycle): 2 to 4 candle momentum waves
  const o3 = gradNoise1D(symSeed + 307, tSec / 150);
  // 4. Candle momentum (~70s cycle): primary candle-to-candle direction & body
  const o4 = gradNoise1D(symSeed + 419, tSec / 70);
  // 5. Intra-candle wave (~25s cycle): sub-minute pullbacks & tests
  const o5 = gradNoise1D(symSeed + 521, tSec / 25);
  // 6. Fast order-flow tick (~8s cycle): realistic sub-pip tick movement
  const o6 = gradNoise1D(symSeed + 631, tSec / 8);

  // Equalized distribution giving robust body formations and clear swings
  return (o1 * 0.28) + (o2 * 0.26) + (o3 * 0.22) + (o4 * 0.16) + (o5 * 0.05) + (o6 * 0.03);
}

export function getSyncedMarketPrice(market: MarketPairConfig, timeMs: number, timeframeSecs: number = 60): number {
  const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);

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
        const waveOsc = -Math.sign(totalDelta) * Math.sin(rawProgress * Math.PI * 2 * waveCycles) * (Math.abs(totalDelta) * 0.10) * pullbackDamping;
        const mainTrajectory = startPrice + (totalDelta * smoothProgress) + waveOsc;
        const microNoise = fractalPriceAction(symSeed, tSec) * (base * 0.0004);
        return Number((mainTrajectory + microNoise).toFixed(precision));
      } else {
        const timeSinceReached = elapsedSec - targetDurationSec;
        const action = market.targetReachedAction || 'REVERSE';
        if (action === 'REVERSE') {
          const revProgress = Math.min(1.0, timeSinceReached / (targetDurationSec * 0.8));
          const smoothRev = (1 - Math.cos(revProgress * Math.PI)) / 2;
          const revAmplitude = totalDelta * 0.40;
          const revWave = Math.sin(timeSinceReached * 0.10) * (revAmplitude * 0.12);
          const reversalOffset = -(revAmplitude * smoothRev) + revWave;
          const currentPrice = targetPrice + reversalOffset + (fractalPriceAction(symSeed, tSec) * base * 0.0003);
          return Number(currentPrice.toFixed(precision));
        } else {
          const rangeOsc = fractalPriceAction(symSeed, tSec) * (base * 0.0004);
          return Number((targetPrice + rangeOsc).toFixed(precision));
        }
      }
    }
  }

  // 2. REALISTIC MULTI-FRACTAL STOCHASTIC PRICE ACTION (QUOTEX / EXNESS CALIBRATED)
  const volSetting = market.volatility || 'SMOOTH';
  const volMult = volSetting === 'EXTREME' ? 1.3 : volSetting === 'VOLATILE' ? 1.15 : volSetting === 'MODERATE' ? 1.0 : 0.85;
  const isCrypto = (market.symbol || '').includes('BTC') || (market.symbol || '').includes('ETH');
  const isGold = (market.symbol || '').includes('XAU') || (market.symbol || '').includes('GOLD');
  const isJpy = (market.symbol || '').includes('JPY');
  
  // Calibrated to realistic Quotex / Exness institutional OTC volatility:
  // Normal 1-minute bars form clear 5 - 15 pip bodies with natural trends & pullbacks
  const amplitude = isCrypto
    ? base * 0.0075 * volMult
    : isGold
      ? base * 0.0050 * volMult
      : isJpy
        ? base * 0.0040 * volMult
        : base * 0.0035 * volMult;

  const effectiveMode = market.controlMode || market.trendBias || 'AUTO';
  let trendBiasOffset = 0;
  const strSetting = market.trendStrength || 'MODERATE';
  const strMult = strSetting === 'STRONG' ? 1.25 : strSetting === 'WEAK' ? 0.75 : 1.0;

  if (effectiveMode === 'UP') {
    const trendProgress = (tSec / 3600) % 24;
    const trendRamp = Math.min(1.0, trendProgress * 0.25);
    trendBiasOffset = (trendRamp * 0.5 + 0.25) * amplitude * 1.1 * strMult;
  } else if (effectiveMode === 'DOWN') {
    const trendProgress = (tSec / 3600) % 24;
    const trendRamp = Math.min(1.0, trendProgress * 0.25);
    trendBiasOffset = -(trendRamp * 0.5 + 0.25) * amplitude * 1.1 * strMult;
  }

  // Generate fractal price action without oversized swings
  const fractalWalk = fractalPriceAction(symSeed, tSec) * amplitude;

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
  const drift = open - rawBoundaryOpen;
  const close = Number((rawBoundaryClose + drift).toFixed(precision));

  let maxP = Math.max(open, close);
  let minP = Math.min(open, close);

  // Sample continuous trajectory across 16 fixed sub-points to record the exact path traversal
  const SAMPLES = 16;
  for (let i = 1; i < SAMPLES; i++) {
    const sampleTime = bucketTimeMs + (i / SAMPLES) * timeStepMs;
    const p = Number((getDeterministicBoundaryPrice(market, sampleTime, tfSecs) + drift).toFixed(precision));
    if (p > maxP) maxP = p;
    if (p < minP) minP = p;
  }

  const isCrypto = (market.symbol || '').includes('BTC') || (market.symbol || '').includes('ETH');
  const isGold = (market.symbol || '').includes('XAU') || (market.symbol || '').includes('GOLD');
  const isJpy = (market.symbol || '').includes('JPY');

  const symHash = hashSymbol(market.symbol || 'EUR/USD');
  const candleIndex = Math.floor(bucketTimeMs / timeStepMs);
  const candleSeed = (symHash ^ (candleIndex * 2654435761)) >>> 0;
  
  // Deterministic pseudo-random numbers in [0, 1) for this specific candle
  const r1 = ((Math.sin(candleSeed * 12.9898) * 43758.5453) % 1 + 1) % 1;
  const r2 = ((Math.sin((candleSeed + 17) * 78.233) * 43758.5453) % 1 + 1) % 1;

  // Authentic Quotex wick proportions (typically 20% to 50% of candle body)
  const bodySize = Math.abs(close - open);
  const minWickPip = pipStep * (isJpy ? 4 : isCrypto ? 1000 : isGold ? 20 : 3.0);
  const upperWick = Math.max(minWickPip, bodySize * (0.15 + r1 * 0.40));
  const lowerWick = Math.max(minWickPip, bodySize * (0.15 + r2 * 0.40));

  const high = Number(Math.max(open, close, maxP, Math.max(open, close) + upperWick).toFixed(precision));
  const low = Number(Math.min(open, close, minP, Math.min(open, close) - lowerWick).toFixed(precision));

  const seed = symHash + Math.floor(bucketTimeMs / 1000);
  const rVol = Math.abs(Math.sin(seed * 0.13));
  const volume = Math.floor(80 + rVol * 160 + (Math.abs(close - open) / ((market.basePrice || 100) * 0.00005)));

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
 * 
 * Strict Zero-Gap Boundary:
 * - At progress === 0.0 (candle open): Returns strictly 0.0 (open = previous close)
 * - At progress === 1.0 (candle close): Returns strictly 0.0 (hits deterministic close exactly)
 * - Preserves all candlestick patterns, bar colors, and radar predictions 100% intact.
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
  // Natural bell envelope: 0 at start and 0 at end
  const envelope = Math.sin(progress * Math.PI);

  const symHash = hashSymbol(symbol || 'EUR/USD');
  const symSeed = (symHash % 1000) + 1;
  const tSec = nowMs / 1000;
  const pipStep = Math.pow(10, -precision);

  // Dynamic organic order-flow micro-waves (cycles of 14s, 8.5s and 4.2s)
  const w1 = Math.sin((tSec * (2 * Math.PI / 14.0)) + symSeed * 1.71);
  const w2 = Math.cos((tSec * (2 * Math.PI / 8.5)) + symSeed * 2.37);
  const w3 = Math.sin((tSec * (2 * Math.PI / 4.2)) + symSeed * 3.19);

  const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
  const isGold = symbol.includes('XAU') || symbol.includes('GOLD');
  const isJpy = symbol.includes('JPY');

  // Realistic Quotex-calibrated intra-candle micro-amplitude:
  // Gives visible, lively, organic price ticking (0.5 - 2 pips on Forex, visible tick line)
  const amp = isCrypto
    ? basePrice * 0.0004
    : isGold
      ? basePrice * 0.00015
      : isJpy
        ? pipStep * 6.0
        : pipStep * 5.0;

  const rawPA = (w1 * 0.50 + w2 * 0.35 + w3 * 0.15) * amp * envelope;
  return Number(rawPA.toFixed(precision));
}

export function getDeterministicActiveCandle(
  market: MarketPairConfig,
  currentBucketTimeMs: number,
  nowMs: number,
  tfSecs: number = 60,
  stableOpen?: number
): { livePrice: number; activeCandle: Candlestick } {
  const precision = market.precision ?? ((market.symbol || '').includes('JPY') ? 3 : (market.symbol || '').includes('BTC') || (market.symbol || '').includes('XAU') ? 2 : 5);
  const timeStepMs = tfSecs * 1000;
  const pipStep = Math.pow(10, -precision);
  const base = market.basePrice || 100;

  const candleOpen = typeof stableOpen === 'number' && Number.isFinite(stableOpen)
    ? stableOpen
    : getDeterministicBoundaryPrice(market, currentBucketTimeMs, tfSecs);

  const rawBoundaryOpen = getDeterministicBoundaryPrice(market, currentBucketTimeMs, tfSecs);
  const rawBoundaryNow = getDeterministicBoundaryPrice(market, nowMs, tfSecs);
  const driftOffset = candleOpen - rawBoundaryOpen;

  // Base price starts EXACTLY at candleOpen at t=0 and smoothly rides the deterministic wave
  const baseLivePrice = Number((rawBoundaryNow + driftOffset).toFixed(precision));
  const progress = Math.max(0, Math.min(1.0, (nowMs - currentBucketTimeMs) / timeStepMs));

  // Realistic market price action micro-fluctuation (discrete order-flow ticks, pauses and micro-retests)
  const paOffset = getIntraCandlePriceActionNoise(market.symbol, base, precision, nowMs, currentBucketTimeMs, timeStepMs);
  const organicLivePrice = Number((baseLivePrice + paOffset).toFixed(precision));

  // Monotonic traversal sampling at fixed integer timestamps (so High NEVER shrinks and Low NEVER increases)
  let maxP = Math.max(candleOpen, organicLivePrice);
  let minP = Math.min(candleOpen, organicLivePrice);

  const stepSec = Math.max(2, Math.floor(tfSecs / 16));
  const elapsedSec = Math.floor((nowMs - currentBucketTimeMs) / 1000);
  for (let s = 1; s * stepSec <= elapsedSec; s++) {
    const sampleT = currentBucketTimeMs + s * stepSec * 1000;
    const paSample = getIntraCandlePriceActionNoise(market.symbol, base, precision, sampleT, currentBucketTimeMs, timeStepMs);
    const p = Number((getDeterministicBoundaryPrice(market, sampleT, tfSecs) + driftOffset + paSample).toFixed(precision));
    if (p > maxP) maxP = p;
    if (p < minP) minP = p;
  }

  // Check live exposure bias (5s Counter Loss Shield for heavier volume side)
  const exposure = getMarketLiveExposure(market.symbol);

  if (exposure && exposure.enabled === true && exposure.biasDirection !== 'NEUTRAL') {
    const naturalBodyDelta = Math.max(base * 0.0006, pipStep * 8);
    const remSec = exposure.minRemainingSec !== undefined 
      ? exposure.minRemainingSec 
      : Math.max(0, Math.ceil((1.0 - progress) * tfSecs));

    // Phase 1: Natural organic price action when more than 20 seconds remain (normal realistic market)
    if (remSec > 20 && progress < 0.67) {
      return {
        livePrice: organicLivePrice,
        activeCandle: {
          time: currentBucketTimeMs,
          timestamp: currentBucketTimeMs,
          open: candleOpen,
          high: Math.max(candleOpen, Number(maxP.toFixed(precision)), organicLivePrice),
          low: Math.min(candleOpen, Number(minP.toFixed(precision)), organicLivePrice),
          close: organicLivePrice,
          volume: 60 + Math.floor(progress * 90)
        }
      };
    }

    // Phase 2: At 20 seconds remaining, smoothly and realistically drive the market against the heavy volume side
    const timeInFinal = Math.max(0, Math.min(1.0, (20 - remSec) / 20));
    const progressInFinal = Math.max(timeInFinal, Math.max(0, (progress - 0.67) / 0.33));
    // Hermite smooth cubic easing (zero jerky snapping)
    const smoothFactor = progressInFinal * progressInFinal * (3 - 2 * progressInFinal);
    const dampedPA = paOffset * Math.max(0, 1 - smoothFactor * 0.85);

    if (exposure.biasDirection === 'DOWN') {
      const refPrice = (exposure.heavyEntryPrice && Number.isFinite(exposure.heavyEntryPrice)) 
        ? exposure.heavyEntryPrice 
        : candleOpen;
      const targetClose = Math.min(candleOpen, refPrice) - naturalBodyDelta;
      const livePrice = Number((baseLivePrice + (targetClose - baseLivePrice) * smoothFactor + dampedPA).toFixed(precision));

      const high = Number(Math.max(candleOpen, livePrice, maxP).toFixed(precision));
      const low = Number(Math.min(candleOpen, livePrice, minP).toFixed(precision));

      const activeCandle: Candlestick = {
        time: currentBucketTimeMs,
        timestamp: currentBucketTimeMs,
        open: candleOpen,
        high: Math.max(candleOpen, high, livePrice),
        low: Math.min(candleOpen, low, livePrice),
        close: livePrice,
        volume: 90 + Math.floor(progress * 130)
      };

      return { livePrice, activeCandle };

    } else if (exposure.biasDirection === 'UP') {
      const refPrice = (exposure.heavyEntryPrice && Number.isFinite(exposure.heavyEntryPrice)) 
        ? exposure.heavyEntryPrice 
        : candleOpen;
      const targetClose = Math.max(candleOpen, refPrice) + naturalBodyDelta;
      const livePrice = Number((baseLivePrice + (targetClose - baseLivePrice) * smoothFactor + dampedPA).toFixed(precision));

      const high = Number(Math.max(candleOpen, livePrice, maxP).toFixed(precision));
      const low = Number(Math.min(candleOpen, livePrice, minP).toFixed(precision));

      const activeCandle: Candlestick = {
        time: currentBucketTimeMs,
        timestamp: currentBucketTimeMs,
        open: candleOpen,
        high: Math.max(candleOpen, high, livePrice),
        low: Math.min(candleOpen, low, livePrice),
        close: livePrice,
        volume: 90 + Math.floor(progress * 130)
      };

      return { livePrice, activeCandle };
    }
  }

  // --- NEUTRAL ORGANIC CANDLE TRAJECTORY (When 5S LOSS IS OFF OR NO EXPOSURE) ---
  const high = Number(Math.max(candleOpen, organicLivePrice, maxP).toFixed(precision));
  const low = Number(Math.min(candleOpen, organicLivePrice, minP).toFixed(precision));
  const volume = 60 + Math.floor(progress * 90);

  const activeCandle: Candlestick = {
    time: currentBucketTimeMs,
    timestamp: currentBucketTimeMs,
    open: candleOpen,
    high,
    low,
    close: organicLivePrice,
    volume
  };

  return { livePrice: organicLivePrice, activeCandle };
}

