import { ActiveTrade, AccountType } from '../types';
import { parseSafeDate } from './dateUtils';

export interface TimeframeProfitMetrics {
  totalProfit: number;      // Sum of positive realized profit (> 0)
  totalLoss: number;        // Sum of absolute realized loss (< 0)
  netPnl: number;           // totalProfit - totalLoss (Net realized P/L)
  totalTrades: number;      // Total closed trades count in timeframe
  winTradesCount: number;   // Count of winning trades
  lossTradesCount: number;  // Count of losing trades
  drawTradesCount: number;  // Count of draw / breakeven trades
  winRate: number;          // Win rate percentage (0.0 to 100.0)
  trades: ActiveTrade[];    // Filtered trades for this timeframe
}

export interface AccountCalculatedMetrics {
  balance: number;
  floatingPnl: number;
  netAssets: number;
  usedMargin: number;
  freeMargin: number;
  activeCount: number;
  closedCount: number;

  // Real-time Timeframe Metrics
  today: TimeframeProfitMetrics;
  weekly: TimeframeProfitMetrics;
  monthly: TimeframeProfitMetrics;
  yearly: TimeframeProfitMetrics;
  allTime: TimeframeProfitMetrics;

  // Convenient Flat Aliases for Today's PnL
  todayProfit: number;
  todayLoss: number;
  netTodayPnl: number;
}

/**
 * Extracts exact closing timestamp (in ms) from any trade record.
 * Handles number timestamps, string dates, Firestore Timestamps, and ISO strings safely.
 */
export function getTradeClosedTimestamp(trade: ActiveTrade): number {
  if (!trade) return 0;

  // 1. Direct numeric close timestamp
  if (typeof (trade as any).closeTimestamp === 'number' && (trade as any).closeTimestamp > 0) {
    return (trade as any).closeTimestamp;
  }
  if (typeof (trade as any).closedAtMs === 'number' && (trade as any).closedAtMs > 0) {
    return (trade as any).closedAtMs;
  }

  // 2. Formatted closeTime string or closedAt
  if (trade.closeTime) {
    const d = parseSafeDate(trade.closeTime);
    if (d) return d.getTime();
  }
  if ((trade as any).closedAt) {
    const d = parseSafeDate((trade as any).closedAt);
    if (d) return d.getTime();
  }
  if ((trade as any).updatedAt) {
    const d = parseSafeDate((trade as any).updatedAt);
    if (d) return d.getTime();
  }

  // 3. Fallbacks: open timestamp, timestamp, createdAt
  if (typeof trade.openTimestamp === 'number' && trade.openTimestamp > 0) {
    return trade.openTimestamp;
  }
  if (trade.openTime) {
    const d = parseSafeDate(trade.openTime);
    if (d) return d.getTime();
  }
  if (trade.timestamp) {
    const d = parseSafeDate(trade.timestamp);
    if (d) return d.getTime();
  }
  if ((trade as any).createdAt) {
    const d = parseSafeDate((trade as any).createdAt);
    if (d) return d.getTime();
  }

  return 0;
}

import { getDailyTradingCycleWindow } from './benchmarkData';
export { getDailyTradingCycleWindow };

/**
 * Checks if a timestamp falls within the 8:00 AM UTC daily trading cycle (8:00 AM to 8:00 AM next day).
 * When 8:00 AM UTC arrives, previous trades automatically return false, resetting Today's profit to 0.
 */
export function isTimestampToday(timestampMs: number, referenceDate = new Date(), resetHour = 8): boolean {
  if (!timestampMs || isNaN(timestampMs) || timestampMs <= 0) return false;
  const cycle = getDailyTradingCycleWindow(resetHour, referenceDate);
  return timestampMs >= cycle.startTime && timestampMs < cycle.endTime;
}

/**
 * Checks if a timestamp falls within the current calendar week (Monday 00:00:00.000 to end of week).
 */
export function isTimestampThisWeek(timestampMs: number, referenceDate = new Date()): boolean {
  if (!timestampMs || isNaN(timestampMs) || timestampMs <= 0) return false;
  const d = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0, 0, 0, 0
  );
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);

  const startOfWeek = d.getTime();
  const endOfWeek = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    23, 59, 59, 999
  ).getTime();

  return timestampMs >= startOfWeek && timestampMs <= endOfWeek;
}

/**
 * Checks if a timestamp falls within the current calendar month (1st of month 00:00:00.000 to end of month).
 */
export function isTimestampThisMonth(timestampMs: number, referenceDate = new Date()): boolean {
  if (!timestampMs || isNaN(timestampMs) || timestampMs <= 0) return false;
  const startOfMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
    0, 0, 0, 0
  ).getTime();
  const nextMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    1,
    0, 0, 0, 0
  ).getTime();

  return timestampMs >= startOfMonth && timestampMs < nextMonth;
}

/**
 * Checks if a timestamp falls within the current calendar year (Jan 1 to Dec 31).
 */
export function isTimestampThisYear(timestampMs: number, referenceDate = new Date()): boolean {
  if (!timestampMs || isNaN(timestampMs) || timestampMs <= 0) return false;
  const startOfYear = new Date(
    referenceDate.getFullYear(),
    0,
    1,
    0, 0, 0, 0
  ).getTime();
  const nextYear = new Date(
    referenceDate.getFullYear() + 1,
    0,
    1,
    0, 0, 0, 0
  ).getTime();

  return timestampMs >= startOfYear && timestampMs < nextYear;
}

/**
 * Computes profit, loss, net PnL, win rate, and counts for an array of closed trades.
 * Pure mathematical calculation without hardcoded or fake metrics.
 */
export function calculateTimeframeMetrics(trades: ActiveTrade[]): TimeframeProfitMetrics {
  let totalProfit = 0;
  let totalLoss = 0;
  let winTradesCount = 0;
  let lossTradesCount = 0;
  let drawTradesCount = 0;

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    const pnl = typeof t.pnl === 'number' && !isNaN(t.pnl) ? t.pnl : 0;

    if (pnl > 0 || t.status === 'WON') {
      totalProfit += Math.max(0, pnl);
      winTradesCount++;
    } else if (pnl < 0 || t.status === 'LOST') {
      totalLoss += Math.abs(pnl);
      lossTradesCount++;
    } else {
      drawTradesCount++;
    }
  }

  const netPnl = Number((totalProfit - totalLoss).toFixed(2));
  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? Number(((winTradesCount / totalTrades) * 100).toFixed(1)) : 0;

  return {
    totalProfit: Number(totalProfit.toFixed(2)),
    totalLoss: Number(totalLoss.toFixed(2)),
    netPnl,
    totalTrades,
    winTradesCount,
    lossTradesCount,
    drawTradesCount,
    winRate,
    trades
  };
}

/**
 * Calculates complete, real-time account metrics partitioned across:
 * - Today (00:00-23:59 local day, resets automatically to 0 on new day)
 * - Weekly (current calendar week)
 * - Monthly (current calendar month)
 * - All-Time (sum of all closed trades, never resets)
 */
export function calculateAccountMetricsEngine(
  acc: AccountType,
  balances: { live: number; bonus: number; demo: number },
  activeTrades: ActiveTrade[],
  closedTrades: ActiveTrade[],
  referenceDate = new Date(),
  resetHour = 8
): AccountCalculatedMetrics {
  // Deduplicate closed trades strictly by trade ID to guarantee no double-counting of profits or trades
  const seenClosedIds = new Set<string>();
  const accClosed: ActiveTrade[] = [];
  for (let i = 0; i < (closedTrades || []).length; i++) {
    const t = closedTrades[i];
    if (!t) continue;
    const matchesAccount = (t.accountType === acc || (!t.accountType && acc === 'live')) && t.status !== 'OPEN';
    if (!matchesAccount) continue;
    if (t.id) {
      if (seenClosedIds.has(t.id)) continue;
      seenClosedIds.add(t.id);
    }
    accClosed.push(t);
  }

  // Deduplicate active trades strictly and exclude any trade already closed or settled
  const seenActiveIds = new Set<string>();
  const accActive: ActiveTrade[] = [];
  for (let i = 0; i < (activeTrades || []).length; i++) {
    const t = activeTrades[i];
    if (!t) continue;
    const matchesAccount = (t.accountType === acc || (!t.accountType && acc === 'live')) && t.status === 'OPEN';
    if (!matchesAccount) continue;
    if (t.id) {
      if (seenActiveIds.has(t.id) || seenClosedIds.has(t.id)) continue;
      seenActiveIds.add(t.id);
    }
    accActive.push(t);
  }

  const bal = balances[acc] || 0;
  const floating = accActive.reduce((sum, trd) => sum + (typeof trd.pnl === 'number' && !isNaN(trd.pnl) ? trd.pnl : 0), 0);
  const netAssets = bal + floating;
  const usedM = accActive.reduce((sum, trd) => sum + (typeof trd.amount === 'number' && !isNaN(trd.amount) ? trd.amount : 0), 0);
  const freeM = Math.max(0, netAssets - usedM);

  // Partition closed trades into time buckets
  const todayTrades: ActiveTrade[] = [];
  const weeklyTrades: ActiveTrade[] = [];
  const monthlyTrades: ActiveTrade[] = [];
  const yearlyTrades: ActiveTrade[] = [];

  for (let i = 0; i < accClosed.length; i++) {
    const trade = accClosed[i];
    const closedTimeMs = getTradeClosedTimestamp(trade);

    if (isTimestampToday(closedTimeMs, referenceDate, resetHour)) {
      todayTrades.push(trade);
    }
    if (isTimestampThisWeek(closedTimeMs, referenceDate)) {
      weeklyTrades.push(trade);
    }
    if (isTimestampThisMonth(closedTimeMs, referenceDate)) {
      monthlyTrades.push(trade);
    }
    if (isTimestampThisYear(closedTimeMs, referenceDate)) {
      yearlyTrades.push(trade);
    }
  }

  // Calculate metrics for each timeframe
  const todayMetrics = calculateTimeframeMetrics(todayTrades);
  const weeklyMetrics = calculateTimeframeMetrics(weeklyTrades);
  const monthlyMetrics = calculateTimeframeMetrics(monthlyTrades);
  const yearlyMetrics = calculateTimeframeMetrics(yearlyTrades);
  const allTimeMetrics = calculateTimeframeMetrics(accClosed);

  return {
    balance: Number(bal.toFixed(2)),
    floatingPnl: Number(floating.toFixed(2)),
    netAssets: Number(netAssets.toFixed(2)),
    usedMargin: Number(usedM.toFixed(2)),
    freeMargin: Number(freeM.toFixed(2)),
    activeCount: accActive.length,
    closedCount: accClosed.length,

    today: todayMetrics,
    weekly: weeklyMetrics,
    monthly: monthlyMetrics,
    yearly: yearlyMetrics,
    allTime: allTimeMetrics,

    todayProfit: todayMetrics.totalProfit,
    todayLoss: todayMetrics.totalLoss,
    netTodayPnl: todayMetrics.netPnl
  };
}
