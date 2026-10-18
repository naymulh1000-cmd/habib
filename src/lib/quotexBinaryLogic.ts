import { getTimeframeSeconds } from './candleHistoryService';
import { safeFormatTimeWithSeconds } from './dateUtils';

export type QuotexExpiryMode = 'candle_sync' | 'timer';

export interface QuotexTimingInfo {
  mode: QuotexExpiryMode;
  timeframe: string;
  timeframeSecs: number;
  currentCandleStartMs: number;
  currentCandleEndMs: number;
  secondsRemainingInCandle: number;
  // Quotex 30-Second Purchase Rule
  purchaseDeadlineMs: number;
  purchaseTimeRemainingSec: number; // Seconds left to buy for current candle
  isRollover: boolean; // True if placed within last 30s, rolling over to next candle
  targetExpiryMs: number;
  targetExpiryFormatted: string; // e.g. "14:35:00"
  tradeDurationSec: number; // Total duration of trade from now until expiry
}

/**
 * Calculates Quotex / Pocket Option candle-synchronized trade expiry & purchase timing.
 * 
 * The Quotex 30-Second Rule:
 * 1. Each 1-Minute candle starts at :00s and ends at :59s (next :00s).
 * 2. Purchase Time Window: First 30 seconds of the candle (seconds 00 to 29).
 *    - If user enters trade when remaining time in candle >= 30s:
 *      -> Trade closes at the END OF THE CURRENT CANDLE (next :00s).
 *      -> Total trade duration = remaining seconds in current candle (30s to 60s).
 * 3. Rollover Window: Last 30 seconds of the candle (seconds 30 to 59).
 *    - If user enters trade when remaining time in candle < 30s:
 *      -> Trade rolls over to the END OF THE NEXT CANDLE (+1 full candle).
 *      -> Total trade duration = remaining seconds + 60s (30s to 59s).
 * 4. Instant Zero-Lag Settlement: When the clock hits :00s and the candle closes,
 *    the trade immediately settles based on the candle's close price vs entry price.
 */
export function calculateQuotexTiming(
  timeframe: string = 'M1',
  selectedDurationSeconds: number = 60,
  mode: QuotexExpiryMode = 'candle_sync',
  nowMs: number = Date.now()
): QuotexTimingInfo {
  const tfSecs = getTimeframeSeconds(timeframe as any) || 60;
  const nowSec = Math.floor(nowMs / 1000);

  // Current candle boundaries aligned to clock
  const currentCandleStartSec = Math.floor(nowSec / tfSecs) * tfSecs;
  const currentCandleEndSec = currentCandleStartSec + tfSecs;
  const secondsRemainingInCandle = Math.max(0, currentCandleEndSec - nowSec);

  // If user explicitly chose fixed timer (e.g. 5s or 15s fixed mode)
  if (mode === 'timer' && selectedDurationSeconds < 30 && selectedDurationSeconds > 0) {
    const targetExpiryMs = nowMs + selectedDurationSeconds * 1000;
    return {
      mode: 'timer',
      timeframe,
      timeframeSecs: tfSecs,
      currentCandleStartMs: currentCandleStartSec * 1000,
      currentCandleEndMs: currentCandleEndSec * 1000,
      secondsRemainingInCandle,
      purchaseDeadlineMs: (currentCandleEndSec - 30) * 1000,
      purchaseTimeRemainingSec: secondsRemainingInCandle,
      isRollover: false,
      targetExpiryMs,
      targetExpiryFormatted: safeFormatTimeWithSeconds(targetExpiryMs, ''),
      tradeDurationSec: selectedDurationSeconds
    };
  }

  // Quotex Candle Synchronized Expiry
  // Threshold: 30 seconds before candle close
  const purchaseThresholdSec = Math.min(30, Math.floor(tfSecs / 2));
  const isRollover = secondsRemainingInCandle < purchaseThresholdSec;

  let targetExpirySec: number;
  let tradeDurationSec: number;
  let purchaseTimeRemainingSec: number;

  if (!isRollover) {
    // Trade placed before 30-sec mark -> Settles at CURRENT candle close
    targetExpirySec = currentCandleEndSec;
    tradeDurationSec = secondsRemainingInCandle;
    purchaseTimeRemainingSec = secondsRemainingInCandle - purchaseThresholdSec;
  } else {
    // Trade placed after 30-sec mark -> Settles at NEXT candle close
    targetExpirySec = currentCandleEndSec + tfSecs;
    tradeDurationSec = secondsRemainingInCandle + tfSecs;
    purchaseTimeRemainingSec = secondsRemainingInCandle + tfSecs - purchaseThresholdSec;
  }

  // Handle multi-candle duration multipliers if user selected 2m (120s), 5m (300s), etc.
  if (selectedDurationSeconds > tfSecs) {
    const extraCandles = Math.floor(selectedDurationSeconds / tfSecs) - 1;
    if (extraCandles > 0) {
      targetExpirySec += extraCandles * tfSecs;
      tradeDurationSec += extraCandles * tfSecs;
    }
  }

  const targetExpiryMs = targetExpirySec * 1000;

  return {
    mode: 'candle_sync',
    timeframe,
    timeframeSecs: tfSecs,
    currentCandleStartMs: currentCandleStartSec * 1000,
    currentCandleEndMs: currentCandleEndSec * 1000,
    secondsRemainingInCandle,
    purchaseDeadlineMs: (currentCandleEndSec - purchaseThresholdSec) * 1000,
    purchaseTimeRemainingSec: Math.max(0, purchaseTimeRemainingSec),
    isRollover,
    targetExpiryMs,
    targetExpiryFormatted: safeFormatTimeWithSeconds(targetExpiryMs, ''),
    tradeDurationSec
  };
}

/**
 * Formats seconds into MM:SS countdown display.
 */
export function formatQuotexCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
