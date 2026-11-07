/**
 * Bonus & Challenge Rules Engine
 * Single Source of Truth for Deposit Bonuses, Challenge Milestones, Daily Profit Caps & Withdrawal Shares
 */

export type BonusCategoryTier = 1 | 2 | 3;

export interface BonusCategoryConfig {
  tier: BonusCategoryTier;
  name: string;
  nameBn: string;
  minDeposit: number;
  maxDeposit: number;
  dailyProfitCapPercent: number; // 5%, 10%, 20%
  challengeTargetMultiplier: number; // 2 (100% gain / double)
  withdrawableProfitSharePercent: number; // 50%, 60%, 70%
  tag: string;
  tagBn: string;
  terms: string;
  termsBn: string;
}

export const BONUS_CATEGORIES: Record<BonusCategoryTier, BonusCategoryConfig> = {
  1: {
    tier: 1,
    name: 'Starter ($250 - $499)',
    nameBn: 'ক্যাটাগরি ১ (স্টার্টার)',
    minDeposit: 250,
    maxDeposit: 499,
    dailyProfitCapPercent: 5,
    challengeTargetMultiplier: 2,
    withdrawableProfitSharePercent: 50,
    tag: '100% Bonus + 5% Max Daily Gain',
    tagBn: '১০০% বোনাস + ডেইলি ৫% ম্যাক্স গেইন',
    terms: 'Withdrawals unlock when balance doubles (2x). Then 50% of profits are withdrawable.',
    termsBn: 'ব্যালেন্স ডাবল না হওয়া পর্যন্ত বোনাস প্রফিট উইথড্র বন্ধ। ডাবল হওয়ার পর অ্যাকাউন্ট অ্যাক্টিভ হবে এবং পরবর্তী প্রফিটের ৫০% উইথড্রযোগ্য।'
  },
  2: {
    tier: 2,
    name: 'Pro ($500 - $999)',
    nameBn: 'ক্যাটাগরি ২ (প্রো)',
    minDeposit: 500,
    maxDeposit: 999,
    dailyProfitCapPercent: 10,
    challengeTargetMultiplier: 2,
    withdrawableProfitSharePercent: 60,
    tag: '100% Bonus + 10% Max Daily Gain',
    tagBn: '১০০% বোনাস + ডেইলি ১০% ম্যাক্স গেইন',
    terms: 'Withdrawals unlock when balance doubles (2x). Then 60% of profits are withdrawable.',
    termsBn: 'ব্যালেন্স ডাবল না হওয়া পর্যন্ত বোনাস প্রফিট উইথড্র বন্ধ। ডাবল হওয়ার পর অ্যাকাউন্ট অ্যাক্টিভ হবে এবং পরবর্তী প্রফিটের ৬০% উইথড্রযোগ্য।'
  },
  3: {
    tier: 3,
    name: 'Elite ($1,000+)',
    nameBn: 'ক্যাটাগরি ৩ (এলিট)',
    minDeposit: 1000,
    maxDeposit: Infinity,
    dailyProfitCapPercent: 20,
    challengeTargetMultiplier: 2,
    withdrawableProfitSharePercent: 70,
    tag: '100% Bonus + 20% Max Daily Gain',
    tagBn: '১০০% বোনাস + ডেইলি ২০% ম্যাক্স গেইন',
    terms: 'Withdrawals unlock when balance doubles (2x). Then 70% of profits are withdrawable.',
    termsBn: 'ব্যালেন্স ডাবল না হওয়া পর্যন্ত বোনাস প্রফিট উইথড্র বন্ধ। ডাবল হওয়ার পর অ্যাকাউন্ট অ্যাক্টিভ হবে এবং পরবর্তী প্রফিটের ৭০% উইথড্রযোগ্য।'
  }
};

/**
 * Returns the bonus category config for a given deposit amount.
 * Threshold is $250.
 */
export function getBonusCategoryForAmount(amount: number): BonusCategoryConfig | null {
  if (amount < 250) return null;
  if (amount < 500) return BONUS_CATEGORIES[1];
  if (amount < 1000) return BONUS_CATEGORIES[2];
  return BONUS_CATEGORIES[3];
}

/**
 * Returns the bonus category config for a tier number (1, 2, or 3).
 * Defaults to Category 1 if invalid.
 */
export function getBonusCategoryByTier(tier?: number | null): BonusCategoryConfig {
  if (tier === 2) return BONUS_CATEGORIES[2];
  if (tier === 3) return BONUS_CATEGORIES[3];
  return BONUS_CATEGORIES[1];
}

/**
 * Derives the tier from the granted bonus base amount.
 */
export function deriveTierFromBaseAmount(baseAmount: number): BonusCategoryTier {
  if (baseAmount >= 1000) return 3;
  if (baseAmount >= 500) return 2;
  return 1;
}

/**
 * Returns the UTC date string (YYYY-MM-DD) for server-aligned daily resets at 00:00 UTC.
 */
export function getCurrentUtcDateKey(): string {
  try {
    return new Date().toISOString().split('T')[0];
  } catch (_) {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
}

/**
 * Daily Profit Tracker interface stored in localStorage / Firestore per user
 */
export interface UserDailyBonusProfitState {
  dateKey: string; // 'YYYY-MM-DD' UTC
  profitToday: number;
}

/**
 * Loads daily bonus profit state for the current user and resets at 00:00 UTC.
 */
export function getBonusDailyProfitState(
  userUid?: string,
  baseBonusAmount = 250,
  tier: BonusCategoryTier = 1
): {
  profitToday: number;
  dailyCapUsd: number;
  dailyProfitCapPercent: number;
  isCapped: boolean;
  remainingCapUsd: number;
  resetHoursRemaining: number;
} {
  const dateKey = getCurrentUtcDateKey();
  const storageKey = `forex_bonus_daily_profit_${userUid || 'default'}`;
  let profitToday = 0;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: UserDailyBonusProfitState = JSON.parse(raw);
      if (parsed && parsed.dateKey === dateKey && typeof parsed.profitToday === 'number') {
        profitToday = Math.max(0, parsed.profitToday);
      }
    }
  } catch (_) {}

  const cat = getBonusCategoryByTier(tier);
  const effectiveBase = baseBonusAmount > 0 ? baseBonusAmount : cat.minDeposit;
  const dailyCapUsd = Number(((effectiveBase * cat.dailyProfitCapPercent) / 100).toFixed(2));
  const isCapped = profitToday >= dailyCapUsd && dailyCapUsd > 0;
  const remainingCapUsd = Math.max(0, Number((dailyCapUsd - profitToday).toFixed(2)));

  // Calculate hours remaining until 00:00 UTC
  const now = new Date();
  const resetTime = new Date();
  resetTime.setUTCHours(24, 0, 0, 0);
  const resetHoursRemaining = Math.max(0.1, Number(((resetTime.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(1)));

  return {
    profitToday,
    dailyCapUsd,
    dailyProfitCapPercent: cat.dailyProfitCapPercent,
    isCapped,
    remainingCapUsd,
    resetHoursRemaining
  };
}

/**
 * Records profit earned from a bonus trade today, accumulating until 00:00 UTC.
 */
export function recordBonusTradeProfit(userUid: string | undefined, profitAmount: number): number {
  if (profitAmount <= 0) return 0;
  const dateKey = getCurrentUtcDateKey();
  const storageKey = `forex_bonus_daily_profit_${userUid || 'default'}`;
  let profitToday = 0;

  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed: UserDailyBonusProfitState = JSON.parse(raw);
      if (parsed && parsed.dateKey === dateKey && typeof parsed.profitToday === 'number') {
        profitToday = Math.max(0, parsed.profitToday);
      }
    }
  } catch (_) {}

  profitToday = Number((profitToday + profitAmount).toFixed(2));

  try {
    const payload: UserDailyBonusProfitState = { dateKey, profitToday };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (_) {}

  return profitToday;
}

/**
 * Checks challenge status (100% gain / double the bonus base).
 */
export function checkBonusChallengeStatus(
  currentBonusBalance: number,
  baseBonusAmount: number
): {
  isCompleted: boolean;
  targetBalance: number;
  progressPercent: number;
  remainingToDouble: number;
} {
  const base = baseBonusAmount > 0 ? baseBonusAmount : 250;
  const targetBalance = Number((base * 2).toFixed(2));
  const isCompleted = currentBonusBalance >= targetBalance;
  const remainingToDouble = Math.max(0, Number((targetBalance - currentBonusBalance).toFixed(2)));
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentBonusBalance / targetBalance) * 100)));

  return {
    isCompleted,
    targetBalance,
    progressPercent,
    remainingToDouble
  };
}

/**
 * Calculates withdrawable bonus profit based on tier and profit earned above target.
 */
export function calculateWithdrawableBonusProfit(
  currentBonusBalance: number,
  baseBonusAmount: number,
  tier: BonusCategoryTier
): {
  withdrawableAmount: number;
  totalNewProfit: number;
  profitSharePercent: number;
  isUnlocked: boolean;
} {
  const base = baseBonusAmount > 0 ? baseBonusAmount : 250;
  const targetBalance = Number((base * 2).toFixed(2));
  const isUnlocked = currentBonusBalance >= targetBalance;
  const cat = getBonusCategoryByTier(tier);
  const profitSharePercent = cat.withdrawableProfitSharePercent;

  if (!isUnlocked) {
    return {
      withdrawableAmount: 0,
      totalNewProfit: 0,
      profitSharePercent,
      isUnlocked: false
    };
  }

  // Profit earned above initial granted base
  const totalNewProfit = Math.max(0, Number((currentBonusBalance - base).toFixed(2)));
  const withdrawableAmount = Number(((totalNewProfit * profitSharePercent) / 100).toFixed(2));

  return {
    withdrawableAmount,
    totalNewProfit,
    profitSharePercent,
    isUnlocked: true
  };
}
