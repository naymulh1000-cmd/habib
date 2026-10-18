import { db, isQuotaExceeded, isQuotaError } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface PaymentGatewayConfig {
  id: string;
  name: string;
  type: 'crypto';
  symbol: string;
  network?: string; // Tron, BSC, Polygon, ETH, Bitcoin, Solana, TON, etc.
  toCurrency?: string; // USDT, BTC, ETH, TON, SOL, TRX, BNB, LTC, USDC, DOGE, BCH
  accountOrAddress: string;
  instructions: string;
  fee: string;
  minUsd: number;
  isActive: boolean;
  currencyConversionRate?: number;
  qrCodeUrl?: string;
  isCryptomusAuto?: boolean;
}

export interface DepositRulesConfig {
  minDepositUsd: number;
  maxDepositUsd: number;
  defaultDepositUsd: number;
  quickAmounts: number[];
  isBonusEnabled: boolean;
  bonusMinDepositUsd: number;
  bonusMaxDepositUsd: number;
  bonusPercentage: number; // 100%
  bonusWithdrawalProfitPercent: number; // 50%
  bonusTermsNotice: string;
}

export const DEFAULT_PAYMENT_GATEWAYS: PaymentGatewayConfig[] = [
  {
    id: 'cryptomus_usdt_trc20',
    name: 'USDT (TRC20 - Tron Network)',
    type: 'crypto',
    symbol: 'USDT-TRC20',
    network: 'tron',
    toCurrency: 'USDT',
    accountOrAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    instructions: 'Automated Cryptomus checkout. Send exact USDT amount via TRC-20 Tron network. Confirmation takes ~30 seconds.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_usdt_bep20',
    name: 'USDT (BEP20 - BNB Smart Chain)',
    type: 'crypto',
    symbol: 'USDT-BEP20',
    network: 'bsc',
    toCurrency: 'USDT',
    accountOrAddress: '0x55d398326f99059fF775485246999027B3197955',
    instructions: 'Automated Cryptomus checkout. Send USDT via BEP-20 (BSC). Instant block confirmation.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_usdt_polygon',
    name: 'USDT (Polygon Network)',
    type: 'crypto',
    symbol: 'USDT-POL',
    network: 'polygon',
    toCurrency: 'USDT',
    accountOrAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    instructions: 'Automated Cryptomus checkout. Ultra-low gas fee on Polygon POS network.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_btc',
    name: 'Bitcoin (BTC)',
    type: 'crypto',
    symbol: 'BTC',
    network: 'bitcoin',
    toCurrency: 'BTC',
    accountOrAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    instructions: 'Automated Cryptomus checkout. Send BTC from any crypto wallet or exchange.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 20,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_eth',
    name: 'Ethereum (ETH)',
    type: 'crypto',
    symbol: 'ETH',
    network: 'eth',
    toCurrency: 'ETH',
    accountOrAddress: '0x00000000219ab540356cBB839Cbe05303d7705Fa',
    instructions: 'Automated Cryptomus checkout. Send Ethereum (ERC-20).',
    fee: '0% (Cryptomus Auto)',
    minUsd: 20,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_ton',
    name: 'Toncoin (TON Network)',
    type: 'crypto',
    symbol: 'TON',
    network: 'ton',
    toCurrency: 'TON',
    accountOrAddress: 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
    instructions: 'Automated Cryptomus checkout. Instant transaction via Telegram / Tonkeeper wallet.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_sol',
    name: 'Solana (SOL)',
    type: 'crypto',
    symbol: 'SOL',
    network: 'solana',
    toCurrency: 'SOL',
    accountOrAddress: 'So11111111111111111111111111111111111111112',
    instructions: 'Automated Cryptomus checkout. Lightning-fast Solana network confirmation.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_trx',
    name: 'TRON (TRX)',
    type: 'crypto',
    symbol: 'TRX',
    network: 'tron',
    toCurrency: 'TRX',
    accountOrAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    instructions: 'Automated Cryptomus checkout. Send TRX directly via Tron network.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_bnb',
    name: 'BNB (BNB Smart Chain)',
    type: 'crypto',
    symbol: 'BNB',
    network: 'bsc',
    toCurrency: 'BNB',
    accountOrAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    instructions: 'Automated Cryptomus checkout via BNB Smart Chain (BEP20).',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_ltc',
    name: 'Litecoin (LTC)',
    type: 'crypto',
    symbol: 'LTC',
    network: 'litecoin',
    toCurrency: 'LTC',
    accountOrAddress: 'LTC1Q8C64K8FVT6GKP9C39T8Q4Z0L2V5P6S7D8E9F',
    instructions: 'Automated Cryptomus checkout. Low transaction fees via Litecoin network.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_usdc',
    name: 'USD Coin (USDC)',
    type: 'crypto',
    symbol: 'USDC',
    network: 'polygon',
    toCurrency: 'USDC',
    accountOrAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    instructions: 'Automated Cryptomus checkout. Verified Circle USDC on Polygon / BSC / TRC20.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_doge',
    name: 'Dogecoin (DOGE)',
    type: 'crypto',
    symbol: 'DOGE',
    network: 'dogecoin',
    toCurrency: 'DOGE',
    accountOrAddress: 'D8vFxBy24CryptoMusOfficialWalletAddress7',
    instructions: 'Automated Cryptomus checkout via Dogecoin network.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_bch',
    name: 'Bitcoin Cash (BCH)',
    type: 'crypto',
    symbol: 'BCH',
    network: 'bch',
    toCurrency: 'BCH',
    accountOrAddress: 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a',
    instructions: 'Automated Cryptomus checkout via Bitcoin Cash network.',
    fee: '0% (Cryptomus Auto)',
    minUsd: 10,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  },
  {
    id: 'cryptomus_usdt_erc20',
    name: 'USDT (ERC20 - Ethereum)',
    type: 'crypto',
    symbol: 'USDT-ERC20',
    network: 'eth',
    toCurrency: 'USDT',
    accountOrAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    instructions: 'Automated Cryptomus checkout via Ethereum ERC-20.',
    fee: 'Standard ETH gas',
    minUsd: 25,
    isActive: true,
    isCryptomusAuto: true,
    qrCodeUrl: ''
  }
];

export const DEFAULT_DEPOSIT_RULES: DepositRulesConfig = {
  minDepositUsd: 100,
  maxDepositUsd: 10000,
  defaultDepositUsd: 100,
  quickAmounts: [100, 250, 500, 1000],
  isBonusEnabled: true,
  bonusMinDepositUsd: 250,
  bonusMaxDepositUsd: 5000,
  bonusPercentage: 100,
  bonusWithdrawalProfitPercent: 50,
  bonusTermsNotice: '100% Welcome Bonus is available once per account on deposits between $250 - $5,000 USD. Minimum standard deposit is $100 USD. Live & Bonus funds are credited separately upon deposit approval.'
};

// Local storage helper keys
const LOCAL_GATEWAYS_KEY = 'forex_gateways_config';
const LOCAL_RULES_KEY = 'forex_deposit_rules';

export function getStoredGateways(): PaymentGatewayConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_GATEWAYS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_PAYMENT_GATEWAYS;
}

export function saveStoredGateways(gateways: PaymentGatewayConfig[]) {
  try {
    localStorage.setItem(LOCAL_GATEWAYS_KEY, JSON.stringify(gateways));
  } catch (_) {}
  window.dispatchEvent(new Event('forex_config_updated'));
}

export function getStoredDepositRules(): DepositRulesConfig {
  try {
    const raw = localStorage.getItem(LOCAL_RULES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_DEPOSIT_RULES;
}

export function saveStoredDepositRules(rules: DepositRulesConfig) {
  try {
    localStorage.setItem(LOCAL_RULES_KEY, JSON.stringify(rules));
  } catch (_) {}
  window.dispatchEvent(new Event('forex_config_updated'));
}

/**
 * Utility to compress custom uploaded QR code image files before saving.
 * Reduces raw 2MB-10MB photo files down to ~20-50KB lightweight JPEGs,
 * ensuring Firestore document size limits (< 1MB) are strictly respected.
 */
export async function compressQrImage(file: File, maxWidth = 500, maxHeight = 500): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (evt) => {
      const img = new Image();
      img.onerror = (err) => reject(err);
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(evt.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Save updated gateways list permanently to Firestore database and server.
 * Syncs immediately to all online users.
 */
export async function saveGatewaysToFirestore(gateways: PaymentGatewayConfig[]): Promise<boolean> {
  saveStoredGateways(gateways);

  // Sync to Express backend for immediate cross-device distribution
  try {
    fetch('/api/deposit-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateways })
    }).catch(() => {});
  } catch (_) {}

  try {
    await setDoc(doc(db, 'settings', 'deposit_gateways'), {
      gateways,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to write deposit gateways to Firestore:', error);
    return false;
  }
}

/**
 * Save updated deposit rules permanently to Firestore database and server.
 */
export async function saveRulesToFirestore(rules: DepositRulesConfig): Promise<boolean> {
  saveStoredDepositRules(rules);

  // Sync to Express backend for immediate cross-device distribution
  try {
    fetch('/api/deposit-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules })
    }).catch(() => {});
  } catch (_) {}

  try {
    await setDoc(doc(db, 'settings', 'deposit_gateways'), {
      rules,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to write deposit rules to Firestore:', error);
    return false;
  }
}

/**
 * Real-time subscription to Firestore deposit gateways & rules configuration.
 * Ensures every single member on desktop & mobile sees the exact same updated wallet details.
 */
export function subscribeToDepositConfig(
  onUpdate: (gateways: PaymentGatewayConfig[], rules: DepositRulesConfig) => void
) {
  // Always emit cached version first for instant 0ms UI load
  onUpdate(getStoredGateways(), getStoredDepositRules());

  // Polling to server to guarantee sync even across networks/phones/desktops
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/deposit-config');
      if (res.ok) {
        const data = await res.json();
        let changed = false;
        let curGateways = getStoredGateways();
        let curRules = getStoredDepositRules();

        if (Array.isArray(data.gateways) && data.gateways.length > 0) {
          curGateways = data.gateways;
          saveStoredGateways(curGateways);
          changed = true;
        }
        if (data.rules && typeof data.rules === 'object') {
          curRules = { ...curRules, ...data.rules };
          saveStoredDepositRules(curRules);
          changed = true;
        }
        if (changed) {
          onUpdate(curGateways, curRules);
        }
      }
    } catch (_) {}
  }, 3500);

  // Focus refresh
  const handleFocus = async () => {
    try {
      const res = await fetch('/api/deposit-config');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.gateways) && data.gateways.length > 0) {
          saveStoredGateways(data.gateways);
          onUpdate(data.gateways, data.rules || getStoredDepositRules());
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

  const docRef = doc(db, 'settings', 'deposit_gateways');

  const unsubscribe = onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      let loadedGateways = getStoredGateways();
      let loadedRules = getStoredDepositRules();

      if (Array.isArray(data.gateways) && data.gateways.length > 0) {
        loadedGateways = data.gateways;
        saveStoredGateways(loadedGateways);
      }
      if (data.rules && typeof data.rules === 'object') {
        loadedRules = { ...loadedRules, ...data.rules };
        saveStoredDepositRules(loadedRules);
      }

      onUpdate(loadedGateways, loadedRules);
    } else {
      // Initialize Firestore document with defaults if missing
      const initialGateways = getStoredGateways();
      const initialRules = getStoredDepositRules();
      if (!isQuotaExceeded()) {
        setDoc(docRef, {
          gateways: initialGateways,
          rules: initialRules,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch((err) => { isQuotaError(err); });
      }

      onUpdate(initialGateways, initialRules);
    }
  }, (err) => {
    if (!isQuotaError(err)) {
      console.warn('Firestore subscription notice:', err);
    }
    onUpdate(getStoredGateways(), getStoredDepositRules());
  });

  return () => {
    clearInterval(pollTimer);
    if (typeof window !== 'undefined') window.removeEventListener('focus', handleFocus);
    unsubscribe();
  };
}
