import { CoinAsset, TradePosition, TransactionRecord } from '../types';

export const INITIAL_COIN_ASSETS: CoinAsset[] = [
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 34890.12,
    change24h: 1120.50,
    changePercent: 3.22,
    volume: '$28.1B',
    high24h: 35400.00,
    low24h: 33750.00,
    isUp: true,
    type: 'crypto',
    sparkline: [32000, 32500, 31800, 33200, 34100, 33900, 34890],
    iconBg: 'bg-amber-500'
  },
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 1915.60,
    change24h: 52.30,
    changePercent: 2.80,
    volume: '$12.5B',
    high24h: 1950.00,
    low24h: 1880.00,
    isUp: true,
    type: 'crypto',
    sparkline: [1820, 1850, 1840, 1890, 1910, 1895, 1915.60],
    iconBg: 'bg-purple-600'
  },
  {
    id: 'sol',
    symbol: 'SOL',
    name: 'Solana',
    price: 41.75,
    change24h: 2.02,
    changePercent: 5.10,
    volume: '$2.9B',
    high24h: 43.20,
    low24h: 39.10,
    isUp: true,
    type: 'crypto',
    sparkline: [38, 39, 38.5, 40, 41, 40.8, 41.75],
    iconBg: 'bg-teal-500'
  },
  {
    id: 'eurusd',
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    price: 1.0854,
    change24h: 0.0023,
    changePercent: 0.21,
    volume: '$485B',
    high24h: 1.0880,
    low24h: 1.0820,
    isUp: true,
    type: 'forex',
    sparkline: [1.081, 1.083, 1.082, 1.084, 1.085, 1.0845, 1.0854],
    iconBg: 'bg-blue-600'
  },
  {
    id: 'gbpusd',
    symbol: 'GBP/USD',
    name: 'British Pound / USD',
    price: 1.2642,
    change24h: -0.0018,
    changePercent: -0.14,
    volume: '$310B',
    high24h: 1.2690,
    low24h: 1.2610,
    isUp: false,
    type: 'forex',
    sparkline: [1.268, 1.267, 1.265, 1.266, 1.263, 1.264, 1.2642],
    iconBg: 'bg-indigo-600'
  },
  {
    id: 'usdjpy',
    symbol: 'USD/JPY',
    name: 'US Dollar / Yen',
    price: 154.25,
    change24h: 0.85,
    changePercent: 0.55,
    volume: '$290B',
    high24h: 154.80,
    low24h: 153.20,
    isUp: true,
    type: 'forex',
    sparkline: [153.1, 153.5, 153.8, 154.0, 153.9, 154.1, 154.25],
    iconBg: 'bg-emerald-600'
  },
  {
    id: 'xauusd',
    symbol: 'XAU/USD',
    name: 'Gold / US Dollar',
    price: 2385.50,
    change24h: 12.40,
    changePercent: 0.52,
    volume: '$180B',
    high24h: 2392.00,
    low24h: 2370.00,
    isUp: true,
    type: 'forex',
    sparkline: [2360, 2372, 2368, 2378, 2382, 2380, 2385.5],
    iconBg: 'bg-[#F5B301]'
  },
  {
    id: 'lithium',
    symbol: 'LITH',
    name: 'Lithium Spot',
    price: 1.00,
    change24h: 0.00,
    changePercent: 0.00,
    volume: '$45M',
    high24h: 1.02,
    low24h: 0.98,
    isUp: true,
    type: 'binary',
    sparkline: [0.99, 1.00, 1.01, 0.98, 0.99, 1.00, 1.00],
    iconBg: 'bg-[#15eaff]'
  }
];

export const INITIAL_TRADES: TradePosition[] = [];

export const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx-901',
    accountType: 'live',
    type: 'Deposit',
    method: 'USDT (TRC20)',
    amount: 500000.00,
    status: 'Completed',
    timestamp: '2026-07-23 18:22',
    txHash: '0x8f2a...9c1e'
  },
  {
    id: 'tx-902',
    accountType: 'bonus',
    type: 'Bonus Credit',
    method: 'Welcome Bonus Promo',
    amount: 1000.00,
    status: 'Completed',
    timestamp: '2026-07-20 10:00'
  },
  {
    id: 'tx-903',
    accountType: 'demo',
    type: 'Deposit',
    method: 'Virtual Refill',
    amount: 300.00,
    status: 'Completed',
    timestamp: '2026-07-24 01:00'
  }
];
