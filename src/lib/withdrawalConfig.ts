import { db, isQuotaExceeded, isQuotaError } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface WithdrawalMethodConfig {
  id: string;
  name: string;
  type: 'crypto' | 'mfs' | 'bank' | 'binance';
  symbol: string;
  fee: string;
  minUsd: number;
  isActive: boolean;
  currencyConversionRate?: number; // e.g. 1 USD = 125 BDT
  inputLabel: string;
  placeholder: string;
}

export interface WithdrawalRulesConfig {
  minWithdrawalUsd: number;
  maxWithdrawalUsd: number;
  bonusProfitWithdrawPercent: number; // 50%
  processingTimeNotice: string;
}

export const DEFAULT_WITHDRAWAL_METHODS: WithdrawalMethodConfig[] = [
  {
    id: 'binance_pay',
    name: 'Binance Pay (Instant)',
    type: 'binance',
    symbol: 'BINANCE',
    fee: '0% (Free)',
    minUsd: 10,
    isActive: true,
    inputLabel: 'Binance Pay ID / Email',
    placeholder: 'Enter 9-digit Binance Pay ID (e.g. 894021590) or Email'
  },
  {
    id: 'usdt_trc20',
    name: 'USDT (TRC20 Network)',
    type: 'crypto',
    symbol: 'USDT-TRC20',
    fee: '1 USDT',
    minUsd: 10,
    isActive: true,
    inputLabel: 'TRC20 Wallet Address',
    placeholder: 'Enter TRC20 Address (starts with T...)'
  },
  {
    id: 'usdt_bep20',
    name: 'BEP20 (BSC Network)',
    type: 'crypto',
    symbol: 'BEP20',
    fee: '0.50 USDT',
    minUsd: 10,
    isActive: true,
    inputLabel: 'BEP20 BSC Address',
    placeholder: 'Enter BEP20 Address (starts with 0x...)'
  },
  {
    id: 'usdt_erc20',
    name: 'ERC20 (Ethereum Network)',
    type: 'crypto',
    symbol: 'ERC20',
    fee: '3 USDT',
    minUsd: 20,
    isActive: true,
    inputLabel: 'ERC20 Wallet Address',
    placeholder: 'Enter ERC20 Address (starts with 0x...)'
  },
  {
    id: 'ton_network',
    name: 'TON (Toncoin Network)',
    type: 'crypto',
    symbol: 'TON',
    fee: '0.1 TON',
    minUsd: 10,
    isActive: true,
    inputLabel: 'TON Wallet Address',
    placeholder: 'Enter TON Wallet Address'
  },
  {
    id: 'solana_network',
    name: 'Solana (SOL Network)',
    type: 'crypto',
    symbol: 'SOL',
    fee: '0.01 SOL',
    minUsd: 10,
    isActive: true,
    inputLabel: 'Solana Wallet Address',
    placeholder: 'Enter Solana (SOL) Address'
  },
  {
    id: 'litecoin',
    name: 'Litecoin (LTC Network)',
    type: 'crypto',
    symbol: 'LTC',
    fee: '0.001 LTC',
    minUsd: 10,
    isActive: true,
    inputLabel: 'Litecoin Wallet Address',
    placeholder: 'Enter LTC Wallet Address'
  },
  {
    id: 'bkash_mfs',
    name: 'bKash Mobile Financial Service',
    type: 'mfs',
    symbol: 'BKASH',
    fee: '0%',
    minUsd: 10,
    isActive: true,
    currencyConversionRate: 125,
    inputLabel: 'bKash Mobile Number',
    placeholder: 'Enter 11-digit bKash Personal/Agent Number'
  },
  {
    id: 'nagad_mfs',
    name: 'Nagad Mobile Financial Service',
    type: 'mfs',
    symbol: 'NAGAD',
    fee: '0%',
    minUsd: 10,
    isActive: true,
    currencyConversionRate: 125,
    inputLabel: 'Nagad Mobile Number',
    placeholder: 'Enter 11-digit Nagad Account Number'
  }
];

export const DEFAULT_WITHDRAWAL_RULES: WithdrawalRulesConfig = {
  minWithdrawalUsd: 10,
  maxWithdrawalUsd: 50000,
  bonusProfitWithdrawPercent: 50,
  processingTimeNotice: 'Your withdrawal request has been received successfully. It will be processed within 24–48 hours.'
};

// Local Storage Helper Keys
const LOCAL_WITHDRAWAL_METHODS_KEY = 'forex_withdrawal_methods_config';
const LOCAL_WITHDRAWAL_RULES_KEY = 'forex_withdrawal_rules_config';

export function getStoredWithdrawalMethods(): WithdrawalMethodConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_WITHDRAWAL_METHODS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_WITHDRAWAL_METHODS;
}

export function saveStoredWithdrawalMethods(methods: WithdrawalMethodConfig[]) {
  try {
    localStorage.setItem(LOCAL_WITHDRAWAL_METHODS_KEY, JSON.stringify(methods));
  } catch (_) {}
  window.dispatchEvent(new Event('forex_withdrawal_config_updated'));
}

export function getStoredWithdrawalRules(): WithdrawalRulesConfig {
  try {
    const raw = localStorage.getItem(LOCAL_WITHDRAWAL_RULES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_WITHDRAWAL_RULES;
}

export function saveStoredWithdrawalRules(rules: WithdrawalRulesConfig) {
  try {
    localStorage.setItem(LOCAL_WITHDRAWAL_RULES_KEY, JSON.stringify(rules));
  } catch (_) {}
  window.dispatchEvent(new Event('forex_withdrawal_config_updated'));
}

/**
 * Save updated withdrawal methods permanently to Firestore database and server.
 * Syncs immediately to all online users.
 */
export async function saveWithdrawalMethodsToFirestore(methods: WithdrawalMethodConfig[]): Promise<boolean> {
  saveStoredWithdrawalMethods(methods);

  // Sync to Express backend for immediate cross-device distribution
  try {
    fetch('/api/withdrawal-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ methods })
    }).catch(() => {});
  } catch (_) {}

  try {
    await setDoc(doc(db, 'settings', 'withdrawal_methods'), {
      methods,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to write withdrawal methods to Firestore:', error);
    return false;
  }
}

/**
 * Save updated withdrawal rules permanently to Firestore database and server.
 */
export async function saveWithdrawalRulesToFirestore(rules: WithdrawalRulesConfig): Promise<boolean> {
  saveStoredWithdrawalRules(rules);

  // Sync to Express backend for immediate cross-device distribution
  try {
    fetch('/api/withdrawal-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules })
    }).catch(() => {});
  } catch (_) {}

  try {
    await setDoc(doc(db, 'settings', 'withdrawal_methods'), {
      rules,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to write withdrawal rules to Firestore:', error);
    return false;
  }
}

/**
 * Real-time subscription to Firestore withdrawal methods & rules configuration.
 */
export function subscribeToWithdrawalConfig(
  onUpdate: (methods: WithdrawalMethodConfig[], rules: WithdrawalRulesConfig) => void
) {
  // Always emit cached version first for instant UI response
  onUpdate(getStoredWithdrawalMethods(), getStoredWithdrawalRules());

  // Polling to Express server every 3.5s to guarantee phone <-> desktop sync
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/withdrawal-config');
      if (res.ok) {
        const data = await res.json();
        let changed = false;
        let curMethods = getStoredWithdrawalMethods();
        let curRules = getStoredWithdrawalRules();

        if (Array.isArray(data.methods) && data.methods.length > 0) {
          curMethods = data.methods;
          saveStoredWithdrawalMethods(curMethods);
          changed = true;
        }
        if (data.rules && typeof data.rules === 'object') {
          curRules = { ...curRules, ...data.rules };
          saveStoredWithdrawalRules(curRules);
          changed = true;
        }
        if (changed) {
          onUpdate(curMethods, curRules);
        }
      }
    } catch (_) {}
  }, 3500);

  // Focus refresh
  const handleFocus = async () => {
    try {
      const res = await fetch('/api/withdrawal-config');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.methods) && data.methods.length > 0) {
          saveStoredWithdrawalMethods(data.methods);
          onUpdate(data.methods, data.rules || getStoredWithdrawalRules());
        }
      }
    } catch (_) {}
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
  }

  if (isQuotaExceeded()) {
    return () => {
      clearInterval(pollTimer);
      if (typeof window !== 'undefined') window.removeEventListener('focus', handleFocus);
    };
  }

  const docRef = doc(db, 'settings', 'withdrawal_methods');

  const unsubscribe = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      let loadedMethods = getStoredWithdrawalMethods();
      let loadedRules = getStoredWithdrawalRules();

      if (Array.isArray(data.methods) && data.methods.length > 0) {
        loadedMethods = data.methods;
        saveStoredWithdrawalMethods(loadedMethods);
      }
      if (data.rules && typeof data.rules === 'object') {
        loadedRules = { ...loadedRules, ...data.rules };
        saveStoredWithdrawalRules(loadedRules);
      }

      onUpdate(loadedMethods, loadedRules);
    } else {
      const initialMethods = getStoredWithdrawalMethods();
      const initialRules = getStoredWithdrawalRules();
      if (!isQuotaExceeded()) {
        setDoc(docRef, {
          methods: initialMethods,
          rules: initialRules,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch((err) => { isQuotaError(err); });
      }

      onUpdate(initialMethods, initialRules);
    }
  }, (err) => {
    if (!isQuotaError(err)) {
      console.warn('Firestore withdrawal config subscription notice:', err);
    }
    onUpdate(getStoredWithdrawalMethods(), getStoredWithdrawalRules());
  });

  return () => {
    clearInterval(pollTimer);
    if (typeof window !== 'undefined') window.removeEventListener('focus', handleFocus);
    unsubscribe();
  };
}

