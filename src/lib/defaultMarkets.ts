export interface MarketPairConfig {
  id: string;
  symbol: string;
  name: string;
  category: 'forex' | 'otc' | 'crypto' | 'commodities';
  basePrice: number;
  spread: number;
  change24h: number;
  payoutPercent?: number;
  isActive: boolean;
  isRunning?: boolean;
  precision: number;
  isRealMarket?: boolean;
  trendBias?: 'UP' | 'DOWN' | 'SIDEWAYS' | 'REVERSAL' | 'RANDOM';
  controlMode?: 'AUTO' | 'UP' | 'DOWN' | 'SIDEWAYS' | 'REVERSAL' | 'RANDOM'; // Explicit Market Control Panel state
  volatility?: 'SMOOTH' | 'MODERATE' | 'VOLATILE' | 'EXTREME';
  wickSize?: 'SMALL' | 'NATURAL' | 'LONG';
  pullbackFreq?: 'BALANCED' | 'STRONG_TREND' | 'CHOPPY';
  updateSpeedMs?: number; // Tick update speed in ms (50, 100, 200, 250, 500, 1000)
  speed?: number; // Alias for updateSpeedMs
  trendStrength?: 'WEAK' | 'MODERATE' | 'STRONG';
  spikeProbability?: 'RARE' | 'LOW' | 'MEDIUM' | 'HIGH';
  maxCandleCap?: 'SMALL' | 'STANDARD' | 'EXPANDED';
  // Admin Target Price Control System
  targetPrice?: number | null;
  targetInitialPrice?: number | null;
  targetSetTimestamp?: number | null;
  targetSpeedSeconds?: number;
  targetReachedAction?: 'REVERSE' | 'CONSOLIDATE' | 'AUTO';
  targetDirection?: 'UP' | 'DOWN' | null;
}

export const DEFAULT_MARKETS: MarketPairConfig[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. REAL LIVE FOREX MARKETS (Real-time sub-second feeds)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'eur_usd',
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    category: 'forex',
    basePrice: 1.11990,
    spread: 0.00012,
    change24h: 0.03,
    payoutPercent: 92,
    isActive: true,
    precision: 5,
    isRealMarket: true
  },
  {
    id: 'gbp_usd',
    symbol: 'GBP/USD',
    name: 'British Pound / US Dollar',
    category: 'forex',
    basePrice: 1.32140,
    spread: 0.00018,
    change24h: 0.01,
    payoutPercent: 90,
    isActive: true,
    precision: 5,
    isRealMarket: true
  },
  {
    id: 'usd_jpy',
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    category: 'forex',
    basePrice: 158.260,
    spread: 0.020,
    change24h: 0.14,
    payoutPercent: 88,
    isActive: true,
    precision: 3,
    isRealMarket: true
  },
  {
    id: 'aud_usd',
    symbol: 'AUD/USD',
    name: 'Australian Dollar / US Dollar',
    category: 'forex',
    basePrice: 0.69550,
    spread: 0.00015,
    change24h: -0.09,
    payoutPercent: 87,
    isActive: true,
    precision: 5,
    isRealMarket: true
  },
  {
    id: 'usd_cad',
    symbol: 'USD/CAD',
    name: 'US Dollar / Canadian Dollar',
    category: 'forex',
    basePrice: 1.42400,
    spread: 0.00016,
    change24h: -0.11,
    payoutPercent: 88,
    isActive: true,
    precision: 5,
    isRealMarket: true
  },

  // ─────────────────────────────────────────────────────────────
  // 2. REAL LIVE COMMODITIES (Gold Spot Rate)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'xau_usd',
    symbol: 'XAU/USD',
    name: 'Gold / US Dollar',
    category: 'commodities',
    basePrice: 4116.50,
    spread: 0.35,
    change24h: 0.15,
    payoutPercent: 91,
    isActive: true,
    precision: 2,
    isRealMarket: true
  },

  // ─────────────────────────────────────────────────────────────
  // 3. REAL LIVE CRYPTO MARKETS (Direct Binance WebSocket Stream)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'btc_usd',
    symbol: 'BTC/USD',
    name: 'Bitcoin / US Dollar',
    category: 'crypto',
    basePrice: 81450.00,
    spread: 5.00,
    change24h: 2.85,
    payoutPercent: 93,
    isActive: true,
    precision: 2,
    isRealMarket: true
  },
  {
    id: 'eth_usd',
    symbol: 'ETH/USD',
    name: 'Ethereum / US Dollar',
    category: 'crypto',
    basePrice: 2480.00,
    spread: 0.80,
    change24h: 1.95,
    payoutPercent: 90,
    isActive: true,
    precision: 2,
    isRealMarket: true
  },
  {
    id: 'sol_usd',
    symbol: 'SOL/USD',
    name: 'Solana / US Dollar',
    category: 'crypto',
    basePrice: 103.00,
    spread: 0.15,
    change24h: 4.12,
    payoutPercent: 89,
    isActive: true,
    precision: 2,
    isRealMarket: true
  },

  // ─────────────────────────────────────────────────────────────
  // 4. PRESERVED BINARY OPTIONS OTC PAIRS (100% UNCHANGED)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'eur_usd_otc',
    symbol: 'EUR/USD OTC',
    name: 'Euro / US Dollar OTC',
    category: 'otc',
    basePrice: 1.08550,
    spread: 0.00010,
    change24h: 0.65,
    payoutPercent: 92,
    isActive: true,
    precision: 5,
    isRealMarket: false
  },
  {
    id: 'gbp_usd_otc',
    symbol: 'GBP/USD OTC',
    name: 'British Pound / US Dollar OTC',
    category: 'otc',
    basePrice: 1.29450,
    spread: 0.00014,
    change24h: 0.82,
    payoutPercent: 90,
    isActive: true,
    precision: 5,
    isRealMarket: false
  },
  {
    id: 'btc_usd_otc',
    symbol: 'BTC/USD OTC',
    name: 'Bitcoin / US Dollar OTC',
    category: 'otc',
    basePrice: 67450.00,
    spread: 12.00,
    change24h: 3.45,
    payoutPercent: 95,
    isActive: true,
    precision: 2,
    isRealMarket: false
  },
  {
    id: 'eth_usd_otc',
    symbol: 'ETH/USD OTC',
    name: 'Ethereum / US Dollar OTC',
    category: 'otc',
    basePrice: 3520.00,
    spread: 1.50,
    change24h: 2.10,
    payoutPercent: 88,
    isActive: true,
    precision: 2,
    isRealMarket: false
  },
  {
    id: 'usd_jpy_otc',
    symbol: 'USD/JPY OTC',
    name: 'US Dollar / Japanese Yen OTC',
    category: 'otc',
    basePrice: 154.250,
    spread: 0.020,
    change24h: 0.54,
    payoutPercent: 89,
    isActive: true,
    precision: 3,
    isRealMarket: false
  },
  {
    id: 'aud_usd_otc',
    symbol: 'AUD/USD OTC',
    name: 'Australian Dollar / US Dollar OTC',
    category: 'otc',
    basePrice: 0.72350,
    spread: 0.00014,
    change24h: 0.35,
    payoutPercent: 88,
    isActive: true,
    precision: 5,
    isRealMarket: false
  },
  {
    id: 'gold_otc',
    symbol: 'GOLD OTC',
    name: 'Gold Commodities OTC',
    category: 'otc',
    basePrice: 4082.50,
    spread: 0.25,
    change24h: 1.80,
    payoutPercent: 93,
    isActive: true,
    precision: 2,
    isRealMarket: false
  }
];
