import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_MARKETS, MarketPairConfig } from './src/lib/defaultMarkets';
import { 
  getDeterministicHistoricalCandle, 
  getDeterministicActiveCandle, 
  getTimeframeSeconds,
  setMarketLiveExposure,
  getMarketLiveExposure
} from './src/lib/deterministicMarketEngine';
import { 
  DEFAULT_BENCHMARK_LIVE, 
  DEFAULT_BENCHMARK_BONUS, 
  BaseLeaderboardEntry,
  getDailyBenchmarkAccounts,
  getDailyTradingCycleWindow,
  cleanAndRankTop50,
  cleanAndRankTop20
} from './src/lib/benchmarkData';
import { tradingViewMasterFeed, MONITORED_REAL_MARKETS } from './server/tradingViewMasterFeed';

// Start TradingView Master Feed on server boot
tradingViewMasterFeed.start();

const app = express();
const PORT = 3000;

// Enable gzip/deflate compression for all requests
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Persistent data storage directory
const DATA_DIR = path.join(process.cwd(), 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'global_leaderboard.json');
const LEADERBOARD_CONFIG_FILE = path.join(DATA_DIR, 'leaderboard_config.json');
const MARKETS_FILE = path.join(DATA_DIR, 'markets_config.json');
const REGISTERED_USERS_FILE = path.join(DATA_DIR, 'registered_users.json');

function getStoredUsersServer(): any[] {
  try {
    if (fs.existsSync(REGISTERED_USERS_FILE)) {
      return JSON.parse(fs.readFileSync(REGISTERED_USERS_FILE, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function resolveServerProfileName(userId?: string, fallbackName?: string, userEmail?: string): string {
  try {
    const users = getStoredUsersServer();
    if (userId || userEmail) {
      const matched = users.find((u: any) => 
        (userId && u.uid === userId) || 
        (userEmail && u.email && u.email.toLowerCase() === userEmail.toLowerCase())
      );
      if (matched) {
        const pName = matched.displayName || matched.fullName || matched.name;
        if (pName && typeof pName === 'string' && !pName.includes('@')) {
          const trimmed = pName.trim();
          if (trimmed.length >= 2) return trimmed.length > 20 ? trimmed.substring(0, 19) + '...' : trimmed;
        }
      }
    }
  } catch (_) {}

  let clean = (fallbackName || '').trim();
  if (clean.includes('@')) {
    clean = clean.split('@')[0].replace(/[._\-+]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }
  if (!clean || clean.length < 2) {
    return userId ? `Trader ${userId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'VIP'}` : 'Trader';
  }
  return clean.length > 20 ? clean.substring(0, 19) + '...' : clean;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
// MARKETS GLOBAL CONFIGURATION
// ─────────────────────────────────────────────────────────────

let marketsConfig: MarketPairConfig[] = DEFAULT_MARKETS;

try {
  if (fs.existsSync(MARKETS_FILE)) {
    const raw = fs.readFileSync(MARKETS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const merged: MarketPairConfig[] = [];
      DEFAULT_MARKETS.forEach(dm => {
        const found = parsed.find((p: any) => p.id === dm.id || p.symbol === dm.symbol);
        if (found) {
          merged.push({
            ...dm,
            ...found,
            basePrice: dm.isRealMarket ? dm.basePrice : (found.basePrice ?? dm.basePrice),
            isRealMarket: dm.isRealMarket,
            payoutPercent: found.payoutPercent ?? dm.payoutPercent ?? 90
          });
        } else {
          merged.push(dm);
        }
      });
      marketsConfig = merged;
      persistMarkets();
    }
  }
} catch (e) {
  console.warn('Could not load existing markets file, using default markets:', e);
}

function persistMarkets() {
  try {
    fs.writeFileSync(MARKETS_FILE, JSON.stringify(marketsConfig, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to persist markets config:', e);
  }
}

// ─────────────────────────────────────────────────────────────
// LEADERBOARD CONFIGURATION & BENCHMARKS
// ─────────────────────────────────────────────────────────────

export interface LeaderboardConfig {
  resetHourUtc: number;
  liveActive: boolean;
  bonusActive: boolean;
  lastResetTimestamp: number;
  benchmarkEntriesLive: BaseLeaderboardEntry[];
  benchmarkEntriesBonus: BaseLeaderboardEntry[];
  updatedAt?: number;
}

let leaderboardConfig: LeaderboardConfig = {
  resetHourUtc: 8,
  liveActive: true,
  bonusActive: true,
  lastResetTimestamp: Date.now(),
  benchmarkEntriesLive: DEFAULT_BENCHMARK_LIVE,
  benchmarkEntriesBonus: DEFAULT_BENCHMARK_BONUS,
  updatedAt: Date.now()
};

try {
  if (fs.existsSync(LEADERBOARD_CONFIG_FILE)) {
    const raw = fs.readFileSync(LEADERBOARD_CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.benchmarkEntriesLive) && parsed.benchmarkEntriesLive.length > 0) {
        leaderboardConfig.benchmarkEntriesLive = parsed.benchmarkEntriesLive;
      }
      if (Array.isArray(parsed.benchmarkEntriesBonus) && parsed.benchmarkEntriesBonus.length > 0) {
        leaderboardConfig.benchmarkEntriesBonus = parsed.benchmarkEntriesBonus;
      }
      leaderboardConfig.resetHourUtc = parsed.resetHourUtc ?? 8;
      leaderboardConfig.liveActive = parsed.liveActive ?? true;
      leaderboardConfig.bonusActive = parsed.bonusActive ?? true;
      leaderboardConfig.lastResetTimestamp = parsed.lastResetTimestamp ?? Date.now();
      leaderboardConfig.updatedAt = parsed.updatedAt ?? Date.now();
    }
  }
} catch (e) {
  console.warn('Could not load existing leaderboard config file, using defaults:', e);
}

function persistLeaderboardConfig() {
  try {
    fs.writeFileSync(LEADERBOARD_CONFIG_FILE, JSON.stringify(leaderboardConfig, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to persist leaderboard config:', e);
  }
}

// ─────────────────────────────────────────────────────────────
// REAL TRADERS STORAGE & TOP 50 COMPILATION
// ─────────────────────────────────────────────────────────────

let realTraders: Record<string, BaseLeaderboardEntry> = {};

try {
  if (fs.existsSync(LEADERBOARD_FILE)) {
    const raw = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      realTraders = parsed;
    }
  }
} catch (e) {
  console.warn('Could not load existing leaderboard file, starting fresh:', e);
}

function persistTraders() {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(realTraders, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to persist leaderboard traders:', e);
  }
}

/**
 * Checks if the 24-hour cycle has rolled over at 2:00 PM BST (08:00 UTC).
 * Resets all stored real trader profits to 0 for the fresh daily cycle.
 */
function checkAndResetDailyCycle(now = Date.now()) {
  const resetHour = leaderboardConfig.resetHourUtc ?? 8;
  const cycleWindow = getDailyTradingCycleWindow(resetHour, new Date(now));
  
  let changed = false;
  for (const key of Object.keys(realTraders)) {
    const t = realTraders[key];
    // Any record updated before the current cycle start time (with 2-min clock grace) must be zeroed out
    if (!t.lastUpdated || t.lastUpdated < (cycleWindow.startTime - 120000)) {
      if ((t.todayProfit || 0) !== 0 || (t.totalTrades || 0) !== 0 || (t.profitPercentage || 0) !== 0) {
        t.todayProfit = 0;
        t.profitPercentage = 0;
        t.winRate = 0;
        t.totalTrades = 0;
        t.lastUpdated = cycleWindow.startTime;
        changed = true;
      }
    }
  }

  if (changed) {
    persistTraders();
  }

  return cycleWindow;
}

// Background daemon to ensure immediate zero-out as soon as 2:00 PM BST (08:00 UTC) strikes
setInterval(() => {
  try {
    checkAndResetDailyCycle();
  } catch (_) {}
}, 5000);

function getTop50(accountType: 'live' | 'bonus'): (BaseLeaderboardEntry & { rank: number })[] {
  const now = Date.now();
  const cycleWindow = checkAndResetDailyCycle(now);
  const dynamicBenchmarks = getDailyBenchmarkAccounts(accountType, cycleWindow.startTime, now);
  
  // Real traders for this account type who traded in the current cycle with positive profit
  const matchedRealTraders: BaseLeaderboardEntry[] = Object.values(realTraders).filter(
    t => t.accountType === accountType && 
         !t.isBenchmark && 
         ((t.lastUpdated || 0) >= (cycleWindow.startTime - 120000)) && 
         ((t.todayProfit || 0) > 0)
  ).map(t => ({
    ...t,
    username: resolveServerProfileName(t.userId, t.username, (t as any).email),
  }));

  return cleanAndRankTop50(matchedRealTraders, dynamicBenchmarks);
}

const getTop20 = getTop50;

// ─────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// Authoritative Single Clock for Multi-Client Synchronization
app.get('/api/server-time', (_req, res) => {
  const now = Date.now();
  res.json({ time: now, serverTime: now, iso: new Date(now).toISOString() });
});

// Markets endpoints
app.get('/api/markets', (req, res) => {
  res.json({ markets: marketsConfig, lastUpdated: Date.now() });
});

app.post('/api/markets', (req, res) => {
  try {
    const { markets } = req.body;
    if (Array.isArray(markets) && markets.length > 0) {
      marketsConfig = markets;
      persistMarkets();
      return res.json({ success: true, count: marketsConfig.length });
    }
    return res.status(400).json({ error: 'Invalid markets array' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error updating markets' });
  }
});

// Leaderboard endpoints
app.get('/api/leaderboard/config', (req, res) => {
  res.json({ config: leaderboardConfig, lastUpdated: Date.now() });
});

app.post('/api/leaderboard/config', (req, res) => {
  try {
    const incoming = req.body;
    if (incoming && typeof incoming === 'object') {
      if (Array.isArray(incoming.benchmarkEntriesLive)) {
        leaderboardConfig.benchmarkEntriesLive = incoming.benchmarkEntriesLive;
      }
      if (Array.isArray(incoming.benchmarkEntriesBonus)) {
        leaderboardConfig.benchmarkEntriesBonus = incoming.benchmarkEntriesBonus;
      }
      if (typeof incoming.resetHourUtc === 'number') {
        leaderboardConfig.resetHourUtc = incoming.resetHourUtc;
      }
      if (typeof incoming.liveActive === 'boolean') {
        leaderboardConfig.liveActive = incoming.liveActive;
      }
      if (typeof incoming.bonusActive === 'boolean') {
        leaderboardConfig.bonusActive = incoming.bonusActive;
      }
      leaderboardConfig.lastResetTimestamp = incoming.lastResetTimestamp || Date.now();
      leaderboardConfig.updatedAt = Date.now();

      persistLeaderboardConfig();
      return res.json({ success: true, config: leaderboardConfig });
    }
    return res.status(400).json({ error: 'Invalid config payload' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error saving config' });
  }
});

app.post('/api/leaderboard/admin-config', (req, res) => {
  try {
    const incoming = req.body;
    if (incoming && typeof incoming === 'object') {
      if (Array.isArray(incoming.benchmarkEntriesLive)) {
        leaderboardConfig.benchmarkEntriesLive = incoming.benchmarkEntriesLive;
      }
      if (Array.isArray(incoming.benchmarkEntriesBonus)) {
        leaderboardConfig.benchmarkEntriesBonus = incoming.benchmarkEntriesBonus;
      }
      if (typeof incoming.resetHourUtc === 'number') {
        leaderboardConfig.resetHourUtc = incoming.resetHourUtc;
      }
      if (typeof incoming.liveActive === 'boolean') {
        leaderboardConfig.liveActive = incoming.liveActive;
      }
      if (typeof incoming.bonusActive === 'boolean') {
        leaderboardConfig.bonusActive = incoming.bonusActive;
      }
      leaderboardConfig.lastResetTimestamp = incoming.lastResetTimestamp || Date.now();
      leaderboardConfig.updatedAt = Date.now();

      persistLeaderboardConfig();
      return res.json({ success: true, config: leaderboardConfig });
    }
    return res.status(400).json({ error: 'Invalid config payload' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error saving config' });
  }
});

app.get('/api/leaderboard/:accountType', (req, res) => {
  const accountType = req.params.accountType === 'bonus' ? 'bonus' : 'live';
  const top50 = getTop50(accountType);
  res.json({
    accountType,
    top50,
    top20: top50,
    lastUpdated: Date.now(),
  });
});

app.get('/api/leaderboard/all', (req, res) => {
  const liveTop50 = getTop50('live');
  const bonusTop50 = getTop50('bonus');
  res.json({
    live: liveTop50,
    bonus: bonusTop50,
    top50: {
      live: liveTop50,
      bonus: bonusTop50,
    },
    top20: {
      live: liveTop50,
      bonus: bonusTop50,
    },
    lastUpdated: Date.now(),
  });
});

app.post('/api/leaderboard/sync', (req, res) => {
  try {
    const { traderRecord, accountType } = req.body;
    if (!traderRecord || !traderRecord.userId) {
      return res.status(400).json({ error: 'Missing userId or traderRecord' });
    }

    const validAccountType: 'live' | 'bonus' = accountType === 'bonus' ? 'bonus' : 'live';
    const key = `${validAccountType}_${traderRecord.userId}`;

    const now = Date.now();
    const cycleWindow = checkAndResetDailyCycle(now);

    const traderLastUpdated = traderRecord.lastUpdated || now;
    const isFromCurrentCycle = traderLastUpdated >= cycleWindow.startTime;

    const todayProfit = isFromCurrentCycle ? (typeof traderRecord.todayProfit === 'number' ? traderRecord.todayProfit : 0) : 0;
    const totalTrades = isFromCurrentCycle ? (typeof traderRecord.totalTrades === 'number' ? traderRecord.totalTrades : 0) : 0;
    const profitPercentage = isFromCurrentCycle ? (typeof traderRecord.profitPercentage === 'number' ? traderRecord.profitPercentage : 0) : 0;

    const resolvedUsername = resolveServerProfileName(traderRecord.userId, traderRecord.username, traderRecord.email);

    // Update real trader record
    realTraders[key] = {
      ...traderRecord,
      username: resolvedUsername,
      accountType: validAccountType,
      todayProfit,
      totalTrades,
      profitPercentage,
      isBenchmark: false,
      lastUpdated: now,
    };

    persistTraders();

    const updatedTop50 = getTop50(validAccountType);
    return res.json({
      success: true,
      accountType: validAccountType,
      top50: updatedTop50,
      top20: updatedTop50,
      lastUpdated: Date.now(),
    });
  } catch (err: any) {
    console.error('Leaderboard sync error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
});

app.post('/api/leaderboard/reset-now', (_req, res) => {
  try {
    for (const key of Object.keys(realTraders)) {
      const t = realTraders[key];
      t.todayProfit = 0;
      t.profitPercentage = 0;
      t.winRate = 0;
      t.totalTrades = 0;
      t.lastUpdated = Date.now();
    }
    persistTraders();
    res.json({ success: true, message: 'All leaderboard profits reset to 0.00' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CROSS-DEVICE GLOBAL CONFIGURATION & SYNC ENDPOINTS
// ─────────────────────────────────────────────────────────────

const BRANDING_FILE = path.join(DATA_DIR, 'branding_config.json');
const HELPLINE_FILE = path.join(DATA_DIR, 'helpline_config.json');
const BROADCASTS_FILE = path.join(DATA_DIR, 'broadcasts.json');
const DEPOSIT_GATEWAYS_FILE = path.join(DATA_DIR, 'deposit_gateways.json');
const WITHDRAWAL_METHODS_FILE = path.join(DATA_DIR, 'withdrawal_methods.json');
const USER_BALANCES_FILE = path.join(DATA_DIR, 'user_balances.json');
const DEPOSITS_FILE = path.join(DATA_DIR, 'deposits.json');
const WITHDRAWALS_FILE = path.join(DATA_DIR, 'withdrawals.json');
const ADMIN_LOGS_FILE = path.join(DATA_DIR, 'admin_logs.json');

// Helper to load/save deposits and withdrawals safely
function getStoredDepositsServer(): any[] {
  try {
    if (fs.existsSync(DEPOSITS_FILE)) {
      const raw = fs.readFileSync(DEPOSITS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to read deposits.json:', err);
  }
  return [];
}

function saveStoredDepositsServer(deposits: any[]): void {
  try {
    fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(deposits, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write deposits.json:', err);
  }
}

function getStoredWithdrawalsServer(): any[] {
  try {
    if (fs.existsSync(WITHDRAWALS_FILE)) {
      const raw = fs.readFileSync(WITHDRAWALS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to read withdrawals.json:', err);
  }
  return [];
}

function saveStoredWithdrawalsServer(withdrawals: any[]): void {
  try {
    fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(withdrawals, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write withdrawals.json:', err);
  }
}

function logAdminActionServer(action: string, meta: Record<string, any>): void {
  try {
    let logs: any[] = [];
    if (fs.existsSync(ADMIN_LOGS_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(ADMIN_LOGS_FILE, 'utf8'));
      } catch (_) {}
    }
    logs.unshift({
      action,
      ...meta,
      timestamp: new Date().toISOString()
    });
    if (logs.length > 500) logs = logs.slice(0, 500);
    fs.writeFileSync(ADMIN_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed to save admin action log:', e);
  }
}

// 1. Branding (Master Logo, App Name, Brand Subtitle)
app.get('/api/branding', (_req, res) => {
  try {
    if (fs.existsSync(BRANDING_FILE)) {
      const raw = fs.readFileSync(BRANDING_FILE, 'utf8');
      return res.json(JSON.parse(raw));
    }
  } catch (_) {}
  return res.json({
    logoUrl: '/logo.png',
    brandName: 'Forex Trade',
    brandSubtitle: 'PRO',
    updatedAt: new Date().toISOString()
  });
});

app.post('/api/branding', (req, res) => {
  try {
    const { logoUrl, brandName, brandSubtitle } = req.body;
    let current: any = {
      logoUrl: '/logo.png',
      brandName: 'Forex Trade',
      brandSubtitle: 'PRO',
      updatedAt: new Date().toISOString()
    };
    if (fs.existsSync(BRANDING_FILE)) {
      try {
        current = JSON.parse(fs.readFileSync(BRANDING_FILE, 'utf8'));
      } catch (_) {}
    }
    const updated = {
      ...current,
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(brandName !== undefined ? { brandName } : {}),
      ...(brandSubtitle !== undefined ? { brandSubtitle } : {}),
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(BRANDING_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 1.5. 24/7 Helpline & Support Links Configuration
const DEFAULT_HELPLINE_CONFIG = {
  telegramUrl: 'https://t.me/ftpsupport24',
  telegramLabel: 'Telegram Support (@ftpsupport24)',
  gmailUrl: 'forextradepro24@gmail.com',
  gmailLabel: 'Email Support (forextradepro24@gmail.com)',
  hotlinePhone: '',
  hotlineLabel: '',
  whatsappUrl: '',
  whatsappLabel: '',
  customLinkUrl: '',
  customLinkTitle: '',
  supportNotice: 'Our 24/7 official support team is active. Reach out via Telegram or Gmail for fast assistance.',
  updatedAt: new Date().toISOString()
};

app.get('/api/helpline', (_req, res) => {
  try {
    if (fs.existsSync(HELPLINE_FILE)) {
      const raw = fs.readFileSync(HELPLINE_FILE, 'utf8');
      return res.json(JSON.parse(raw));
    }
  } catch (_) {}
  return res.json(DEFAULT_HELPLINE_CONFIG);
});

app.post('/api/helpline', (req, res) => {
  try {
    const {
      telegramUrl,
      telegramLabel,
      gmailUrl,
      gmailLabel,
      hotlinePhone,
      hotlineLabel,
      whatsappUrl,
      whatsappLabel,
      customLinkUrl,
      customLinkTitle,
      supportNotice
    } = req.body;

    let current: any = { ...DEFAULT_HELPLINE_CONFIG };
    if (fs.existsSync(HELPLINE_FILE)) {
      try {
        current = JSON.parse(fs.readFileSync(HELPLINE_FILE, 'utf8'));
      } catch (_) {}
    }

    const updated = {
      ...current,
      ...(telegramUrl !== undefined ? { telegramUrl } : {}),
      ...(telegramLabel !== undefined ? { telegramLabel } : {}),
      ...(gmailUrl !== undefined ? { gmailUrl } : {}),
      ...(gmailLabel !== undefined ? { gmailLabel } : {}),
      ...(hotlinePhone !== undefined ? { hotlinePhone } : {}),
      ...(hotlineLabel !== undefined ? { hotlineLabel } : {}),
      ...(whatsappUrl !== undefined ? { whatsappUrl } : {}),
      ...(whatsappLabel !== undefined ? { whatsappLabel } : {}),
      ...(customLinkUrl !== undefined ? { customLinkUrl } : {}),
      ...(customLinkTitle !== undefined ? { customLinkTitle } : {}),
      ...(supportNotice !== undefined ? { supportNotice } : {}),
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(HELPLINE_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Broadcast Signals & Announcements
app.get('/api/broadcasts', (_req, res) => {
  try {
    if (fs.existsSync(BROADCASTS_FILE)) {
      const raw = fs.readFileSync(BROADCASTS_FILE, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return res.json({ broadcasts: list });
      }
    }
  } catch (_) {}
  return res.json({
    broadcasts: [
      {
        id: 'sig-01',
        title: 'EUR/USD Bullish Spike Expected',
        text: 'ECB interest rate release showing high momentum. Strong support at 1.0820 with upside target 1.0890.',
        time: '12 mins ago',
        type: 'buy',
        author: 'Chief Market Analyst',
        createdAt: new Date(Date.now() - 12 * 60000).toISOString()
      },
      {
        id: 'sig-02',
        title: 'BTC/USD Resistance Rejection',
        text: 'Bitcoin facing rejection at key $94,200 psychological barrier. Expecting pullback to $92,000 support level.',
        time: '45 mins ago',
        type: 'sell',
        author: 'Crypto Desk',
        createdAt: new Date(Date.now() - 45 * 60000).toISOString()
      },
      {
        id: 'sig-03',
        title: 'Weekend Binary OTC Markets Activated',
        text: 'OTC Payouts increased to 92% across all major FX and Gold pairs. Instant withdrawals active 24/7.',
        time: '2 hours ago',
        type: 'announcement',
        author: 'Platform Ops',
        createdAt: new Date(Date.now() - 120 * 60000).toISOString()
      }
    ]
  });
});

app.post('/api/broadcasts', (req, res) => {
  try {
    const newSignal = req.body;
    if (!newSignal || !newSignal.title) {
      return res.status(400).json({ error: 'Missing title' });
    }
    let list: any[] = [];
    if (fs.existsSync(BROADCASTS_FILE)) {
      try {
        const raw = fs.readFileSync(BROADCASTS_FILE, 'utf8');
        list = JSON.parse(raw);
      } catch (_) {}
    }
    const updated = [newSignal, ...list.filter(s => s.id !== newSignal.id)].slice(0, 50);
    fs.writeFileSync(BROADCASTS_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return res.json({ success: true, broadcasts: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/broadcasts/:id', (req, res) => {
  try {
    const { id } = req.params;
    let list: any[] = [];
    if (fs.existsSync(BROADCASTS_FILE)) {
      try {
        list = JSON.parse(fs.readFileSync(BROADCASTS_FILE, 'utf8'));
      } catch (_) {}
    }
    const updated = list.filter(s => s.id !== id);
    fs.writeFileSync(BROADCASTS_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return res.json({ success: true, broadcasts: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Deposit Gateways & Deposit Rules
app.get('/api/deposit-config', (_req, res) => {
  try {
    if (fs.existsSync(DEPOSIT_GATEWAYS_FILE)) {
      const raw = fs.readFileSync(DEPOSIT_GATEWAYS_FILE, 'utf8');
      return res.json(JSON.parse(raw));
    }
  } catch (_) {}
  return res.json({ gateways: null, rules: null });
});

app.post('/api/deposit-config', (req, res) => {
  try {
    const { gateways, rules } = req.body;
    let current: any = {};
    if (fs.existsSync(DEPOSIT_GATEWAYS_FILE)) {
      try {
        current = JSON.parse(fs.readFileSync(DEPOSIT_GATEWAYS_FILE, 'utf8'));
      } catch (_) {}
    }
    const updated = {
      gateways: gateways !== undefined ? gateways : current.gateways,
      rules: rules !== undefined ? rules : current.rules,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(DEPOSIT_GATEWAYS_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Withdrawal Methods & Withdrawal Rules
app.get('/api/withdrawal-config', (_req, res) => {
  try {
    if (fs.existsSync(WITHDRAWAL_METHODS_FILE)) {
      const raw = fs.readFileSync(WITHDRAWAL_METHODS_FILE, 'utf8');
      return res.json(JSON.parse(raw));
    }
  } catch (_) {}
  return res.json({ methods: null, rules: null });
});

app.post('/api/withdrawal-config', (req, res) => {
  try {
    const { methods, rules } = req.body;
    let current: any = {};
    if (fs.existsSync(WITHDRAWAL_METHODS_FILE)) {
      try {
        current = JSON.parse(fs.readFileSync(WITHDRAWAL_METHODS_FILE, 'utf8'));
      } catch (_) {}
    }
    const updated = {
      methods: methods !== undefined ? methods : current.methods,
      rules: rules !== undefined ? rules : current.rules,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(WITHDRAWAL_METHODS_FILE, JSON.stringify(updated, null, 2), 'utf8');
    return res.json({ success: true, config: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper to permanently update user balances across USER_BALANCES_FILE and REGISTERED_USERS_FILE
function updateUserPermanentBalancesServer(userUid: string, userEmail: string | undefined, newBalances: { live?: number; bonus?: number; demo?: number }) {
  let allBalances: Record<string, any> = {};
  if (fs.existsSync(USER_BALANCES_FILE)) {
    try {
      allBalances = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
    } catch (_) {}
  }
  let current = allBalances[userUid]?.balances;
  if (!current) {
    const users = getStoredUsersServer();
    const existing = users.find(u => u.uid === userUid || (userEmail && u.email && u.email.toLowerCase() === userEmail.toLowerCase()));
    if (existing) {
      current = existing.balances || { live: existing.liveBalance, bonus: existing.bonusBalance, demo: existing.demoBalance };
    }
  }
  if (!current) {
    current = { live: 0, bonus: 0, demo: 10000 };
  }
  const updatedBalances = {
    live: typeof newBalances.live === 'number' ? Number(newBalances.live.toFixed(2)) : (current.live || 0),
    bonus: typeof newBalances.bonus === 'number' ? Number(newBalances.bonus.toFixed(2)) : (current.bonus || 0),
    demo: typeof newBalances.demo === 'number' ? Number(newBalances.demo.toFixed(2)) : (current.demo ?? 10000)
  };
  allBalances[userUid] = {
    balances: updatedBalances,
    updatedAt: Date.now()
  };
  try {
    const dataDir = path.dirname(USER_BALANCES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(USER_BALANCES_FILE, JSON.stringify(allBalances, null, 2), 'utf8');
  } catch (err) {
    console.error('[server] Error saving user balances:', err);
  }

  // Also update registered users cache
  try {
    const users = getStoredUsersServer();
    const existingIdx = users.findIndex(u => u.uid === userUid || (userEmail && u.email && u.email.toLowerCase() === userEmail.toLowerCase()));
    if (existingIdx !== -1) {
      users[existingIdx] = {
        ...users[existingIdx],
        liveBalance: updatedBalances.live,
        bonusBalance: updatedBalances.bonus,
        demoBalance: updatedBalances.demo,
        balances: updatedBalances,
        updatedAt: Date.now()
      };
      saveStoredUsersServer(users);
    }
  } catch (err) {
    console.error('[server] Error updating user in registered users list:', err);
  }
  return updatedBalances;
}

// 5. User Balances Cross-Device Backup & Sync
app.get('/api/users/sync-balances/:uid', (req, res) => {
  try {
    const { uid } = req.params;
    const userEmail = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : '';
    let foundBalances: any = null;
    let updatedAt: number = 0;

    if (fs.existsSync(USER_BALANCES_FILE)) {
      const allBalances = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
      if (allBalances[uid] && allBalances[uid].balances) {
        foundBalances = allBalances[uid].balances;
        updatedAt = allBalances[uid].updatedAt || 0;
      }
    }

    if (!foundBalances) {
      const users = getStoredUsersServer();
      const u = users.find(x => x.uid === uid || (userEmail && x.email && x.email.toLowerCase().trim() === userEmail));
      if (u && (u.balances || typeof u.liveBalance === 'number')) {
        foundBalances = u.balances || {
          live: u.liveBalance ?? 0,
          bonus: u.bonusBalance ?? 0,
          demo: u.demoBalance ?? 10000
        };
        updatedAt = u.updatedAt || 0;
      }
    }

    if (foundBalances) {
      return res.json({ found: true, balances: foundBalances, updatedAt });
    }
  } catch (_) {}
  return res.json({ found: false });
});

app.post('/api/users/sync-balances', (req, res) => {
  try {
    const { uid, userEmail, balances } = req.body;
    if (!uid || !balances) {
      return res.status(400).json({ error: 'Missing uid or balances' });
    }
    const updated = updateUserPermanentBalancesServer(uid, userEmail, balances);
    return res.json({ success: true, balances: updated, updatedAt: Date.now() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5b. Registered Users Persistent Storage & Admin Sync
function saveStoredUsersServer(users: any[]) {
  try {
    const dataDir = path.dirname(REGISTERED_USERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(REGISTERED_USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('[server] Error saving registered users:', err);
  }
}

app.get('/api/admin/users', (_req, res) => {
  try {
    const rawUsers = getStoredUsersServer();
    const FAKE_MOCK_EMAILS = ['sarah.jenkins@forexpro.com', 'm.rahman@tradeasia.com', 'alex.v@investor.io'];
    const FAKE_MOCK_UIDS = ['8940215', '7721094', '3319082', '1092837'];

    // 1. Filter out any legacy fake mock users
    let cleanUsers = rawUsers.filter((u: any) => {
      if (!u || !u.uid) return false;
      const email = (u.email || '').toLowerCase().trim();
      const uid = String(u.uid).trim();
      if (FAKE_MOCK_EMAILS.includes(email) || FAKE_MOCK_UIDS.includes(uid)) return false;
      return true;
    });

    // 2. Load latest real-time user balances from USER_BALANCES_FILE
    let allBalances: Record<string, any> = {};
    if (fs.existsSync(USER_BALANCES_FILE)) {
      try {
        allBalances = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
      } catch (_) {}
    }

    // 3. Enrich existing users with live balances
    const knownUids = new Set<string>();
    cleanUsers = cleanUsers.map((u: any) => {
      knownUids.add(u.uid);
      const bObj = allBalances[u.uid]?.balances;
      if (bObj) {
        const live = typeof bObj.live === 'number' ? bObj.live : (u.balances?.live ?? 0);
        const bonus = typeof bObj.bonus === 'number' ? bObj.bonus : (u.balances?.bonus ?? 0);
        const demo = typeof bObj.demo === 'number' ? bObj.demo : (u.balances?.demo ?? 10000);
        return {
          ...u,
          liveBalance: live,
          bonusBalance: bonus,
          demoBalance: demo,
          balances: { live, bonus, demo }
        };
      }
      return u;
    });

    // 4. Also add any genuine user in USER_BALANCES_FILE that might not be in REGISTERED_USERS_FILE
    Object.keys(allBalances).forEach(uid => {
      if (!knownUids.has(uid) && !FAKE_MOCK_UIDS.includes(uid)) {
        const bObj = allBalances[uid]?.balances;
        if (bObj) {
          const live = typeof bObj.live === 'number' ? bObj.live : 0;
          const bonus = typeof bObj.bonus === 'number' ? bObj.bonus : 0;
          const demo = typeof bObj.demo === 'number' ? bObj.demo : 10000;
          cleanUsers.push({
            uid,
            displayUserId: getDisplayUserIdServer(uid),
            email: '',
            displayName: `Trader ${uid.slice(-4)}`,
            fullName: `Trader ${uid.slice(-4)}`,
            isVerifiedUser: false,
            isBlocked: false,
            accountStatus: 'active',
            kycStatus: 'unverified',
            role: 'user',
            balances: { live, bonus, demo },
            liveBalance: live,
            bonusBalance: bonus,
            demoBalance: demo,
            createdAt: new Date(allBalances[uid]?.updatedAt || Date.now()).toISOString(),
            registeredAt: allBalances[uid]?.updatedAt || Date.now(),
            updatedAt: allBalances[uid]?.updatedAt || Date.now()
          });
          knownUids.add(uid);
        }
      }
    });

    return res.json({ users: cleanUsers });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/register', (req, res) => {
  try {
    const userData = req.body;
    if (!userData || !userData.uid) {
      return res.status(400).json({ error: 'Missing uid' });
    }
    const users = getStoredUsersServer();
    const cleanEmail = (userData.email || '').toLowerCase().trim();
    const existingIdx = users.findIndex(u => 
      u.uid === userData.uid || 
      (cleanEmail && u.email && u.email.toLowerCase().trim() === cleanEmail)
    );
    
    const referrerUid = userData.referrerUid || userData.referralCode || userData.referredBy || null;
    const referralCode = userData.referralCode || userData.referrerUid || userData.referredBy || null;
    const referredBy = userData.referredBy || userData.referrerUid || userData.referralCode || null;

    // Check USER_BALANCES_FILE first for the most accurate balance
    let permanentBal: any = null;
    if (fs.existsSync(USER_BALANCES_FILE)) {
      try {
        const allB = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
        if (allB[userData.uid]?.balances) permanentBal = allB[userData.uid].balances;
      } catch (_) {}
    }

    const hasIncomingLive = typeof userData.liveBalance === 'number' || typeof userData.balances?.live === 'number';
    const incomingLive = typeof userData.liveBalance === 'number' ? userData.liveBalance : userData.balances?.live;

    const hasIncomingBonus = typeof userData.bonusBalance === 'number' || typeof userData.balances?.bonus === 'number';
    const incomingBonus = typeof userData.bonusBalance === 'number' ? userData.bonusBalance : userData.balances?.bonus;

    const hasIncomingDemo = typeof userData.demoBalance === 'number' || typeof userData.balances?.demo === 'number';
    const incomingDemo = typeof userData.demoBalance === 'number' ? userData.demoBalance : userData.balances?.demo;

    const isSuperAdminEmail = cleanEmail === 'naymulh1000@gmail.com' || cleanEmail === 'admin@fxby24.com' || cleanEmail === 'admin@forextradepro.com';
    const role = isSuperAdminEmail ? 'super_admin' : (userData.role || 'user');

    if (existingIdx !== -1) {
      const existingUser = users[existingIdx];
      // Retain permanent verified status if already verified
      const incomingKycStatus = userData.kycStatus;
      const resolvedKycStatus = (existingUser.kycStatus === 'verified' || existingUser.isVerifiedUser) 
        ? 'verified' 
        : (incomingKycStatus || existingUser.kycStatus || 'unverified');
      const resolvedIsVerified = Boolean(existingUser.isVerifiedUser || existingUser.kycStatus === 'verified' || userData.isVerifiedUser || incomingKycStatus === 'verified');

      // CRITICAL: NEVER wipe out existing balances on registration or auth sync!
      const currentBalances = existingUser.balances || {};
      const resolvedLive = (hasIncomingLive && incomingLive !== undefined && incomingLive > 0)
        ? incomingLive
        : (permanentBal && typeof permanentBal.live === 'number')
          ? permanentBal.live
          : (typeof existingUser.liveBalance === 'number')
            ? existingUser.liveBalance
            : (currentBalances.live ?? 0);

      const resolvedBonus = (hasIncomingBonus && incomingBonus !== undefined && incomingBonus > 0)
        ? incomingBonus
        : (permanentBal && typeof permanentBal.bonus === 'number')
          ? permanentBal.bonus
          : (typeof existingUser.bonusBalance === 'number')
            ? existingUser.bonusBalance
            : (currentBalances.bonus ?? 0);

      const resolvedDemo = (hasIncomingDemo && incomingDemo !== undefined)
        ? incomingDemo
        : (permanentBal && typeof permanentBal.demo === 'number')
          ? permanentBal.demo
          : (typeof existingUser.demoBalance === 'number')
            ? existingUser.demoBalance
            : (currentBalances.demo ?? 10000);

      users[existingIdx] = { 
        ...existingUser, 
        ...userData,
        email: cleanEmail || existingUser.email,
        role: (existingUser.role === 'admin' || existingUser.role === 'super_admin') ? existingUser.role : role,
        kycStatus: resolvedKycStatus,
        isVerifiedUser: resolvedIsVerified,
        liveBalance: resolvedLive,
        bonusBalance: resolvedBonus,
        demoBalance: resolvedDemo,
        balances: { live: resolvedLive, bonus: resolvedBonus, demo: resolvedDemo },
        referrerUid: referrerUid || existingUser.referrerUid || null,
        referralCode: referralCode || existingUser.referralCode || null,
        referredBy: referredBy || existingUser.referredBy || null,
        updatedAt: Date.now() 
      };
    } else {
      const isVerified = Boolean(userData.isVerifiedUser || userData.kycStatus === 'verified');
      const liveBal = (permanentBal && typeof permanentBal.live === 'number') ? permanentBal.live : (incomingLive ?? 0);
      const bonusBal = (permanentBal && typeof permanentBal.bonus === 'number') ? permanentBal.bonus : (incomingBonus ?? 0);
      const demoBal = (permanentBal && typeof permanentBal.demo === 'number') ? permanentBal.demo : (incomingDemo ?? 10000);

      users.unshift({ 
        ...userData, 
        email: cleanEmail,
        role,
        kycStatus: userData.kycStatus || (isVerified ? 'verified' : 'unverified'),
        isVerifiedUser: isVerified,
        accountStatus: userData.accountStatus || 'active',
        isBlocked: Boolean(userData.isBlocked || userData.accountStatus === 'blocked'),
        liveBalance: liveBal,
        bonusBalance: bonusBal,
        demoBalance: demoBal,
        balances: { live: liveBal, bonus: bonusBal, demo: demoBal },
        referrerUid,
        referralCode,
        referredBy,
        registeredAt: userData.registeredAt || Date.now(),
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: Date.now() 
      });
    }
    saveStoredUsersServer(users);
    console.log(`[server] 👤 User registration synced: ${cleanEmail || userData.uid}, referrer: ${referrerUid || 'none'}`);
    return res.json({ success: true, user: userData });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin endpoint to permanently delete a user from server backup
app.delete('/api/admin/users/:uid', (req, res) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    const users = getStoredUsersServer();
    const filtered = users.filter(u => u.uid !== uid);
    saveStoredUsersServer(filtered);

    // Also permanently delete from USER_BALANCES_FILE
    if (fs.existsSync(USER_BALANCES_FILE)) {
      try {
        const allB = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
        if (allB[uid]) {
          delete allB[uid];
          fs.writeFileSync(USER_BALANCES_FILE, JSON.stringify(allB, null, 2), 'utf8');
        }
      } catch (_) {}
    }

    // Also purge user trades from server memory and file
    try {
      const allTrades = getStoredUserTradesServer();
      const filteredTrades = allTrades.filter(t => t.userUid !== uid && t.userId !== uid);
      saveStoredUserTradesServer(filteredTrades);
    } catch (_) {}

    console.log(`[server] 🗑️ User permanently purged from server databases: ${uid}`);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin endpoint to toggle block / unblock a user permanently
app.post('/api/admin/users/toggle-block', (req, res) => {
  try {
    const { uid, isBlocked } = req.body;
    if (!uid) return res.status(400).json({ error: 'Missing uid' });
    const users = getStoredUsersServer();
    const idx = users.findIndex(u => u.uid === uid);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        isBlocked: Boolean(isBlocked),
        accountStatus: isBlocked ? 'blocked' : 'active',
        updatedAt: Date.now()
      };
      saveStoredUsersServer(users);
    }
    console.log(`[server] 🛡️ User block state persisted: ${uid} -> ${isBlocked ? 'BLOCKED' : 'ACTIVE'}`);
    return res.json({ success: true, isBlocked: Boolean(isBlocked) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

function getDisplayUserIdServer(uid?: string, displayUserId?: string): string {
  if (displayUserId && /^\d{6}$/.test(displayUserId)) {
    return displayUserId;
  }
  if (!uid) return '100001';
  if (/^\d{6}$/.test(uid)) {
    return uid;
  }
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash << 5) - hash + uid.charCodeAt(i);
    hash |= 0;
  }
  const positive = Math.abs(hash);
  const sixDigit = 100000 + (positive % 900000);
  return sixDigit.toString();
}

// 5b2. Referral Accounts & Balances Tracking (Strict Privacy - Name, UID & Balances ONLY)
app.get('/api/referrals/my-referrals', (req, res) => {
  try {
    const rawRefCode = String(req.query.referralCode || '').trim();
    const rawUserUid = String(req.query.userUid || '').trim();

    if (!rawRefCode && !rawUserUid) {
      return res.status(400).json({ error: 'Missing referralCode or userUid' });
    }

    const users = getStoredUsersServer();
    const deposits = getStoredDepositsServer();

    let allBalances: Record<string, any> = {};
    if (fs.existsSync(USER_BALANCES_FILE)) {
      try {
        allBalances = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
      } catch (_) {}
    }

    // Match candidate keys for this referrer
    const matchKeys = new Set<string>();
    if (rawRefCode) {
      matchKeys.add(rawRefCode.toLowerCase());
      matchKeys.add(rawRefCode);
    }
    if (rawUserUid) {
      matchKeys.add(rawUserUid.toLowerCase());
      matchKeys.add(rawUserUid);
      const dId = getDisplayUserIdServer(rawUserUid);
      if (dId) {
        matchKeys.add(dId.toLowerCase());
        matchKeys.add(dId);
      }
    }

    // Check if user is in users list to pick up their displayUserId or email
    const selfUser = users.find(u => 
      (rawUserUid && u.uid === rawUserUid) || 
      (rawRefCode && (u.displayUserId === rawRefCode || u.uid === rawRefCode))
    );
    if (selfUser?.displayUserId) {
      matchKeys.add(String(selfUser.displayUserId).toLowerCase());
      matchKeys.add(String(selfUser.displayUserId));
    }
    if (selfUser?.uid) {
      matchKeys.add(String(selfUser.uid).toLowerCase());
      matchKeys.add(String(selfUser.uid));
    }

    const referredUsers = users.filter((u: any) => {
      // Exclude self
      if (rawUserUid && u.uid === rawUserUid) return false;
      if (selfUser?.uid && u.uid === selfUser.uid) return false;

      const code = String(u.referralCode || '').trim();
      const refUid = String(u.referrerUid || '').trim();
      const refBy = String(u.referredBy || '').trim();

      if (!code && !refUid && !refBy) return false;

      return (
        (code && (matchKeys.has(code) || matchKeys.has(code.toLowerCase()))) ||
        (refUid && (matchKeys.has(refUid) || matchKeys.has(refUid.toLowerCase()))) ||
        (refBy && (matchKeys.has(refBy) || matchKeys.has(refBy.toLowerCase())))
      );
    });

    let qualifyingCount = 0;
    let totalBonusEarned = 0;

    const referrals = referredUsers.map((u: any) => {
      const uUid = u.uid;
      const liveBal = typeof allBalances[uUid]?.balances?.live === 'number'
        ? allBalances[uUid].balances.live
        : (typeof u.balances?.live === 'number' ? u.balances.live : (typeof u.liveBalance === 'number' ? u.liveBalance : 0));
      
      const bonusBal = typeof allBalances[uUid]?.balances?.bonus === 'number'
        ? allBalances[uUid].balances.bonus
        : (typeof u.balances?.bonus === 'number' ? u.balances.bonus : (typeof u.bonusBalance === 'number' ? u.bonusBalance : 0));

      const demoBal = typeof allBalances[uUid]?.balances?.demo === 'number'
        ? allBalances[uUid].balances.demo
        : (typeof u.balances?.demo === 'number' ? u.balances.demo : (typeof u.demoBalance === 'number' ? u.demoBalance : 10000));

      // Find if this user has any qualifying approved deposit of $250 or more
      const uDeposits = deposits.filter((d: any) => 
        (d.userUid === uUid || (u.email && d.userEmail && d.userEmail.toLowerCase() === u.email.toLowerCase())) &&
        (d.status === 'Success' || d.status === 'Approved' || d.status === 'Completed')
      );

      const qualDep = uDeposits.find((d: any) => Number(d.amount) >= 250);
      const hasQualifyingDeposit = Boolean(qualDep || u.referralBonusAwarded);

      if (hasQualifyingDeposit) {
        qualifyingCount += 1;
        totalBonusEarned += 25.00;
      }

      // STRICT PRIVACY PROTECTION:
      // Return ONLY name, UID, balances (live, bonus, demo), creation date, and status.
      // Every user's actual UID is their primary identifier.
      return {
        uid: u.uid || u.displayUserId || getDisplayUserIdServer(u.uid),
        fullName: u.fullName || u.displayName || 'Trader',
        liveBalance: Number(liveBal.toFixed(2)),
        bonusBalance: Number(bonusBal.toFixed(2)),
        demoBalance: Number(demoBal.toFixed(2)),
        createdAt: u.registeredAt || u.createdAt || new Date().toISOString(),
        hasQualifyingDeposit,
        qualifyingDepositAmount: qualDep ? Number(qualDep.amount) : 0,
        bonusEarned: hasQualifyingDeposit ? 25.00 : 0,
        status: hasQualifyingDeposit ? 'Active (Bonus Paid)' : 'Registered'
      };
    });

    return res.json({
      success: true,
      referralCode: rawUserUid || rawRefCode || (selfUser?.uid || selfUser?.displayUserId || ''),
      totalReferrals: referrals.length,
      qualifyingReferrals: qualifyingCount,
      totalBonusEarned: Number(totalBonusEarned.toFixed(2)),
      referrals
    });
  } catch (err: any) {
    console.error('[server] Error in /api/referrals/my-referrals:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5c. Master Market Candles Cross-Device Real-Time Sync
const CANDLES_CACHE_FILE = path.join(DATA_DIR, 'market_candles.json');

// In-memory cache for live market candles from real exchanges
interface CachedMarketCandles {
  timestamp: number;
  candles: any[];
}
const realMarketCandlesMemoryCache = new Map<string, CachedMarketCandles>();

// GET 100% Authentic Real Exchange Candles (TradingView Master Feed for 6 pairs, Binance for Crypto)
app.get('/api/real-market-candles', async (req, res) => {
  try {
    const rawSymbol = String(req.query.symbol || 'EUR/USD').trim();
    const timeframe = String(req.query.timeframe || 'M1').trim();
    const count = Math.min(Math.max(parseInt(String(req.query.count || '150'), 10) || 150, 10), 2000);
    const before = req.query.before ? parseInt(String(req.query.before), 10) : undefined;

    const normSymbol = rawSymbol.toUpperCase().replace(/\s+/g, '');

    // 1. PRIMARY: Check TradingView Master Feed (XAU/USD, EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD)
    const tvCandles = tradingViewMasterFeed.getCandles(rawSymbol, timeframe, count, before);
    if (tvCandles && tvCandles.length > 0) {
      return res.json({
        success: true,
        symbol: rawSymbol,
        timeframe,
        source: 'tradingview_master_real',
        candles: tvCandles
      });
    }

    const cacheKey = `${normSymbol}_${timeframe}`;
    const cached = realMarketCandlesMemoryCache.get(cacheKey);
    if (!before && cached && Date.now() - cached.timestamp < 3000 && cached.candles.length > 0) {
      return res.json({ success: true, symbol: rawSymbol, timeframe, candles: cached.candles });
    }

    const intervalMap: Record<string, string> = {
      'S1': '1s',
      'S5': '1m',
      'S15': '1m',
      'S30': '1m',
      'M1': '1m',
      'M5': '5m',
      'M15': '15m',
      'M30': '30m',
      'H1': '1h',
      'H4': '4h',
      'D1': '1d'
    };
    const binanceInterval = intervalMap[timeframe] || '1m';

    // 2. Crypto (Binance Public API for BTC, ETH, SOL)
    if (normSymbol === 'BTC/USD' || normSymbol === 'ETH/USD' || normSymbol === 'SOL/USD') {
      const binanceSym = normSymbol === 'BTC/USD' ? 'BTCUSDT'
        : normSymbol === 'ETH/USD' ? 'ETHUSDT'
        : 'SOLUSDT';
      
      const endTimeParam = before && before > 0 ? `&endTime=${before}` : '';
      const bRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSym}&interval=${binanceInterval}&limit=${count}${endTimeParam}`);
      if (bRes.ok) {
        const raw = await bRes.json();
        if (Array.isArray(raw) && raw.length > 0) {
          const precision = 2;
          const candles = raw.map((k: any) => ({
            time: Number(k[0]),
            timestamp: Number(k[0]),
            open: Number(parseFloat(k[1]).toFixed(precision)),
            high: Number(parseFloat(k[2]).toFixed(precision)),
            low: Number(parseFloat(k[3]).toFixed(precision)),
            close: Number(parseFloat(k[4]).toFixed(precision)),
            volume: parseFloat(k[5]) || 100
          }));

          realMarketCandlesMemoryCache.set(cacheKey, { timestamp: Date.now(), candles });
          return res.json({ success: true, symbol: rawSymbol, timeframe, candles });
        }
      }
    }

    // 3. Forex Secondary Fallback (Yahoo Finance Chart Feed)
    const yfMap: Record<string, string> = {
      'EUR/USD': 'EURUSD=X',
      'GBP/USD': 'GBPUSD=X',
      'USD/JPY': 'USDJPY=X',
      'AUD/USD': 'AUDUSD=X',
      'USD/CAD': 'USDCAD=X'
    };

    const yfSymbol = yfMap[normSymbol];
    if (yfSymbol) {
      const yfRange = timeframe === 'D1' ? '3mo' : timeframe === 'H4' || timeframe === 'H1' ? '1mo' : '7d';
      const yfInterval = timeframe === 'D1' ? '1d' : timeframe === 'H4' ? '1h' : timeframe === 'H1' ? '1h' : timeframe === 'M30' ? '30m' : timeframe === 'M15' ? '15m' : timeframe === 'M5' ? '5m' : '1m';

      const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yfSymbol}?interval=${yfInterval}&range=${yfRange}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });

      if (yRes.ok) {
        const data = await yRes.json();
        const result = data.chart?.result?.[0];
        const timestamps: number[] = result?.timestamp || [];
        const quotes = result?.indicators?.quote?.[0] || {};
        const precision = normSymbol.includes('JPY') ? 3 : 5;

        const candles: any[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          const o = quotes.open?.[i];
          const h = quotes.high?.[i];
          const l = quotes.low?.[i];
          const c = quotes.close?.[i];
          if (o != null && c != null) {
            const open = Number(o.toFixed(precision));
            const close = Number(c.toFixed(precision));
            const high = Number((h != null ? h : Math.max(open, close)).toFixed(precision));
            const low = Number((l != null ? l : Math.min(open, close)).toFixed(precision));
            candles.push({
              time: timestamps[i] * 1000,
              timestamp: timestamps[i] * 1000,
              open,
              high: Math.max(high, open, close),
              low: Math.min(low, open, close),
              close,
              volume: quotes.volume?.[i] || 100
            });
          }
        }

        if (candles.length > 0) {
          const sliced = candles.slice(-count);
          realMarketCandlesMemoryCache.set(cacheKey, { timestamp: Date.now(), candles: sliced });
          return res.json({ success: true, symbol: rawSymbol, timeframe, candles: sliced });
        }
      }
    }

    if (cached && cached.candles.length > 0) {
      return res.json({ success: true, symbol: rawSymbol, timeframe, candles: cached.candles });
    }

    return res.status(404).json({ success: false, error: 'Candles not available for symbol' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET all 6 authoritative real market live tickers & active forming candles
app.get('/api/real-market-live-all', (_req, res) => {
  const tickers = tradingViewMasterFeed.getAllTickers();
  res.json({
    success: true,
    timestamp: Date.now(),
    tickers
  });
});

// SSE (Server-Sent Events) live ticker & candle broadcaster for 50,000 users synchronization
app.get('/api/real-market-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  // Send initial snapshot
  const initial = tradingViewMasterFeed.getAllTickers();
  res.write(`data: ${JSON.stringify({ type: 'SNAPSHOT', timestamp: Date.now(), tickers: initial })}\n\n`);

  const unsub = tradingViewMasterFeed.subscribeTicks((tickers) => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'TICK', timestamp: Date.now(), tickers })}\n\n`);
    } catch (_) {}
  });

  req.on('close', () => {
    unsub();
  });
});

// ─────────────────────────────────────────────────────────────
// OTC LIQUIDITY EXPOSURE ENGINE & ADMIN PREDICTOR FORECAST
// ─────────────────────────────────────────────────────────────

const OTC_CONTROL_FILE = path.join(DATA_DIR, 'otc_control_config.json');

interface OtcControlConfig {
  exposureControlEnabled: boolean;
  adminPredictorMode: boolean;
  lastUpdated: number;
}

let otcControlConfig: OtcControlConfig = {
  exposureControlEnabled: false,
  adminPredictorMode: true,
  lastUpdated: Date.now()
};

try {
  if (fs.existsSync(OTC_CONTROL_FILE)) {
    const raw = fs.readFileSync(OTC_CONTROL_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      otcControlConfig = {
        exposureControlEnabled: parsed.exposureControlEnabled === true,
        adminPredictorMode: parsed.adminPredictorMode !== false,
        lastUpdated: parsed.lastUpdated || Date.now()
      };
    }
  }
} catch (_) {}

function persistOtcControlConfig() {
  try {
    fs.writeFileSync(OTC_CONTROL_FILE, JSON.stringify(otcControlConfig, null, 2), 'utf8');
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────
// Authoritative OTC Deterministic Candle Endpoint:
// Guarantees 100-200 phones receive the EXACT same candles and prices
// ─────────────────────────────────────────────────────────────

function updateServerLiveExposureForSymbol(rawSymbol: string) {
  try {
    if (!otcControlConfig || !otcControlConfig.exposureControlEnabled) {
      setMarketLiveExposure(rawSymbol, {
        symbol: rawSymbol,
        upVolume: 0,
        downVolume: 0,
        netExposure: 0,
        biasDirection: 'NEUTRAL',
        enabled: false,
        activeOrdersCount: 0
      });
      return;
    }
    const allTrades = getStoredUserTradesServer();
    const now = Date.now();
    const cleanSym = rawSymbol.trim().toUpperCase();
    const symKey = cleanSym.replace(/[^A-Z0-9]/g, '');
    const ADMIN_EMAILS = ['naymulh1000@gmail.com', 'admin@fxby24.com', 'admin@forextradepro.com'];
    
    // Filter active OPEN trades across live & demo accounts (excluding admin accounts)
    const activeLiveTrades = allTrades.filter(t => {
      if (!t || t.status !== 'OPEN') return false;
      if (t.expiryTimestamp && t.expiryTimestamp <= now) return false;
      if (t.userEmail && ADMIN_EMAILS.includes(t.userEmail.toLowerCase().trim())) return false;
      const tSym = (t.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const matchesSymbol = tSym === symKey || symKey.includes(tSym) || tSym.includes(symKey);
      return matchesSymbol;
    });

    let upVolume = 0;
    let downVolume = 0;
    let minRemainingSec = 60;

    activeLiveTrades.forEach(t => {
      const amount = Number(t.amount || t.investment || 1);
      const isUp = t.type === 'CALL' || t.type === 'UP' || t.type === 'BUY';
      const isDown = t.type === 'PUT' || t.type === 'DOWN' || t.type === 'SELL';
      const remSec = t.expiryTimestamp ? Math.max(0, Math.ceil((t.expiryTimestamp - now) / 1000)) : 60;
      if (remSec < minRemainingSec) minRemainingSec = remSec;
      if (isUp) upVolume += amount;
      else if (isDown) downVolume += amount;
    });

    let biasDirection: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
    let heavySide: 'UP' | 'DOWN' | 'NONE' = 'NONE';
    let heavyEntryPrice = 0;

    if (upVolume > downVolume) {
      biasDirection = 'DOWN';
      heavySide = 'UP';
      const upOrders = activeLiveTrades.filter(t => (t.type === 'CALL' || t.type === 'UP' || t.type === 'BUY') && typeof t.entryPrice === 'number');
      heavyEntryPrice = upOrders.length > 0 ? upOrders.reduce((sum, o) => sum + (o.entryPrice * (Number(o.amount) || 1)), 0) / (upVolume || 1) : 0;
    } else if (downVolume > upVolume) {
      biasDirection = 'UP';
      heavySide = 'DOWN';
      const downOrders = activeLiveTrades.filter(t => (t.type === 'PUT' || t.type === 'DOWN' || t.type === 'SELL') && typeof t.entryPrice === 'number');
      heavyEntryPrice = downOrders.length > 0 ? downOrders.reduce((sum, o) => sum + (o.entryPrice * (Number(o.amount) || 1)), 0) / (downVolume || 1) : 0;
    } else if (upVolume > 0 && downVolume > 0 && upVolume === downVolume) {
      // Tie-breaker: force DOWN to neutralize long exposure
      biasDirection = 'DOWN';
      heavySide = 'UP';
    }

    const isEnabled = Boolean(otcControlConfig.exposureControlEnabled && (upVolume > 0 || downVolume > 0) && biasDirection !== 'NEUTRAL');

    setMarketLiveExposure(rawSymbol, {
      symbol: rawSymbol,
      upVolume,
      downVolume,
      netExposure: upVolume - downVolume,
      biasDirection,
      heavySide,
      heavyEntryPrice,
      minRemainingSec,
      enabled: isEnabled,
      activeOrdersCount: activeLiveTrades.length
    });
  } catch (_) {}
}

// Authoritative Persistent Closed OTC Candles Store (Guarantees every phone receives identical candles)
const OTC_CANDLES_FILE = path.join(DATA_DIR, 'otc_closed_candles.json');
interface SavedOtcCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
const otcClosedCandlesStore = new Map<string, Map<number, SavedOtcCandle>>();

function loadOtcClosedCandles() {
  try {
    if (fs.existsSync(OTC_CANDLES_FILE)) {
      const raw = fs.readFileSync(OTC_CANDLES_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach(k => {
          const m = new Map<number, SavedOtcCandle>();
          const arr = parsed[k];
          if (Array.isArray(arr)) {
            arr.forEach((c: any) => {
              if (c && typeof c.time === 'number') {
                m.set(c.time, c);
              }
            });
          }
          otcClosedCandlesStore.set(k, m);
        });
      }
    }
  } catch (_) {}
}
loadOtcClosedCandles();

let saveOtcCandlesDebounce: any = null;
function persistOtcClosedCandles() {
  if (saveOtcCandlesDebounce) return;
  saveOtcCandlesDebounce = setTimeout(() => {
    saveOtcCandlesDebounce = null;
    try {
      const obj: Record<string, any[]> = {};
      otcClosedCandlesStore.forEach((map, k) => {
        const arr = Array.from(map.values()).sort((a, b) => a.time - b.time).slice(-400);
        obj[k] = arr;
      });
      fs.writeFileSync(OTC_CANDLES_FILE, JSON.stringify(obj), 'utf8');
    } catch (_) {}
  }, 1000);
}

// POST finalize a completed OTC candle into permanent server store
app.post('/api/otc-candles/finalize', (req, res) => {
  try {
    const { symbol, timeframe, candle } = req.body;
    if (!symbol || !candle || typeof candle.time !== 'number') {
      return res.status(400).json({ error: 'Invalid candle data' });
    }
    const cleanSym = symbol.trim().toUpperCase();
    const tf = timeframe || 'M1';
    const key = `${cleanSym}_${tf}`;
    let map = otcClosedCandlesStore.get(key);
    if (!map) {
      map = new Map();
      otcClosedCandlesStore.set(key, map);
    }
    map.set(candle.time, {
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume || 100
    });
    persistOtcClosedCandles();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Global In-Memory Authoritative Active Candle Cache per OTC symbol
const otcActiveCandlesCache = new Map<string, any>();

// Background Authoritative OTC Candle Engine:
// 1. Every second, calculates and updates the active candle and live price for every OTC market
// 2. When a bucket finishes, seamlessly freezes the final active candle into otcClosedCandlesStore
// 3. Guarantees 100% gap-free transitions (new open === previous close) with ZERO jumping and ZERO fake wicks
setInterval(() => {
  try {
    const now = Date.now();
    const timeframe = 'M1';
    const tfSecs = 60;
    const timeStepMs = 60000;
    const currentBucketTime = Math.floor(now / timeStepMs) * timeStepMs;
    const prevBucketTime = currentBucketTime - timeStepMs;

    marketsConfig.forEach(m => {
      const isOtc = m.category === 'otc' || (m.symbol && m.symbol.toUpperCase().includes('OTC')) || m.isRealMarket === false;
      if (!isOtc) return;

      const cleanSym = m.symbol.trim().toUpperCase();
      const key = `${cleanSym}_${timeframe}`;
      let map = otcClosedCandlesStore.get(key);
      if (!map) {
        map = new Map();
        otcClosedCandlesStore.set(key, map);
      }

      // 1. If previous bucket just finished and is not yet in map, freeze its final active candle:
      if (!map.has(prevBucketTime)) {
        const lastActive = otcActiveCandlesCache.get(key);
        let finalized: SavedOtcCandle;

        if (lastActive && lastActive.time === prevBucketTime) {
          finalized = {
            time: prevBucketTime,
            open: lastActive.open,
            high: Math.max(lastActive.open, lastActive.high, lastActive.close),
            low: Math.min(lastActive.open, lastActive.low, lastActive.close),
            close: lastActive.close,
            volume: lastActive.volume || 100
          };
        } else {
          let rollingOpen: number | undefined;
          const prevPrevCandle = map.get(prevBucketTime - timeStepMs);
          if (prevPrevCandle) {
            rollingOpen = prevPrevCandle.close;
          } else {
            const prevHist = getDeterministicHistoricalCandle(m, prevBucketTime - timeStepMs, tfSecs);
            rollingOpen = prevHist.close;
          }
          const hist = getDeterministicHistoricalCandle(m, prevBucketTime, tfSecs, rollingOpen);
          const openVal = typeof rollingOpen === 'number' ? rollingOpen : hist.open;
          finalized = {
            time: prevBucketTime,
            open: openVal,
            high: Math.max(openVal, hist.high, hist.close),
            low: Math.min(openVal, hist.low, hist.close),
            close: hist.close,
            volume: hist.volume || 100
          };
        }
        map.set(prevBucketTime, finalized);
        persistOtcClosedCandles();
      }

      // 2. Continuous active candle tracking for currentBucketTime:
      updateServerLiveExposureForSymbol(m.symbol);
      let rollingOpen: number | undefined;
      const prevCandle = map.get(currentBucketTime - timeStepMs);
      if (prevCandle) {
        rollingOpen = prevCandle.close;
      } else {
        const prevHist = getDeterministicHistoricalCandle(m, currentBucketTime - timeStepMs, tfSecs);
        rollingOpen = prevHist.close;
      }

      const existingActive = otcActiveCandlesCache.get(key);
      const stableOpen = (existingActive && existingActive.time === currentBucketTime)
        ? existingActive.open
        : rollingOpen;

      const { activeCandle, livePrice } = getDeterministicActiveCandle(m, currentBucketTime, now, tfSecs, stableOpen);

      const openPrice = typeof stableOpen === 'number' ? stableOpen : activeCandle.open;
      const currentHigh = (existingActive && existingActive.time === currentBucketTime)
        ? Math.max(openPrice, existingActive.high, activeCandle.high, livePrice)
        : Math.max(openPrice, activeCandle.high, livePrice);
      const currentLow = (existingActive && existingActive.time === currentBucketTime)
        ? Math.min(openPrice, existingActive.low, activeCandle.low, livePrice)
        : Math.min(openPrice, activeCandle.low, livePrice);

      const updatedActive = {
        time: currentBucketTime,
        timestamp: currentBucketTime,
        open: openPrice,
        high: currentHigh,
        low: currentLow,
        close: livePrice,
        volume: (existingActive && existingActive.time === currentBucketTime) ? (existingActive.volume || 60) + 1 : 60
      };

      otcActiveCandlesCache.set(key, updatedActive);
    });
  } catch (_) {}
}, 1000);

app.get('/api/otc-candles/:symbol/:timeframe', (req, res) => {
  try {
    const rawSymbol = decodeURIComponent(req.params.symbol);
    const timeframe = req.params.timeframe || 'M1';
    const count = Math.min(600, Math.max(30, parseInt(req.query.count as string) || 150));

    const market = marketsConfig.find(m => 
      m.symbol.toUpperCase() === rawSymbol.toUpperCase() || 
      m.id.toLowerCase() === rawSymbol.toLowerCase() ||
      m.symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === rawSymbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    ) || DEFAULT_MARKETS.find(m => 
      m.symbol.toUpperCase() === rawSymbol.toUpperCase() || 
      m.id.toLowerCase() === rawSymbol.toLowerCase()
    );

    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    updateServerLiveExposureForSymbol(market.symbol);

    const tfSecs = getTimeframeSeconds(timeframe);
    const timeStepMs = tfSecs * 1000;
    const now = Date.now();
    const currentBucketTime = Math.floor(now / timeStepMs) * timeStepMs;
    const startBucket = currentBucketTime - (count * timeStepMs);

    const cleanSym = market.symbol.trim().toUpperCase();
    const key = `${cleanSym}_${timeframe}`;
    let map = otcClosedCandlesStore.get(key);
    if (!map) {
      map = new Map();
      otcClosedCandlesStore.set(key, map);
    }

    const candles: any[] = [];
    let rollingOpen: number | undefined;

    for (let t = startBucket; t < currentBucketTime; t += timeStepMs) {
      const existing = map.get(t);
      if (existing) {
        if (typeof rollingOpen === 'number' && existing.open !== rollingOpen) {
          existing.open = rollingOpen;
          existing.high = Math.max(existing.high, existing.open, existing.close);
          existing.low = Math.min(existing.low, existing.open, existing.close);
          map.set(t, existing);
        }
        candles.push(existing);
        rollingOpen = existing.close;
      } else {
        const openPrice = typeof rollingOpen === 'number' ? rollingOpen : undefined;
        const hist = getDeterministicHistoricalCandle(market, t, tfSecs, openPrice);
        const newClosed: SavedOtcCandle = {
          time: t,
          open: hist.open,
          high: hist.high,
          low: hist.low,
          close: hist.close,
          volume: hist.volume || 100
        };
        map.set(t, newClosed);
        candles.push(newClosed);
        rollingOpen = newClosed.close;
      }
    }

    // Active forming candle at currentBucketTime with rollingOpen as stable anchor
    let finalActiveCandle: any;
    let finalLivePrice: number;
    const cachedActive = otcActiveCandlesCache.get(key);
    if (cachedActive && cachedActive.time === currentBucketTime) {
      finalActiveCandle = { ...cachedActive };
      if (typeof rollingOpen === 'number') {
        finalActiveCandle.open = rollingOpen;
        finalActiveCandle.high = Math.max(finalActiveCandle.high, finalActiveCandle.open, finalActiveCandle.close);
        finalActiveCandle.low = Math.min(finalActiveCandle.low, finalActiveCandle.open, finalActiveCandle.close);
      }
      finalLivePrice = finalActiveCandle.close;
    } else {
      const { activeCandle, livePrice } = getDeterministicActiveCandle(market, currentBucketTime, now, tfSecs, rollingOpen);
      if (typeof rollingOpen === 'number') {
        activeCandle.open = rollingOpen;
        activeCandle.high = Math.max(activeCandle.high, activeCandle.open, activeCandle.close);
        activeCandle.low = Math.min(activeCandle.low, activeCandle.open, activeCandle.close);
      }
      finalActiveCandle = activeCandle;
      finalLivePrice = livePrice;
    }
    candles.push(finalActiveCandle);

    // Final zero-gap pass across all historical and active candles
    for (let i = 1; i < candles.length; i++) {
      candles[i].open = candles[i - 1].close;
      candles[i].high = Math.max(candles[i].high, candles[i].open, candles[i].close);
      candles[i].low = Math.min(candles[i].low, candles[i].open, candles[i].close);
    }

    return res.json({
      success: true,
      symbol: market.symbol,
      timeframe,
      serverTime: now,
      livePrice: finalLivePrice,
      candles
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Live Authoritative OTC Ticks for all markets to guarantee identical price across all phones & devices globally
app.get('/api/otc/live-ticks', (_req, res) => {
  try {
    const now = Date.now();
    const timeframe = 'M1';
    const tfSecs = 60;
    const timeStepMs = 60000;
    const currentBucketTime = Math.floor(now / timeStepMs) * timeStepMs;

    const ticks: Record<string, {
      symbol: string;
      price: number;
      activeCandle: SavedOtcCandle;
      exposureEnabled: boolean;
      biasDirection: 'UP' | 'DOWN' | 'NEUTRAL';
    }> = {};

    marketsConfig.forEach(m => {
      const isOtc = m.category === 'otc' || (m.symbol && m.symbol.toUpperCase().includes('OTC')) || m.isRealMarket === false;
      if (isOtc) {
        updateServerLiveExposureForSymbol(m.symbol);
        const cleanSym = m.symbol.trim().toUpperCase();
        const key = `${cleanSym}_${timeframe}`;
        let map = otcClosedCandlesStore.get(key);
        if (!map) {
          map = new Map();
          otcClosedCandlesStore.set(key, map);
        }
        const cachedActive = otcActiveCandlesCache.get(key);
        let finalActive: any;
        let finalPrice: number;

        if (cachedActive && cachedActive.time === currentBucketTime) {
          finalActive = cachedActive;
          finalPrice = cachedActive.close;
        } else {
          let rollingOpen: number | undefined;
          const prevCandle = map.get(currentBucketTime - timeStepMs);
          if (prevCandle) {
            rollingOpen = prevCandle.close;
          } else {
            const hist = getDeterministicHistoricalCandle(m, currentBucketTime - timeStepMs, tfSecs);
            rollingOpen = hist.close;
          }
          const { activeCandle, livePrice } = getDeterministicActiveCandle(m, currentBucketTime, now, tfSecs, rollingOpen);
          finalPrice = livePrice;
          finalActive = {
            time: activeCandle.time,
            open: typeof rollingOpen === 'number' ? rollingOpen : activeCandle.open,
            high: Math.max(rollingOpen || activeCandle.open, activeCandle.high, livePrice),
            low: Math.min(rollingOpen || activeCandle.open, activeCandle.low, livePrice),
            close: livePrice,
            volume: activeCandle.volume || 100
          };
          otcActiveCandlesCache.set(key, finalActive);
        }

        const exp = getMarketLiveExposure(m.symbol);
        ticks[cleanSym] = {
          symbol: m.symbol,
          price: finalPrice,
          activeCandle: {
            time: finalActive.time,
            open: finalActive.open,
            high: finalActive.high,
            low: finalActive.low,
            close: finalActive.close,
            volume: finalActive.volume || 100
          },
          exposureEnabled: Boolean(exp && exp.enabled),
          biasDirection: exp ? exp.biasDirection : 'NEUTRAL'
        };
      }
    });

    return res.json({
      success: true,
      serverTime: now,
      exposureControlEnabled: Boolean(otcControlConfig.exposureControlEnabled),
      adminPredictorMode: Boolean(otcControlConfig.adminPredictorMode),
      ticks
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/market-candles/:symbol/:timeframe', (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const key = `${symbol.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${timeframe.toUpperCase()}`;
    if (fs.existsSync(CANDLES_CACHE_FILE)) {
      const all = JSON.parse(fs.readFileSync(CANDLES_CACHE_FILE, 'utf8'));
      if (all[key]) {
        return res.json({ found: true, ...all[key] });
      }
    }
  } catch (_) {}
  return res.json({ found: false });
});

app.post('/api/market-candles/:symbol/:timeframe', (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    const { currentCandle, recentCandles, lastPrice } = req.body;
    const key = `${symbol.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${timeframe.toUpperCase()}`;
    let all: Record<string, any> = {};
    if (fs.existsSync(CANDLES_CACHE_FILE)) {
      try {
        all = JSON.parse(fs.readFileSync(CANDLES_CACHE_FILE, 'utf8'));
      } catch (_) {}
    }
    all[key] = {
      symbol,
      timeframe,
      currentCandle,
      recentCandles: (recentCandles || []).slice(-100),
      lastPrice,
      updatedAt: Date.now()
    };
    fs.writeFileSync(CANDLES_CACHE_FILE, JSON.stringify(all, null, 2), 'utf8');
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 6. CRYPTOMUS AUTOMATED DEPOSIT & INVOICE GATEWAY
// ─────────────────────────────────────────────────────────────

// POST create Cryptomus invoice (with fallback address & automated session timer)
app.post('/api/cryptomus/create-invoice', async (req, res) => {
  try {
    const {
      amount,
      userUid,
      userEmail,
      userName,
      bonusAmount,
      claimBonus,
      accountType,
      network,
      toCurrency,
      methodName
    } = req.body;

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const orderId = 'CM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const merchantId = process.env.CRYPTOMUS_MERCHANT_ID || '';
    const paymentApiKey = process.env.CRYPTOMUS_PAYMENT_API_KEY || '';
    const originHost = req.get('origin') || ('https://' + (req.get('host') || 'fxby24.com'));

    let cryptomusResult: any = null;
    let cryptomusPayUrl: string | null = null;
    let paymentAddress: string | null = null;
    let cryptoPaymentAmount: string | null = null;

    if (merchantId && paymentApiKey) {
      try {
        const payload: any = {
          amount: numAmount.toFixed(2),
          currency: 'USD',
          order_id: orderId,
          url_callback: `${originHost}/api/cryptomus/webhook`,
          url_return: originHost,
          is_payment_multiple: false,
          lifetime: 3600,
          additional_data: JSON.stringify({
            userUid,
            userEmail,
            userName,
            bonusAmount: Number(bonusAmount) || 0,
            claimBonus: Boolean(claimBonus),
            accountType: accountType || 'live',
            methodName
          })
        };

        if (toCurrency && toCurrency !== 'USD') {
          payload.to_currency = toCurrency;
        }
        if (network) {
          payload.network = network;
        }

        const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64');
        const sign = crypto.createHash('md5').update(dataStr + paymentApiKey).digest('hex');

        const response = await fetch('https://api.cryptomus.com/v1/payment', {
          method: 'POST',
          headers: {
            'merchant': merchantId,
            'sign': sign,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data && data.state === 0 && data.result) {
          cryptomusResult = data.result;
          cryptomusPayUrl = data.result.url || null;
          paymentAddress = data.result.address || null;
          cryptoPaymentAmount = data.result.payment_amount || null;
        } else {
          console.warn('[server] Cryptomus API response notice:', data);
        }
      } catch (apiErr) {
        console.warn('[server] Cryptomus direct API request error:', apiErr);
      }
    }

    // Official designated Cryptomus addresses per coin/network
    const defaultAddresses: Record<string, string> = {
      'usdt-trc20': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      'usdt-bep20': '0x55d398326f99059fF775485246999027B3197955',
      'usdt-pol': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      'usdt-polygon': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      'usdt-erc20': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'btc': '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      'eth': '0x00000000219ab540356cBB839Cbe05303d7705Fa',
      'ton': 'EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N',
      'sol': 'So11111111111111111111111111111111111111112',
      'trx': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      'bnb': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      'ltc': 'LTC1Q8C64K8FVT6GKP9C39T8Q4Z0L2V5P6S7D8E9F',
      'usdc': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      'doge': 'D8vFxBy24CryptoMusOfficialWalletAddress7',
      'bch': 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'
    };

    const currencyKey = (toCurrency || 'usdt').toLowerCase();
    const networkKey = (network || '').toLowerCase();
    const resolvedSymbol = `${currencyKey}${networkKey ? `-${networkKey}` : ''}`;
    const targetAddress = paymentAddress || defaultAddresses[resolvedSymbol] || defaultAddresses[currencyKey] || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

    // Verify 1-time welcome bonus eligibility:
    // Min $250, Max $5,000, 100% bonus, only once per account lifetime
    const allUsersServer = getStoredUsersServer();
    const existingUser = allUsersServer.find(u => (userUid && u.uid === userUid) || (userEmail && u.email && u.email.toLowerCase() === userEmail.toLowerCase()));
    const allDepositsServer = getStoredDepositsServer();
    const hasAlreadyClaimedBonus = Boolean(
      existingUser?.hasClaimedWelcomeBonus ||
      existingUser?.bonusClaimed ||
      allDepositsServer.some(d => 
        ((userUid && d.userUid === userUid) || (userEmail && d.userEmail && d.userEmail.toLowerCase() === userEmail.toLowerCase())) &&
        (d.status === 'Success' || d.status === 'Approved') &&
        (Number(d.bonusAmount) > 0)
      )
    );

    let cleanBonus = 0;
    if (!hasAlreadyClaimedBonus && Boolean(claimBonus) && numAmount >= 250 && numAmount <= 5000) {
      cleanBonus = Number(bonusAmount) > 0 ? Number(bonusAmount) : numAmount;
    }

    const nowIso = new Date().toISOString();

    const depositRecord = {
      id: orderId,
      orderId: orderId,
      cryptomusUuid: cryptomusResult?.uuid || null,
      userUid: userUid || 'anonymous',
      userEmail: userEmail || 'trader@forexpro.com',
      userName: userName || (userEmail ? userEmail.split('@')[0] : 'Trader'),
      accountType: accountType || 'live',
      type: 'Deposit',
      method: methodName || `Cryptomus ${(toCurrency || 'USDT').toUpperCase()}${network ? ` (${network.toUpperCase()})` : ''}`,
      methodSymbol: (toCurrency || 'USDT').toUpperCase(),
      network: network || 'tron',
      amount: numAmount,
      bonusAmount: cleanBonus,
      mainBalanceCredit: accountType === 'live' ? numAmount : 0,
      status: 'Pending',
      cryptomusStatus: cryptomusResult?.status || 'process',
      payUrl: cryptomusPayUrl,
      payAddress: targetAddress,
      cryptoAmount: cryptoPaymentAmount || numAmount.toFixed(2),
      timestamp: nowIso.replace('T', ' ').substring(0, 16),
      txHash: '',
      trxId: orderId,
      createdAt: nowIso,
      expiresAt: Date.now() + 3600 * 1000
    };

    const deposits = getStoredDepositsServer();
    deposits.unshift(depositRecord);
    saveStoredDepositsServer(deposits);

    logAdminActionServer('CRYPTOMUS_INVOICE_CREATED', {
      orderId,
      amount: numAmount,
      bonusAmount: cleanBonus,
      userEmail: depositRecord.userEmail,
      currency: toCurrency,
      network
    });

    console.log(`[server] 💎 Cryptomus invoice generated: ${orderId} for $${numAmount} (Bonus: $${cleanBonus})`);

    return res.json({
      success: true,
      orderId,
      uuid: cryptomusResult?.uuid || null,
      amount: numAmount,
      bonusAmount: cleanBonus,
      currency: toCurrency || 'USDT',
      network: network || 'tron',
      payAddress: targetAddress,
      payUrl: cryptomusPayUrl,
      cryptoAmount: cryptoPaymentAmount || numAmount.toFixed(2),
      expiresAt: depositRecord.expiresAt,
      deposit: depositRecord
    });
  } catch (err: any) {
    console.error('[server] ❌ Error creating Cryptomus invoice:', err);
    return res.status(500).json({ error: err.message || 'Error generating invoice' });
  }
});

// POST Cryptomus Webhook Notification
app.post('/api/cryptomus/webhook', (req, res) => {
  try {
    const payload = req.body;
    console.log('[server] 📥 Cryptomus Webhook received:', payload);

    if (!payload || !payload.order_id) {
      return res.status(400).json({ error: 'Missing order_id' });
    }

    const { order_id, status, uuid } = payload;
    const isPaid = status === 'paid' || status === 'paid_over';

    const deposits = getStoredDepositsServer();
    const index = deposits.findIndex(d => d.id === order_id || d.orderId === order_id || (uuid && d.cryptomusUuid === uuid));

    if (index !== -1) {
      const dep = deposits[index];
      dep.cryptomusStatus = status;
      if (isPaid && dep.status !== 'Success' && dep.status !== 'Approved') {
        dep.status = 'Success';
        dep.approvedAt = new Date().toISOString();
        dep.approvedBy = 'Cryptomus Automated Gateway';
        deposits[index] = dep;
        saveStoredDepositsServer(deposits);

        // Credit balances permanently
        const userUid = dep.userUid;
        if (userUid && userUid !== 'anonymous') {
          let allBalances: Record<string, any> = {};
          if (fs.existsSync(USER_BALANCES_FILE)) {
            try {
              allBalances = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
            } catch (_) {}
          }
          const current = allBalances[userUid]?.balances || { live: 0, bonus: 0, demo: 10000 };
          const amount = Number(dep.amount) || 0;
          const bonusAmount = Number(dep.bonusAmount) || 0;
          const isBonusWallet = dep.accountType === 'bonus';

          const newLive = isBonusWallet ? (current.live || 0) : Number(((current.live || 0) + amount).toFixed(2));
          const newBonus = isBonusWallet 
            ? Number(((current.bonus || 0) + amount + bonusAmount).toFixed(2))
            : Number(((current.bonus || 0) + bonusAmount).toFixed(2));

          updateUserPermanentBalancesServer(userUid, dep.userEmail, {
            live: newLive,
            bonus: newBonus,
            demo: current.demo || 10000
          });

          if (bonusAmount > 0) {
            const allUsers = getStoredUsersServer();
            const uIdx = allUsers.findIndex(u => u.uid === userUid || (dep.userEmail && u.email && u.email.toLowerCase() === dep.userEmail.toLowerCase()));
            if (uIdx !== -1) {
              allUsers[uIdx].hasClaimedWelcomeBonus = true;
              allUsers[uIdx].bonusClaimed = true;
              saveStoredUsersServer(allUsers);
            }
          }

          console.log(`[server] 🚀 Automated Cryptomus payment approved! User ${userUid} credited: Live +$${amount}, Bonus +$${bonusAmount}`);
        }

        logAdminActionServer('CRYPTOMUS_PAYMENT_SUCCESS', {
          orderId: order_id,
          amount: dep.amount,
          bonusAmount: dep.bonusAmount,
          userUid: dep.userUid,
          userEmail: dep.userEmail
        });
      }
    }

    return res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('[server] ❌ Error handling Cryptomus webhook:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET Polling status for client checkout
app.get('/api/cryptomus/check-status/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const deposits = getStoredDepositsServer();
    const deposit = deposits.find(d => d.id === orderId || d.orderId === orderId || d.trxId === orderId);

    if (!deposit) {
      return res.status(404).json({ found: false, isPaid: false });
    }

    const isPaid = deposit.status === 'Success' || deposit.status === 'Approved' || deposit.cryptomusStatus === 'paid' || deposit.cryptomusStatus === 'paid_over';

    return res.json({
      found: true,
      orderId: deposit.id,
      status: deposit.status,
      cryptomusStatus: deposit.cryptomusStatus || deposit.status,
      isPaid,
      amount: deposit.amount,
      bonusAmount: deposit.bonusAmount,
      accountType: deposit.accountType,
      deposit
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST Manual Transaction Hash submission for verification
app.post('/api/cryptomus/confirm-manual', (req, res) => {
  try {
    const { orderId, txHash } = req.body;
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID required' });
    }

    const deposits = getStoredDepositsServer();
    const index = deposits.findIndex(d => d.id === orderId || d.orderId === orderId);

    if (index === -1) {
      return res.status(404).json({ error: 'Deposit record not found' });
    }

    const dep = deposits[index];
    if (txHash && txHash.trim()) {
      dep.txHash = txHash.trim();
      dep.trxId = txHash.trim();
    }
    dep.updatedAt = new Date().toISOString();
    deposits[index] = dep;
    saveStoredDepositsServer(deposits);

    logAdminActionServer('DEPOSIT_TX_HASH_SUBMITTED', {
      orderId,
      txHash: dep.txHash,
      userEmail: dep.userEmail
    });

    return res.json({ success: true, deposit: dep });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 6b. ADMIN DIRECT USER BALANCE & DIRECT DEPOSIT ENDPOINTS
// ─────────────────────────────────────────────────────────────

// POST update user balances permanently from Admin Panel
app.post('/api/admin/users/update-balance', (req, res) => {
  try {
    const userUid = req.body.userUid || req.body.uid;
    const userEmail = req.body.userEmail;
    const rawBalances = req.body.balances;
    const adminEmail = req.body.adminEmail || 'admin@fxby24.com';
    const deltaAmount = req.body.deltaAmount;
    const deltaType = req.body.deltaType;
    const operation = req.body.operation;
    const actionNote = req.body.actionNote;

    if (!userUid) {
      return res.status(400).json({ error: 'Missing userUid' });
    }

    const balances = rawBalances && typeof rawBalances === 'object' ? {
      live: typeof rawBalances.live === 'number' ? rawBalances.live : (Number(req.body.liveBalance) || 0),
      bonus: typeof rawBalances.bonus === 'number' ? rawBalances.bonus : (Number(req.body.bonusBalance) || 0),
      demo: typeof rawBalances.demo === 'number' ? rawBalances.demo : (Number(req.body.demoBalance) || 10000)
    } : {
      live: Number(req.body.liveBalance) || 0,
      bonus: Number(req.body.bonusBalance) || 0,
      demo: Number(req.body.demoBalance) || 10000
    };

    const updatedBalances = updateUserPermanentBalancesServer(userUid, userEmail, balances);

    logAdminActionServer('ADMIN_UPDATE_USER_BALANCE', {
      adminEmail,
      targetUserUid: userUid,
      targetUserEmail: userEmail,
      deltaAmount,
      deltaType,
      operation,
      actionNote,
      newBalances: updatedBalances
    });

    console.log(`[server] 🛠️ Admin (${adminEmail}) updated balances for user ${userUid}: Live: $${updatedBalances.live}, Bonus: $${updatedBalances.bonus}, Demo: $${updatedBalances.demo}`);
    return res.json({ success: true, balances: updatedBalances });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST issue direct deposit to any user permanently from Admin Panel
app.post('/api/admin/users/direct-deposit', (req, res) => {
  try {
    const { userUid, userEmail, userName, amount, bonusAmount, wallet, method, note, adminEmail } = req.body;
    if (!userUid || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid userUid or amount' });
    }

    const numAmount = Number(amount);
    const numBonus = Number(bonusAmount) || 0;
    const targetWallet = wallet === 'bonus' ? 'bonus' : 'live';

    // 1. Fetch current balances
    let allBalances: Record<string, any> = {};
    if (fs.existsSync(USER_BALANCES_FILE)) {
      try {
        allBalances = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
      } catch (_) {}
    }
    const current = allBalances[userUid]?.balances || { live: 0, bonus: 0, demo: 10000 };
    const currentLive = current.live || 0;
    const currentBonus = current.bonus || 0;

    const newLive = targetWallet === 'live' ? Number((currentLive + numAmount).toFixed(2)) : currentLive;
    const newBonus = targetWallet === 'bonus'
      ? Number((currentBonus + numAmount + numBonus).toFixed(2))
      : Number((currentBonus + numBonus).toFixed(2));

    const updatedBalances = updateUserPermanentBalancesServer(userUid, userEmail, {
      live: newLive,
      bonus: newBonus,
      demo: current.demo || 10000
    });

    // 2. Create approved deposit record
    const depId = 'DIR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const nowIso = new Date().toISOString();
    const directDeposit = {
      id: depId,
      trxId: depId,
      userUid,
      userEmail: userEmail || 'trader@forexpro.com',
      userName: userName || (userEmail ? userEmail.split('@')[0] : 'Trader'),
      accountType: targetWallet,
      type: 'Deposit',
      method: method || 'Direct Admin Credit',
      amount: numAmount,
      bonusAmount: numBonus,
      mainBalanceCredit: targetWallet === 'live' ? numAmount : 0,
      status: 'Success',
      timestamp: nowIso.replace('T', ' ').substring(0, 16),
      note: note || 'Direct deposit issued by Admin',
      approvedAt: nowIso,
      approvedBy: adminEmail || 'Admin Direct Credit',
      createdAt: nowIso
    };

    const deposits = getStoredDepositsServer();
    deposits.unshift(directDeposit);
    saveStoredDepositsServer(deposits);

    logAdminActionServer('ADMIN_DIRECT_DEPOSIT_ISSUED', {
      adminEmail: adminEmail || 'admin@fxby24.com',
      targetUserUid: userUid,
      targetUserEmail: userEmail,
      amount: numAmount,
      bonusAmount: numBonus,
      wallet: targetWallet,
      note
    });

    console.log(`[server] 💰 Direct deposit of $${numAmount} (+Bonus $${numBonus}) issued to ${userUid} (${userEmail}) by ${adminEmail}`);

    return res.json({
      success: true,
      deposit: directDeposit,
      newBalances: updatedBalances
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 6c. DEPOSIT REQUESTS (FAST PERSISTENT BACKEND API)
// ─────────────────────────────────────────────────────────────

// GET all deposits (supports optional ?userUid=... and ?userEmail=... filtering)
app.get('/api/deposits', (req, res) => {
  try {
    let deposits = getStoredDepositsServer();
    const userUid = typeof req.query.userUid === 'string' ? req.query.userUid.trim() : '';
    const userEmail = typeof req.query.userEmail === 'string' ? req.query.userEmail.trim().toLowerCase() : '';

    if (userUid || userEmail) {
      deposits = deposits.filter((d: any) => {
        const matchUid = Boolean(userUid && d.userUid && d.userUid === userUid);
        const matchEmail = Boolean(userEmail && d.userEmail && d.userEmail.trim().toLowerCase() === userEmail);
        return matchUid || matchEmail;
      });
    }

    return res.json({ success: true, deposits });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET combined user transactions (both deposits and withdrawals)
app.get('/api/user-transactions', (req, res) => {
  try {
    const userUid = typeof req.query.userUid === 'string' ? req.query.userUid.trim() : '';
    const userEmail = typeof req.query.userEmail === 'string' ? req.query.userEmail.trim().toLowerCase() : '';

    if (!userUid && !userEmail) {
      return res.status(400).json({ error: 'userUid or userEmail is required' });
    }

    const allDeposits = getStoredDepositsServer().filter((d: any) => {
      const matchUid = Boolean(userUid && d.userUid && d.userUid === userUid);
      const matchEmail = Boolean(userEmail && d.userEmail && d.userEmail.trim().toLowerCase() === userEmail);
      return matchUid || matchEmail;
    });

    const allWithdrawals = getStoredWithdrawalsServer().filter((w: any) => {
      const matchUid = Boolean(userUid && w.userUid && w.userUid === userUid);
      const matchEmail = Boolean(userEmail && w.userEmail && w.userEmail.trim().toLowerCase() === userEmail);
      return matchUid || matchEmail;
    });

    const combined = [...allDeposits, ...allWithdrawals].sort((a: any, b: any) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return res.json({ success: true, transactions: combined });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST new deposit (idempotent deduplication by trxId / id)
app.post('/api/deposits', (req, res) => {
  try {
    const { 
      id, 
      userUid, 
      userEmail, 
      userName, 
      amount, 
      bonusAmount, 
      method, 
      trxId, 
      proofScreenshot, 
      accountType 
    } = req.body;

    if (!trxId || !trxId.trim()) {
      return res.status(400).json({ error: 'Transaction ID / Hash is required' });
    }

    const cleanTrx = trxId.trim();
    const cleanId = id || ('DP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());
    const existingDeposits = getStoredDepositsServer();

    // Check if deposit with identical ID already exists (idempotency against rapid double-clicks)
    const existing = existingDeposits.find(d => d.id && d.id === cleanId);

    if (existing) {
      console.log(`[server] ⚠️ Duplicate deposit submission detected for ID '${cleanId}'. Returning existing record.`);
      return res.json({ success: true, isDuplicate: true, deposit: existing });
    }

    const numAmount = Number(amount) || 0;
    const allUsersServer = getStoredUsersServer();
    const existingUser = allUsersServer.find(u => (userUid && u.uid === userUid) || (userEmail && u.email && u.email.toLowerCase() === userEmail.toLowerCase()));
    const hasAlreadyClaimedBonus = Boolean(
      existingUser?.hasClaimedWelcomeBonus ||
      existingUser?.bonusClaimed ||
      existingDeposits.some(d => 
        ((userUid && d.userUid === userUid) || (userEmail && d.userEmail && d.userEmail.toLowerCase() === userEmail.toLowerCase())) &&
        (d.status === 'Success' || d.status === 'Approved') &&
        (Number(d.bonusAmount) > 0)
      )
    );

    let cleanBonus = 0;
    if (!hasAlreadyClaimedBonus && Boolean(req.body.claimBonus) && numAmount >= 250 && numAmount <= 5000) {
      cleanBonus = Number(bonusAmount) > 0 ? Number(bonusAmount) : numAmount;
    } else if (!hasAlreadyClaimedBonus && Number(bonusAmount) > 0 && numAmount >= 250 && numAmount <= 5000) {
      cleanBonus = Number(bonusAmount);
    }

    const formattedTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newDeposit = {
      id: cleanId,
      userUid: userUid || 'anonymous',
      userEmail: userEmail || 'trader@forexpro.com',
      userName: userName || (userEmail ? userEmail.split('@')[0] : 'Trader'),
      accountType: accountType || 'live',
      type: 'Deposit',
      method: method || 'Payment Gateway',
      amount: numAmount,
      bonusAmount: cleanBonus,
      claimBonus: Boolean(cleanBonus > 0),
      mainBalanceCredit: accountType === 'live' ? numAmount : 0,
      status: 'Pending',
      timestamp: formattedTime,
      txHash: cleanTrx,
      trxId: cleanTrx,
      proofScreenshot: proofScreenshot || undefined,
      createdAt: new Date().toISOString()
    };

    existingDeposits.unshift(newDeposit);
    saveStoredDepositsServer(existingDeposits);

    logAdminActionServer('NEW_DEPOSIT_SUBMITTED', {
      depositId: cleanId,
      trxId: cleanTrx,
      amount: newDeposit.amount,
      userEmail: newDeposit.userEmail
    });

    console.log(`[server] ✅ Deposit request ${cleanId} ($${newDeposit.amount}) saved successfully.`);
    return res.json({ success: true, deposit: newDeposit });
  } catch (err: any) {
    console.error('[server] ❌ Error saving deposit:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST approve deposit (credits user balance atomically)
app.post('/api/deposits/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    const deposits = getStoredDepositsServer();
    const index = deposits.findIndex(d => d.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Deposit record not found' });
    }

    const deposit = deposits[index];
    if (deposit.status === 'Approved' || deposit.status === 'Success') {
      return res.json({ success: true, alreadyApproved: true, deposit });
    }

    const nowIso = new Date().toISOString();
    deposit.status = 'Success';
    deposit.approvedAt = nowIso;
    deposit.approvedBy = approvedBy || 'Admin';
    deposits[index] = deposit;
    saveStoredDepositsServer(deposits);

    // Atomically credit user live balance in persistent storage
    let updatedBalances: any = null;
    const targetUid = deposit.userUid;
    if (targetUid && targetUid !== 'anonymous') {
      let allBalances: Record<string, any> = {};
      if (fs.existsSync(USER_BALANCES_FILE)) {
        try {
          allBalances = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
        } catch (_) {}
      }
      const current = allBalances[targetUid]?.balances || { live: 0, bonus: 0, demo: 10000 };
      const currentLive = typeof current.live === 'number' ? current.live : 0;
      const currentBonus = typeof current.bonus === 'number' ? current.bonus : 0;
      const currentDemo = typeof current.demo === 'number' ? current.demo : 10000;
      const amount = Number(deposit.amount) || 0;
      const bonusAmount = Number(deposit.bonusAmount) || 0;
      const isBonusWallet = deposit.accountType === 'bonus';

      const newLive = isBonusWallet ? currentLive : Number((currentLive + amount).toFixed(2));
      const newBonus = isBonusWallet 
        ? Number((currentBonus + amount + bonusAmount).toFixed(2)) 
        : Number((currentBonus + bonusAmount).toFixed(2));

      updatedBalances = {
        live: newLive,
        bonus: newBonus,
        demo: currentDemo
      };

      allBalances[targetUid] = {
        balances: updatedBalances,
        updatedAt: Date.now()
      };
      fs.writeFileSync(USER_BALANCES_FILE, JSON.stringify(allBalances, null, 2), 'utf8');
      console.log(`[server] 💰 User ${targetUid} credited live: $${newLive}, bonus: $${newBonus}`);

      if (bonusAmount > 0) {
        const allUsers = getStoredUsersServer();
        const depUserIdx = allUsers.findIndex(u => u.uid === targetUid || (deposit.userEmail && u.email && u.email.toLowerCase() === deposit.userEmail.toLowerCase()));
        if (depUserIdx !== -1) {
          allUsers[depUserIdx].hasClaimedWelcomeBonus = true;
          allUsers[depUserIdx].bonusClaimed = true;
          saveStoredUsersServer(allUsers);
        }
      }

      // Check and process $25 Referral Bonus on First Qualifying Deposit (>= $250)
      if (amount >= 250) {
        try {
          const allUsers = getStoredUsersServer();
          const depUserIdx = allUsers.findIndex(u => u.uid === targetUid || (deposit.userEmail && u.email && u.email.toLowerCase() === deposit.userEmail.toLowerCase()));
          if (depUserIdx !== -1) {
            const depUser = allUsers[depUserIdx];
            const refCode = depUser?.referrerUid || depUser?.referralCode || depUser?.referredBy;

            if (refCode && !depUser.referralBonusAwarded) {
              const cleanRef = String(refCode).trim().toLowerCase();
              const referrerIdx = allUsers.findIndex(u => 
                u.uid.toLowerCase() === cleanRef || 
                (u.referrerUid && u.referrerUid.toLowerCase() === cleanRef) ||
                (u.displayUserId && String(u.displayUserId).toLowerCase() === cleanRef) ||
                (u.email && u.email.toLowerCase() === cleanRef)
              );

              if (referrerIdx !== -1 && allUsers[referrerIdx].uid !== targetUid) {
                const referrerUser = allUsers[referrerIdx];
                const refUid = referrerUser.uid;

                const curRefBal = allBalances[refUid]?.balances || referrerUser.balances || { live: 0, bonus: 0, demo: 10000 };
                const prevBonus = typeof curRefBal.bonus === 'number' ? curRefBal.bonus : 0;
                const newRefBonus = Number((prevBonus + 25.00).toFixed(2));

                const updatedRefBalances = {
                  live: typeof curRefBal.live === 'number' ? curRefBal.live : 0,
                  bonus: newRefBonus,
                  demo: typeof curRefBal.demo === 'number' ? curRefBal.demo : 10000
                };

                allBalances[refUid] = {
                  balances: updatedRefBalances,
                  updatedAt: Date.now()
                };
                fs.writeFileSync(USER_BALANCES_FILE, JSON.stringify(allBalances, null, 2), 'utf8');

                // Update referrer stats in registered_users
                allUsers[referrerIdx] = {
                  ...referrerUser,
                  bonusBalance: newRefBonus,
                  balances: updatedRefBalances,
                  referralBonusTotal: (referrerUser.referralBonusTotal || 0) + 25.00,
                  referralCount: (referrerUser.referralCount || 0) + 1,
                  updatedAt: Date.now()
                };

                // Mark depositing user as rewarded
                allUsers[depUserIdx] = {
                  ...depUser,
                  referralBonusAwarded: true,
                  referredByUid: refUid,
                  updatedAt: Date.now()
                };
                saveStoredUsersServer(allUsers);

                // Add Referral Income Transaction Record to Transaction Studio / history
                const refTxRecord = {
                  id: `TX-REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                  userUid: refUid,
                  userEmail: referrerUser.email || '',
                  userName: referrerUser.fullName || 'Trader',
                  accountType: 'bonus',
                  type: 'Deposit',
                  method: 'Referral Income ($25.00)',
                  amount: 25.00,
                  bonusAmount: 25.00,
                  status: 'Success',
                  trxId: `REF-${deposit.trxId || id}`,
                  destinationAddress: `Bonus Wallet - Referral reward from ${deposit.userName || 'Referred User'} ($${amount})`,
                  timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
                  createdAt: new Date().toISOString(),
                  approvedAt: new Date().toISOString(),
                  approvedBy: 'System (Referral Bonus)'
                };

                deposits.unshift(refTxRecord);
                saveStoredDepositsServer(deposits);
                console.log(`[server] 🎁 $25 Referral Bonus credited to referrer ${refUid} (${referrerUser.email}) and logged in transaction history!`);
              }
            }
          }
        } catch (refBonusErr) {
          console.warn('[server] Error processing referral bonus on approve:', refBonusErr);
        }
      }
    }

    logAdminActionServer('APPROVE_DEPOSIT', {
      depositId: id,
      trxId: deposit.trxId,
      amount: deposit.amount,
      userUid: deposit.userUid,
      approvedBy: deposit.approvedBy
    });

    return res.json({ success: true, deposit, newBalances: updatedBalances });
  } catch (err: any) {
    console.error('[server] ❌ Error approving deposit:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST reject deposit
app.post('/api/deposits/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason, deposit: incomingDeposit } = req.body;
    const deposits = getStoredDepositsServer();
    const cleanId = (id || '').trim().toLowerCase();

    const index = deposits.findIndex(d => 
      (d.id && d.id.trim().toLowerCase() === cleanId) ||
      (d.trxId && d.trxId.trim().toLowerCase() === cleanId) ||
      (d.txHash && d.txHash.trim().toLowerCase() === cleanId)
    );

    let deposit = index !== -1 ? deposits[index] : (incomingDeposit || { id, type: 'Deposit', amount: 0 });
    deposit.id = deposit.id || id;
    deposit.status = 'Rejected';
    deposit.rejectionReason = reason || 'Invalid payment proof / TrxID mismatch';
    deposit.rejectedAt = new Date().toISOString();
    deposit.updatedAt = new Date().toISOString();

    if (index !== -1) {
      deposits[index] = deposit;
    } else {
      deposits.unshift(deposit);
    }
    saveStoredDepositsServer(deposits);

    logAdminActionServer('REJECT_DEPOSIT', {
      depositId: deposit.id,
      trxId: deposit.trxId,
      amount: deposit.amount,
      userEmail: deposit.userEmail,
      reason: deposit.rejectionReason
    });

    console.log(`[server] ❌ Deposit ${deposit.id} marked as REJECTED (${deposit.rejectionReason})`);
    return res.json({ success: true, deposit });
  } catch (err: any) {
    console.error('[server] Error rejecting deposit:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. WITHDRAWAL REQUESTS (FAST PERSISTENT BACKEND API)
// ─────────────────────────────────────────────────────────────

// GET all withdrawals (supports optional ?userUid=... and ?userEmail=... filtering)
app.get('/api/withdrawals', (req, res) => {
  try {
    let withdrawals = getStoredWithdrawalsServer();
    const userUid = typeof req.query.userUid === 'string' ? req.query.userUid.trim() : '';
    const userEmail = typeof req.query.userEmail === 'string' ? req.query.userEmail.trim().toLowerCase() : '';

    if (userUid || userEmail) {
      withdrawals = withdrawals.filter((w: any) => {
        const matchUid = Boolean(userUid && w.userUid && w.userUid === userUid);
        const matchEmail = Boolean(userEmail && w.userEmail && w.userEmail.trim().toLowerCase() === userEmail);
        return matchUid || matchEmail;
      });
    }

    return res.json({ success: true, withdrawals });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST new withdrawal (idempotent, deducts balance immediately)
app.post('/api/withdrawals', (req, res) => {
  try {
    const {
      id,
      trxId,
      userUid,
      userEmail,
      amount,
      method,
      methodSymbol,
      destinationAddress,
      accountType
    } = req.body;

    const reqId = id || trxId || ('WD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase());
    const existingWds = getStoredWithdrawalsServer();

    // Check duplicate
    const existing = existingWds.find(w => w.id === reqId || (trxId && w.trxId === trxId));
    if (existing) {
      return res.json({ success: true, isDuplicate: true, withdrawal: existing });
    }

    const nowIso = new Date().toISOString();
    const newWd = {
      id: reqId,
      trxId: reqId,
      userUid: userUid || 'anonymous',
      userEmail: userEmail || 'trader@forexpro.com',
      accountType: accountType || 'live',
      type: 'Withdrawal',
      amount: Number(amount) || 0,
      method: method || 'Payment Gateway',
      methodSymbol: methodSymbol || method || 'USD',
      destinationAddress: destinationAddress || '',
      depositBonusGranted: req.body.depositBonusGranted !== undefined ? Number(req.body.depositBonusGranted) : undefined,
      systemDeductedProfitAmount: req.body.systemDeductedProfitAmount !== undefined ? Number(req.body.systemDeductedProfitAmount) : undefined,
      totalNetProfit: req.body.totalNetProfit !== undefined ? Number(req.body.totalNetProfit) : undefined,
      status: 'Pending',
      timestamp: nowIso.replace('T', ' ').substring(0, 16),
      createdAt: nowIso,
      deductedAtSubmit: true
    };

    // Deduct live or bonus balance in server persistent storage
    if (userUid && userUid !== 'anonymous') {
      let allBalances: Record<string, any> = {};
      if (fs.existsSync(USER_BALANCES_FILE)) {
        try {
          allBalances = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
        } catch (_) {}
      }
      if (allBalances[userUid]?.balances) {
        if (accountType === 'live') {
          const currentLive = allBalances[userUid].balances.live || 0;
          const newLive = Math.max(0, Number((currentLive - Number(amount)).toFixed(2)));
          allBalances[userUid].balances.live = newLive;
        } else if (accountType === 'bonus') {
          const currentBonus = allBalances[userUid].balances.bonus || 0;
          const baseGranted = Number(req.body.depositBonusGranted || 250);
          const newBonus = Math.min(currentBonus, baseGranted);
          allBalances[userUid].balances.bonus = newBonus;
        }
        allBalances[userUid].updatedAt = Date.now();
        fs.writeFileSync(USER_BALANCES_FILE, JSON.stringify(allBalances, null, 2), 'utf8');
      }
    }

    existingWds.unshift(newWd);
    saveStoredWithdrawalsServer(existingWds);

    logAdminActionServer('NEW_WITHDRAWAL_SUBMITTED', {
      withdrawalId: reqId,
      amount: newWd.amount,
      userEmail: newWd.userEmail
    });

    console.log(`[server] ✅ Withdrawal request ${reqId} ($${newWd.amount}) saved successfully.`);
    return res.json({ success: true, withdrawal: newWd });
  } catch (err: any) {
    console.error('[server] ❌ Error saving withdrawal:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST approve withdrawal
app.post('/api/withdrawals/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const withdrawals = getStoredWithdrawalsServer();
    const index = withdrawals.findIndex(w => w.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Withdrawal record not found' });
    }

    const wd = withdrawals[index];
    wd.status = 'Approved';
    wd.approvedAt = new Date().toISOString();
    withdrawals[index] = wd;
    saveStoredWithdrawalsServer(withdrawals);

    logAdminActionServer('APPROVE_WITHDRAWAL', {
      withdrawalId: id,
      amount: wd.amount,
      userUid: wd.userUid
    });

    return res.json({ success: true, withdrawal: wd });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST reject withdrawal (refunds user live balance)
app.post('/api/withdrawals/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason, withdrawal: incomingWd } = req.body;
    const withdrawals = getStoredWithdrawalsServer();
    const cleanId = (id || '').trim().toLowerCase();

    const index = withdrawals.findIndex(w => 
      (w.id && w.id.trim().toLowerCase() === cleanId) ||
      (w.trxId && w.trxId.trim().toLowerCase() === cleanId) ||
      (w.txHash && w.txHash.trim().toLowerCase() === cleanId)
    );

    let wd = index !== -1 ? withdrawals[index] : (incomingWd || { id, type: 'Withdrawal', amount: 0 });
    wd.id = wd.id || id;
    const wasAlreadyRejected = wd.status === 'Rejected';
    wd.status = 'Rejected';
    wd.rejectionReason = reason || 'Verification or destination address error';
    wd.rejectedAt = new Date().toISOString();
    wd.updatedAt = new Date().toISOString();

    if (index !== -1) {
      withdrawals[index] = wd;
    } else {
      withdrawals.unshift(wd);
    }
    saveStoredWithdrawalsServer(withdrawals);

    // Refund live or bonus balance if it was deducted
    if (!wasAlreadyRejected && wd.userUid && wd.userUid !== 'anonymous') {
      let allBalances: Record<string, any> = {};
      if (fs.existsSync(USER_BALANCES_FILE)) {
        try {
          allBalances = JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf8'));
        } catch (_) {}
      }
      const userRecord = allBalances[wd.userUid]?.balances || { live: 0, bonus: 0, demo: 10000 };
      if (wd.accountType === 'live') {
        const currentLive = Number(userRecord.live || 0);
        const refundedLive = Number((currentLive + Number(wd.amount)).toFixed(2));
        updateUserPermanentBalancesServer(wd.userUid, wd.userEmail, { live: refundedLive });
        console.log(`[server] ↩️ Refunded $${wd.amount} live balance to user ${wd.userUid} (new total: $${refundedLive})`);
      } else if (wd.accountType === 'bonus') {
        const currentBonus = Number(userRecord.bonus || 0);
        const refundBonus = Number(wd.amount) + Number(wd.systemDeductedProfitAmount || 0);
        const refundedBonus = Number((currentBonus + refundBonus).toFixed(2));
        updateUserPermanentBalancesServer(wd.userUid, wd.userEmail, { bonus: refundedBonus });
        console.log(`[server] ↩️ Refunded $${refundBonus} bonus balance to user ${wd.userUid} (new total: $${refundedBonus})`);
      }
    }

    logAdminActionServer('REJECT_WITHDRAWAL', {
      withdrawalId: wd.id,
      amount: wd.amount,
      userUid: wd.userUid,
      userEmail: wd.userEmail,
      reason: wd.rejectionReason
    });

    console.log(`[server] ❌ Withdrawal ${wd.id} marked as REJECTED (${wd.rejectionReason})`);
    return res.json({ success: true, withdrawal: wd });
  } catch (err: any) {
    console.error('[server] Error rejecting withdrawal:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// 7. USER PERSISTENCE & CROSS-DEVICE REAL-TIME SYNC (PHONE <-> DESKTOP)
// ─────────────────────────────────────────────────────────────

const USER_TRADES_FILE = path.join(DATA_DIR, 'user_trades_store.json');

function getStoredUserTradesServer(): any[] {
  try {
    if (fs.existsSync(USER_TRADES_FILE)) {
      const raw = fs.readFileSync(USER_TRADES_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {}
  return [];
}

function saveStoredUserTradesServer(trades: any[]) {
  try {
    fs.writeFileSync(USER_TRADES_FILE, JSON.stringify(trades.slice(0, 5000), null, 2), 'utf8');
  } catch (_) {}
}

// GET user KYC status for cross-device synchronization (phone <-> desktop)
app.get('/api/users/kyc-status/:uid', (req, res) => {
  try {
    const { uid } = req.params;
    const users = getStoredUsersServer();
    const user = users.find(u => u.uid === uid);
    if (user) {
      return res.json({
        found: true,
        kycStatus: user.kycStatus || (user.isVerifiedUser ? 'verified' : 'unverified'),
        isVerifiedUser: Boolean(user.isVerifiedUser || user.kycStatus === 'verified'),
        kycApprovedAt: user.kycApprovedAt || null,
        kycRejectionReason: user.kycRejectionReason || null
      });
    }
    return res.json({ found: false, kycStatus: 'unverified', isVerifiedUser: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST sync user KYC status from client to server persistent store
app.post('/api/users/kyc-status', (req, res) => {
  try {
    const { uid, userEmail, kycStatus, isVerifiedUser, kycApprovedAt, kycRejectionReason } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'Missing uid' });
    }
    const users = getStoredUsersServer();
    const existingIdx = users.findIndex(u => u.uid === uid || (userEmail && u.email && u.email.toLowerCase() === userEmail.toLowerCase()));
    const isVerified = kycStatus === 'verified' || isVerifiedUser === true;
    const cleanStatus = isVerified ? 'verified' : (kycStatus || 'unverified');

    if (existingIdx !== -1) {
      // Never downgrade a verified account to unverified or pending
      if (users[existingIdx].kycStatus === 'verified' && cleanStatus !== 'verified') {
        return res.json({ success: true, user: users[existingIdx] });
      }
      users[existingIdx] = {
        ...users[existingIdx],
        kycStatus: cleanStatus,
        isVerifiedUser: isVerified,
        kycApprovedAt: isVerified ? (kycApprovedAt || users[existingIdx].kycApprovedAt || new Date().toISOString()) : users[existingIdx].kycApprovedAt,
        kycRejectionReason: kycRejectionReason || users[existingIdx].kycRejectionReason || null,
        updatedAt: Date.now()
      };
      saveStoredUsersServer(users);
      console.log(`[server] 🛡️ Updated KYC status for user ${uid} to: ${cleanStatus}`);
      return res.json({ success: true, user: users[existingIdx] });
    } else {
      const newUser = {
        uid,
        email: userEmail,
        kycStatus: cleanStatus,
        isVerifiedUser: isVerified,
        kycApprovedAt: isVerified ? (kycApprovedAt || new Date().toISOString()) : null,
        kycRejectionReason: kycRejectionReason || null,
        registeredAt: Date.now()
      };
      users.unshift(newUser);
      saveStoredUsersServer(users);
      return res.json({ success: true, user: newUser });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET all trades for a specific user (cross-device sync) with strict deduplication
app.get('/api/users/trades/:uid', (req, res) => {
  try {
    const { uid } = req.params;
    const userEmail = typeof req.query.email === 'string' ? req.query.email.toLowerCase().trim() : '';
    const allTrades = getStoredUserTradesServer();

    const userTrades = allTrades.filter(t => {
      const matchUid = t.userUid && t.userUid === uid;
      const matchEmail = Boolean(userEmail && t.userEmail && t.userEmail.toLowerCase().trim() === userEmail);
      return matchUid || matchEmail;
    });

    const seenClosedIds = new Set<string>();
    const closed: any[] = [];
    userTrades
      .filter(t => t.status !== 'OPEN')
      .sort((a, b) => {
        const tA = a.closeTimestamp || (a.closeTime ? new Date(a.closeTime).getTime() : 0);
        const tB = b.closeTimestamp || (b.closeTime ? new Date(b.closeTime).getTime() : 0);
        return tB - tA;
      })
      .forEach(t => {
        if (!t.id || seenClosedIds.has(t.id)) return;
        seenClosedIds.add(t.id);
        closed.push(t);
      });

    const seenActiveIds = new Set<string>();
    const active: any[] = [];
    const now = Date.now();
    userTrades
      .filter(t => t.status === 'OPEN')
      .forEach(t => {
        if (!t.id || seenActiveIds.has(t.id) || seenClosedIds.has(t.id)) return;
        // If an OTC trade has passed its expiry by more than 3 seconds, do not return as active
        if ((t.tradingMode === 'otc' || t.category === 'binary') && t.expiryTimestamp && t.expiryTimestamp < (now - 3000)) {
          return;
        }
        seenActiveIds.add(t.id);
        active.push(t);
      });

    return res.json({ success: true, active, closed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET all trades for admin panel (real-time overview of all trades)
app.get('/api/admin/trades', (_req, res) => {
  try {
    const allTrades = getStoredUserTradesServer();
    const sorted = allTrades.slice(0, 1000).sort((a: any, b: any) => {
      const tA = a.openTimestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tB = b.openTimestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tB - tA;
    });
    return res.json({ success: true, trades: sorted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST save/sync single trade to central server store
app.post('/api/users/trades', (req, res) => {
  try {
    const trade = req.body;
    if (!trade || !trade.id) {
      return res.status(400).json({ error: 'Missing trade or trade.id' });
    }

    const allTrades = getStoredUserTradesServer();
    const existingIdx = allTrades.findIndex(t => t.id === trade.id);

    if (existingIdx !== -1) {
      allTrades[existingIdx] = { ...allTrades[existingIdx], ...trade, updatedAt: Date.now() };
    } else {
      allTrades.unshift({ ...trade, updatedAt: Date.now() });
    }

    saveStoredUserTradesServer(allTrades);
    return res.json({ success: true, trade });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST atomic batch save/sync trades to central server store (prevents race condition in Close All)
app.post('/api/users/trades/batch', (req, res) => {
  try {
    const { trades } = req.body;
    if (!Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({ error: 'Missing or empty trades array' });
    }

    const allTrades = getStoredUserTradesServer();
    const now = Date.now();

    trades.forEach((trade: any) => {
      if (!trade || !trade.id) return;
      const existingIdx = allTrades.findIndex(t => t.id === trade.id);
      if (existingIdx !== -1) {
        allTrades[existingIdx] = { ...allTrades[existingIdx], ...trade, updatedAt: now };
      } else {
        allTrades.unshift({ ...trade, updatedAt: now });
      }
    });

    saveStoredUserTradesServer(allTrades);
    return res.json({ success: true, count: trades.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// OTC LIQUIDITY EXPOSURE ENGINE & ADMIN PREDICTOR FORECAST
// ─────────────────────────────────────────────────────────────

// GET OTC Live Exposure & Active Orders Heatmap
app.get('/api/otc/exposure', (_req, res) => {
  try {
    const allTrades = getStoredUserTradesServer();
    const now = Date.now();

    const ADMIN_EMAILS = ['naymulh1000@gmail.com', 'admin@fxby24.com', 'admin@forextradepro.com'];
    // Filter active OPEN binary trades on OTC markets (both live and demo for complete coverage)
    const activeTrades = allTrades.filter(t => 
      t &&
      t.status === 'OPEN' &&
      (t.category === 'otc' || (t.symbol && t.symbol.toUpperCase().includes('OTC')) || t.tradingMode === 'otc') &&
      (!t.expiryTimestamp || t.expiryTimestamp > now) &&
      (!t.userEmail || !ADMIN_EMAILS.includes(t.userEmail.toLowerCase().trim()))
    );

    const exposureBySymbol: Record<string, {
      symbol: string;
      upVolume: number;
      downVolume: number;
      netExposure: number;
      biasDirection: 'UP' | 'DOWN' | 'NEUTRAL';
      heavySide: 'UP' | 'DOWN' | 'NONE';
      heavyEntryPrice: number;
      minRemainingSec: number;
      enabled: boolean;
      totalOrders: number;
      orders: any[];
    }> = {};

    activeTrades.forEach(t => {
      const sym = (t.symbol || 'EUR/USD OTC').trim().toUpperCase();
      if (!exposureBySymbol[sym]) {
        exposureBySymbol[sym] = {
          symbol: sym,
          upVolume: 0,
          downVolume: 0,
          netExposure: 0,
          biasDirection: 'NEUTRAL',
          heavySide: 'NONE',
          heavyEntryPrice: 0,
          minRemainingSec: 99999,
          enabled: otcControlConfig.exposureControlEnabled,
          totalOrders: 0,
          orders: []
        };
      }

      const amount = Number(t.amount || t.investment || 0);
      const isUp = t.type === 'CALL' || t.type === 'UP' || t.type === 'BUY';
      const isDown = t.type === 'PUT' || t.type === 'DOWN' || t.type === 'SELL';
      const remSec = t.expiryTimestamp ? Math.max(0, Math.ceil((t.expiryTimestamp - now) / 1000)) : 60;

      if (remSec < exposureBySymbol[sym].minRemainingSec) {
        exposureBySymbol[sym].minRemainingSec = remSec;
      }

      if (isUp) {
        exposureBySymbol[sym].upVolume += amount;
      } else if (isDown) {
        exposureBySymbol[sym].downVolume += amount;
      }

      exposureBySymbol[sym].totalOrders += 1;
      exposureBySymbol[sym].orders.push({
        id: t.id,
        userId: t.userId,
        userEmail: t.userEmail,
        displayName: t.displayName || t.username || 'Trader',
        symbol: sym,
        amount,
        type: isUp ? 'UP' : 'DOWN',
        entryPrice: t.entryPrice,
        openTime: t.openTime || t.createdAt,
        expiryTimestamp: t.expiryTimestamp,
        remainingSeconds: remSec
      });
    });

    // Calculate final bias direction and heavyEntryPrice:
    // If UP volume > DOWN volume (or only UP took trades): Bias is DOWN (drive market DOWN to settle UP in loss)
    // If DOWN volume > UP volume (or only DOWN took trades): Bias is UP (drive market UP to settle DOWN in loss)
    Object.values(exposureBySymbol).forEach(exp => {
      exp.netExposure = exp.upVolume - exp.downVolume;
      exp.enabled = Boolean(otcControlConfig.exposureControlEnabled);

      if (exp.enabled && exp.upVolume > exp.downVolume) {
        exp.biasDirection = 'DOWN';
        exp.heavySide = 'UP';
        const upOrders = exp.orders.filter(o => o.type === 'UP' && typeof o.entryPrice === 'number');
        exp.heavyEntryPrice = upOrders.length > 0 
          ? upOrders.reduce((sum, o) => sum + (o.entryPrice * o.amount), 0) / (exp.upVolume || 1)
          : 0;
      } else if (exp.enabled && exp.downVolume > exp.upVolume) {
        exp.biasDirection = 'UP';
        exp.heavySide = 'DOWN';
        const downOrders = exp.orders.filter(o => o.type === 'DOWN' && typeof o.entryPrice === 'number');
        exp.heavyEntryPrice = downOrders.length > 0 
          ? downOrders.reduce((sum, o) => sum + (o.entryPrice * o.amount), 0) / (exp.downVolume || 1)
          : 0;
      } else {
        exp.biasDirection = 'NEUTRAL';
        exp.heavySide = 'NONE';
        exp.heavyEntryPrice = 0;
      }

      // Also register this symbol's exposure in server memory
      setMarketLiveExposure(exp.symbol, {
        symbol: exp.symbol,
        upVolume: exp.upVolume,
        downVolume: exp.downVolume,
        netExposure: exp.netExposure,
        biasDirection: exp.biasDirection,
        heavySide: exp.heavySide,
        heavyEntryPrice: exp.heavyEntryPrice,
        minRemainingSec: exp.minRemainingSec,
        enabled: exp.enabled,
        activeOrdersCount: exp.totalOrders
      });
    });

    return res.json({
      success: true,
      exposureControlEnabled: otcControlConfig.exposureControlEnabled,
      adminPredictorMode: otcControlConfig.adminPredictorMode,
      marketsExposure: exposureBySymbol,
      activeLiveOrdersCount: activeTrades.length,
      lastUpdated: now
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET / POST Admin Predictor Toggle Mode
app.get('/api/otc/admin-mode', (_req, res) => {
  return res.json({
    adminPredictorMode: otcControlConfig.adminPredictorMode,
    exposureControlEnabled: otcControlConfig.exposureControlEnabled,
    lastUpdated: otcControlConfig.lastUpdated
  });
});

app.post('/api/otc/admin-mode', (req, res) => {
  try {
    const { adminPredictorMode, exposureControlEnabled } = req.body;
    if (typeof adminPredictorMode === 'boolean') {
      otcControlConfig.adminPredictorMode = adminPredictorMode;
    }
    if (typeof exposureControlEnabled === 'boolean') {
      otcControlConfig.exposureControlEnabled = exposureControlEnabled;
    }
    otcControlConfig.lastUpdated = Date.now();
    persistOtcControlConfig();

    return res.json({
      success: true,
      adminPredictorMode: otcControlConfig.adminPredictorMode,
      exposureControlEnabled: otcControlConfig.exposureControlEnabled
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET Future 5-Candle Deterministic Forecast for any OTC Symbol
app.get('/api/otc/forecast/:symbol/:timeframe', (req, res) => {
  try {
    const symbol = decodeURIComponent(req.params.symbol || 'EUR/USD OTC');
    const tf = (req.params.timeframe || 'M1').toUpperCase();
    const count = Math.min(10, Math.max(3, parseInt(req.query.count as string) || 5));

    const market = marketsConfig.find(m => m.symbol.toUpperCase() === symbol.toUpperCase()) || {
      id: symbol.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: `${symbol} (OTC)`,
      symbol: symbol,
      category: 'otc' as const,
      basePrice: symbol.includes('BTC') ? 68500 : symbol.includes('ETH') ? 3500 : symbol.includes('JPY') ? 154.20 : 1.08500,
      spread: 0.00010,
      change24h: 0.85,
      payoutPercent: 92,
      isActive: true,
      precision: symbol.includes('JPY') ? 3 : symbol.includes('BTC') || symbol.includes('ETH') ? 2 : 5
    };

    const tfSecs = getTimeframeSeconds(tf);
    const timeStepMs = tfSecs * 1000;
    const now = Date.now();
    const currentBucket = Math.floor(now / timeStepMs) * timeStepMs;

    const forecast: Array<{
      index: number;
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      direction: 'UP' | 'DOWN';
      delta: number;
      confidence: number;
    }> = [];

    for (let i = 1; i <= count; i++) {
      const bucketTime = currentBucket + (i * timeStepMs);
      const candle = getDeterministicHistoricalCandle(market, bucketTime, tfSecs);
      const isUp = candle.close >= candle.open;
      forecast.push({
        index: i,
        time: bucketTime,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        direction: isUp ? 'UP' : 'DOWN',
        delta: Number((candle.close - candle.open).toFixed(market.precision || 5)),
        confidence: 97 + ((bucketTime % 30) / 10)
      });
    }

    return res.json({
      symbol,
      timeframe: tf,
      currentBucket,
      forecastCount: forecast.length,
      adminPredictorMode: otcControlConfig.adminPredictorMode,
      forecast,
      serverTime: now
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Background Authoritative Trade Settlement Sweeper
// Guarantees all expired OTC trades settle authoritatively according to 5S Loss mode
setInterval(() => {
  try {
    const allTrades = getStoredUserTradesServer();
    const now = Date.now();
    let hasChanges = false;
    const ADMIN_EMAILS = ['naymulh1000@gmail.com', 'admin@fxby24.com', 'admin@forextradepro.com'];

    allTrades.forEach(t => {
      if (!t || t.status !== 'OPEN') return;
      if (!t.expiryTimestamp || t.expiryTimestamp > now) return;

      const isAdminUser = Boolean(t.userEmail && ADMIN_EMAILS.includes(t.userEmail.toLowerCase().trim()));
      const amount = Number(t.amount || t.investment || 0);

      // If 5S Loss is enabled and not an admin account: Settle as LOST
      if (otcControlConfig.exposureControlEnabled && !isAdminUser) {
        t.status = 'LOST';
        t.outcome = 'LOST';
        t.pnl = -amount;
        t.returnPayout = 0;
        t.closeTimestamp = t.expiryTimestamp;
        t.closeTime = new Date(t.expiryTimestamp).toISOString();
        t.updatedAt = now;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      saveStoredUserTradesServer(allTrades);
    }
  } catch (_) {}
}, 2000);

// ─────────────────────────────────────────────────────────────
// VITE MIDDLEWARE & SERVER STARTUP
// ─────────────────────────────────────────────────────────────

async function startServer() {
  // Serve public static assets (favicons, robots.txt, manifest.json, logo images) with highest priority
  const publicPath = path.join(process.cwd(), 'public');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
  }

  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  // Only serve pre-built dist when explicitly run with NODE_ENV=production.
  // In dev mode (NODE_ENV !== 'production'), always mount Vite middleware so dynamic imports like ForexDashboard.tsx compile and serve on-demand.
  const isProduction = process.env.NODE_ENV === 'production' && hasDist;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Long-term immutable caching for bundled assets
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '1y',
      immutable: true
    }));
    app.use(express.static(distPath, {
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
