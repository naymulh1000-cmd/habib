import { ActiveTrade } from '../types';
import { safeFormatDateTime, safeGetTime } from './dateUtils';
import { getMarketContractUnits } from './marketConfig';

// Global In-Memory and LocalStorage Persistent Settlement Lock Registry
const SETTLED_TRADES_STORAGE_KEY = 'forex_settled_trade_ids_v1';

const settledTradeIdsSet = new Set<string>();

// Initialize from localStorage
try {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(SETTLED_TRADES_STORAGE_KEY);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      parsed.forEach(id => settledTradeIdsSet.add(id));
    }
  }
} catch (_) {}

function persistSettledIds(): void {
  try {
    if (typeof window !== 'undefined') {
      const list = Array.from(settledTradeIdsSet).slice(-2000);
      localStorage.setItem(SETTLED_TRADES_STORAGE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
}

/**
 * Registers an existing closed trade ID into the settled set
 */
export function registerSettledTradeId(tradeId: string): void {
  if (!tradeId) return;
  if (!settledTradeIdsSet.has(tradeId)) {
    settledTradeIdsSet.add(tradeId);
    persistSettledIds();
  }
}

/**
 * Bulk registers closed trade IDs
 */
export function registerSettledTradeIds(tradeIds: string[]): void {
  if (!tradeIds || tradeIds.length === 0) return;
  let changed = false;
  tradeIds.forEach(id => {
    if (id && !settledTradeIdsSet.has(id)) {
      settledTradeIdsSet.add(id);
      changed = true;
    }
  });
  if (changed) {
    persistSettledIds();
  }
}

/**
 * Checks if a trade ID is already marked as settled/processed
 */
export function isTradeSettled(tradeId: string): boolean {
  if (!tradeId) return false;
  return settledTradeIdsSet.has(tradeId);
}

/**
 * Filters an active trades array so that:
 * 1. No trade whose ID is already marked settled can be included.
 * 2. Only status === 'OPEN' trades are included.
 * 3. Any duplicate trade IDs are strictly removed.
 */
export function filterUnsettledActiveTrades(trades: ActiveTrade[]): ActiveTrade[] {
  if (!Array.isArray(trades) || trades.length === 0) return [];
  const seen = new Set<string>();
  const result: ActiveTrade[] = [];
  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    if (!t || !t.id) continue;
    if (t.status !== 'OPEN') continue;
    if (settledTradeIdsSet.has(t.id)) continue;
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    result.push(t);
  }
  return result;
}

/**
 * Atomically marks a trade ID as settled.
 * Returns true if this invocation was the FIRST to mark it (mutex lock granted).
 * Returns false if it was already marked (duplicate processing blocked).
 */
export function markTradeSettled(tradeId: string): boolean {
  if (!tradeId) return false;
  if (settledTradeIdsSet.has(tradeId)) {
    return false;
  }
  settledTradeIdsSet.add(tradeId);
  persistSettledIds();
  return true;
}

export interface BinarySettlementResult {
  resolvedTrade: ActiveTrade;
  returnPayout: number; // Balance addition (stake + net profit for Win; stake for Draw; 0 for Loss)
  netPnl: number;       // PnL recorded (+profit for Win; 0 for Draw; -stake for Loss)
  status: 'WON' | 'LOST' | 'DRAW';
}

/**
 * Resolves a binary/OTC option trade with strictly ONE-TIME payout calculation.
 * Formula:
 * - WIN: Stake ($10) + (Stake * 90%) ($9) = $19 returned to balance. Net PnL = +$9.
 * - DRAW: Stake ($10) returned to balance. Net PnL = $0.
 * - LOSS: $0 returned to balance (stake already deducted on placement). Net PnL = -$10.
 * Guaranteed to execute EXACTLY ONCE per unique trade ID.
 */
export function resolveBinaryTrade(
  trade: ActiveTrade,
  closePrice: number,
  now = Date.now()
): BinarySettlementResult | null {
  if (!trade || !trade.id) return null;
  if (trade.status !== 'OPEN') return null;

  // Atomic lock check: only the first processor gets lock
  if (!markTradeSettled(trade.id)) {
    return null; // Already processed elsewhere!
  }

  const openMs = trade.openTimestamp || (trade.timestamp ? safeGetTime(trade.timestamp, now) : now);
  const expMs = trade.expiryTimestamp || (openMs + (trade.expirySeconds || 60) * 1000);

  const isWin =
    ((trade.type === 'UP' || trade.type === 'BUY') && closePrice > trade.entryPrice) ||
    ((trade.type === 'DOWN' || trade.type === 'SELL') && closePrice < trade.entryPrice);
  const isDraw = closePrice === trade.entryPrice;

  const payoutMultiplier = (trade.payoutPercent || 90) / 100;
  let returnPayout = 0;
  let netPnl = -trade.amount;
  let statusResult: 'WON' | 'LOST' | 'DRAW' = 'LOST';

  if (isWin) {
    statusResult = 'WON';
    const profit = Number((trade.amount * payoutMultiplier).toFixed(2));
    returnPayout = Number((trade.amount + profit).toFixed(2));
    netPnl = profit;
  } else if (isDraw) {
    statusResult = 'DRAW';
    returnPayout = Number(trade.amount.toFixed(2));
    netPnl = 0;
  } else {
    statusResult = 'LOST';
    returnPayout = 0;
    netPnl = -Number(trade.amount.toFixed(2));
  }

  const resolvedTrade: ActiveTrade = {
    ...trade,
    openTimestamp: openMs,
    expiryTimestamp: expMs,
    closeTimestamp: now,
    closedAtMs: now,
    remainingSeconds: 0,
    currentPrice: closePrice,
    exitPrice: closePrice,
    status: statusResult,
    pnl: netPnl,
    closeTime: safeFormatDateTime(now)
  };

  return {
    resolvedTrade,
    returnPayout,
    netPnl,
    status: statusResult
  };
}

export interface ForexSettlementResult {
  resolvedTrade: ActiveTrade;
  realizedPnl: number;
}

/**
 * Resolves a Forex position with pip calculation and atomic duplicate protection.
 */
export function resolveForexTrade(
  trade: ActiveTrade,
  closePrice: number,
  now = Date.now()
): ForexSettlementResult | null {
  if (!trade || !trade.id) return null;
  if (trade.status !== 'OPEN') return null;

  // Atomic lock check
  if (!markTradeSettled(trade.id)) {
    return null;
  }

  const lot = trade.lotSize || 0.01;
  const contractUnits = getMarketContractUnits(trade.symbol);
  const direction = trade.type === 'BUY' ? 1 : -1;
  const priceDiff = closePrice - trade.entryPrice;
  const realizedPnl = Number((priceDiff * contractUnits * lot * direction).toFixed(2));

  const resolvedTrade: ActiveTrade = {
    ...trade,
    closeTimestamp: now,
    closedAtMs: now,
    status: realizedPnl >= 0 ? 'WON' : 'LOST',
    currentPrice: closePrice,
    exitPrice: closePrice,
    pnl: realizedPnl,
    closeTime: safeFormatDateTime(now)
  };

  return {
    resolvedTrade,
    realizedPnl
  };
}
