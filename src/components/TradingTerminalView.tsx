import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Globe,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Zap,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Layers,
  Crown,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Hand,
  Smartphone,
  BarChart2,
  ChevronRight,
  ChevronLeft,
  Wallet,
  Pencil,
  Square,
  Minus,
  Plus,
  Trash2,
  Palette,
  Slash,
  Move,
  Lock,
  Unlock,
  Compass,
  Eye,
  EyeOff,
  Copy,
  History,
  ListOrdered,
  FilePlus,
  Percent,
  ArrowLeft,
  RefreshCw,
  Trophy,
  XCircle,
  Gauge,
  Building2
} from 'lucide-react';
import { TradeHistoryList } from './TradeHistoryList';

// Code-split modals so terminal shell boots in milliseconds without waiting for heavy secondary assets
const LeaderboardModal = React.lazy(() => import('./LeaderboardModal').then(m => ({ default: m.LeaderboardModal })));
const AboutCompanyModal = React.lazy(() => import('./AboutCompanyModal').then(m => ({ default: m.AboutCompanyModal })));
const EditDemoBalanceModal = React.lazy(() => import('./EditDemoBalanceModal').then(m => ({ default: m.EditDemoBalanceModal })));
const LeverageModal = React.lazy(() => import('./LeverageModal').then(m => ({ default: m.LeverageModal })));
const TradeDetailModal = React.lazy(() => import('./TradeDetailModal').then(m => ({ default: m.TradeDetailModal })));
import { AccountType } from '../types';
import { getStoredMarkets, subscribeToMarketConfig, MarketPairConfig, getSyncedMarketPrice, getCandleBucketMetrics, getMarketContractUnits, CandlePredictionMetrics, setMarketLiveExposure } from '../lib/marketConfig';
import { customMarketEngine, TimeframeId } from '../lib/customMarketEngine';
import { realTimeLiveMarketService } from '../lib/realTimeLiveMarketService';
import { db } from '../lib/firebase';
import { collection, addDoc, setDoc, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { saveTradeToFirestore, saveTradesBatchToFirestore, saveUserBalancesToFirestore } from '../lib/firestoreSync';
import { resolveBinaryTrade, resolveForexTrade, registerSettledTradeIds, isTradeSettled } from '../lib/tradeSettlement';
import { calculateUserTodayProfit, syncUserToGlobalLeaderboard } from '../lib/leaderboardService';
import { 
  loadOrInitializeCandles, 
  loadOlderHistoricalCandles, 
  saveSingleCandleToFirestore, 
  saveCandlesToFirestore,
  mergeAndDeduplicateCandles,
  startGlobalMarketCandleSync,
  getTimeframeSeconds
} from '../lib/candleHistoryService';
import { onGoldPriceUpdate, onGoldLiveStatusChange, isGoldLiveAvailable } from '../lib/goldLiveDataService';
import { safeFormatTime, safeFormatTimeWithSeconds, safeFormatDate, safeFormatDateTime, safeGetTime } from '../lib/dateUtils';
import { calculateQuotexTiming, formatQuotexCountdown, QuotexTimingInfo } from '../lib/quotexBinaryLogic';

const formatCandleCountdown = (remSecs: number, tf: string): string => {
  if (remSecs <= 0) return '00:00';
  const tfSecs = getTimeframeSeconds(tf as any);
  
  if (tfSecs >= 3600) {
    const hrs = Math.floor(remSecs / 3600);
    const mins = Math.floor((remSecs % 3600) / 60);
    const secs = remSecs % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  } else {
    const mins = Math.floor(remSecs / 60);
    const secs = remSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
};

const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
};

export type DrawingType = 'long_position' | 'short_position' | 'trend_line' | 'horizontal_line' | 'ray' | 'rectangle';

export interface ChartDrawing {
  id: string;
  type: DrawingType;
  color: string;
  price: number;
  x1Pct: number;
  y1Pct: number;
  x2Pct: number;
  y2Pct: number;
  t1Time?: number;
  t2Time?: number;
  p1Price?: number;
  p2Price?: number;
  posTargetPrice?: number;
  posStopPrice?: number;
  isLocked?: boolean;
  isHidden?: boolean;
  fillOpacity?: number;
  strokeWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface ActiveTrade {
  id: string;
  userUid?: string;
  userEmail?: string;
  accountType: AccountType;
  tradingMode?: 'forex' | 'otc';
  category?: 'forex' | 'crypto' | 'binary';
  symbol: string;
  pair?: string;
  type: 'BUY' | 'SELL' | 'UP' | 'DOWN';
  lotSize?: number; // Forex lot size e.g. 0.01, 0.05, 0.10, 1.00
  leverage?: number; // Forex leverage e.g. 100, 200, 500
  amount: number; // Required Margin or Investment Amount
  entryPrice: number;
  currentPrice: number;
  exitPrice?: number;
  closePrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  payoutPercent?: number; // For OTC e.g. 92%
  expirySeconds?: number;
  remainingSeconds?: number;
  openTimestamp?: number;
  expiryTimestamp?: number;
  pnl: number;
  timestamp: string;
  openTime?: string;
  closeTime?: string;
  status: 'OPEN' | 'WON' | 'LOST' | 'CLOSED' | 'DRAW';
}

export interface PendingOrder {
  id: string;
  userUid?: string;
  userEmail?: string;
  accountType: AccountType;
  tradingMode?: 'forex';
  symbol: string;
  type?: 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  orderType: 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  lotSize: number;
  leverage?: number;
  amount?: number;
  targetPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp?: string;
  createdAt?: string;
  status?: 'PENDING' | 'TRIGGERED' | 'CANCELLED';
}

interface TradingTerminalViewProps {
  activeAccount: AccountType;
  setActiveAccount: (acc: AccountType) => void;
  balances: { live: number; bonus: number; demo: number };
  setBalances: React.Dispatch<React.SetStateAction<{ live: number; bonus: number; demo: number }>>;
  userEmail?: string;
  userUid?: string;
  userDisplayName?: string;
  userAvatar?: string;
  onTradeExecuted?: (trade: ActiveTrade) => void;
  activeTrades?: ActiveTrade[];
  setActiveTrades?: React.Dispatch<React.SetStateAction<ActiveTrade[]>>;
  closedTrades?: ActiveTrade[];
  setClosedTrades?: React.Dispatch<React.SetStateAction<ActiveTrade[]>>;
  initialTradingMode?: 'forex' | 'otc';
  initialMarketId?: string;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  onBack?: () => void;
}

interface Candlestick {
  time: number;
  timestamp?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const ACTIVE_TRADES_STORAGE_KEY = 'forex_pro_active_trades';
const CLOSED_TRADES_STORAGE_KEY = 'forex_pro_closed_trades';
const PENDING_ORDERS_STORAGE_KEY = 'forex_pro_pending_orders';

const formatCountdown = (seconds: number = 0) => {
  if (seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
  return `${secs}s`;
};

export const TradingTerminalView: React.FC<TradingTerminalViewProps> = ({
  activeAccount,
  setActiveAccount,
  balances,
  setBalances,
  userEmail,
  userUid,
  userDisplayName,
  userAvatar,
  onTradeExecuted,
  activeTrades: externalActiveTrades,
  setActiveTrades: externalSetActiveTrades,
  closedTrades: externalClosedTrades,
  setClosedTrades: externalSetClosedTrades,
  initialTradingMode,
  initialMarketId,
  isSuperAdmin,
  isAdmin,
  onBack
}) => {
  // 1. Markets & Selection State
  const [markets, setMarkets] = useState<MarketPairConfig[]>(getStoredMarkets());
  const [tradingMode, setTradingMode] = useState<'forex' | 'otc'>(() => {
    if (initialTradingMode) return initialTradingMode;
    try {
      const saved = localStorage.getItem('forex_pro_selected_trading_mode');
      if (saved === 'forex' || saved === 'otc') return saved;
    } catch (_) {}
    return 'forex';
  });
  const [showModeSelectionModal, setShowModeSelectionModal] = useState<boolean>(!initialTradingMode && !localStorage.getItem('forex_pro_selected_trading_mode'));
  const [selectedMarketId, setSelectedMarketId] = useState<string>(() => {
    if (initialMarketId) return initialMarketId;
    try {
      const saved = localStorage.getItem('forex_pro_selected_market_id');
      if (saved) return saved;
    } catch (_) {}
    return 'gbp_usd';
  });

  // Save selected market and trading mode to localStorage whenever changed
  useEffect(() => {
    if (selectedMarketId) {
      try {
        localStorage.setItem('forex_pro_selected_market_id', selectedMarketId);
      } catch (_) {}
    }
  }, [selectedMarketId]);

  useEffect(() => {
    if (tradingMode) {
      try {
        localStorage.setItem('forex_pro_selected_trading_mode', tradingMode);
      } catch (_) {}
    }
  }, [tradingMode]);

  // Dynamically sync trading mode whenever initialTradingMode changes (e.g. Dashboard navigation)
  useEffect(() => {
    if (initialTradingMode) {
      setTradingMode(initialTradingMode);
      setShowModeSelectionModal(false);
    }
  }, [initialTradingMode]);

  useEffect(() => {
    if (initialMarketId) {
      setSelectedMarketId(initialMarketId);
    }
  }, [initialMarketId]);

  const [isMarketModalOpen, setIsMarketModalOpen] = useState<boolean>(false);
  const [marketSearchQuery, setMarketSearchQuery] = useState<string>('');

  // 2. Chart Settings State
  const [timeframe, setTimeframe] = useState<'S1' | 'S5' | 'S15' | 'S30' | 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1'>('M1');
  const [candles, setCandles] = useState<Candlestick[]>([]);
  const [currentTickPrice, setCurrentTickPrice] = useState<number>(1.29410);
  const currentTickPriceRef = useRef<number>(currentTickPrice);

  useEffect(() => {
    currentTickPriceRef.current = currentTickPrice;
  }, [currentTickPrice]);
  const [priceChangeDirection, setPriceChangeDirection] = useState<'up' | 'down' | 'neutral'>('neutral');
  const [candleCountdown, setCandleCountdown] = useState<number>(60);
  const [historicalOffset, setHistoricalOffset] = useState<number>(0);
  const [editingSlTpTrade, setEditingSlTpTrade] = useState<ActiveTrade | null>(null);
  const [editSlValue, setEditSlValue] = useState<string>('');
  const [editTpValue, setEditTpValue] = useState<string>('');

  // 3. Trade Input Form State
  // Forex Inputs: Persistent Lot Size across refreshes
  const [forexLotSize, setForexLotSize] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('forex_pro_saved_lot_size');
      if (saved && !isNaN(parseFloat(saved)) && parseFloat(saved) > 0) return saved;
    } catch (_) {}
    return '0.01';
  });

  useEffect(() => {
    if (forexLotSize && !isNaN(parseFloat(forexLotSize))) {
      try {
        localStorage.setItem('forex_pro_saved_lot_size', forexLotSize);
      } catch (_) {}
    }
  }, [forexLotSize]);
  const [forexLeverage, setForexLeverage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('forex_trade_leverage');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([100, 200, 500, 1000, 2000].includes(parsed)) return parsed;
      }
    } catch {}
    return 100;
  });
  const [isLeverageModalOpen, setIsLeverageModalOpen] = useState<boolean>(false);

  const handleSelectLeverage = (newLeverage: number) => {
    setForexLeverage(newLeverage);
    try {
      localStorage.setItem('forex_trade_leverage', String(newLeverage));
      localStorage.setItem(`forex_trade_leverage_${activeAccount}`, String(newLeverage));
    } catch {}
    if (userUid && db) {
      setDoc(doc(db, 'users', userUid), { leverage: newLeverage, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
    }
    showNotification(`Leverage updated to 1:${newLeverage}. Margins recalculated!`, 'success');
  };
  const [enableSlTp, setEnableSlTp] = useState<boolean>(false);
  const [showSlTpSection, setShowSlTpSection] = useState<boolean>(false);
  const [stopLossInput, setStopLossInput] = useState<string>('');
  const [takeProfitInput, setTakeProfitInput] = useState<string>('');

  // Dropdown UI visibility states
  const [showAccountDropdown, setShowAccountDropdown] = useState<boolean>(false);
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState<boolean>(false);
  const [showLotDropdown, setShowLotDropdown] = useState<boolean>(false);
  const [showDemoBalanceModal, setShowDemoBalanceModal] = useState<boolean>(false);

  const handleSaveDemoBalance = (newBalance: number) => {
    const fixedVal = Number(newBalance.toFixed(2));
    setBalances(prev => {
      const updated = {
        ...prev,
        demo: fixedVal
      };
      if (userUid) {
        saveUserBalancesToFirestore(userUid, updated, userEmail, true);
        try {
          localStorage.setItem(`forex_pro_user_balances_${userUid}`, JSON.stringify(updated));
          localStorage.setItem(`forex_pro_demo_balance_${userUid}`, String(fixedVal));
          localStorage.setItem(`forex_pro_demo_custom_set_${userUid}`, 'true');
        } catch (_) {}
      }
      try {
        localStorage.setItem('forex_pro_user_balances', JSON.stringify(updated));
        localStorage.setItem('forex_pro_demo_balance', String(fixedVal));
      } catch (_) {}
      return updated;
    });
    showNotification(`Demo Balance updated to $${fixedVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`, 'success');
  };

  // Pending Orders Modal State
  const [showPendingOrderModal, setShowPendingOrderModal] = useState<boolean>(false);
  const [pendingOrderType, setPendingOrderType] = useState<'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP'>('BUY_LIMIT');
  const [pendingOrderTargetPrice, setPendingOrderTargetPrice] = useState<string>('');
  const [pendingOrderLotSize, setPendingOrderLotSize] = useState<string>('0.01');
  const [pendingOrderStopLoss, setPendingOrderStopLoss] = useState<string>('');
  const [pendingOrderTakeProfit, setPendingOrderTakeProfit] = useState<string>('');
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>(() => {
    try {
      const stored = localStorage.getItem(PENDING_ORDERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PENDING_ORDERS_STORAGE_KEY, JSON.stringify(pendingOrders));
    } catch (_) {}
  }, [pendingOrders]);

  // Binary OTC Inputs - Persistent Investment Amount & Expiry Duration
  const [otcInvestment, setOtcInvestment] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('forex_pro_saved_otc_investment');
      if (saved && !isNaN(parseFloat(saved)) && parseFloat(saved) > 0) return saved;
    } catch (_) {}
    return '50';
  });
  const [otcExpiryDuration, setOtcExpiryDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('forex_pro_saved_otc_expiry');
      if (saved && !isNaN(parseInt(saved, 10)) && parseInt(saved, 10) > 0) return parseInt(saved, 10);
    } catch (_) {}
    return 60;
  });

  useEffect(() => {
    if (otcInvestment && !isNaN(parseFloat(otcInvestment))) {
      try {
        localStorage.setItem('forex_pro_saved_otc_investment', otcInvestment);
      } catch (_) {}
    }
  }, [otcInvestment]);

  useEffect(() => {
    if (otcExpiryDuration) {
      try {
        localStorage.setItem('forex_pro_saved_otc_expiry', String(otcExpiryDuration));
      } catch (_) {}
    }
  }, [otcExpiryDuration]);

  // 4. Positions & Persistence State
  const [positionsFilter, setPositionsFilter] = useState<'all' | 'forex' | 'otc'>('forex');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'forex' | 'otc'>('forex');

  const [internalActiveTrades, setInternalActiveTrades] = useState<ActiveTrade[]>(() => {
    if (!userUid) return [];
    try {
      const stored = localStorage.getItem(`${ACTIVE_TRADES_STORAGE_KEY}_${userUid}`);
      if (stored) {
        const parsed: ActiveTrade[] = JSON.parse(stored);
        return parsed.filter(t => t.userUid === userUid && t.status === 'OPEN');
      }
    } catch (_) {}
    return [];
  });

  const [internalClosedTrades, setInternalClosedTrades] = useState<ActiveTrade[]>(() => {
    if (!userUid) return [];
    try {
      const stored = localStorage.getItem(`${CLOSED_TRADES_STORAGE_KEY}_${userUid}`);
      if (stored) {
        const parsed: ActiveTrade[] = JSON.parse(stored);
        return parsed.filter(t => t.userUid === userUid && t.status !== 'OPEN');
      }
    } catch (_) {}
    return [];
  });

  // Re-sync internal trade states when userUid changes
  useEffect(() => {
    if (externalActiveTrades !== undefined) return;
    if (!userUid) {
      setInternalActiveTrades([]);
      setInternalClosedTrades([]);
      return;
    }
    try {
      const storedActive = localStorage.getItem(`${ACTIVE_TRADES_STORAGE_KEY}_${userUid}`);
      if (storedActive) {
        const parsed: ActiveTrade[] = JSON.parse(storedActive);
        setInternalActiveTrades(parsed.filter(t => t.userUid === userUid && t.status === 'OPEN'));
      } else {
        setInternalActiveTrades([]);
      }

      const storedClosed = localStorage.getItem(`${CLOSED_TRADES_STORAGE_KEY}_${userUid}`);
      if (storedClosed) {
        const parsed: ActiveTrade[] = JSON.parse(storedClosed);
        setInternalClosedTrades(parsed.filter(t => t.userUid === userUid && t.status !== 'OPEN'));
      } else {
        setInternalClosedTrades([]);
      }
    } catch (_) {
      setInternalActiveTrades([]);
      setInternalClosedTrades([]);
    }
  }, [userUid, externalActiveTrades]);

  const activeTrades = externalActiveTrades !== undefined ? externalActiveTrades : internalActiveTrades;
  const setActiveTrades = externalSetActiveTrades !== undefined ? externalSetActiveTrades : setInternalActiveTrades;

  const closedTrades = externalClosedTrades !== undefined ? externalClosedTrades : internalClosedTrades;
  const setClosedTrades = externalSetClosedTrades !== undefined ? externalSetClosedTrades : setInternalClosedTrades;

  // Real-time synchronous balance ref for rapid execution and multi-trade batch settlements
  const balancesRef = useRef(balances);
  useEffect(() => {
    // Only update ref if balances state actually changed externally (not during fast local deductions)
    if (balances) {
      balancesRef.current = {
        live: balances.live ?? balancesRef.current.live ?? 0,
        bonus: balances.bonus ?? balancesRef.current.bonus ?? 0,
        demo: balances.demo ?? balancesRef.current.demo ?? 0
      };
    }
  }, [balances]);

  const tradeCounterRef = useRef<number>(0);

  // Save internal active & closed trades to localStorage when updated
  useEffect(() => {
    if (externalActiveTrades !== undefined || !userUid) return;
    try {
      localStorage.setItem(`${ACTIVE_TRADES_STORAGE_KEY}_${userUid}`, JSON.stringify(internalActiveTrades));
    } catch (_) {}
  }, [internalActiveTrades, userUid, externalActiveTrades]);

  useEffect(() => {
    if (externalClosedTrades !== undefined || !userUid) return;
    try {
      localStorage.setItem(`${CLOSED_TRADES_STORAGE_KEY}_${userUid}`, JSON.stringify(internalClosedTrades));
    } catch (_) {}
  }, [internalClosedTrades, userUid, externalClosedTrades]);

  // Helper to compute total live floating Forex PnL for an account
  const getAccountFloatingPnl = useCallback((acc: AccountType) => {
    return activeTrades
      .filter(t => (t.accountType === acc || (!t.accountType && acc === 'live')) && t.status === 'OPEN' && (t.tradingMode === 'forex' || t.category === 'forex' || !t.tradingMode))
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
  }, [activeTrades]);

  // Fetch past user trades from Firestore backup on load (only if activeTrades state is not managed externally)
  useEffect(() => {
    if (externalActiveTrades !== undefined) return;
    const fetchFirestoreTrades = async () => {
      if (!userEmail && !userUid) return;
      try {
        const q = userUid
          ? query(collection(db, 'trades'), where('userUid', '==', userUid))
          : query(collection(db, 'trades'), where('userEmail', '==', userEmail!));

        const querySnapshot = await getDocs(q);
        const loadedClosed: ActiveTrade[] = [];
        const loadedActive: ActiveTrade[] = [];

        querySnapshot.forEach(docSnap => {
          const d = docSnap.data();
          const tradeObj: ActiveTrade = {
            id: d.id || docSnap.id,
            userUid: d.userUid,
            userEmail: d.userEmail,
            accountType: d.accountType || 'live',
            tradingMode: d.tradingMode || 'forex',
            category: d.category || (d.tradingMode === 'otc' ? 'binary' : 'forex'),
            symbol: d.symbol || 'EUR/USD',
            type: d.type || 'BUY',
            lotSize: d.lotSize || 0.01,
            leverage: d.leverage || 100,
            amount: d.amount || 10,
            entryPrice: d.entryPrice || 0,
            currentPrice: d.closePrice || d.currentPrice || d.entryPrice || 0,
            exitPrice: d.closePrice || d.exitPrice,
            payoutPercent: d.payoutPercent,
            expirySeconds: d.expirySeconds,
            pnl: d.pnl || 0,
            timestamp: safeFormatTimeWithSeconds(d.createdAt, 'Today'),
            status: d.status || 'CLOSED'
          };

          if (d.status === 'OPEN') {
            loadedActive.push(tradeObj);
          } else {
            loadedClosed.push(tradeObj);
          }
        });

        if (loadedClosed.length > 0) {
          registerSettledTradeIds(loadedClosed.map(c => c.id));
          setClosedTrades(prev => {
            const combined = [...prev, ...loadedClosed];
            const seen = new Set<string>();
            return combined.filter(t => {
              if (!t.id || seen.has(t.id)) return false;
              seen.add(t.id);
              return true;
            });
          });
        }
        if (loadedActive.length > 0) {
          setActiveTrades(prev => {
            const closedIds = new Set(loadedClosed.map(c => c.id));
            const combined = [...prev, ...loadedActive.filter(a => !closedIds.has(a.id) && !isTradeSettled(a.id))];
            const seen = new Set<string>();
            return combined.filter(t => {
              if (!t.id || seen.has(t.id) || closedIds.has(t.id) || isTradeSettled(t.id)) return false;
              seen.add(t.id);
              return true;
            });
          });
        }
      } catch (err) {
        console.warn('Firebase trades load note:', err);
      }
    };

    // Cross-device continuous polling from persistent central backend
    const syncFromCentralStore = async () => {
      if (!userUid) return;
      try {
        const res = await fetch(`/api/users/trades/${encodeURIComponent(userUid)}?email=${encodeURIComponent(userEmail || '')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.closed && Array.isArray(data.closed) && data.closed.length > 0) {
              registerSettledTradeIds(data.closed.map((c: any) => c.id));
              setClosedTrades(prev => {
                const combined = [...data.closed, ...prev];
                const seen = new Set<string>();
                return combined.filter(t => {
                  if (!t.id || seen.has(t.id)) return false;
                  seen.add(t.id);
                  return true;
                });
              });
            }
            if (data.active && Array.isArray(data.active)) {
              setActiveTrades(prev => {
                const currentIds = new Set(prev.map(t => t.id));
                const missing = data.active.filter((t: any) => 
                  !currentIds.has(t.id) && 
                  t.status === 'OPEN' && 
                  !isTradeSettled(t.id)
                );
                if (missing.length === 0) return prev;
                return [...missing, ...prev];
              });
            }
          }
        }
      } catch (_) {}
    };

    fetchFirestoreTrades();
    syncFromCentralStore();
    const intervalTimer = setInterval(syncFromCentralStore, 3000);

    return () => clearInterval(intervalTimer);
  }, [userEmail, userUid, externalActiveTrades]);

  const [activeTab, setActiveTab] = useState<'positions' | 'pending' | 'history'>('positions');
  const [tradeNotification, setTradeNotification] = useState<{ msg: string; type: 'success' | 'danger' } | null>(null);
  const [terminalToasts, setTerminalToasts] = useState<{ id: string; msg: string; type: 'success' | 'danger'; timestamp: number }[]>([]);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isAboutCompanyOpen, setIsAboutCompanyOpen] = useState<boolean>(false);

  // Canvas Gesture & Fullscreen States
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [priceZoomLevel, setPriceZoomLevel] = useState<number>(1.0);
  const [isDraggingPriceScale, setIsDraggingPriceScale] = useState<boolean>(false);
  const [dragStartPriceScale, setDragStartPriceScale] = useState<{ y: number; initialZoom: number }>({ y: 0, initialZoom: 1.0 });
  const [isHoveringPriceScale, setIsHoveringPriceScale] = useState<boolean>(false);

  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showFullscreenAccountMenu, setShowFullscreenAccountMenu] = useState<boolean>(false);
  const [showFullscreenTimeframeMenu, setShowFullscreenTimeframeMenu] = useState<boolean>(false);
  const [showFullscreenTradesModal, setShowFullscreenTradesModal] = useState<boolean>(false);
  const [fullscreenTradesTab, setFullscreenTradesTab] = useState<'positions' | 'history'>('positions');
  const [fullscreenTradesMode, setFullscreenTradesMode] = useState<'forex' | 'otc'>('forex');
  const [selectedHistoryDetailTrade, setSelectedHistoryDetailTrade] = useState<ActiveTrade | null>(null);
  const [tradeYMap, setTradeYMap] = useState<Record<string, number>>({});
  const tradeYMapRef = useRef<Record<string, number>>({});

  const pinchDistRef = useRef<number | null>(null);
  const isSubmittingTradeRef = useRef<boolean>(false);

  // Dynamic Chart Bounds Ref for Dynamic Price & Time-to-Pixel Anchoring
  const chartBoundsRef = useRef<{
    minPrice: number;
    maxPrice: number;
    chartWidth: number;
    chartHeight: number;
    totalWidth: number;
    totalHeight: number;
    rightMarginOffset: number;
    zoomLevel: number;
    priceZoomLevel: number;
    panOffsetX: number;
    panOffsetY: number;
    candlesList: Candlestick[];
  }>({
    minPrice: 1,
    maxPrice: 2,
    chartWidth: 600,
    chartHeight: 300,
    totalWidth: 665,
    totalHeight: 325,
    rightMarginOffset: 150,
    zoomLevel: 1,
    priceZoomLevel: 1,
    panOffsetX: 0,
    panOffsetY: 0,
    candlesList: []
  });

  // Dynamically compute active chart bounds with fallback to candle data
  const getActiveChartBounds = () => {
    let { minPrice, maxPrice, chartWidth, chartHeight, totalWidth, totalHeight, rightMarginOffset } = chartBoundsRef.current;
    
    if (candles && candles.length > 0) {
      const candleWidth = Math.max(2, Math.floor(14 * zoomLevel));
      const candleGap = Math.max(1, Math.floor(4 * zoomLevel));
      const totalItemWidth = candleWidth + candleGap;
      const w = chartWidth || 600;
      const rOffset = rightMarginOffset || Math.max(100, Math.min(260, Math.floor(w * 0.26)));
      const buffer = Math.max(120, Math.floor(w * 0.25));
      
      const visibleCandles = candles.filter((_, idx) => {
        const x = (w - rOffset) - (candles.length - 1 - idx) * totalItemWidth + panOffset.x;
        return x + candleWidth >= -buffer && x <= w + buffer;
      });
      const candlesToScale = visibleCandles.length > 0 ? visibleCandles : candles;
      let cMin = Math.min(...candlesToScale.map(c => c.low));
      let cMax = Math.max(...candlesToScale.map(c => c.high));
      if (!isFinite(cMin) || !isFinite(cMax) || cMin <= 0 || cMax <= cMin) {
        cMin = (currentTickPrice || activeMarket.basePrice || 1.085) * 0.995;
        cMax = (currentTickPrice || activeMarket.basePrice || 1.085) * 1.005;
      }
      const padding = (cMax - cMin) * 0.15 || (activeMarket.basePrice * 0.002);
      minPrice = cMin - padding;
      maxPrice = cMax + padding;
    } else {
      const base = currentTickPrice || activeMarket.basePrice || 1.08500;
      minPrice = base * 0.995;
      maxPrice = base * 1.005;
    }
    
    return {
      minPrice,
      maxPrice,
      chartWidth: chartWidth || 600,
      chartHeight: chartHeight || 300,
      totalWidth: totalWidth || 665,
      totalHeight: totalHeight || 325,
      rightMarginOffset: rightMarginOffset || 150,
      candlesList: candles
    };
  };

  // Dynamic Price to Overlay Y Percentage Conversion
  const priceToYOverlay = (priceVal?: number): number | null => {
    if (priceVal === undefined || priceVal === null || isNaN(priceVal)) return null;
    const { minPrice, maxPrice, chartHeight, totalHeight } = getActiveChartBounds();
    const h = chartHeight || 300;
    const totH = totalHeight || (h + 25);
    if (!minPrice || !maxPrice || maxPrice <= minPrice) return null;
    const baseScaleY = h - ((priceVal - minPrice) / (maxPrice - minPrice)) * (h - 30);
    const centerY = h / 2;
    const effectiveYZoom = zoomLevel * priceZoomLevel;
    const yPx = (baseScaleY - centerY) * effectiveYZoom + centerY + panOffset.y;
    return (yPx / totH) * 100;
  };

  // Overlay Y Percentage to Price Conversion
  const yToPriceOverlay = (yPct: number): number => {
    const { minPrice, maxPrice, chartHeight, totalHeight } = getActiveChartBounds();
    const h = chartHeight || 300;
    const totH = totalHeight || (h + 25);
    if (!minPrice || !maxPrice || maxPrice <= minPrice) return currentTickPrice || 1.08500;
    const yPx = (yPct / 100) * totH;
    const centerY = h / 2;
    const effectiveYZoom = zoomLevel * priceZoomLevel;
    const baseScaleY = (yPx - panOffset.y - centerY) / effectiveYZoom + centerY;
    const priceVal = minPrice + ((h - baseScaleY) / (h - 30)) * (maxPrice - minPrice);
    return Number(priceVal.toFixed(activeMarket.precision || 5));
  };

  // Dynamic Time to Overlay X Percentage Conversion
  const timeToXOverlay = (timeVal?: number): number | null => {
    if (timeVal === undefined || timeVal === null || isNaN(timeVal)) return null;
    const { chartWidth, totalWidth, rightMarginOffset, candlesList } = getActiveChartBounds();
    const w = chartWidth || 600;
    const totW = totalWidth || (w + 65);
    const rOffset = rightMarginOffset || Math.max(100, Math.min(260, Math.floor(w * 0.26)));
    if (!candlesList || candlesList.length === 0) return null;

    const candleWidth = Math.max(2, Math.floor(14 * zoomLevel));
    const candleGap = Math.max(1, Math.floor(4 * zoomLevel));
    const totalItemWidth = candleWidth + candleGap;

    const lastCandle = candlesList[candlesList.length - 1];
    const firstCandle = candlesList[0];

    let timeStep = 60000;
    if (candlesList.length > 1) {
      timeStep = (lastCandle.time - firstCandle.time) / (candlesList.length - 1);
    }
    if (timeStep <= 0) timeStep = 60000;

    const idxFloat = (candlesList.length - 1) + (timeVal - lastCandle.time) / timeStep;
    const xPx = (w - rOffset) - (candlesList.length - 1 - idxFloat) * totalItemWidth + panOffset.x + candleWidth / 2;

    return (xPx / totW) * 100;
  };

  // Overlay X Percentage to Time Conversion
  const xToTimeOverlay = (xPct: number): number => {
    const { chartWidth, totalWidth, rightMarginOffset, candlesList } = getActiveChartBounds();
    const w = chartWidth || 600;
    const totW = totalWidth || (w + 65);
    const rOffset = rightMarginOffset || Math.max(100, Math.min(260, Math.floor(w * 0.26)));
    if (!candlesList || candlesList.length === 0) return Date.now();

    const candleWidth = Math.max(2, Math.floor(14 * zoomLevel));
    const candleGap = Math.max(1, Math.floor(4 * zoomLevel));
    const totalItemWidth = candleWidth + candleGap;

    const xPx = (xPct / 100) * totW;
    const lastCandle = candlesList[candlesList.length - 1];
    const firstCandle = candlesList[0];

    let timeStep = 60000;
    if (candlesList.length > 1) {
      timeStep = (lastCandle.time - firstCandle.time) / (candlesList.length - 1);
    }
    if (timeStep <= 0) timeStep = 60000;

    const idxFloat = (candlesList.length - 1) - (((w - rOffset) + panOffset.x + candleWidth / 2 - xPx) / totalItemWidth);
    const timeVal = lastCandle.time + (idxFloat - (candlesList.length - 1)) * timeStep;

    return Math.round(timeVal);
  };

  // Drawing Tools States
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [showDrawingToolsMenu, setShowDrawingToolsMenu] = useState<boolean>(false);
  const [activeHandleDrag, setActiveHandleDrag] = useState<{
    drawingId: string;
    handle: string;
    startX: number;
    startY: number;
    initial: ChartDrawing;
  } | null>(null);

  const addDrawing = (type: DrawingType) => {
    const newId = `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const tick = currentTickPrice || activeMarket.basePrice || 1.08500;
    const precision = activeMarket.precision || 5;
    const now = Date.now();
    
    // Get visible chart scale to spawn objects in a perfect, compact, smooth initial proportion
    const bounds = getActiveChartBounds();
    const visiblePriceRange = (bounds.maxPrice && bounds.minPrice && bounds.maxPrice > bounds.minPrice)
      ? (bounds.maxPrice - bounds.minPrice)
      : Math.max(0.0001, tick * 0.004);

    let candleDurationMs = 60000;
    if (candles && candles.length > 1) {
      candleDurationMs = Math.max(1000, (candles[candles.length - 1].time - candles[0].time) / (candles.length - 1));
    }
    
    let newDrawing: ChartDrawing;
    
    if (type === 'horizontal_line') {
      newDrawing = {
        id: newId,
        type,
        color: '#F5B301',
        price: Number(tick.toFixed(precision)),
        p1Price: Number(tick.toFixed(precision)),
        p2Price: Number(tick.toFixed(precision)),
        x1Pct: 0,
        y1Pct: priceToYOverlay(tick) ?? 50,
        x2Pct: 100,
        y2Pct: priceToYOverlay(tick) ?? 50,
        strokeWidth: 2,
      };
    } else if (type === 'trend_line') {
      const pOffset = Math.max(0.00002, visiblePriceRange * 0.06);
      const p1 = Number((tick + pOffset).toFixed(precision));
      const p2 = Number((tick - pOffset).toFixed(precision));
      const t1 = now - (candleDurationMs * 4);
      const t2 = now + (candleDurationMs * 4);
      newDrawing = {
        id: newId,
        type,
        color: '#38BDF8',
        price: tick,
        p1Price: p1,
        p2Price: p2,
        t1Time: t1,
        t2Time: t2,
        x1Pct: timeToXOverlay(t1) ?? 35,
        y1Pct: priceToYOverlay(p1) ?? 42,
        x2Pct: timeToXOverlay(t2) ?? 65,
        y2Pct: priceToYOverlay(p2) ?? 58,
        strokeWidth: 2,
      };
    } else if (type === 'ray') {
      const pOffset = Math.max(0.00002, visiblePriceRange * 0.05);
      const p1 = Number((tick + pOffset).toFixed(precision));
      const p2 = Number((tick - pOffset).toFixed(precision));
      const t1 = now - (candleDurationMs * 4);
      const t2 = now + (candleDurationMs * 3);
      newDrawing = {
        id: newId,
        type,
        color: '#EAB308',
        price: tick,
        p1Price: p1,
        p2Price: p2,
        t1Time: t1,
        t2Time: t2,
        x1Pct: timeToXOverlay(t1) ?? 38,
        y1Pct: priceToYOverlay(p1) ?? 44,
        x2Pct: timeToXOverlay(t2) ?? 58,
        y2Pct: priceToYOverlay(p2) ?? 56,
        strokeWidth: 2,
      };
    } else if (type === 'rectangle') {
      // Compact, elegant box (~8% of visible vertical price range, 6-8 candles wide)
      const halfHeight = Math.max(0.00002, visiblePriceRange * 0.05);
      const p1 = Number((tick + halfHeight).toFixed(precision));
      const p2 = Number((tick - halfHeight).toFixed(precision));
      const t1 = now - (candleDurationMs * 3);
      const t2 = now + (candleDurationMs * 4);
      newDrawing = {
        id: newId,
        type,
        color: '#A855F7',
        price: tick,
        p1Price: p1,
        p2Price: p2,
        t1Time: t1,
        t2Time: t2,
        x1Pct: timeToXOverlay(t1) ?? 35,
        y1Pct: priceToYOverlay(p1) ?? 40,
        x2Pct: timeToXOverlay(t2) ?? 65,
        y2Pct: priceToYOverlay(p2) ?? 60,
        fillOpacity: 0.18,
        strokeWidth: 2,
      };
    } else if (type === 'long_position') {
      // Compact Long Position: risk box ~4% of range, target ~6% of range (1:1.5 RR ratio)
      const posRisk = Math.max(0.00002, visiblePriceRange * 0.04);
      const targetP = Number((tick + (posRisk * 1.5)).toFixed(precision));
      const stopP = Number((tick - posRisk).toFixed(precision));
      const t1 = now - (candleDurationMs * 2);
      const t2 = now + (candleDurationMs * 5);
      newDrawing = {
        id: newId,
        type,
        color: '#10B981',
        price: Number(tick.toFixed(precision)),
        p1Price: targetP,
        p2Price: stopP,
        t1Time: t1,
        t2Time: t2,
        posTargetPrice: targetP,
        posStopPrice: stopP,
        x1Pct: timeToXOverlay(t1) ?? 38,
        y1Pct: priceToYOverlay(targetP) ?? 38,
        x2Pct: timeToXOverlay(t2) ?? 62,
        y2Pct: priceToYOverlay(stopP) ?? 62,
        fillOpacity: 0.22,
        strokeWidth: 2,
      };
    } else {
      // Compact Short Position: risk box ~4% of range, target ~6% of range
      const posRisk = Math.max(0.00002, visiblePriceRange * 0.04);
      const stopP = Number((tick + posRisk).toFixed(precision));
      const targetP = Number((tick - (posRisk * 1.5)).toFixed(precision));
      const t1 = now - (candleDurationMs * 2);
      const t2 = now + (candleDurationMs * 5);
      newDrawing = {
        id: newId,
        type,
        color: '#EF4444',
        price: Number(tick.toFixed(precision)),
        p1Price: stopP,
        p2Price: targetP,
        t1Time: t1,
        t2Time: t2,
        posTargetPrice: targetP,
        posStopPrice: stopP,
        x1Pct: timeToXOverlay(t1) ?? 38,
        y1Pct: priceToYOverlay(stopP) ?? 38,
        x2Pct: timeToXOverlay(t2) ?? 62,
        y2Pct: priceToYOverlay(targetP) ?? 62,
        fillOpacity: 0.22,
        strokeWidth: 2,
      };
    }

    setDrawings(prev => [...prev, newDrawing]);
    setSelectedDrawingId(newId);
    setShowDrawingToolsMenu(false);
  };

  const duplicateDrawing = (id: string) => {
    const source = drawings.find(d => d.id === id);
    if (!source) return;
    const newId = `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const cloned: ChartDrawing = {
      ...source,
      id: newId,
      x1Pct: Math.min(92, source.x1Pct + 3),
      x2Pct: Math.min(95, source.x2Pct + 3),
      y1Pct: Math.min(92, source.y1Pct + 3),
      y2Pct: Math.min(95, source.y2Pct + 3),
      isLocked: false,
    };
    setDrawings(prev => [...prev, cloned]);
    setSelectedDrawingId(newId);
  };

  const toggleLockDrawing = (id: string) => {
    setDrawings(prev => prev.map(d => d.id === id ? { ...d, isLocked: !d.isLocked } : d));
  };

  const toggleHideDrawing = (id: string) => {
    setDrawings(prev => prev.map(d => d.id === id ? { ...d, isHidden: !d.isHidden } : d));
  };

  const handleDrawingPointerDown = (
    e: React.PointerEvent,
    drawingId: string,
    handle: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedDrawingId(drawingId);

    const drawing = drawings.find(d => d.id === drawingId);
    if (!drawing) return;

    setActiveHandleDrag({
      drawingId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initial: { ...drawing }
    });
  };

  const getDrawingX1Pct = (d: ChartDrawing): number => {
    if (d.t1Time !== undefined) {
      const x = timeToXOverlay(d.t1Time);
      if (x !== null) return x;
    }
    return d.x1Pct;
  };

  const getDrawingX2Pct = (d: ChartDrawing): number => {
    if (d.t2Time !== undefined) {
      const x = timeToXOverlay(d.t2Time);
      if (x !== null) return x;
    }
    return d.x2Pct;
  };

  useEffect(() => {
    if (!activeHandleDrag) return;

    let animFrameId: number;

    const handlePointerMove = (e: PointerEvent) => {
      cancelAnimationFrame(animFrameId);

      animFrameId = requestAnimationFrame(() => {
        const bounds = getActiveChartBounds();
        const width = bounds.totalWidth || 665;
        const height = bounds.totalHeight || 325;
        const precision = activeMarket.precision || 5;

        const dxPct = ((e.clientX - activeHandleDrag.startX) / width) * 100;
        const dyPct = ((e.clientY - activeHandleDrag.startY) / height) * 100;

        const h = bounds.chartHeight || 300;
        const dyPx = (dyPct / 100) * height;
        const priceRange = Math.max(0.00001, bounds.maxPrice - bounds.minPrice);
        const effectiveYZoom = zoomLevel * priceZoomLevel;
        const deltaPrice = - (dyPx / (Math.max(0.1, effectiveYZoom) * Math.max(10, h - 30))) * priceRange;

        const candleWidth = Math.max(2, Math.floor(14 * zoomLevel));
        const candleGap = Math.max(1, Math.floor(4 * zoomLevel));
        const totalItemWidth = candleWidth + candleGap;
        const dxPx = (dxPct / 100) * width;
        let timeStep = 60000;
        if (candles && candles.length > 1) {
          timeStep = (candles[candles.length - 1].time - candles[0].time) / (candles.length - 1);
        }
        if (timeStep <= 0) timeStep = 60000;
        const deltaTime = Math.round((dxPx / totalItemWidth) * timeStep);

        setDrawings(prev => prev.map(d => {
          if (d.id !== activeHandleDrag.drawingId) return d;
          if (d.isLocked) return d; // Locked drawings cannot be moved
          const init = activeHandleDrag.initial;

          switch (activeHandleDrag.handle) {
            case 'p1': {
              const nextP1 = Number(((init.p1Price ?? init.price ?? currentTickPrice) + deltaPrice).toFixed(precision));
              const nextT1 = (init.t1Time ?? Date.now()) + deltaTime;
              return {
                ...d,
                p1Price: nextP1,
                t1Time: nextT1,
                x1Pct: timeToXOverlay(nextT1) ?? (init.x1Pct + dxPct),
                y1Pct: priceToYOverlay(nextP1) ?? (init.y1Pct + dyPct)
              };
            }
            case 'p2': {
              const nextP2 = Number(((init.p2Price ?? init.price ?? currentTickPrice) + deltaPrice).toFixed(precision));
              const nextT2 = (init.t2Time ?? Date.now()) + deltaTime;
              return {
                ...d,
                p2Price: nextP2,
                t2Time: nextT2,
                x2Pct: timeToXOverlay(nextT2) ?? (init.x2Pct + dxPct),
                y2Pct: priceToYOverlay(nextP2) ?? (init.y2Pct + dyPct)
              };
            }
            case 'line_y': {
              const baseP = init.price ?? init.p1Price ?? currentTickPrice;
              const nextP = Number((baseP + deltaPrice).toFixed(precision));
              const nextY = priceToYOverlay(nextP) ?? (init.y1Pct + dyPct);
              return {
                ...d,
                price: nextP,
                p1Price: nextP,
                p2Price: nextP,
                y1Pct: nextY,
                y2Pct: nextY
              };
            }
            case 'rect_nw': {
              const topP = Math.max(init.p1Price ?? 0, init.p2Price ?? 0);
              const botP = Math.min(init.p1Price ?? 0, init.p2Price ?? 0);
              const nextTopP = Number(Math.max(botP + 0.00001, topP + deltaPrice).toFixed(precision));
              const nextT1 = (init.t1Time ?? Date.now()) + deltaTime;
              return {
                ...d,
                p1Price: nextTopP,
                p2Price: botP,
                t1Time: nextT1,
                x1Pct: timeToXOverlay(nextT1) ?? (init.x1Pct + dxPct),
                y1Pct: priceToYOverlay(nextTopP) ?? (init.y1Pct + dyPct)
              };
            }
            case 'rect_ne': {
              const topP = Math.max(init.p1Price ?? 0, init.p2Price ?? 0);
              const botP = Math.min(init.p1Price ?? 0, init.p2Price ?? 0);
              const nextTopP = Number(Math.max(botP + 0.00001, topP + deltaPrice).toFixed(precision));
              const nextT2 = (init.t2Time ?? Date.now()) + deltaTime;
              return {
                ...d,
                p1Price: nextTopP,
                p2Price: botP,
                t2Time: nextT2,
                x2Pct: timeToXOverlay(nextT2) ?? (init.x2Pct + dxPct),
                y1Pct: priceToYOverlay(nextTopP) ?? (init.y1Pct + dyPct)
              };
            }
            case 'rect_sw': {
              const topP = Math.max(init.p1Price ?? 0, init.p2Price ?? 0);
              const botP = Math.min(init.p1Price ?? 0, init.p2Price ?? 0);
              const nextBotP = Number(Math.min(topP - 0.00001, botP + deltaPrice).toFixed(precision));
              const nextT1 = (init.t1Time ?? Date.now()) + deltaTime;
              return {
                ...d,
                p1Price: topP,
                p2Price: nextBotP,
                t1Time: nextT1,
                x1Pct: timeToXOverlay(nextT1) ?? (init.x1Pct + dxPct),
                y2Pct: priceToYOverlay(nextBotP) ?? (init.y2Pct + dyPct)
              };
            }
            case 'rect_se': {
              const topP = Math.max(init.p1Price ?? 0, init.p2Price ?? 0);
              const botP = Math.min(init.p1Price ?? 0, init.p2Price ?? 0);
              const nextBotP = Number(Math.min(topP - 0.00001, botP + deltaPrice).toFixed(precision));
              const nextT2 = (init.t2Time ?? Date.now()) + deltaTime;
              return {
                ...d,
                p1Price: topP,
                p2Price: nextBotP,
                t2Time: nextT2,
                x2Pct: timeToXOverlay(nextT2) ?? (init.x2Pct + dxPct),
                y2Pct: priceToYOverlay(nextBotP) ?? (init.y2Pct + dyPct)
              };
            }
            case 'move': {
              if (d.type === 'horizontal_line') {
                const baseP = init.price ?? init.p1Price ?? currentTickPrice;
                const nextP = Number((baseP + deltaPrice).toFixed(precision));
                return {
                  ...d,
                  price: nextP,
                  p1Price: nextP,
                  p2Price: nextP,
                  y1Pct: priceToYOverlay(nextP) ?? init.y1Pct,
                  y2Pct: priceToYOverlay(nextP) ?? init.y2Pct
                };
              }
              if (d.type === 'rectangle') {
                const nextP1 = Number(((init.p1Price ?? init.price) + deltaPrice).toFixed(precision));
                const nextP2 = Number(((init.p2Price ?? init.price) + deltaPrice).toFixed(precision));
                const nextT1 = (init.t1Time ?? Date.now()) + deltaTime;
                const nextT2 = (init.t2Time ?? Date.now()) + deltaTime;
                return {
                  ...d,
                  p1Price: nextP1,
                  p2Price: nextP2,
                  t1Time: nextT1,
                  t2Time: nextT2,
                  x1Pct: timeToXOverlay(nextT1) ?? init.x1Pct,
                  x2Pct: timeToXOverlay(nextT2) ?? init.x2Pct,
                  y1Pct: priceToYOverlay(nextP1) ?? init.y1Pct,
                  y2Pct: priceToYOverlay(nextP2) ?? init.y2Pct
                };
              }
              if (d.type === 'long_position') {
                const nextPrice = Number((init.price + deltaPrice).toFixed(precision));
                const nextTarget = Number(((init.posTargetPrice ?? (init.price * 1.008)) + deltaPrice).toFixed(precision));
                const nextStop = Number(((init.posStopPrice ?? (init.price * 0.996)) + deltaPrice).toFixed(precision));
                const nextT1 = (init.t1Time ?? Date.now()) + deltaTime;
                const nextT2 = (init.t2Time ?? Date.now()) + deltaTime;
                return {
                  ...d,
                  price: nextPrice,
                  posTargetPrice: nextTarget,
                  posStopPrice: nextStop,
                  p1Price: nextTarget,
                  p2Price: nextStop,
                  t1Time: nextT1,
                  t2Time: nextT2,
                  x1Pct: timeToXOverlay(nextT1) ?? init.x1Pct,
                  x2Pct: timeToXOverlay(nextT2) ?? init.x2Pct,
                  y1Pct: priceToYOverlay(nextTarget) ?? init.y1Pct,
                  y2Pct: priceToYOverlay(nextStop) ?? init.y2Pct
                };
              }
              if (d.type === 'short_position') {
                const nextPrice = Number((init.price + deltaPrice).toFixed(precision));
                const nextStop = Number(((init.posStopPrice ?? (init.price * 1.004)) + deltaPrice).toFixed(precision));
                const nextTarget = Number(((init.posTargetPrice ?? (init.price * 0.992)) + deltaPrice).toFixed(precision));
                const nextT1 = (init.t1Time ?? Date.now()) + deltaTime;
                const nextT2 = (init.t2Time ?? Date.now()) + deltaTime;
                return {
                  ...d,
                  price: nextPrice,
                  posStopPrice: nextStop,
                  posTargetPrice: nextTarget,
                  p1Price: nextStop,
                  p2Price: nextTarget,
                  t1Time: nextT1,
                  t2Time: nextT2,
                  x1Pct: timeToXOverlay(nextT1) ?? init.x1Pct,
                  x2Pct: timeToXOverlay(nextT2) ?? init.x2Pct,
                  y1Pct: priceToYOverlay(nextStop) ?? init.y1Pct,
                  y2Pct: priceToYOverlay(nextTarget) ?? init.y2Pct
                };
              }
              // trend_line or ray
              const nextP1 = Number(((init.p1Price ?? init.price) + deltaPrice).toFixed(precision));
              const nextP2 = Number(((init.p2Price ?? init.price) + deltaPrice).toFixed(precision));
              const nextT1 = (init.t1Time ?? Date.now()) + deltaTime;
              const nextT2 = (init.t2Time ?? Date.now()) + deltaTime;
              return {
                ...d,
                p1Price: nextP1,
                p2Price: nextP2,
                t1Time: nextT1,
                t2Time: nextT2,
                x1Pct: timeToXOverlay(nextT1) ?? init.x1Pct,
                x2Pct: timeToXOverlay(nextT2) ?? init.x2Pct,
                y1Pct: priceToYOverlay(nextP1) ?? init.y1Pct,
                y2Pct: priceToYOverlay(nextP2) ?? init.y2Pct
              };
            }
            case 'pos_target': {
              if (d.type === 'long_position') {
                const curTarget = init.posTargetPrice ?? (init.price * 1.008);
                const nextTarget = Number(Math.max(init.price + 0.00001, curTarget + deltaPrice).toFixed(precision));
                return {
                  ...d,
                  posTargetPrice: nextTarget,
                  p1Price: nextTarget,
                  y1Pct: priceToYOverlay(nextTarget) ?? init.y1Pct
                };
              } else {
                const curTarget = init.posTargetPrice ?? (init.price * 0.992);
                const nextTarget = Number(Math.min(init.price - 0.00001, curTarget + deltaPrice).toFixed(precision));
                return {
                  ...d,
                  posTargetPrice: nextTarget,
                  p2Price: nextTarget,
                  y2Pct: priceToYOverlay(nextTarget) ?? init.y2Pct
                };
              }
            }
            case 'pos_stop': {
              if (d.type === 'long_position') {
                const curStop = init.posStopPrice ?? (init.price * 0.996);
                const nextStop = Number(Math.min(init.price - 0.00001, curStop + deltaPrice).toFixed(precision));
                return {
                  ...d,
                  posStopPrice: nextStop,
                  p2Price: nextStop,
                  y2Pct: priceToYOverlay(nextStop) ?? init.y2Pct
                };
              } else {
                const curStop = init.posStopPrice ?? (init.price * 1.004);
                const nextStop = Number(Math.max(init.price + 0.00001, curStop + deltaPrice).toFixed(precision));
                return {
                  ...d,
                  posStopPrice: nextStop,
                  p1Price: nextStop,
                  y1Pct: priceToYOverlay(nextStop) ?? init.y1Pct
                };
              }
            }
            case 'pos_left': {
              const nextT1 = (init.t1Time ?? Date.now()) + deltaTime;
              return {
                ...d,
                t1Time: nextT1,
                x1Pct: timeToXOverlay(nextT1) ?? (init.x1Pct + dxPct)
              };
            }
            case 'pos_right': {
              const nextT2 = (init.t2Time ?? Date.now()) + deltaTime;
              return {
                ...d,
                t2Time: nextT2,
                x2Pct: timeToXOverlay(nextT2) ?? (init.x2Pct + dxPct)
              };
            }
            default:
              return d;
          }
        }));
      });
    };

    const handlePointerUp = () => {
      cancelAnimationFrame(animFrameId);
      setActiveHandleDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeHandleDrag]);

  const getDrawingY1Pct = (d: ChartDrawing): number => {
    if (d.type === 'horizontal_line') {
      const priceVal = d.price ?? d.p1Price;
      const y = priceToYOverlay(priceVal);
      if (y !== null) return y;
    } else if (d.type === 'long_position') {
      const y = priceToYOverlay(d.posTargetPrice ?? d.p1Price);
      if (y !== null) return y;
    } else if (d.type === 'short_position') {
      const y = priceToYOverlay(d.posStopPrice ?? d.p1Price);
      if (y !== null) return y;
    } else if (d.type === 'rectangle') {
      const topP = Math.max(d.p1Price ?? 0, d.p2Price ?? 0) || d.p1Price;
      const y = priceToYOverlay(topP);
      if (y !== null) return y;
    } else if (d.p1Price !== undefined) {
      const y = priceToYOverlay(d.p1Price);
      if (y !== null) return y;
    }
    return d.y1Pct;
  };

  const getDrawingY2Pct = (d: ChartDrawing): number => {
    if (d.type === 'horizontal_line') {
      const priceVal = d.price ?? d.p1Price;
      const y = priceToYOverlay(priceVal);
      if (y !== null) return y;
    } else if (d.type === 'long_position') {
      const y = priceToYOverlay(d.posStopPrice ?? d.p2Price);
      if (y !== null) return y;
    } else if (d.type === 'short_position') {
      const y = priceToYOverlay(d.posTargetPrice ?? d.p2Price);
      if (y !== null) return y;
    } else if (d.type === 'rectangle') {
      const botP = Math.min(d.p1Price ?? 0, d.p2Price ?? 0) || d.p2Price;
      const y = priceToYOverlay(botP);
      if (y !== null) return y;
    } else if (d.p2Price !== undefined) {
      const y = priceToYOverlay(d.p2Price);
      if (y !== null) return y;
    }
    return d.y2Pct;
  };

  const getDrawingYMidPct = (d: ChartDrawing): number => {
    if (d.type === 'long_position' || d.type === 'short_position') {
      const y = priceToYOverlay(d.price);
      if (y !== null) return y;
    }
    return (getDrawingY1Pct(d) + getDrawingY2Pct(d)) / 2;
  };

  const renderDrawingsOverlay = () => {
    if (drawings.length === 0) return null;

    return (
      <div 
        className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none"
      >
        <svg className="w-full h-full absolute inset-0 pointer-events-none">
          {drawings.map((d, idx) => {
            if (d.isHidden) return null;
            const isSelected = selectedDrawingId === d.id;
            const x1Pct = getDrawingX1Pct(d);
            const x2Pct = getDrawingX2Pct(d);
            const y1Pct = getDrawingY1Pct(d);
            const y2Pct = getDrawingY2Pct(d);
            const yMidPct = getDrawingYMidPct(d);

            if (d.type === 'horizontal_line') {
              return (
                <g key={`dwg-svg-${d.id || 'd'}-${idx}`} className="pointer-events-auto">
                  {/* Invisible wide hit area for effortless 1-click selection and dragging */}
                  <line
                    x1="0%"
                    y1={`${y1Pct}%`}
                    x2="100%"
                    y2={`${y1Pct}%`}
                    stroke="transparent"
                    strokeWidth="24"
                    className="cursor-ns-resize"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      handleDrawingPointerDown(e, d.id, 'line_y');
                    }}
                  />
                  {/* Visual Line */}
                  <line
                    x1="0%"
                    y1={`${y1Pct}%`}
                    x2="100%"
                    y2={`${y1Pct}%`}
                    stroke={d.color}
                    strokeWidth={d.strokeWidth || (isSelected ? "2.5" : "1.8")}
                    strokeDasharray={isSelected ? undefined : "6 4"}
                    className={`transition-all ${isSelected ? 'filter drop-shadow-[0_0_6px_rgba(245,179,1,0.6)]' : ''}`}
                  />
                </g>
              );
            }

            if (d.type === 'trend_line') {
              return (
                <g key={`dwg-svg-${d.id || 'd'}-${idx}`} className="pointer-events-auto">
                  {/* Invisible wide hit area */}
                  <line
                    x1={`${x1Pct}%`}
                    y1={`${y1Pct}%`}
                    x2={`${x2Pct}%`}
                    y2={`${y2Pct}%`}
                    stroke="transparent"
                    strokeWidth="24"
                    className="cursor-move"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      handleDrawingPointerDown(e, d.id, 'move');
                    }}
                  />
                  {/* Visual Line */}
                  <line
                    x1={`${x1Pct}%`}
                    y1={`${y1Pct}%`}
                    x2={`${x2Pct}%`}
                    y2={`${y2Pct}%`}
                    stroke={d.color}
                    strokeWidth={d.strokeWidth || (isSelected ? "3" : "2")}
                    className={`transition-all ${isSelected ? 'filter drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]' : ''}`}
                  />
                </g>
              );
            }

            if (d.type === 'ray') {
              const dx = x2Pct - x1Pct;
              const dy = y2Pct - y1Pct;
              let rayY2 = y2Pct;
              if (Math.abs(dx) > 0.01) {
                const slope = dy / dx;
                rayY2 = y1Pct + (100 - x1Pct) * slope;
              }

              return (
                <g key={`dwg-svg-${d.id || 'd'}-${idx}`} className="pointer-events-auto">
                  {/* Invisible wide hit area */}
                  <line
                    x1={`${x1Pct}%`}
                    y1={`${y1Pct}%`}
                    x2="100%"
                    y2={`${rayY2}%`}
                    stroke="transparent"
                    strokeWidth="24"
                    className="cursor-move"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      handleDrawingPointerDown(e, d.id, 'move');
                    }}
                  />
                  {/* Visual Ray */}
                  <line
                    x1={`${x1Pct}%`}
                    y1={`${y1Pct}%`}
                    x2="100%"
                    y2={`${rayY2}%`}
                    stroke={d.color}
                    strokeWidth={d.strokeWidth || (isSelected ? "3" : "2")}
                    className={`transition-all ${isSelected ? 'filter drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]' : ''}`}
                  />
                </g>
              );
            }

            if (d.type === 'rectangle') {
              const xMin = Math.min(x1Pct, x2Pct);
              const xMax = Math.max(x1Pct, x2Pct);
              const yMin = Math.min(y1Pct, y2Pct);
              const yMax = Math.max(y1Pct, y2Pct);

              return (
                <g key={`dwg-svg-${d.id || 'd'}-${idx}`} className="pointer-events-auto">
                  <rect
                    x={`${xMin}%`}
                    y={`${yMin}%`}
                    width={`${Math.max(0.1, xMax - xMin)}%`}
                    height={`${Math.max(0.1, yMax - yMin)}%`}
                    fill={d.color}
                    fillOpacity={d.fillOpacity ?? 0.16}
                    stroke={d.color}
                    strokeWidth={d.strokeWidth || (isSelected ? "2.5" : "1.8")}
                    rx="3"
                    className="cursor-move"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      handleDrawingPointerDown(e, d.id, 'move');
                    }}
                  />
                </g>
              );
            }

            if (d.type === 'long_position') {
              const xMin = Math.min(x1Pct, x2Pct);
              const xMax = Math.max(x1Pct, x2Pct);
              const yMin = Math.min(y1Pct, y2Pct);
              const yMax = Math.max(y1Pct, y2Pct);
              const yMid = yMidPct;

              return (
                <g 
                  key={`dwg-svg-${d.id || 'd'}-${idx}`} 
                  className="pointer-events-auto cursor-move"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleDrawingPointerDown(e, d.id, 'move');
                  }}
                >
                  {/* TP Box */}
                  <rect
                    x={`${xMin}%`}
                    y={`${yMin}%`}
                    width={`${Math.max(0.1, xMax - xMin)}%`}
                    height={`${Math.max(0, yMid - yMin)}%`}
                    fill="#10B981"
                    fillOpacity={d.fillOpacity ?? 0.20}
                    stroke="#10B981"
                    strokeWidth={d.strokeWidth || (isSelected ? "2" : "1.5")}
                  />
                  {/* SL Box */}
                  <rect
                    x={`${xMin}%`}
                    y={`${yMid}%`}
                    width={`${Math.max(0.1, xMax - xMin)}%`}
                    height={`${Math.max(0, yMax - yMid)}%`}
                    fill="#EF4444"
                    fillOpacity={d.fillOpacity ?? 0.20}
                    stroke="#EF4444"
                    strokeWidth={d.strokeWidth || (isSelected ? "2" : "1.5")}
                  />
                  {/* Entry Line */}
                  <line
                    x1={`${xMin}%`}
                    y1={`${yMid}%`}
                    x2={`${xMax}%`}
                    y2={`${yMid}%`}
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                  />
                </g>
              );
            }

            if (d.type === 'short_position') {
              const xMin = Math.min(x1Pct, x2Pct);
              const xMax = Math.max(x1Pct, x2Pct);
              const yMin = Math.min(y1Pct, y2Pct);
              const yMax = Math.max(y1Pct, y2Pct);
              const yMid = yMidPct;

              return (
                <g 
                  key={`dwg-svg-${d.id || 'd'}-${idx}`} 
                  className="pointer-events-auto cursor-move"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    handleDrawingPointerDown(e, d.id, 'move');
                  }}
                >
                  {/* SL Box (Top) */}
                  <rect
                    x={`${xMin}%`}
                    y={`${yMin}%`}
                    width={`${Math.max(0.1, xMax - xMin)}%`}
                    height={`${Math.max(0, yMid - yMin)}%`}
                    fill="#EF4444"
                    fillOpacity={d.fillOpacity ?? 0.20}
                    stroke="#EF4444"
                    strokeWidth={d.strokeWidth || (isSelected ? "2" : "1.5")}
                  />
                  {/* TP Box (Bottom) */}
                  <rect
                    x={`${xMin}%`}
                    y={`${yMid}%`}
                    width={`${Math.max(0.1, xMax - xMin)}%`}
                    height={`${Math.max(0, yMax - yMid)}%`}
                    fill="#10B981"
                    fillOpacity={d.fillOpacity ?? 0.20}
                    stroke="#10B981"
                    strokeWidth={d.strokeWidth || (isSelected ? "2" : "1.5")}
                  />
                  {/* Entry Line */}
                  <line
                    x1={`${xMin}%`}
                    y1={`${yMid}%`}
                    x2={`${xMax}%`}
                    y2={`${yMid}%`}
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                  />
                </g>
              );
            }

            return null;
          })}
        </svg>

        {drawings.map((d, idx) => {
          if (d.isHidden) return null;
          const isSelected = selectedDrawingId === d.id;

          const x1Pct = getDrawingX1Pct(d);
          const x2Pct = getDrawingX2Pct(d);
          const y1Pct = getDrawingY1Pct(d);
          const y2Pct = getDrawingY2Pct(d);
          const yMidPct = getDrawingYMidPct(d);

          const xMin = Math.min(x1Pct, x2Pct);
          const xMax = Math.max(x1Pct, x2Pct);
          const yMin = Math.min(y1Pct, y2Pct);
          const yMax = Math.max(y1Pct, y2Pct);
          const yMid = yMidPct;
          const targetDist = d.type === 'long_position' ? (yMid - yMin) : (yMax - yMid);
          const stopDist = d.type === 'long_position' ? (yMax - yMid) : (yMid - yMin);
          const rrRatio = stopDist > 0 ? (targetDist / stopDist).toFixed(2) : '1.00';

          return (
            <div key={`dwg-div-${d.id || 'd'}-${idx}`} id={d.id} className="absolute inset-0 pointer-events-none">
              
              {d.type === 'horizontal_line' && (
                <div
                  style={{ top: `${y1Pct}%`, right: '0px' }}
                  className="absolute -translate-y-1/2 pointer-events-auto cursor-ns-resize z-20"
                  onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'line_y')}
                >
                  <div
                    style={{ backgroundColor: d.color }}
                    className="px-2 py-0.5 rounded-l text-[10px] font-mono font-bold text-gray-950 shadow-lg flex items-center gap-1 select-none"
                  >
                    <span>${(d.price ?? d.p1Price ?? currentTickPrice).toFixed(activeMarket.precision)}</span>
                  </div>
                </div>
              )}

              {d.type === 'horizontal_line' && isSelected && (
                <div
                  style={{ top: `${y1Pct}%`, left: '50%' }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-ns-resize"
                  onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'line_y')}
                >
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-gray-950 border-2 border-white shadow-xl flex items-center justify-center scale-110 ring-4 ring-amber-500/30">
                    <Move className="w-2.5 h-2.5" />
                  </div>
                </div>
              )}

              {d.type === 'rectangle' && isSelected && (
                <>
                  <div
                    style={{ left: `${(xMin + xMax) / 2}%`, top: `${yMin}%` }}
                    className="absolute -translate-x-1/2 -translate-y-full pb-1 pointer-events-none z-20"
                  >
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[9px] font-mono font-semibold backdrop-blur-sm">
                      ${(Math.max(d.p1Price ?? 0, d.p2Price ?? 0)).toFixed(activeMarket.precision)}
                    </span>
                  </div>
                  <div
                    style={{ left: `${(xMin + xMax) / 2}%`, top: `${yMax}%` }}
                    className="absolute -translate-x-1/2 pt-1 pointer-events-none z-20"
                  >
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[9px] font-mono font-semibold backdrop-blur-sm">
                      ${(Math.min(d.p1Price ?? 0, d.p2Price ?? 0)).toFixed(activeMarket.precision)}
                    </span>
                  </div>
                </>
              )}

              {d.type === 'long_position' && (
                <>
                  <div
                    style={{ left: `${(xMin + xMax) / 2}%`, top: `${yMin + Math.max(1, (yMid - yMin) / 2)}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 text-center select-none"
                  >
                    <div className="px-2 py-0.5 rounded bg-emerald-950/85 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold shadow-md whitespace-nowrap">
                      Target: ${(d.posTargetPrice ?? (d.price * 1.008)).toFixed(activeMarket.precision)} (+{((((d.posTargetPrice ?? (d.price * 1.008)) - d.price) / (d.price || 1)) * 100).toFixed(2)}%)
                    </div>
                  </div>

                  <div
                    style={{ left: `${(xMin + xMax) / 2}%`, top: `${yMid + Math.max(1, (yMax - yMid) / 2)}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 text-center select-none"
                  >
                    <div className="px-2 py-0.5 rounded bg-rose-950/85 border border-rose-500/50 text-rose-300 text-[10px] font-mono font-bold shadow-md whitespace-nowrap">
                      Stop: ${(d.posStopPrice ?? (d.price * 0.996)).toFixed(activeMarket.precision)} (-{(((d.price - (d.posStopPrice ?? (d.price * 0.996))) / (d.price || 1)) * 100).toFixed(2)}%)
                    </div>
                  </div>

                  <div
                    style={{ left: `${xMin}%`, top: `${yMid}%` }}
                    className="absolute -translate-y-1/2 pl-1.5 pointer-events-none z-20 select-none"
                  >
                    <div className="px-1.5 py-0.5 rounded bg-sky-950/85 border border-sky-500/50 text-sky-300 text-[9px] font-mono font-bold shadow whitespace-nowrap">
                      Entry: ${d.price.toFixed(activeMarket.precision)} | R:R {rrRatio}
                    </div>
                  </div>
                </>
              )}

              {d.type === 'short_position' && (
                <>
                  <div
                    style={{ left: `${(xMin + xMax) / 2}%`, top: `${yMin + Math.max(1, (yMid - yMin) / 2)}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 text-center select-none"
                  >
                    <div className="px-2 py-0.5 rounded bg-rose-950/85 border border-rose-500/50 text-rose-300 text-[10px] font-mono font-bold shadow-md whitespace-nowrap">
                      Stop: ${(d.posStopPrice ?? (d.price * 1.004)).toFixed(activeMarket.precision)} (-{((((d.posStopPrice ?? (d.price * 1.004)) - d.price) / (d.price || 1)) * 100).toFixed(2)}%)
                    </div>
                  </div>

                  <div
                    style={{ left: `${(xMin + xMax) / 2}%`, top: `${yMid + Math.max(1, (yMax - yMid) / 2)}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 text-center select-none"
                  >
                    <div className="px-2 py-0.5 rounded bg-emerald-950/85 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-bold shadow-md whitespace-nowrap">
                      Target: ${(d.posTargetPrice ?? (d.price * 0.992)).toFixed(activeMarket.precision)} (+{(((d.price - (d.posTargetPrice ?? (d.price * 0.992))) / (d.price || 1)) * 100).toFixed(2)}%)
                    </div>
                  </div>

                  <div
                    style={{ left: `${xMin}%`, top: `${yMid}%` }}
                    className="absolute -translate-y-1/2 pl-1.5 pointer-events-none z-20 select-none"
                  >
                    <div className="px-1.5 py-0.5 rounded bg-sky-950/85 border border-sky-500/50 text-sky-300 text-[9px] font-mono font-bold shadow whitespace-nowrap">
                      Entry: ${d.price.toFixed(activeMarket.precision)} | R:R {rrRatio}
                    </div>
                  </div>
                </>
              )}

              {/* Handles & Controls ONLY shown when selected */}
              {isSelected && (
                <>
                  {(d.type === 'trend_line' || d.type === 'ray') && (
                    <>
                      <div
                        style={{ left: `${x1Pct}%`, top: `${y1Pct}%`, backgroundColor: d.color }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-xl pointer-events-auto cursor-grab active:cursor-grabbing ring-4 ring-blue-500/40"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'p1')}
                      />

                      <div
                        style={{ left: `${x2Pct}%`, top: `${y2Pct}%`, backgroundColor: d.color }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-xl pointer-events-auto cursor-grab active:cursor-grabbing ring-4 ring-blue-500/40"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'p2')}
                      >
                        <div style={{ backgroundColor: d.color }} className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-xl" />
                      </div>

                      <div
                        style={{ left: `${(x1Pct + x2Pct) / 2}%`, top: `${(y1Pct + y2Pct) / 2}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-move"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'move')}
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-950/90 border border-white/60 text-white shadow-xl flex items-center justify-center">
                          <Move className="w-2.5 h-2.5 text-amber-400" />
                        </div>
                      </div>
                    </>
                  )}

                  {d.type === 'rectangle' && (
                    <>
                      <div
                        style={{ left: `${xMin}%`, top: `${yMin}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-nwse-resize"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'rect_nw')}
                      >
                        <div style={{ backgroundColor: d.color }} className="w-3 h-3 rounded-full border-2 border-white shadow-lg ring-2 ring-purple-500/40" />
                      </div>

                      <div
                        style={{ left: `${xMax}%`, top: `${yMin}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-nesw-resize"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'rect_ne')}
                      >
                        <div style={{ backgroundColor: d.color }} className="w-3 h-3 rounded-full border-2 border-white shadow-lg ring-2 ring-purple-500/40" />
                      </div>

                      <div
                        style={{ left: `${xMin}%`, top: `${yMax}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-nesw-resize"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'rect_sw')}
                      >
                        <div style={{ backgroundColor: d.color }} className="w-3 h-3 rounded-full border-2 border-white shadow-lg ring-2 ring-purple-500/40" />
                      </div>

                      <div
                        style={{ left: `${xMax}%`, top: `${yMax}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-nwse-resize"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'rect_se')}
                      >
                        <div style={{ backgroundColor: d.color }} className="w-3 h-3 rounded-full border-2 border-white shadow-lg ring-2 ring-purple-500/40" />
                      </div>

                      <div
                        style={{ left: `${(xMin + xMax) / 2}%`, top: `${(yMin + yMax) / 2}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-move"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'move')}
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-950/90 border border-purple-400 text-purple-300 shadow-xl flex items-center justify-center">
                          <Move className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    </>
                  )}

                  {(d.type === 'long_position' || d.type === 'short_position') && (
                    <>
                      <div
                        style={{ left: `${(xMin + xMax) / 2}%`, top: `${yMin}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-ns-resize"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'pos_target')}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-xl ${d.type === 'long_position' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      </div>

                      <div
                        style={{ left: `${(xMin + xMax) / 2}%`, top: `${yMax}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-ns-resize"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'pos_stop')}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-xl ${d.type === 'long_position' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      </div>

                      <div
                        style={{ left: `${xMin}%`, top: `${yMid}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-ew-resize"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'pos_left')}
                      >
                        <div className="w-3 h-3 rounded-full bg-sky-400 border border-white shadow" />
                      </div>

                      <div
                        style={{ left: `${xMax}%`, top: `${yMid}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-ew-resize"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'pos_right')}
                      >
                        <div className="w-3 h-3 rounded-full bg-sky-400 border border-white shadow" />
                      </div>

                      <div
                        style={{ left: `${(xMin + xMax) / 2}%`, top: `${yMid}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 p-2 pointer-events-auto cursor-move"
                        onPointerDown={(e) => handleDrawingPointerDown(e, d.id, 'move')}
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-950/90 border border-sky-400 text-sky-300 shadow-xl flex items-center justify-center">
                          <Move className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Context Floating Toolbar for Selected Drawing Tool */}
              {isSelected && (
                <div
                  style={{
                    left: `${Math.max(12, Math.min(88, (xMin + xMax) / 2))}%`,
                    top: `${Math.max(3, Math.min(88, yMin <= 16 ? yMax + 6 : yMin - 7))}%`
                  }}
                  className="absolute -translate-x-1/2 px-2 py-1 rounded-xl bg-[#090D1A]/95 border border-white/20 shadow-2xl pointer-events-auto z-40 flex flex-wrap sm:flex-nowrap items-center gap-1.5 backdrop-blur-xl text-white select-none animate-in fade-in zoom-in-95 duration-150 max-w-[94vw]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Context Info Pill */}
                  {d.type === 'horizontal_line' && (
                    <div className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono font-bold flex items-center gap-1 shrink-0">
                      <span>${(d.p1Price ?? d.price).toFixed(activeMarket.precision)}</span>
                    </div>
                  )}

                  {(d.type === 'long_position' || d.type === 'short_position') && (
                    <div className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] font-mono font-bold flex items-center gap-1 shrink-0">
                      <span>R:R {rrRatio}</span>
                    </div>
                  )}

                  {/* Color Palette */}
                  <div className="flex items-center gap-1 shrink-0">
                    {['#10B981', '#EF4444', '#38BDF8', '#F5B301', '#A855F7', '#EC4899', '#FFFFFF'].map((c, clrIdx) => (
                      <button
                        key={`dwg-${d.id || 'd'}-clr-${c}-${clrIdx}`}
                        type="button"
                        onClick={() => {
                          setDrawings(prev => prev.map(item => item.id === d.id ? { ...item, color: c } : item));
                        }}
                        style={{ backgroundColor: c }}
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-white/40 transition-transform cursor-pointer ${
                          d.color === c ? 'scale-125 ring-1.5 ring-white shadow-lg' : 'hover:scale-110 opacity-80'
                        }`}
                        title="Color"
                      />
                    ))}
                  </div>

                  <div className="h-3 w-px bg-white/20 shrink-0 hidden sm:block" />

                  {/* Line Width Controls */}
                  <div className="flex items-center gap-0.5 bg-gray-800/80 rounded p-0.5 shrink-0">
                    {[1, 2, 3].map((w, wIdx) => (
                      <button
                        key={`dwg-${d.id || 'd'}-w-${w}-${wIdx}`}
                        type="button"
                        onClick={() => {
                          setDrawings(prev => prev.map(item => item.id === d.id ? { ...item, strokeWidth: w } : item));
                        }}
                        className={`px-1 py-0.2 rounded text-[8.5px] font-bold transition-colors cursor-pointer ${
                          (d.strokeWidth || 2) === w ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-white'
                        }`}
                        title={`${w}px Width`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>

                  <div className="h-3 w-px bg-white/20 shrink-0" />

                  {/* Lock / Unlock Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setDrawings(prev => prev.map(item => item.id === d.id ? { ...item, isLocked: !item.isLocked } : item));
                    }}
                    className={`p-1 rounded bg-gray-800/90 hover:bg-gray-700 transition-colors cursor-pointer shrink-0 ${
                      d.isLocked ? 'text-amber-400 bg-amber-500/20' : 'text-gray-300 hover:text-white'
                    }`}
                    title={d.isLocked ? "Unlock Drawing" : "Lock Drawing"}
                  >
                    {d.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => duplicateDrawing(d.id)}
                    className="p-1 rounded bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Duplicate Drawing"
                  >
                    <Copy className="w-3 h-3" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => {
                      setDrawings(prev => prev.filter(item => item.id !== d.id));
                      setSelectedDrawingId(null);
                    }}
                    className="p-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Delete Drawing"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  {/* Close Selection */}
                  <button
                    type="button"
                    onClick={() => setSelectedDrawingId(null)}
                    className="p-1 rounded bg-gray-800/90 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    title="Deselect"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

            </div>
          );
        })}
      </div>
    );
  };

  // Canvas Mouse & Touch Drag & Crosshair Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedDrawingId) {
      setSelectedDrawingId(null);
    }
    if (showDrawingToolsMenu) {
      setShowDrawingToolsMenu(false);
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const width = rect.width;
    const rightAxisWidth = Math.max(78, Math.min(96, Math.floor(width * 0.18)));
    const chartWidth = width - rightAxisWidth;

    // Check if clicking Close button on right end of a Forex trade line
    if (mouseX >= width - 145 && mouseX <= width - 60) {
      const clickedTrade = activeTrades.find(trd => {
        if (trd.symbol !== activeMarket.symbol || trd.status !== 'OPEN' || trd.tradingMode !== 'forex') return false;
        const y = tradeYMapRef.current[trd.id] ?? tradeYMap[trd.id];
        return y !== undefined && Math.abs(mouseY - y) <= 15;
      });
      if (clickedTrade) {
        handleClosePosition(clickedTrade.id);
        return;
      }
    }

    // TradingView Price Axis Dragging (Vertical Scale)
    if (mouseX >= chartWidth) {
      setIsDraggingPriceScale(true);
      setDragStartPriceScale({
        y: e.clientY,
        initialZoom: priceZoomLevel
      });
      return;
    }

    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = rect.width;
    const rightAxisWidth = Math.max(78, Math.min(96, Math.floor(width * 0.18)));
    const chartWidth = width - rightAxisWidth;

    // Detect if hovering over the vertical price scale
    if (mouseX >= chartWidth) {
      if (!isHoveringPriceScale) setIsHoveringPriceScale(true);
    } else {
      if (isHoveringPriceScale) setIsHoveringPriceScale(false);
    }

    // Handle Vertical Price Axis Dragging (TradingView Style)
    if (isDraggingPriceScale) {
      const deltaY = dragStartPriceScale.y - e.clientY;
      const factor = 1 + (deltaY / 130);
      const newZoom = Math.max(0.2, Math.min(8.0, dragStartPriceScale.initialZoom * factor));
      setPriceZoomLevel(newZoom);
      return;
    }

    if (!isDragging) return;
    const rawX = e.clientX - dragStart.x;
    const chartW = chartBoundsRef.current.chartWidth || 600;
    // Fluid, smooth panning in both directions without getting locked
    const minPanX = -Math.floor(chartW * 0.75);
    const clampedX = Math.max(minPanX, rawX);
    setPanOffset({
      x: clampedX,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingPriceScale(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setIsDraggingPriceScale(false);
    setIsHoveringPriceScale(false);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = rect.width;
    const rightAxisWidth = Math.max(78, Math.min(96, Math.floor(width * 0.18)));
    const chartWidth = width - rightAxisWidth;

    // Double clicking the price axis resets vertical scale back to 1.0
    if (mouseX >= chartWidth) {
      setPriceZoomLevel(1.0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (selectedDrawingId) {
      setSelectedDrawingId(null);
    }
    if (e.touches.length === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const touchX = e.touches[0].clientX - rect.left;
      const touchY = e.touches[0].clientY - rect.top;
      const width = rect.width;
      const rightAxisWidth = Math.max(78, Math.min(96, Math.floor(width * 0.18)));
      const chartWidth = width - rightAxisWidth;

      // Check if tapping Close button on right end of a Forex trade line on mobile
      if (touchX >= width - 155 && touchX <= width - 35) {
        const clickedTrade = activeTrades.find(trd => {
          if (trd.symbol !== activeMarket.symbol || trd.status !== 'OPEN' || trd.tradingMode !== 'forex') return false;
          const y = tradeYMapRef.current[trd.id] ?? tradeYMap[trd.id];
          return y !== undefined && Math.abs(touchY - y) <= 25;
        });
        if (clickedTrade) {
          handleClosePosition(clickedTrade.id);
          return;
        }
      }

      // Check if touching on the price axis for vertical scaling
      if (touchX >= chartWidth) {
        setIsDraggingPriceScale(true);
        setDragStartPriceScale({
          y: e.touches[0].clientY,
          initialZoom: priceZoomLevel
        });
        return;
      }

      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panOffset.x,
        y: e.touches[0].clientY - panOffset.y
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      if (isDraggingPriceScale) {
        const deltaY = dragStartPriceScale.y - e.touches[0].clientY;
        const factor = 1 + (deltaY / 130);
        const newZoom = Math.max(0.2, Math.min(8.0, dragStartPriceScale.initialZoom * factor));
        setPriceZoomLevel(newZoom);
        return;
      }

      if (isDragging) {
        const rawX = e.touches[0].clientX - dragStart.x;
        const chartW = chartBoundsRef.current.chartWidth || 600;
        // Fluid, smooth panning in both directions without getting locked
        const minPanX = -Math.floor(chartW * 0.75);
        const clampedX = Math.max(minPanX, rawX);
        setPanOffset({
          x: clampedX,
          y: e.touches[0].clientY - dragStart.y
        });
      }
    } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - pinchDistRef.current) * 0.008;
      setZoomLevel(prev => Math.min(3.5, Math.max(0.2, prev + delta)));
      pinchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsDraggingPriceScale(false);
    pinchDistRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoomLevel(prev => Math.min(3.5, Math.max(0.2, prev + delta)));
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(3.5, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(0.2, Number((prev - 0.15).toFixed(2))));
  };

  const handleResetChart = () => {
    setZoomLevel(1.0);
    setPriceZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Canvas Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trendMomentumRef = useRef<number>(0);

  // Save active & closed trades to localStorage on update
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TRADES_STORAGE_KEY, JSON.stringify(activeTrades));
    } catch (_) {}
  }, [activeTrades]);

  useEffect(() => {
    try {
      localStorage.setItem(CLOSED_TRADES_STORAGE_KEY, JSON.stringify(closedTrades));
    } catch (_) {}
  }, [closedTrades]);

  // Listen to Admin market updates with live Firestore synchronization
  useEffect(() => {
    const handleMarketsChange = () => {
      setMarkets(getStoredMarkets());
    };
    window.addEventListener('forex_markets_config_updated', handleMarketsChange);

    const unsubscribe = subscribeToMarketConfig((remoteMarkets) => {
      setMarkets(remoteMarkets);
    });

    return () => {
      window.removeEventListener('forex_markets_config_updated', handleMarketsChange);
      unsubscribe();
    };
  }, []);

  const [isGoldLiveAvailableState, setIsGoldLiveAvailableState] = useState<boolean>(true);

  useEffect(() => {
    const unsubStatus = onGoldLiveStatusChange((available) => {
      setIsGoldLiveAvailableState(available);
    });
    return () => { unsubStatus(); };
  }, []);

  // Filter Active Market object
  const activeMarket = markets.find(m => m.id === selectedMarketId) || markets[0];
  const activeMarketRef = useRef<MarketPairConfig>(activeMarket);
  useEffect(() => {
    activeMarketRef.current = activeMarket;
  }, [activeMarket]);

  // --- Admin Verification & Future Candle Radar State ---
  const ADMIN_EMAILS = ['naymulh1000@gmail.com', 'admin@fxby24.com', 'admin@forextradepro.com'];
  const isAdminUser = Boolean(
    isAdmin ||
    isSuperAdmin ||
    (userEmail && ADMIN_EMAILS.includes(userEmail.toLowerCase().trim())) ||
    (typeof window !== 'undefined' && (
      Boolean(localStorage.getItem('forex_admin_session')) ||
      localStorage.getItem('forex_admin_authenticated') === 'true' ||
      localStorage.getItem('forex_pro_user_role') === 'admin' ||
      localStorage.getItem('forex_pro_is_admin') === 'true' ||
      sessionStorage.getItem('forex_admin_authenticated') === 'true'
    ))
  );

  const [adminRadarActive, setAdminRadarActive] = useState<boolean>(() => {
    if (!isAdminUser) return false;
    try {
      const saved = localStorage.getItem('forex_admin_radar_active');
      return saved !== null ? saved === 'true' : true; // Default ON for Admin
    } catch (_) {
      return true;
    }
  });

  // Future Candle Predictions for Admin Radar (Strictly ONLY allowed for authorized admin!)
  const [upcomingPredictions, setUpcomingPredictions] = useState<CandlePredictionMetrics[]>([]);

  // CRITICAL SECURITY ENFORCEMENT: If not an admin user, adminRadarActive MUST ALWAYS be false and predictions empty
  useEffect(() => {
    if (!isAdminUser) {
      if (adminRadarActive) setAdminRadarActive(false);
      if (upcomingPredictions.length > 0) setUpcomingPredictions([]);
    }
  }, [isAdminUser, adminRadarActive, upcomingPredictions.length]);

  const [isRadarHudExpanded, setIsRadarHudExpanded] = useState<boolean>(true);

  const toggleAdminRadar = async () => {
    if (!isAdminUser) {
      setAdminRadarActive(false);
      return;
    }
    const next = !adminRadarActive;
    setAdminRadarActive(next);
    try {
      localStorage.setItem('forex_admin_radar_active', String(next));
    } catch (_) {}

    let nextExposure = exposureControlEnabled;
    if (next) {
      nextExposure = false;
      setExposureControlEnabled(false);
      try {
        localStorage.setItem('forex_admin_exposure_control', 'false');
      } catch (_) {}
      setPanOffset(p => ({ ...p, x: 0 }));
      setIsRadarHudExpanded(true);
      showNotification('👑 Radar Predictor: ON (5-Candle future forecast active on chart)', 'success');
    } else {
      showNotification('⚪ Radar Predictor: OFF', 'danger');
    }

    try {
      await fetch('/api/otc/admin-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPredictorMode: next, exposureControlEnabled: nextExposure })
      });
    } catch (_) {}
  };

  const [exposureControlEnabled, setExposureControlEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('forex_admin_exposure_control');
      return saved === 'true'; // Default false for 100% natural real market!
    } catch (_) {
      return false;
    }
  });

  const [activeMarketExposure, setActiveMarketExposure] = useState<{
    symbol: string;
    upVolume: number;
    downVolume: number;
    netExposure: number;
    biasDirection: 'UP' | 'DOWN' | 'NEUTRAL';
    totalOrders?: number;
  } | null>(null);

  // Synchronize active market live exposure metrics from server
  useEffect(() => {
    const fetchOtcExposure = () => {
      try {
        fetch('/api/otc/exposure')
          .then(res => res.json())
          .then(data => {
            if (data && data.success) {
              if (typeof data.exposureControlEnabled === 'boolean') {
                setExposureControlEnabled(data.exposureControlEnabled);
                try {
                  localStorage.setItem('forex_admin_exposure_control', String(data.exposureControlEnabled));
                } catch (_) {}
              }
              if (activeMarket && data.marketsExposure) {
                const sym = (activeMarket.symbol || '').trim().toUpperCase();
                const exp = data.marketsExposure[sym] || null;
                setActiveMarketExposure(exp);
              }
            }
          })
          .catch(() => {});
      } catch (_) {}
    };

    fetchOtcExposure();
    const interval = setInterval(fetchOtcExposure, 1500);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'forex_admin_exposure_control') {
        setExposureControlEnabled(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [activeMarket?.symbol]);

  const handleToggleExposureControl = async () => {
    const nextState = !exposureControlEnabled;
    setExposureControlEnabled(nextState);
    try {
      localStorage.setItem('forex_admin_exposure_control', String(nextState));
    } catch (_) {}

    let nextPredictor = adminRadarActive;
    if (nextState) {
      showNotification('🛡️ 5S Loss Shield: ON (Trades will automatically settle in LOSS in the last 5 seconds)', 'danger');
      if (isAdminUser) {
        nextPredictor = false;
        setAdminRadarActive(false);
        try {
          localStorage.setItem('forex_admin_radar_active', 'false');
        } catch (_) {}
      }
    } else {
      showNotification('⚪ 5S Loss Shield: OFF (Admin 5-Candle future forecast active on chart)', 'success');
      // When 5s loss is OFF: Admin chart displays the 5 future candles
      if (isAdminUser) {
        nextPredictor = true;
        setAdminRadarActive(true);
        setIsRadarHudExpanded(true);
        try {
          localStorage.setItem('forex_admin_radar_active', 'true');
        } catch (_) {}
      }
    }

    try {
      await fetch('/api/otc/admin-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPredictorMode: nextPredictor, exposureControlEnabled: nextState })
      });
    } catch (_) {}
  };

  const isCurrentMarketOTC = Boolean(
    activeMarket && (
      activeMarket.category === 'otc' ||
      (activeMarket.symbol || '').includes('OTC') ||
      tradingMode === 'otc'
    )
  );

  useEffect(() => {
    // Strictly ONLY for authorized admin on OTC market
    if (!isAdminUser || !activeMarket || !isCurrentMarketOTC) {
      setUpcomingPredictions([]);
      return;
    }

    // When 5S LOSS is ON, radar predictor is hidden:
    if (exposureControlEnabled || !adminRadarActive) {
      setUpcomingPredictions([]);
      return;
    }

    const refreshPredictions = () => {
      try {
        const preds = customMarketEngine.getUpcomingCandlesPreview(activeMarket, 5, timeframe as TimeframeId);
        setUpcomingPredictions(preds);
      } catch (err) {
        console.warn('Radar prediction calculation notice:', err);
      }
    };

    refreshPredictions();
    const interval = setInterval(refreshPredictions, 1000);
    return () => clearInterval(interval);
  }, [isAdminUser, adminRadarActive, exposureControlEnabled, isCurrentMarketOTC, activeMarket?.symbol, timeframe]);

  const userUidRef = useRef(userUid);
  useEffect(() => {
    userUidRef.current = userUid;
  }, [userUid]);

  const userEmailRef = useRef(userEmail);
  useEffect(() => {
    userEmailRef.current = userEmail;
  }, [userEmail]);

  const closedTradesRef = useRef<ActiveTrade[]>(closedTrades);
  useEffect(() => {
    closedTradesRef.current = closedTrades;
  }, [closedTrades]);

  const activeTradesRef = useRef<ActiveTrade[]>(activeTrades);
  useEffect(() => {
    activeTradesRef.current = activeTrades;
  }, [activeTrades]);

  // Sync mode with market selection and position filters
  useEffect(() => {
    if (tradingMode === 'otc') {
      // Intelligently find corresponding OTC market if currently on a pair
      let targetMarket: MarketPairConfig | undefined;
      const curSym = activeMarket.symbol.toUpperCase();
      const curId = activeMarket.id.toLowerCase();
      
      if (curId.includes('xau') || curId.includes('gold') || curSym.includes('XAU') || curSym.includes('GOLD')) {
        targetMarket = markets.find(m => (m.id === 'gold_otc' || m.symbol.toUpperCase().includes('GOLD')) && m.category === 'otc');
      } else if (curSym.includes('EUR/USD') || curId.includes('eur_usd')) {
        targetMarket = markets.find(m => m.id === 'eur_usd_otc');
      } else if (curSym.includes('GBP/USD') || curId.includes('gbp_usd')) {
        targetMarket = markets.find(m => m.id === 'gbp_usd_otc');
      } else if (curSym.includes('BTC/USD') || curId.includes('btc_usd')) {
        targetMarket = markets.find(m => m.id === 'btc_usd_otc');
      } else if (curSym.includes('ETH/USD') || curId.includes('eth_usd')) {
        targetMarket = markets.find(m => m.id === 'eth_usd_otc');
      }
      
      if (!targetMarket) {
        targetMarket = markets.find(m => m.category === 'otc' && m.isActive) || markets[0];
      }

      setSelectedMarketId(targetMarket.id);
      setCurrentTickPrice(targetMarket.basePrice);
      setPositionsFilter('otc');
      setHistoryFilter('otc');
    } else {
      // Intelligently find corresponding Forex market if currently on an OTC pair
      let targetMarket: MarketPairConfig | undefined;
      const curSym = activeMarket.symbol.toUpperCase();
      const curId = activeMarket.id.toLowerCase();
      
      if (curId.includes('gold') || curId.includes('xau') || curSym.includes('GOLD') || curSym.includes('XAU')) {
        targetMarket = markets.find(m => (m.id === 'xau_usd' || m.symbol === 'XAU/USD') && m.isActive);
      } else if (curSym.includes('EUR/USD') || curId.includes('eur_usd')) {
        targetMarket = markets.find(m => m.id === 'eur_usd' && m.isActive);
      } else if (curSym.includes('GBP/USD') || curId.includes('gbp_usd')) {
        targetMarket = markets.find(m => m.id === 'gbp_usd' && m.isActive);
      } else if (curSym.includes('BTC/USD') || curId.includes('btc_usd')) {
        targetMarket = markets.find(m => m.id === 'btc_usd' && m.isActive);
      } else if (curSym.includes('ETH/USD') || curId.includes('eth_usd')) {
        targetMarket = markets.find(m => m.id === 'eth_usd' && m.isActive);
      }

      if (!targetMarket) {
        targetMarket = markets.find(m => (m.category === 'forex' || m.category === 'commodities' || m.isRealMarket) && m.isActive) || markets[0];
      }

      setSelectedMarketId(targetMarket.id);
      setCurrentTickPrice(targetMarket.basePrice);
      setPositionsFilter('forex');
      setHistoryFilter('forex');
    }
  }, [tradingMode]);

  // Helper: Convert symbol name to unique numeric hash for deterministic seed
  const hashSymbol = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  // Helper: Pseudo-random number generator given a seed
  const seededRandom = (seed: number): number => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Helper: Get timeframe duration in seconds
  const getTimeframeSeconds = (tf: 'S5' | 'S15' | 'S30' | 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1'): number => {
    switch (tf) {
      case 'S5': return 5;
      case 'S15': return 15;
      case 'S30': return 30;
      case 'M5': return 300;
      case 'M15': return 900;
      case 'M30': return 1800;
      case 'H1': return 3600;
      case 'H4': return 14400;
      case 'D1': return 86400;
      default: return 60;
    }
  };

  // Helper: Deterministic, globally synchronized continuous market price calculator
  const getSyncedMarketPriceHelper = (
    market: MarketPairConfig,
    timeMs: number
  ): number => {
    return getSyncedMarketPrice(market, timeMs);
  };

  const isLoadingOlderRef = useRef<boolean>(false);

  // Initialize Global Background Candle Sync Engine
  useEffect(() => {
    startGlobalMarketCandleSync();
  }, []);

  // Persistent Candlestick Engine with Global Market Background Engine & Firestore Sync
  useEffect(() => {
    setHistoricalOffset(0);
    let isMounted = true;

    // Check if customMarketEngine already has warm, continuously-running candles for this market & tf
    const existingCandles = customMarketEngine.getCandles(activeMarket.symbol, timeframe as TimeframeId);
    if (existingCandles && existingCandles.length > 0) {
      setCandles(existingCandles);
      const currentPrice = customMarketEngine.getCurrentPrice(activeMarket.symbol);
      setCurrentTickPrice(currentPrice);
      const tfSecs = getTimeframeSeconds(timeframe);
      const now = customMarketEngine.getSyncedNow();
      const remSecs = tfSecs - (Math.floor(now / 1000) % tfSecs);
      setCandleCountdown(remSecs);
    }

    const initCandles = async () => {
      // Ultra-fast lightweight initial candle buffer (70-130 candles for instant 0.1s mobile rendering)
      // Older historical bars smoothly lazy-load when user scrolls/drags left
      const isReal = activeMarket.isRealMarket || activeMarket.category !== 'otc';
      let candleCount = 120;
      switch (timeframe) {
        case 'S1':
        case 'S5': candleCount = 90; break;
        case 'S15':
        case 'S30': candleCount = 100; break;
        case 'M1': candleCount = 130; break;
        case 'M5': candleCount = 110; break;
        case 'M15': candleCount = 90; break;
        case 'H1': candleCount = 70; break;
        default: candleCount = 100; break;
      }

      customMarketEngine.setActiveViewedSymbol(activeMarket.symbol);
      const loaded = await loadOrInitializeCandles(activeMarket, timeframe, candleCount);
      if (!isMounted) return;

      const currentWarm = customMarketEngine.getCandles(activeMarket.symbol, timeframe as TimeframeId);
      const finalCandles = isReal
        ? loaded
        : (currentWarm && currentWarm.length > 0 ? mergeAndDeduplicateCandles(loaded, currentWarm) : loaded);

      setCandles(finalCandles);
      customMarketEngine.seedCandles(activeMarket.symbol, timeframe as TimeframeId, finalCandles);

      const now = customMarketEngine.getSyncedNow();
      const currentLivePrice = isReal
        ? (realTimeLiveMarketService.getLatestPrice(activeMarket.symbol) || (finalCandles.length > 0 ? finalCandles[finalCandles.length - 1].close : customMarketEngine.getCurrentPrice(activeMarket.symbol) || activeMarket.basePrice))
        : (getSyncedMarketPrice(activeMarket, now) || (finalCandles.length > 0 ? finalCandles[finalCandles.length - 1].close : activeMarket.basePrice));
      setCurrentTickPrice(currentLivePrice);

      const tfSecs = getTimeframeSeconds(timeframe);
      const remSecs = tfSecs - (Math.floor(now / 1000) % tfSecs);
      setCandleCountdown(remSecs);
    };

    initCandles();

    // Subscribe to customMarketEngine's continuous background candle updates
    const unsubCandles = customMarketEngine.subscribeToCandles(
      activeMarket.symbol,
      timeframe as TimeframeId,
      (updatedCandles) => {
        if (!isMounted) return;
        setCandles(updatedCandles);
      }
    );

    // Subscribe to customMarketEngine's real-time ticks
    const unsubTicker = customMarketEngine.subscribeToTicker(
      activeMarket.symbol,
      (ticker) => {
        if (!isMounted) return;
        const latestPrice = ticker.price;
        setCurrentTickPrice(prevPrice => {
          if (latestPrice > prevPrice) {
            setPriceChangeDirection('up');
          } else if (latestPrice < prevPrice) {
            setPriceChangeDirection('down');
          }
          return latestPrice;
        });

        // Real-time smooth floating PnL recalculation for active trades
        const now = Date.now();
        setActiveTrades(prevTrades => {
          if (prevTrades.length === 0) return prevTrades;
          let changed = false;
          const updated = prevTrades.map(trade => {
            if (trade.status !== 'OPEN') return trade;
            
            const isThisMarket = trade.symbol === activeMarket.symbol || trade.symbol === activeMarket.id;
            const tradePrice = isThisMarket ? latestPrice : (customMarketEngine.getCurrentPrice(trade.symbol) || trade.currentPrice || latestPrice);

            if (trade.tradingMode === 'forex' || trade.category === 'forex' || !trade.tradingMode) {
              const livePnl = calculateForexPnl(trade, tradePrice);
              if (trade.pnl !== livePnl || Math.abs((trade.currentPrice || 0) - tradePrice) > 0.000001) {
                changed = true;
                return { ...trade, currentPrice: tradePrice, pnl: livePnl };
              }
            } else if (trade.tradingMode === 'otc' || trade.category === 'binary') {
              const isWinning = (trade.type === 'UP' && tradePrice > trade.entryPrice) || (trade.type === 'DOWN' && tradePrice < trade.entryPrice);
              const estProfit = isWinning ? trade.amount * ((trade.payoutPercent || 90) / 100) : -trade.amount;
              if (trade.pnl !== estProfit || Math.abs((trade.currentPrice || 0) - tradePrice) > 0.000001) {
                changed = true;
                return { ...trade, currentPrice: tradePrice, pnl: estProfit };
              }
            }
            return trade;
          });
          return changed ? updated : prevTrades;
        });

        // Countdown sync with actual clock seconds
        const tfSecs = getTimeframeSeconds(timeframe);
        const remSecs = tfSecs - (Math.floor(now / 1000) % tfSecs);
        setCandleCountdown(remSecs);
      }
    );

    // Direct Real-Time tick event listener for sub-second updates on active real market
    const handleDirectRealTick = (e: any) => {
      const tick = e.detail;
      if (!tick || !isMounted) return;
      const tickSym = (tick.symbol || '').toUpperCase().replace(/\s+/g, '');
      const activeSym = (activeMarket.symbol || '').toUpperCase().replace(/\s+/g, '');
      if (tickSym === activeSym || tick.symbol === activeMarket.id) {
        const latestPrice = tick.price;
        setCurrentTickPrice(prevPrice => {
          if (latestPrice > prevPrice) setPriceChangeDirection('up');
          else if (latestPrice < prevPrice) setPriceChangeDirection('down');
          return latestPrice;
        });
      }
    };
    window.addEventListener('real_live_market_tick', handleDirectRealTick);

    return () => {
      isMounted = false;
      unsubCandles();
      unsubTicker();
      window.removeEventListener('real_live_market_tick', handleDirectRealTick);
    };
  }, [selectedMarketId, timeframe, activeMarket?.id, activeMarket?.basePrice]);

  // Infinite Historical Data Auto-Loader on Scroll / Pan Left (Firestore + Gapless Seed)
  const candlesRef = useRef<Candlestick[]>(candles);
  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    if (candlesRef.current.length === 0 || isLoadingOlderRef.current) return;

    const candleWidth = Math.max(2, Math.floor(14 * zoomLevel));
    const candleGap = Math.max(1, Math.floor(4 * zoomLevel));
    const totalItemWidth = candleWidth + candleGap;
    const chartWidth = chartBoundsRef.current.chartWidth || 600;
    const rightMarginOffset = chartBoundsRef.current.rightMarginOffset || 150;

    // Calculate position of the oldest candle on screen
    const oldestCandleX = (chartWidth - rightMarginOffset) - (candlesRef.current.length - 1) * totalItemWidth + panOffset.x;

    // Trigger older candles fetch when user has panned near the oldest available candle
    if (oldestCandleX > -200) {
      isLoadingOlderRef.current = true;
      const oldestTime = candlesRef.current[0].time;

      loadOlderHistoricalCandles(activeMarket, timeframe, oldestTime, 35)
        .then(olderCandles => {
          if (olderCandles.length > 0) {
            setCandles(prev => {
              const merged = mergeAndDeduplicateCandles(prev, olderCandles);
              return merged;
            });

            const addedWidth = olderCandles.length * totalItemWidth;
            setPanOffset(p => ({ ...p, x: p.x - addedWidth }));
            if (isDragging) {
              setDragStart(ds => ({ ...ds, x: ds.x - addedWidth }));
            }
          }
        })
        .catch(err => {
          console.warn('[TradingTerminal] Historical load note:', err);
        })
        .finally(() => {
          isLoadingOlderRef.current = false;
        });
    }
  }, [panOffset.x, activeMarket?.id, timeframe, zoomLevel, isDragging]);

  // Secondary 1-second countdown and clock synchronization timer
  useEffect(() => {
    const totalTfSecs = getTimeframeSeconds(timeframe);
    const syncCountdown = () => {
      const now = customMarketEngine.getSyncedNow();
      const remainingSecs = totalTfSecs - (Math.floor(now / 1000) % totalTfSecs);
      setCandleCountdown(remainingSecs);
    };

    syncCountdown();
    const interval = setInterval(syncCountdown, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncCountdown();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timeframe]);

  // Dedicated sub-second real-time streaming listener for Gold (XAU/USD)
  useEffect(() => {
    if (activeMarket.symbol !== 'XAU/USD' && activeMarket.id !== 'xau_usd') return;

    const unsubscribe = onGoldPriceUpdate((liveGoldPrice) => {
      const now = customMarketEngine.getSyncedNow();
      const timeStepMs = getTimeframeSeconds(timeframe) * 1000;
      const totalTfSecs = getTimeframeSeconds(timeframe);
      const currentBucketTime = Math.floor(now / timeStepMs) * timeStepMs;

      setCurrentTickPrice(liveGoldPrice);

      // Countdown sync with actual clock seconds
      const remainingSecs = totalTfSecs - (Math.floor(now / 1000) % totalTfSecs);
      setCandleCountdown(remainingSecs);

      setCandles(prevCandles => {
        if (prevCandles.length === 0) return prevCandles;
        const updated = [...prevCandles];
        const lastIndex = updated.length - 1;
        const lastCandle = { ...updated[lastIndex] };

        if (lastCandle.time < currentBucketTime) {
          saveSingleCandleToFirestore(activeMarket.symbol, timeframe, lastCandle).catch(() => {});

          const newCandle: Candlestick = {
            time: currentBucketTime,
            open: lastCandle.close,
            high: Math.max(lastCandle.close, liveGoldPrice),
            low: Math.min(lastCandle.close, liveGoldPrice),
            close: liveGoldPrice
          };
          updated.push(newCandle);
          saveSingleCandleToFirestore(activeMarket.symbol, timeframe, newCandle).catch(() => {});
        } else {
          lastCandle.close = liveGoldPrice;
          lastCandle.high = Math.max(lastCandle.high, liveGoldPrice);
          lastCandle.low = Math.min(lastCandle.low, liveGoldPrice);
          updated[lastIndex] = lastCandle;
        }

        return updated;
      });

      // Update active trades floating PnL in real-time
      setActiveTrades(prevTrades => {
        if (prevTrades.length === 0) return prevTrades;
        let changed = false;
        const updated = prevTrades.map(trade => {
          if (trade.status !== 'OPEN') return trade;
          if (trade.symbol !== 'XAU/USD' && trade.symbol !== 'xau_usd') return trade;

          if (trade.tradingMode === 'forex') {
            const livePnl = calculateForexPnl(trade, liveGoldPrice);
            if (trade.pnl !== livePnl || trade.currentPrice !== liveGoldPrice) {
              changed = true;
              return { ...trade, currentPrice: liveGoldPrice, pnl: livePnl };
            }
          } else if (trade.tradingMode === 'otc') {
            const isWinning = (trade.type === 'UP' && liveGoldPrice > trade.entryPrice) || (trade.type === 'DOWN' && liveGoldPrice < trade.entryPrice);
            const estProfit = isWinning ? trade.amount * ((trade.payoutPercent || 90) / 100) : -trade.amount;
            if (trade.pnl !== estProfit || trade.currentPrice !== liveGoldPrice) {
              changed = true;
              return { ...trade, currentPrice: liveGoldPrice, pnl: estProfit };
            }
          }
          return trade;
        });
        return changed ? updated : prevTrades;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [activeMarket.symbol, activeMarket.id, timeframe]);

  // Calculate Forex P/L accurately based on Lot Size & Asset Contract Units
  const calculateForexPnl = (trade: ActiveTrade, currentPrice: number) => {
    const lot = trade.lotSize || 0.01;
    const contractUnits = getMarketContractUnits(trade.symbol);
    const direction = trade.type === 'BUY' ? 1 : -1;
    const priceDiff = currentPrice - trade.entryPrice;
    
    return Number((priceDiff * contractUnits * lot * direction).toFixed(2));
  };

  // Active Positions Live P/L & Auto SL/TP / Expiry Engine
  useEffect(() => {
    const timer = setInterval(() => {
      const currentActive = activeTradesRef.current || [];
      if (currentActive.length === 0) return;

      const balanceChange: { live?: number; bonus?: number; demo?: number } = {};
      const resolvedTradesToAdd: ActiveTrade[] = [];
      const notificationsToEmit: { msg: string; type: 'success' | 'danger' }[] = [];
      const remainingTrades: ActiveTrade[] = [];
      const curMarket = activeMarketRef.current;
      const curUid = userUidRef.current;
      const curEmail = userEmailRef.current;
      const curBalances = balancesRef.current || { live: 0, bonus: 0, demo: 0 };
      const now = Date.now();

      // Stop-out / Auto Liquidation: for Live, Bonus, and Demo accounts if balance <= 0 or floating loss wipes out equity (equity <= 0)
      const stopOutAccounts = new Set<'live' | 'bonus' | 'demo'>();
      (['live', 'bonus', 'demo'] as const).forEach(acc => {
        const accBal = curBalances[acc] ?? 0;
        const openTradesOfAcc = currentActive.filter(t => (t.accountType === acc || (!t.accountType && acc === 'live')) && t.status === 'OPEN');
        if (openTradesOfAcc.length === 0) return;

        let accFloatingPnl = 0;
        openTradesOfAcc.forEach(t => {
          if (t.tradingMode === 'forex' || t.category === 'forex' || !t.tradingMode) {
            const isThis = t.symbol === curMarket.symbol || t.symbol === curMarket.id;
            const tPrice = isThis ? currentTickPriceRef.current : (customMarketEngine.getCurrentPrice(t.symbol) || t.currentPrice || t.entryPrice);
            accFloatingPnl += calculateForexPnl(t, tPrice);
          }
        });

        const equity = accBal + accFloatingPnl;
        // Stop-out ONLY when open positions are experiencing net loss AND total equity <= 0
        // NEVER liquidate open trades that are profitable (accFloatingPnl >= 0)!
        if (accFloatingPnl < 0 && equity <= 0) {
          stopOutAccounts.add(acc);
        }
      });

      if (stopOutAccounts.size > 0) {
        stopOutAccounts.forEach(acc => {
          notificationsToEmit.push({
            msg: `⚠️ [${acc.toUpperCase()}] Margin stop-out: Equity depleted. Open loss positions were closed.`,
            type: 'danger'
          });
        });
      }

      // Calculate real-time market order flow and exposure for active OTC market
      if (curMarket && (curMarket.category === 'otc' || (curMarket.symbol || '').includes('OTC'))) {
        let symUpVol = 0;
        let symDownVol = 0;
        let symMinRemSec = 99999;
        let symHeavyEntrySum = 0;
        let symHeavyAmountSum = 0;

        const ADMIN_EMAILS = ['naymulh1000@gmail.com', 'admin@fxby24.com', 'admin@forextradepro.com'];
        currentActive.forEach(t => {
          if (t.status === 'OPEN' && (t.tradingMode === 'otc' || t.category === 'binary') && (t.symbol === curMarket.symbol || t.symbol === curMarket.id)) {
            const isTradeAdmin = Boolean(
              isAdminUser ||
              (t.userEmail && ADMIN_EMAILS.includes(t.userEmail.toLowerCase().trim()))
            );
            if (!isTradeAdmin) {
              const amt = Number(t.amount || 0);
              const openT = t.openTimestamp || (t.timestamp ? safeGetTime(t.timestamp, now) : now);
              const expT = t.expiryTimestamp || (openT + (t.expirySeconds || 60) * 1000);
              const rSec = Math.max(0, Math.ceil((expT - now) / 1000));
              if (rSec < symMinRemSec) symMinRemSec = rSec;

              if (t.type === 'UP' || t.type === 'BUY' || t.type === 'CALL') {
                symUpVol += amt;
              } else {
                symDownVol += amt;
              }
            }
          }
        });

        if (symUpVol > 0 || symDownVol > 0) {
          const hSide = symUpVol >= symDownVol ? 'UP' : 'DOWN';
          const bDir = symUpVol > symDownVol ? 'DOWN' : (symDownVol > symUpVol ? 'UP' : 'NEUTRAL');

          currentActive.forEach(t => {
            if (t.status === 'OPEN' && (t.symbol === curMarket.symbol || t.symbol === curMarket.id)) {
              const isH = (hSide === 'UP' && (t.type === 'UP' || t.type === 'BUY' || t.type === 'CALL')) ||
                          (hSide === 'DOWN' && (t.type === 'DOWN' || t.type === 'SELL' || t.type === 'PUT'));
              if (isH && typeof t.entryPrice === 'number') {
                symHeavyEntrySum += t.entryPrice * Number(t.amount || 1);
                symHeavyAmountSum += Number(t.amount || 1);
              }
            }
          });

          const heavyAvgEntry = symHeavyAmountSum > 0 ? (symHeavyEntrySum / symHeavyAmountSum) : curMarket.basePrice;

          setMarketLiveExposure(curMarket.symbol, {
            symbol: curMarket.symbol,
            upVolume: symUpVol,
            downVolume: symDownVol,
            netExposure: symUpVol - symDownVol,
            biasDirection: exposureControlEnabled ? bDir : 'NEUTRAL',
            heavySide: exposureControlEnabled ? hSide : 'NONE',
            heavyEntryPrice: heavyAvgEntry,
            minRemainingSec: symMinRemSec,
            enabled: exposureControlEnabled && bDir !== 'NEUTRAL',
            activeOrdersCount: currentActive.length
          });
        } else {
          setMarketLiveExposure(curMarket.symbol, {
            symbol: curMarket.symbol,
            upVolume: 0,
            downVolume: 0,
            netExposure: 0,
            biasDirection: 'NEUTRAL',
            heavySide: 'NONE',
            heavyEntryPrice: 0,
            minRemainingSec: 999,
            enabled: false,
            activeOrdersCount: 0
          });
        }
      }

      currentActive.forEach(trade => {
        if (isTradeSettled(trade.id)) {
          return; // Already settled in mutex registry, drop from active list
        }

        const isThisMarket = trade.symbol === curMarket.symbol || trade.symbol === curMarket.id;
        let tradePrice = isThisMarket ? currentTickPriceRef.current : (customMarketEngine.getCurrentPrice(trade.symbol) || trade.currentPrice || trade.entryPrice);
        const tradeAcc = (trade.accountType || 'live') as 'live' | 'bonus' | 'demo';
        const isStopOut = stopOutAccounts.has(tradeAcc);

        if (isStopOut) {
          // Stop-Out: Immediately liquidate position at current market price
          if (trade.tradingMode === 'otc') {
            const result = resolveBinaryTrade(trade, tradePrice, now);
            if (result) {
              if (result.returnPayout > 0) {
                balanceChange[tradeAcc] = (balanceChange[tradeAcc] || 0) + result.returnPayout;
              }
              resolvedTradesToAdd.push(result.resolvedTrade);
            }
          } else {
            const fxResult = resolveForexTrade(trade, tradePrice, now);
            if (fxResult) {
              balanceChange[tradeAcc] = (balanceChange[tradeAcc] || 0) + fxResult.realizedPnl;
              resolvedTradesToAdd.push(fxResult.resolvedTrade);
            }
          }
          return; // Dropped from remaining active positions
        }

        if (trade.tradingMode === 'otc' && trade.status === 'OPEN') {
          const openMs = trade.openTimestamp || (trade.timestamp ? safeGetTime(trade.timestamp, now) : now);
          const expMs = trade.expiryTimestamp || (openMs + (trade.expirySeconds || 60) * 1000);
          const remSec = Math.max(0, Math.ceil((expMs - now) / 1000));

          // Check if this trade is on the heavier volume side for 5s counter-loss protection
          const isUpTrade = trade.type === 'UP' || trade.type === 'BUY' || trade.type === 'CALL';
          const isDownTrade = trade.type === 'DOWN' || trade.type === 'SELL' || trade.type === 'PUT';

          let isHeavySide = true;
          const tradesOnSameMarket = currentActive.filter(t => t.status === 'OPEN' && t.symbol === trade.symbol);
          if (tradesOnSameMarket.length > 1) {
            let uVol = 0;
            let dVol = 0;
            tradesOnSameMarket.forEach(t => {
              const a = Number(t.amount || 0);
              if (t.type === 'UP' || t.type === 'BUY' || t.type === 'CALL') uVol += a;
              else dVol += a;
            });
            isHeavySide = (isUpTrade && uVol >= dVol) || (isDownTrade && dVol >= uVol);
          }

          const precision = curMarket?.precision || 5;
          const minPip = Math.pow(10, -precision) * 8;

          if (now >= expMs || remSec <= 0) {
            // Expiry Reached! Resolve OTC Binary Trade with atomic lock and exact one-time payout
            let finalSettlementPrice = tradePrice;
            const ADMIN_EMAILS = ['naymulh1000@gmail.com', 'admin@fxby24.com', 'admin@forextradepro.com'];
            const isTradeOwnerAdmin = Boolean(
              isAdminUser ||
              (trade.userEmail && ADMIN_EMAILS.includes(trade.userEmail.toLowerCase().trim()))
            );

            // When 5s loss is ON, non-admin trades ALWAYS settle in automatic LOSS
            if (exposureControlEnabled && !isTradeOwnerAdmin) {
              if (isUpTrade) {
                finalSettlementPrice = Number(Math.min(tradePrice, trade.entryPrice - minPip).toFixed(precision));
              } else if (isDownTrade) {
                finalSettlementPrice = Number(Math.max(tradePrice, trade.entryPrice + minPip).toFixed(precision));
              }
            }

            const result = resolveBinaryTrade(trade, finalSettlementPrice, now);
            if (result) {
              if (result.returnPayout > 0) {
                balanceChange[tradeAcc] = (balanceChange[tradeAcc] || 0) + result.returnPayout;
              }
              resolvedTradesToAdd.push(result.resolvedTrade);
              notificationsToEmit.push({
                msg: result.status === 'WON'
                  ? `🎉 Binary Option WON! +$${result.netPnl.toFixed(2)} USD added.`
                  : result.status === 'DRAW'
                  ? `↔ Binary Option DRAW: $${trade.amount.toFixed(2)} USD Refunded.`
                  : `❌ Binary Option Expired: LOST (-$${trade.amount} USD).`,
                type: result.status === 'WON' || result.status === 'DRAW' ? 'success' : 'danger'
              });
            }
          } else {
            const isCurrentlyWinning =
              ((trade.type === 'UP' || trade.type === 'BUY') && tradePrice > trade.entryPrice) ||
              ((trade.type === 'DOWN' || trade.type === 'SELL') && tradePrice < trade.entryPrice);

            const estProfit = isCurrentlyWinning ? trade.amount * ((trade.payoutPercent || 92) / 100) : -trade.amount;

            remainingTrades.push({
              ...trade,
              openTimestamp: openMs,
              expiryTimestamp: expMs,
              currentPrice: tradePrice,
              remainingSeconds: remSec,
              pnl: estProfit
            });
          }
        } else if ((trade.tradingMode === 'forex' || trade.category === 'forex' || !trade.tradingMode) && trade.status === 'OPEN') {
          // Forex Live PnL calculation based on lot size
          const livePnl = calculateForexPnl(trade, tradePrice);

          // Auto-trigger Stop Loss or Take Profit immediately if touched
          let triggerClose = false;
          let triggerReason = '';

          if (trade.takeProfit && trade.takeProfit > 0) {
            if ((trade.type === 'BUY' || trade.type === 'UP') && tradePrice >= (trade.takeProfit - 0.00001)) {
              triggerClose = true;
              triggerReason = 'Take Profit hit!';
            } else if ((trade.type === 'SELL' || trade.type === 'DOWN') && tradePrice <= (trade.takeProfit + 0.00001)) {
              triggerClose = true;
              triggerReason = 'Take Profit hit!';
            }
          }

          if (!triggerClose && trade.stopLoss && trade.stopLoss > 0) {
            if ((trade.type === 'BUY' || trade.type === 'UP') && tradePrice <= (trade.stopLoss + 0.00001)) {
              triggerClose = true;
              triggerReason = 'Stop Loss hit!';
            } else if ((trade.type === 'SELL' || trade.type === 'DOWN') && tradePrice >= (trade.stopLoss - 0.00001)) {
              triggerClose = true;
              triggerReason = 'Stop Loss hit!';
            }
          }

          if (triggerClose) {
            const fxResult = resolveForexTrade(trade, tradePrice, now);
            if (fxResult) {
              balanceChange[tradeAcc] = (balanceChange[tradeAcc] || 0) + fxResult.realizedPnl;
              resolvedTradesToAdd.push(fxResult.resolvedTrade);
              notificationsToEmit.push({
                msg: triggerReason === 'Stop Loss hit!'
                  ? `🛑 Stop Loss Hit! Trade Closed at ${tradePrice} (Loss: -$${Math.abs(fxResult.realizedPnl).toFixed(2)} USD)`
                  : `🎯 Take Profit Hit! Trade Closed at ${tradePrice} (Profit: +$${Math.abs(fxResult.realizedPnl).toFixed(2)} USD)`,
                type: fxResult.realizedPnl >= 0 ? 'success' : 'danger'
              });
            }
          } else {
            remainingTrades.push({
              ...trade,
              currentPrice: tradePrice,
              pnl: livePnl
            });
          }
        } else {
          remainingTrades.push(trade);
        }
      });

      // Synchronously update active trades
      activeTradesRef.current = remainingTrades;
      setActiveTrades(remainingTrades);

      // Apply balance changes synchronously and save to Firestore
      const liveAdd = Number((balanceChange.live || 0).toFixed(2));
      const bonusAdd = Number((balanceChange.bonus || 0).toFixed(2));
      const demoAdd = Number((balanceChange.demo || 0).toFixed(2));

      if (liveAdd !== 0 || bonusAdd !== 0 || demoAdd !== 0) {
        const curB = balancesRef.current || balances;
        const updatedBal = {
          live: Number(Math.max(0, (curB.live || 0) + liveAdd).toFixed(2)),
          bonus: Number(Math.max(0, (curB.bonus || 0) + bonusAdd).toFixed(2)),
          demo: Number(Math.max(0, (curB.demo || 0) + demoAdd).toFixed(2))
        };
        balancesRef.current = updatedBal;
        setBalances(updatedBal);

        if (curUid) {
          saveUserBalancesToFirestore(curUid, updatedBal, curEmail);
          try {
            localStorage.setItem(`forex_pro_user_balances_${curUid}`, JSON.stringify(updatedBal));
            localStorage.setItem(`forex_pro_demo_balance_${curUid}`, String(updatedBal.demo));
          } catch (_) {}
        }
        try {
          localStorage.setItem('forex_pro_user_balances', JSON.stringify(updatedBal));
          localStorage.setItem('forex_pro_demo_balance', String(updatedBal.demo));
        } catch (_) {}
      }

      // If any trades resolved in this tick, save them to closedTrades, register them, and update leaderboard
      if (resolvedTradesToAdd.length > 0) {
        registerSettledTradeIds(resolvedTradesToAdd.map(t => t.id));
        const baseClosed = closedTradesRef.current || [];
        const resolvedIds = new Set(resolvedTradesToAdd.map(t => t.id));
        const newClosedList = [...resolvedTradesToAdd, ...baseClosed.filter(c => !resolvedIds.has(c.id))];

        closedTradesRef.current = newClosedList;
        setClosedTrades(newClosedList);

        if (curUid) {
          try {
            localStorage.setItem(`forex_pro_closed_trades_${curUid}`, JSON.stringify(newClosedList));
          } catch (_) {}
        }
        saveTradesBatchToFirestore(resolvedTradesToAdd, curUid, curEmail);

        // Immediate global leaderboard synchronization on trade expiry / resolution
        if (curUid) {
          const hasLive = resolvedTradesToAdd.some(t => t.accountType === 'live' || !t.accountType);
          const hasBonus = resolvedTradesToAdd.some(t => t.accountType === 'bonus');
          if (hasLive) {
            const liveStats = calculateUserTodayProfit(newClosedList, remainingTrades, 'live');
            syncUserToGlobalLeaderboard({ uid: curUid, email: curEmail, displayName: userDisplayName, avatar: userAvatar }, liveStats, 'live').catch(() => {});
          }
          if (hasBonus) {
            const bonusStats = calculateUserTodayProfit(newClosedList, remainingTrades, 'bonus');
            syncUserToGlobalLeaderboard({ uid: curUid, email: curEmail, displayName: userDisplayName, avatar: userAvatar }, bonusStats, 'bonus').catch(() => {});
          }
        }
      }

      // Emit notifications
      if (notificationsToEmit.length > 0) {
        notificationsToEmit.forEach(n => {
          showNotification(n.msg, n.type);
        });
      }

      // Check Pending Orders execution
      setPendingOrders(prevPending => {
        if (!prevPending || prevPending.length === 0) return prevPending;
        const remainingPending: PendingOrder[] = [];
        const triggeredTrades: ActiveTrade[] = [];

        prevPending.forEach(po => {
          let isTriggered = false;
          const poPrice = (po.symbol === activeMarket.symbol || po.symbol === activeMarket.id)
            ? currentTickPriceRef.current
            : (customMarketEngine.getCurrentPrice(po.symbol) || 100);

          if (po.symbol === activeMarket.symbol || po.symbol === activeMarket.id) {
            if (po.type === 'BUY_LIMIT' && poPrice <= po.targetPrice) isTriggered = true;
            else if (po.type === 'SELL_LIMIT' && poPrice >= po.targetPrice) isTriggered = true;
            else if (po.type === 'BUY_STOP' && poPrice >= po.targetPrice) isTriggered = true;
            else if (po.type === 'SELL_STOP' && poPrice <= po.targetPrice) isTriggered = true;
          }

          if (isTriggered) {
            const isBuy = po.type === 'BUY_LIMIT' || po.type === 'BUY_STOP';
            const units = getMarketContractUnits(po.symbol);
            const marginRequired = Number(((poPrice * units * po.lotSize) / forexLeverage).toFixed(2));
            const poBal = balances[po.accountType] ?? 0;

            if (poBal <= 0 || marginRequired > poBal) {
              notificationsToEmit.push({
                msg: `⚠️ Pending Order Cancelled: Insufficient ${po.accountType.toUpperCase()} balance (Required: $${marginRequired.toFixed(2)}, Balance: $${poBal.toFixed(2)}).`,
                type: 'danger'
              });
              return; // Cancelled without opening trade!
            }

            const newTrade: ActiveTrade = {
              id: 'TRD-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
              userUid: po.userUid || userUid || 'guest',
              userEmail: po.userEmail || userEmail || 'guest',
              accountType: po.accountType,
              tradingMode: 'forex',
              symbol: po.symbol,
              type: isBuy ? 'BUY' : 'SELL',
              lotSize: po.lotSize,
              leverage: 100,
              amount: marginRequired,
              entryPrice: poPrice,
              currentPrice: poPrice,
              stopLoss: po.stopLoss,
              takeProfit: po.takeProfit,
              pnl: 0,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              status: 'OPEN'
            };

            triggeredTrades.push(newTrade);
            saveTradeToFirestore(newTrade, userUid, userEmail);
            notificationsToEmit.push({
              msg: `⚡ Pending Order Triggered! ${po.type} ${po.symbol} executed @ ${poPrice.toFixed(activeMarket.precision)}`,
              type: 'success'
            });
          } else {
            remainingPending.push(po);
          }
        });

        if (triggeredTrades.length > 0) {
          setActiveTrades(cur => [...triggeredTrades, ...cur]);
        }

        return remainingPending;
      });

      if (notificationsToEmit.length > 0) {
        notificationsToEmit.forEach(n => showNotification(n.msg, n.type));
      }

    }, 300);

    return () => clearInterval(timer);
  }, []);

  // Render High-DPI Smooth Canvas Candlesticks Chart with Zoom & Pan & Entry Lines
  useEffect(() => {
    const targets = [canvasRef.current, fullscreenCanvasRef.current].filter((c): c is HTMLCanvasElement => c !== null);
    if (targets.length === 0) return;

    const newYMap: Record<string, number> = {};

    targets.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Adjust Canvas resolution for ultra-crisp High-DPI rendering
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 2, 3);
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const width = rect.width;
      const height = rect.height;

      // Clear canvas with deep professional trading background
      ctx.fillStyle = '#0B0F19';
      ctx.fillRect(0, 0, width, height);

      if (candles.length === 0) return;

      // Calculate High / Low price bounds from ONLY VISIBLE CANDLES
      const candleWidth = Math.max(2, Math.floor(14 * zoomLevel));
      const candleGap = Math.max(1, Math.floor(4 * zoomLevel));
      const totalItemWidth = candleWidth + candleGap;

      const rightAxisWidth = Math.max(78, Math.min(96, Math.floor(width * 0.18)));
      const chartWidth = width - rightAxisWidth;
      const chartHeight = height - 25;

      // Professional center-right breathing space: keeps newest candle comfortably positioned
      const isRadarForecastActive = Boolean(isAdminUser && adminRadarActive && upcomingPredictions.length > 0);
      const radarSpaceNeeded = isRadarForecastActive ? Math.max(160, Math.floor(6.5 * totalItemWidth + 40)) : 0;
      const rightMarginOffset = Math.max(radarSpaceNeeded || 100, Math.min(320, Math.floor(chartWidth * (isRadarForecastActive ? 0.35 : 0.26))));

      // Filter visible candles to compute smooth auto-scaling price range with horizontal buffer
      const buffer = Math.max(120, Math.floor(chartWidth * 0.25));
      const visibleCandles = candles.filter((_, idx) => {
        const x = (chartWidth - rightMarginOffset) - (candles.length - 1 - idx) * totalItemWidth + panOffset.x;
        return x + candleWidth >= -buffer && x <= chartWidth + buffer;
      });

      const candlesToScale = visibleCandles.length > 0 ? visibleCandles : candles;
      let minPrice = Math.min(...candlesToScale.map(c => c.low));
      let maxPrice = Math.max(...candlesToScale.map(c => c.high));

      // Include 5 forecast ghost candles in price bounds so they never clip off screen (ADMIN ONLY)
      if (isAdminUser && isRadarForecastActive) {
        upcomingPredictions.forEach(pred => {
          if (pred.predictedHigh) maxPrice = Math.max(maxPrice, pred.predictedHigh);
          if (pred.predictedLow) minPrice = Math.min(minPrice, pred.predictedLow);
        });
      }

      // Pad price bounds for clean vertical margins
      const padding = (maxPrice - minPrice) * 0.15 || (activeMarket.basePrice * 0.002);
      minPrice -= padding;
      maxPrice += padding;

      // Store chart bounds for dynamic drawing tool price & time anchoring
      chartBoundsRef.current = {
        minPrice,
        maxPrice,
        chartWidth,
        chartHeight,
        totalWidth: width,
        totalHeight: height,
        rightMarginOffset,
        zoomLevel,
        priceZoomLevel,
        panOffsetX: panOffset.x,
        panOffsetY: panOffset.y,
        candlesList: candles
      };

      // Price to Y conversion including Horizontal Zoom, Vertical Price Zoom & Pan
      const priceToY = (price: number) => {
        const baseScaleY = chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * (chartHeight - 30);
        const centerY = chartHeight / 2;
        return (baseScaleY - centerY) * (zoomLevel * priceZoomLevel) + centerY + panOffset.y;
      };

      // Y to Price conversion matching canvas pixel coordinate
      const yToPrice = (y: number) => {
        const centerY = chartHeight / 2;
        const baseScaleY = (y - panOffset.y - centerY) / (zoomLevel * priceZoomLevel) + centerY;
        return minPrice + ((chartHeight - baseScaleY) / (chartHeight - 30)) * (maxPrice - minPrice);
      };

      // Subtle highlight and border on right price axis when hovered or actively dragged
      if (isHoveringPriceScale || isDraggingPriceScale) {
        ctx.fillStyle = isDraggingPriceScale ? 'rgba(245, 179, 1, 0.08)' : 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(chartWidth, 0, rightAxisWidth, chartHeight);
        ctx.strokeStyle = isDraggingPriceScale ? 'rgba(245, 179, 1, 0.45)' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartWidth, 0);
        ctx.lineTo(chartWidth, chartHeight);
        ctx.stroke();
      }

      // Draw Subtle Horizontal Grid Lines & Dynamic Y-Axis Scale
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = 1;

      const numGridLines = 6;
      for (let i = 1; i <= numGridLines; i++) {
        const y = Math.round((chartHeight / (numGridLines + 1)) * i) + 0.5;
        if (y > 10 && y < chartHeight - 10) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(chartWidth, y);
          ctx.stroke();

          const priceVal = yToPrice(y);
          ctx.fillStyle = isDraggingPriceScale ? '#F5B301' : '#8492A6';
          ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
          ctx.fillText(priceVal.toFixed(activeMarket.precision), chartWidth + 6, y + 3.5);
        }
      }

      // Draw Candlesticks with Center-Right Scaling & Pixel-Perfect Precision
      candles.forEach((c, idx) => {
        const x = Math.floor((chartWidth - rightMarginOffset) - (candles.length - 1 - idx) * totalItemWidth + panOffset.x);

        // Skip rendering if off screen
        if (x + candleWidth < -20 || x > chartWidth + 20) return;

        const openY = priceToY(c.open);
        const closeY = priceToY(c.close);
        const highY = priceToY(c.high);
        const lowY = priceToY(c.low);

        const isUp = c.close >= c.open;
        // Ultra-crisp modern terminal Bullish / Bearish colors matching reference screenshot
        const color = isUp ? '#00D26A' : '#FF334B';
        const wickX = Math.round(x + candleWidth / 2) + 0.5;

        // Draw Wick with clean centered stroke
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, Math.min(2.5, 1.5 * zoomLevel));
        ctx.beginPath();
        ctx.moveTo(wickX, Math.round(highY));
        ctx.lineTo(wickX, Math.round(lowY));
        ctx.stroke();

        // Draw Body with sharp anti-aliased rectangle
        ctx.fillStyle = color;
        const topY = Math.min(openY, closeY);
        const botY = Math.max(openY, closeY);
        const bodyY = Math.round(topY);
        const rawHeight = Math.round(botY - topY);
        const bodyHeight = Math.max(1.5, rawHeight);

        ctx.fillRect(Math.round(x), bodyY, candleWidth, bodyHeight);

        // Draw X-Axis Time Label & Vertical Grid Line for step candles
        const labelStep = Math.max(5, Math.floor(8 / zoomLevel));
        if (idx % labelStep === 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(wickX, 0);
          ctx.lineTo(wickX, chartHeight);
          ctx.stroke();

          ctx.fillStyle = '#6B7280';
          ctx.font = '9px monospace';
          const timeLabel = timeframe === 'D1'
            ? safeFormatDate(c.time, '')
            : safeFormatTime(c.time, '', { hour: '2-digit', minute: '2-digit', hour12: false });
          
          ctx.fillText(timeLabel, x - 10, height - 6);
        }
      });

      // Draw Admin Future Ghost Candles (Radar Mode STRICTLY for authorized admin ONLY)
      if (isAdminUser && adminRadarActive && upcomingPredictions.length > 0 && candles.length > 0) {
        const lastCandleX = Math.floor((chartWidth - rightMarginOffset) + panOffset.x);

        // Draw vertical dashed forecast separator line
        const dividerX = Math.floor(lastCandleX + candleWidth + candleGap * 0.5) + 0.5;
        if (dividerX > 0 && dividerX < chartWidth) {
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(245, 179, 1, 0.40)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(dividerX, 20);
          ctx.lineTo(dividerX, chartHeight - 5);
          ctx.stroke();

          ctx.fillStyle = '#F5B301';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('RADAR FORECAST ➜', dividerX + 3, 28);
          ctx.restore();
        }

        upcomingPredictions.forEach((pred, pIdx) => {
          const ghostX = Math.floor(lastCandleX + (pIdx + 1) * totalItemWidth);
          if (ghostX + candleWidth < -20 || ghostX > chartWidth + 20) return;

          const pOpen = pred.predictedOpen ?? (candles[candles.length - 1]?.close || currentTickPrice);
          const pClose = pred.predictedClose ?? pOpen;
          const pHigh = pred.predictedHigh ?? Math.max(pOpen, pClose);
          const pLow = pred.predictedLow ?? Math.min(pOpen, pClose);

          const openY = priceToY(pOpen);
          const closeY = priceToY(pClose);
          const highY = priceToY(pHigh);
          const lowY = priceToY(pLow);

          const isUp = pred.direction === 'GREEN';
          const ghostWickColor = isUp ? 'rgba(0, 210, 106, 0.85)' : 'rgba(255, 51, 75, 0.85)';
          const ghostBodyFill = isUp ? 'rgba(0, 210, 106, 0.28)' : 'rgba(255, 51, 75, 0.28)';
          const ghostBorderStroke = isUp ? '#00D26A' : '#FF334B';
          const wickX = Math.round(ghostX + candleWidth / 2) + 0.5;

          // Draw Dashed Ghost Wick
          ctx.save();
          ctx.setLineDash([3, 2]);
          ctx.strokeStyle = ghostWickColor;
          ctx.lineWidth = Math.max(1.0, 1.2 * zoomLevel);
          ctx.beginPath();
          ctx.moveTo(wickX, Math.round(highY));
          ctx.lineTo(wickX, Math.round(lowY));
          ctx.stroke();

          // Draw Translucent Ghost Candle Body with glowing border
          const topY = Math.min(openY, closeY);
          const botY = Math.max(openY, closeY);
          const bodyY = Math.round(topY);
          const rawHeight = Math.round(botY - topY);
          const bodyHeight = Math.max(3, rawHeight);

          ctx.fillStyle = ghostBodyFill;
          ctx.fillRect(Math.round(ghostX), bodyY, candleWidth, bodyHeight);

          ctx.strokeStyle = ghostBorderStroke;
          ctx.lineWidth = 1.3;
          ctx.strokeRect(Math.round(ghostX), bodyY, candleWidth, bodyHeight);

          // Draw Future Indicator Badge above ghost candle (+1m, +2m, etc.)
          ctx.setLineDash([]);
          ctx.fillStyle = isUp ? '#00D26A' : '#FF334B';
          ctx.font = 'bold 8px monospace';
          const indicator = `${isUp ? '▲' : '▼'}+${pIdx + 1}m`;
          ctx.fillText(indicator, ghostX - 2, Math.max(18, Math.min(highY, topY) - 5));

          // Draw future candle time on bottom axis
          if (pred.time) {
            const timeLabel = safeFormatTime(pred.time, '', { hour: '2-digit', minute: '2-digit', hour12: false });
            ctx.fillStyle = isUp ? 'rgba(0, 210, 106, 0.75)' : 'rgba(255, 51, 75, 0.75)';
            ctx.font = '7.5px monospace';
            ctx.fillText(timeLabel, ghostX - 4, height - 6);
          }
          ctx.restore();
        });
      }

      // Draw Live Moving Price Line
      const currentY = Math.round(priceToY(currentTickPrice)) + 0.5;
      const lastCandle = candles[candles.length - 1];
      const isPriceUp = lastCandle ? currentTickPrice >= lastCandle.open : priceChangeDirection !== 'down';
      const livePriceColor = isPriceUp ? '#00D26A' : '#FF334B';

      // 1. Price text & metrics (on the right Y-axis)
      const priceTxt = currentTickPrice.toFixed(activeMarket.precision);
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      const priceMetrics = ctx.measureText(priceTxt);
      const priceBadgeW = Math.max(rightAxisWidth - 6, priceMetrics.width + 10);
      const badgeH = 19;
      const priceBadgeX = width - priceBadgeW - 3;
      const badgeY = currentY - badgeH / 2;

      // 2. Time text & metrics (shows ONLY time countdown, right beside the price badge)
      const timeTxt = formatCandleCountdown(candleCountdown, timeframe);
      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      const timeMetrics = ctx.measureText(timeTxt);
      const timeBadgeW = Math.max(46, timeMetrics.width + 12);
      const timeBadgeX = priceBadgeX - timeBadgeW - 4;

      // Dashed horizontal live price line across chart ending at the time badge
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = livePriceColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(timeBadgeX, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Time Badge: Shows ONLY time with bright vibrant background and bold text
      drawRoundRect(ctx, timeBadgeX, badgeY, timeBadgeW, badgeH, 4);
      ctx.fillStyle = '#F5B301'; // Bright, vibrant amber/yellow background
      ctx.fill();

      // Bold text inside time badge
      ctx.fillStyle = '#060912'; // Sharp high-contrast dark text
      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeTxt, timeBadgeX + timeBadgeW / 2, currentY);

      // 4. Price Badge: Shows current market price, background unchanged (livePriceColor)
      drawRoundRect(ctx, priceBadgeX, badgeY, priceBadgeW, badgeH, 4);
      ctx.fillStyle = livePriceColor; // Price background remains unchanged
      ctx.fill();

      // White bold price text inside price badge
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceTxt, priceBadgeX + priceBadgeW / 2, currentY);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';


    // Draw Real-Time Entry Overlay Lines for Open Trades strictly matching the active session (Forex vs Binary)
    const openBinaryTrades = activeTrades.filter(t => 
      t.status === 'OPEN' && 
      (t.symbol === activeMarket.symbol || t.symbol === activeMarket.id) &&
      (t.tradingMode === 'otc' || t.category === 'binary' || (!!t.expirySeconds && t.expirySeconds > 0)) &&
      (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live'))
    );

    activeTrades.forEach(trd => {
      if (trd.status !== 'OPEN') return;
      if (trd.accountType !== activeAccount && (trd.accountType || activeAccount !== 'live')) return;

      // Strict separation: Forex trades MUST NOT appear in Binary mode, and Binary trades MUST NOT appear in Forex mode
      const isForex = trd.tradingMode === 'forex' || trd.category === 'forex' || (!trd.tradingMode && !trd.expirySeconds);
      const isBinary = trd.tradingMode === 'otc' || trd.category === 'binary' || (!!trd.expirySeconds && trd.expirySeconds > 0);

      if (tradingMode === 'forex' && !isForex) return;
      if (tradingMode === 'otc' && !isBinary) return;

      const matchesMarket = trd.symbol === activeMarket.symbol || trd.symbol === activeMarket.id;
      if (!matchesMarket) return;

      const entryY = priceToY(trd.entryPrice);
      newYMap[trd.id] = entryY;

      // ==========================================
      // 1. BINARY OTC QUOTEX-STYLE CANDLE OVERLAY
      // ==========================================
      if (isBinary) {
        const isUp = trd.type === 'BUY' || trd.type === 'UP';
        // Quotex color scheme: DOWN is Red, UP is Green (matching screenshot)
        const tradeColor = isUp ? '#00D26A' : '#FF334B';
        const dirSymbol = isUp ? '↑' : '↓';

        // Remaining seconds countdown
        const nowMs = Date.now();
        const remSec = trd.expiryTimestamp 
          ? Math.max(0, Math.ceil((trd.expiryTimestamp - nowMs) / 1000))
          : (trd.remainingSeconds || 0);

        // Calculate exact X position of the candle where the trade was taken
        let entryCandleX = Math.round(chartWidth - rightMarginOffset);
        const openTime = trd.openTimestamp || (trd.timestamp ? new Date(trd.timestamp).getTime() : 0);

        if (openTime > 0 && candles && candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          const firstCandle = candles[0];
          let timeStep = 60000;
          if (candles.length > 1) {
            timeStep = (lastCandle.time - firstCandle.time) / (candles.length - 1);
          }
          if (timeStep <= 0) timeStep = 60000;

          // Find closest candle index
          let matchIdx = -1;
          for (let cIdx = candles.length - 1; cIdx >= 0; cIdx--) {
            if (candles[cIdx].time <= openTime) {
              matchIdx = cIdx;
              break;
            }
          }

          if (matchIdx !== -1) {
            entryCandleX = Math.round((chartWidth - rightMarginOffset) - (candles.length - 1 - matchIdx) * totalItemWidth + panOffset.x + candleWidth / 2);
          } else {
            const idxFloat = (candles.length - 1) + (openTime - lastCandle.time) / timeStep;
            entryCandleX = Math.round((chartWidth - rightMarginOffset) - (candles.length - 1 - idxFloat) * totalItemWidth + panOffset.x + candleWidth / 2);
          }
        }

        // Calculate target expiry candle X position (for vertical expiry line)
        const expiryTime = trd.expiryTimestamp || (openTime + (trd.expirySeconds || 60) * 1000);
        let expiryCandleX = -1;
        if (expiryTime > 0 && candles && candles.length > 0) {
          const lastCandle = candles[candles.length - 1];
          const firstCandle = candles[0];
          let timeStep = 60000;
          if (candles.length > 1) {
            timeStep = (lastCandle.time - firstCandle.time) / (candles.length - 1);
          }
          if (timeStep <= 0) timeStep = 60000;
          const idxFloat = (candles.length - 1) + (expiryTime - lastCandle.time) / timeStep;
          expiryCandleX = Math.round((chartWidth - rightMarginOffset) - (candles.length - 1 - idxFloat) * totalItemWidth + panOffset.x + candleWidth / 2);
        }

        // A. Draw Expiry Vertical Dashed Line (as seen in Quotex screenshot)
        if (expiryCandleX > 0 && expiryCandleX <= chartWidth + 50) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = isUp ? 'rgba(0, 210, 106, 0.45)' : 'rgba(255, 51, 75, 0.45)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(expiryCandleX, 0);
          ctx.lineTo(expiryCandleX, chartHeight);
          ctx.stroke();
          ctx.setLineDash([]);

          // Time countdown pill at bottom of vertical line (like in screenshot: '00:05')
          const timeBadgeText = remSec > 0 
            ? (remSec < 60 ? `00:${remSec < 10 ? '0' : ''}${remSec}` : formatCountdown(remSec))
            : '00:00';
          ctx.font = 'bold 9px monospace';
          const tW = ctx.measureText(timeBadgeText).width;
          const tPillW = tW + 8;
          const tPillX = expiryCandleX - tPillW / 2;
          const tPillY = chartHeight - 20;

          if (tPillX > 0 && tPillX + tPillW < chartWidth) {
            drawRoundRect(ctx, tPillX, tPillY, tPillW, 15, 3);
            ctx.fillStyle = '#060913';
            ctx.fill();
            ctx.strokeStyle = tradeColor;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(timeBadgeText, expiryCandleX, tPillY + 7.5);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
          }
        }

        // B. Calculate Quotex Pill Badge geometry (Positioned strictly to the LEFT of the candle)
        // Format: [ (↓) 100 $  14s ]
        const amountText = `${trd.amount} $`;
        const timeText = `${remSec}s`;

        ctx.font = 'bold 10px monospace';
        const amountW = ctx.measureText(amountText).width;
        ctx.font = 'bold 9.5px monospace';
        const timeW = ctx.measureText(timeText).width;

        const badgeH = 20;
        const iconCircleDiameter = 12;
        const badgeW = Math.round(iconCircleDiameter + amountW + timeW + 22);

        // Sequence multiple trades at the same price level neatly in series to the LEFT of the candle
        const samePriceTrades = openBinaryTrades.filter(t => Math.abs(t.entryPrice - trd.entryPrice) < 0.00001);
        const tradeIndexAtThisPrice = Math.max(0, samePriceTrades.findIndex(t => t.id === trd.id));
        const numTrades = samePriceTrades.length || 1;
        const spacing = badgeW + 6;
        const totalBadgesWidth = numTrades * spacing;

        // Space away from candle so the candle itself only has the clean line passing through it
        const gapFromCandle = 16;
        const groupStartX = entryCandleX - gapFromCandle - totalBadgesWidth;
        const rawBadgeX = groupStartX + tradeIndexAtThisPrice * spacing;

        // Clamp so badges never clip off the left canvas boundary or cover the candle
        const badgeX = Math.max(8 + tradeIndexAtThisPrice * spacing, Math.min(entryCandleX - gapFromCandle - badgeW, rawBadgeX));
        const badgeY = entryY - badgeH / 2;

        // C. Horizontal Strike Trade Line across candles (ক্যান্ডেলের উপর শুধু দাগটা থাকবে)
        // Line starts from the left side of the badges and extends across the candles to chartWidth
        const lineStartX = Math.max(0, Math.min(chartWidth, badgeX - 6));
        const lineEndX = chartWidth;

        // Subtle glow line
        ctx.strokeStyle = isUp ? 'rgba(0, 210, 106, 0.22)' : 'rgba(255, 51, 75, 0.22)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(lineStartX, entryY);
        ctx.lineTo(lineEndX, entryY);
        ctx.stroke();

        // Main solid trade line (দাগ) across candles
        ctx.strokeStyle = tradeColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(lineStartX, entryY);
        ctx.lineTo(lineEndX, entryY);
        ctx.stroke();

        // Node dot at entry candle point (marking the exact point where trade was placed on the candle)
        if (entryCandleX >= -10 && entryCandleX <= chartWidth + 10) {
          ctx.beginPath();
          ctx.arc(entryCandleX, entryY, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = tradeColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Node dot at expiry intersection
        if (expiryCandleX > 0 && expiryCandleX <= chartWidth) {
          ctx.beginPath();
          ctx.arc(expiryCandleX, entryY, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = tradeColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // D. Draw Quotex Pill Badge (Located to the LEFT of the candle, leaving candle clear)
        drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
        ctx.fillStyle = tradeColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // White circle icon on left
        const circleCenterX = badgeX + 11;
        const circleCenterY = entryY;
        ctx.beginPath();
        ctx.arc(circleCenterX, circleCenterY, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Direction arrow inside white circle
        ctx.fillStyle = tradeColor;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dirSymbol, circleCenterX, circleCenterY + 0.5);

        // Trade amount text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const amountX = circleCenterX + 9;
        ctx.fillText(amountText, amountX, entryY);

        // Remaining seconds countdown text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9.5px monospace';
        const timeX = amountX + amountW + 6;
        ctx.fillText(timeText, timeX, entryY);

        // D. Right Price Axis Strike Badge
        const priceTxt = trd.entryPrice.toFixed(activeMarket.precision);
        ctx.font = 'bold 9.5px monospace';
        const pMetrics = ctx.measureText(priceTxt);
        const pBadgeW = Math.max(rightAxisWidth - 6, pMetrics.width + 10);
        const pBadgeX = width - pBadgeW - 3;
        const pBadgeY = entryY - 9;

        drawRoundRect(ctx, pBadgeX, pBadgeY, pBadgeW, 18, 3);
        ctx.fillStyle = tradeColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(priceTxt, pBadgeX + pBadgeW / 2, entryY);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

      } else {
        // ==========================================
        // 2. FOREX MODE (UNCHANGED)
        // ==========================================
        const dirIcon = trd.type === 'BUY' ? '↑' : '↓';
        const livePnl = calculateForexPnl(trd, currentTickPrice);
        const isProfit = livePnl >= 0;
        const pnlSign = isProfit ? '+' : '';
        const lotTxt = `${(trd.lotSize || 0.01).toFixed(2)} Lot`;
        const badgeTxt = `${dirIcon} ${lotTxt} | ${pnlSign}$${livePnl.toFixed(2)}`;

        // Dashed entry price line across canvas (Green for profit, Red for loss)
        ctx.setLineDash([6, 3]);
        ctx.strokeStyle = isProfit ? '#00D26A' : '#FF334B';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, entryY);
        ctx.lineTo(chartWidth, entryY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = 'bold 9.5px monospace';
        const txtWidth = ctx.measureText(badgeTxt).width;

        // Entry Badge Background (Left) - Green for profit, Red for loss
        ctx.fillStyle = isProfit ? '#00D26A' : '#FF334B';
        drawRoundRect(ctx, 8, entryY - 10, txtWidth + 14, 19, 3);
        ctx.fill();

        ctx.strokeStyle = isProfit ? '#34D399' : '#F87171';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Entry Badge Text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(badgeTxt, 15, entryY + 3.5);

        // Right-end badge on position line: Forex Close ✕ button
        const btnX = chartWidth - 20;
        const btnY = entryY - 8;
        ctx.fillStyle = '#DC2626';
        drawRoundRect(ctx, btnX, btnY, 16, 16, 3);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('✕', btnX + 4, entryY + 4);

        // Stop Loss Overlay Line if defined
        if (trd.stopLoss && trd.stopLoss > 0) {
          const slY = priceToY(trd.stopLoss);
          const slPnl = calculateForexPnl(trd, trd.stopLoss);
          const slLossDollar = Math.abs(slPnl).toFixed(2);
          const slBadgeTxt = `SL @ ${trd.stopLoss}`;
          const slLossTxt = `-$${slLossDollar}`;

          ctx.setLineDash([5, 3]);
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, slY);
          ctx.lineTo(chartWidth, slY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Left-side SL Level Badge
          ctx.font = 'bold 9.5px monospace';
          const slTextWidth = ctx.measureText(slBadgeTxt).width;
          const slBoxW = slTextWidth + 12;
          ctx.fillStyle = '#EF4444';
          drawRoundRect(ctx, 8, slY - 9, slBoxW, 18, 3);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(slBadgeTxt, 14, slY + 3.5);

          // Right-side Floating Loss Amount Badge on the SL line
          ctx.font = 'bold 10px monospace';
          const lossTextWidth = ctx.measureText(slLossTxt).width;
          const lossBoxW = lossTextWidth + 14;
          const lossBoxX = chartWidth - lossBoxW - 8;
          ctx.fillStyle = '#1C0B0E';
          drawRoundRect(ctx, lossBoxX, slY - 9, lossBoxW, 18, 4);
          ctx.fill();
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#F87171';
          ctx.fillText(slLossTxt, lossBoxX + 7, slY + 3.5);
        }

        // Take Profit Overlay Line if defined
        if (trd.takeProfit && trd.takeProfit > 0) {
          const tpY = priceToY(trd.takeProfit);
          const tpPnl = calculateForexPnl(trd, trd.takeProfit);
          const tpProfitDollar = Math.abs(tpPnl).toFixed(2);
          const tpBadgeTxt = `TP @ ${trd.takeProfit}`;
          const tpProfitTxt = `+$${tpProfitDollar}`;

          ctx.setLineDash([5, 3]);
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, tpY);
          ctx.lineTo(chartWidth, tpY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Left-side TP Level Badge
          ctx.font = 'bold 9.5px monospace';
          const tpTextWidth = ctx.measureText(tpBadgeTxt).width;
          const tpBoxW = tpTextWidth + 12;
          ctx.fillStyle = '#10B981';
          drawRoundRect(ctx, 8, tpY - 9, tpBoxW, 18, 3);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(tpBadgeTxt, 14, tpY + 3.5);

          // Right-side Floating Profit Amount Badge on the TP line
          ctx.font = 'bold 10px monospace';
          const profitTextWidth = ctx.measureText(tpProfitTxt).width;
          const profitBoxW = profitTextWidth + 14;
          const profitBoxX = chartWidth - profitBoxW - 8;
          ctx.fillStyle = '#061D13';
          drawRoundRect(ctx, profitBoxX, tpY - 9, profitBoxW, 18, 4);
          ctx.fill();
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#34D399';
          ctx.fillText(tpProfitTxt, profitBoxX + 7, tpY + 3.5);
        }
      }
      });
    });

    tradeYMapRef.current = newYMap;

  }, [candles, currentTickPrice, activeTrades, activeMarket, priceChangeDirection, zoomLevel, panOffset, isFullscreen, tradingMode, activeAccount, adminRadarActive, upcomingPredictions, isAdminUser]);

  // Toast Helper with multi-item stacking and 100% fullscreen visibility
  const showNotification = (msg: string, type: 'success' | 'danger' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setTerminalToasts(prev => [...prev.slice(-2), { id, msg, type, timestamp: Date.now() }]);
    setTradeNotification({ msg, type });
    // Display each toast for 2 seconds as requested by the user
    setTimeout(() => {
      setTerminalToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  };

  const dismissToast = (id: string) => {
    setTerminalToasts(prev => prev.filter(t => t.id !== id));
  };

  // Render animated stacked toast notifications floating directly over the top of the chart (below header)
  const renderFloatingNotifications = () => {
    if (terminalToasts.length === 0) return null;

    return (
      <div className="fixed top-13 sm:top-15 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none w-[92%] max-w-sm flex flex-col items-center gap-1 sm:gap-1.5">
        <AnimatePresence>
          {terminalToasts.map((toast) => {
            const isWon = toast.msg.includes('WON') || toast.msg.includes('Profit') || toast.msg.includes('+$');
            const isLost = toast.msg.includes('LOST') || toast.msg.includes('Loss') || toast.msg.includes('stop-out') || toast.msg.includes('-$');
            const isPlaced = toast.msg.includes('Placed') || toast.msg.includes('Order Placed');

            let borderColor = 'border-white/15';
            let bgColor = 'bg-slate-900/95';
            let textColor = 'text-white';
            let glowColor = 'shadow-black/70';
            let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;

            if (isWon) {
              borderColor = 'border-emerald-500/60';
              bgColor = 'bg-[#061D13]/95 backdrop-blur-xl';
              textColor = 'text-emerald-200';
              glowColor = 'shadow-[0_4px_16px_rgba(16,185,129,0.35)]';
              icon = <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-bounce" />;
            } else if (isLost) {
              borderColor = 'border-rose-500/60';
              bgColor = 'bg-[#1C0B0E]/95 backdrop-blur-xl';
              textColor = 'text-rose-200';
              glowColor = 'shadow-[0_4px_16px_rgba(244,63,94,0.35)]';
              icon = <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
            } else if (isPlaced) {
              borderColor = 'border-amber-500/50';
              bgColor = 'bg-[#141208]/95 backdrop-blur-xl';
              textColor = 'text-amber-200';
              glowColor = 'shadow-[0_4px_16px_rgba(245,179,1,0.3)]';
              icon = <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />;
            } else if (toast.type === 'danger') {
              borderColor = 'border-rose-500/40';
              bgColor = 'bg-[#1C0B0E]/95 backdrop-blur-xl';
              textColor = 'text-rose-300';
              icon = <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
            }

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -16, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.92 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`pointer-events-auto w-full max-w-[320px] sm:max-w-sm px-3 py-1.5 rounded-xl border ${borderColor} ${bgColor} ${glowColor} shadow-lg flex items-center justify-between gap-2.5 text-[11px] font-semibold`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-0.5 rounded bg-white/5 shrink-0">
                    {icon}
                  </div>
                  <span className={`truncate text-[11px] leading-tight ${textColor}`}>
                    {toast.msg}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="p-0.5 rounded text-gray-400 hover:text-white hover:bg-white/10 shrink-0 cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  };

  // Handle Executing New Trade (Debounced with strict atomic balance deduction and multi-click guard)
  const isExecutingTradeLockRef = useRef<boolean>(false);

  const handleExecuteTrade = (type: 'BUY' | 'SELL' | 'UP' | 'DOWN') => {
    // 1. Strict Atomic Lock to completely eliminate duplicate rapid click race conditions
    if (isExecutingTradeLockRef.current || isSubmittingTradeRef.current) {
      return;
    }
    isExecutingTradeLockRef.current = true;
    isSubmittingTradeRef.current = true;
    setTimeout(() => {
      isExecutingTradeLockRef.current = false;
      isSubmittingTradeRef.current = false;
    }, 280);

    if (tradingMode === 'forex') {
      const rawBalance = balancesRef.current[activeAccount] ?? balances[activeAccount] ?? 0;
      if (rawBalance <= 0) {
        showNotification(`Cannot open trade: Your ${activeAccount.toUpperCase()} balance is $0.00. Please deposit funds or switch accounts.`, 'danger');
        return;
      }

      const lotVal = parseFloat(forexLotSize);
      const availableBalance = Math.max(0, rawBalance + getAccountFloatingPnl(activeAccount));
      if (availableBalance <= 0) {
        showNotification(`Cannot open trade: Available equity for ${activeAccount.toUpperCase()} is $0.00. Please deposit funds or close losing positions.`, 'danger');
        return;
      }

      if (isNaN(lotVal) || lotVal < 0.01) {
        showNotification('Minimum Lot Size is 0.01', 'danger');
        return;
      }

      // Calculate required margin based on leverage
      const units = getMarketContractUnits(activeMarket.symbol);
      const marginRequired = Number(((currentTickPrice * units * lotVal) / forexLeverage).toFixed(2));

      // Calculate currently used margin dynamically based on selected leverage
      const usedMargin = activeTrades
        .filter(t => (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && t.status === 'OPEN')
        .reduce((sum, t) => {
          if (t.tradingMode === 'forex') {
            const u = getMarketContractUnits(t.symbol);
            const lev = forexLeverage || t.leverage || 100;
            return sum + Number(((t.entryPrice * u * (t.lotSize || 0.01)) / lev).toFixed(2));
          }
          return sum + (t.amount || 0);
        }, 0);

      const freeMargin = Math.max(0, availableBalance - usedMargin);

      if (marginRequired > rawBalance) {
        showNotification(`Trade Rejected: Required margin ($${marginRequired.toFixed(2)}) exceeds ${activeAccount.toUpperCase()} balance ($${rawBalance.toFixed(2)}).`, 'danger');
        return;
      }

      if (marginRequired > freeMargin) {
        showNotification(`Trade Rejected: Insufficient free margin ($${freeMargin.toFixed(2)} available). Required margin is $${marginRequired.toFixed(2)}.`, 'danger');
        return;
      }

      const newTrade: ActiveTrade = {
        id: 'TRD-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + (++tradeCounterRef.current),
        userUid: userUid || 'guest',
        userEmail: userEmail || 'guest',
        accountType: activeAccount,
        tradingMode: 'forex',
        symbol: activeMarket.symbol,
        type,
        lotSize: lotVal,
        leverage: forexLeverage,
        amount: marginRequired,
        entryPrice: currentTickPrice,
        currentPrice: currentTickPrice,
        stopLoss: (stopLossInput && !isNaN(parseFloat(stopLossInput)) && parseFloat(stopLossInput) > 0) ? parseFloat(stopLossInput) : undefined,
        takeProfit: (takeProfitInput && !isNaN(parseFloat(takeProfitInput)) && parseFloat(takeProfitInput) > 0) ? parseFloat(takeProfitInput) : undefined,
        pnl: 0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 'OPEN'
      };

      setActiveTrades(prev => [newTrade, ...prev]);
      saveTradeToFirestore(newTrade, userUid, userEmail);
      showNotification(`Order Placed! ${type} ${activeMarket.symbol} (${lotVal} Lot @ ${currentTickPrice})`, 'success');

      if (onTradeExecuted) onTradeExecuted(newTrade);

    } else {
      // Binary OTC Mode - Strict balance constraint & atomic deduction to prevent over-trading
      const invAmount = parseFloat(otcInvestment);
      if (isNaN(invAmount) || invAmount <= 0) {
        showNotification('Please enter a valid investment amount.', 'danger');
        return;
      }

      // Check synchronous balance ref to prevent overdrafts
      const currentAvailable = balancesRef.current[activeAccount] ?? balances[activeAccount] ?? 0;
      if (currentAvailable <= 0) {
        showNotification(`Cannot open trade: Your ${activeAccount.toUpperCase()} balance is $0.00. Please deposit funds or switch accounts.`, 'danger');
        return;
      }
      if (invAmount > currentAvailable) {
        showNotification(`Trade Rejected: Investment amount ($${invAmount.toFixed(2)}) exceeds available ${activeAccount.toUpperCase()} balance ($${currentAvailable.toFixed(2)}).`, 'danger');
        return;
      }

      // Synchronously deduct from ref immediately to guarantee accurate balance for next trades
      const updatedAccountBalance = Number(Math.max(0, currentAvailable - invAmount).toFixed(2));
      balancesRef.current = {
        ...balancesRef.current,
        [activeAccount]: updatedAccountBalance
      };

      setBalances(prev => {
        const updated = {
          ...prev,
          [activeAccount]: Number(Math.max(0, (prev[activeAccount] ?? 0) - invAmount).toFixed(2))
        };
        balancesRef.current = updated;
        if (userUid) {
          saveUserBalancesToFirestore(userUid, updated, userEmail);
          try {
            localStorage.setItem(`forex_pro_user_balances_${userUid}`, JSON.stringify(updated));
            if (activeAccount === 'demo') {
              localStorage.setItem(`forex_pro_demo_balance_${userUid}`, String(updated.demo));
            }
          } catch (_) {}
        }
        try {
          localStorage.setItem('forex_pro_user_balances', JSON.stringify(updated));
          if (activeAccount === 'demo') {
            localStorage.setItem('forex_pro_demo_balance', String(updated.demo));
          }
        } catch (_) {}
        return updated;
      });

      const now = Date.now();
      const quotexTiming = calculateQuotexTiming(timeframe, otcExpiryDuration, 'candle_sync', now);
      const expDurationSec = quotexTiming.tradeDurationSec;
      const expiryTimeMs = quotexTiming.targetExpiryMs;
      const uniqueTradeId = 'OTC-' + now.toString(36) + '-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + (++tradeCounterRef.current);

      const newTrade: ActiveTrade = {
        id: uniqueTradeId,
        userUid: userUid || 'guest',
        userEmail: userEmail || 'guest',
        accountType: activeAccount,
        tradingMode: 'otc',
        category: 'binary',
        symbol: activeMarket.symbol,
        type,
        amount: invAmount,
        entryPrice: currentTickPrice,
        currentPrice: currentTickPrice,
        payoutPercent: activeMarket.payoutPercent || 92,
        expirySeconds: expDurationSec,
        remainingSeconds: expDurationSec,
        openTimestamp: now,
        expiryTimestamp: expiryTimeMs,
        pnl: 0,
        timestamp: new Date(now).toISOString().replace('T', ' ').substring(0, 16),
        status: 'OPEN'
      };

      setActiveTrades(prev => [newTrade, ...prev]);
      saveTradeToFirestore(newTrade, userUid, userEmail);
      showNotification(`Binary Option Placed! ${type} ${activeMarket.symbol} ($${invAmount} USD) | Closes at ${quotexTiming.targetExpiryFormatted} (${quotexTiming.isRollover ? 'Next Candle' : 'Current Candle'})`, 'success');

      if (onTradeExecuted) onTradeExecuted(newTrade);
    }
  };

  // Manual Close Position (Forex only - Binary settles automatically on expiry)
  const handleClosePosition = (tradeId: string) => {
    const target = activeTrades.find(t => t.id === tradeId);
    if (!target) {
      setActiveTrades(prev => prev.filter(t => t.id !== tradeId));
      return;
    }

    // Binary contracts strictly settle automatically at expiration time based on countdown
    if (target.tradingMode === 'otc' || target.category === 'binary') {
      showNotification('Binary option contracts settle automatically upon expiry. Manual close is not available.', 'danger');
      return;
    }

    if (isTradeSettled(tradeId)) {
      setActiveTrades(prev => prev.filter(t => t.id !== tradeId));
      return;
    }

    const now = Date.now();
    const isThisMarket = target.symbol === activeMarket.symbol || target.symbol === activeMarket.id;
    const closePrice = isThisMarket 
      ? currentTickPriceRef.current 
      : (customMarketEngine.getCurrentPrice(target.symbol) || target.currentPrice || target.entryPrice);

    let pnlDelta = 0;
    let resolvedTrade: ActiveTrade;

    if (target.tradingMode === 'otc') {
      const otcRes = resolveBinaryTrade(target, closePrice, now);
      if (!otcRes) {
        setActiveTrades(prev => prev.filter(t => t.id !== tradeId));
        return;
      }
      resolvedTrade = otcRes.resolvedTrade;
      pnlDelta = otcRes.returnPayout;
    } else {
      const fxResult = resolveForexTrade(target, closePrice, now);
      if (!fxResult) {
        setActiveTrades(prev => prev.filter(t => t.id !== tradeId));
        return;
      }
      resolvedTrade = fxResult.resolvedTrade;
      pnlDelta = fxResult.realizedPnl;
    }

    // Apply realized profit/loss directly to base wallet balance
    setBalances(prev => {
      const accType = target.accountType || 'live';
      const currentBal = prev[accType] ?? 0;
      const updated = {
        ...prev,
        [accType]: Number(Math.max(0, currentBal + pnlDelta).toFixed(2))
      };
      balancesRef.current = updated;
      if (userUid) {
        saveUserBalancesToFirestore(userUid, updated, userEmail);
        try {
          localStorage.setItem(`forex_pro_user_balances_${userUid}`, JSON.stringify(updated));
          if (accType === 'demo') {
            localStorage.setItem(`forex_pro_demo_balance_${userUid}`, String(updated.demo));
          }
        } catch (_) {}
      }
      try {
        localStorage.setItem('forex_pro_user_balances', JSON.stringify(updated));
        if (accType === 'demo') {
          localStorage.setItem('forex_pro_demo_balance', String(updated.demo));
        }
      } catch (_) {}
      return updated;
    });

    registerSettledTradeIds([resolvedTrade.id]);
    setActiveTrades(prev => prev.filter(t => t.id !== tradeId));
    setClosedTrades(prev => [resolvedTrade, ...prev.filter(t => t.id !== tradeId)]);
    saveTradeToFirestore(resolvedTrade, userUid, userEmail);

    // Immediate global leaderboard synchronization on position close
    const targetAcc = (target.accountType === 'bonus' ? 'bonus' : 'live') as 'live' | 'bonus';
    if (userUid && closedTrades && (target.accountType === 'live' || target.accountType === 'bonus')) {
      const updatedClosedList = [resolvedTrade, ...closedTrades.filter(t => t.id !== tradeId)];
      const updatedActiveList = activeTrades.filter(t => t.id !== tradeId);
      const updatedStats = calculateUserTodayProfit(updatedClosedList, updatedActiveList, targetAcc);
      syncUserToGlobalLeaderboard(
        { uid: userUid, email: userEmail, displayName: userDisplayName, avatar: userAvatar },
        updatedStats,
        targetAcc
      ).catch(() => {});
    }

    const netProfit = resolvedTrade.pnl;
    showNotification(`Position Closed! Net P/L: ${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)} USD`, netProfit >= 0 ? 'success' : 'danger');
  };

  // Close All Open Positions in One Action ("Close All Forex Trades" or Stop-Out)
  const handleCloseAllPositions = (account: AccountType = activeAccount, filterMode: 'all' | 'forex' | 'otc' = 'forex') => {
    const targets = activeTrades.filter(t => {
      const matchAcc = (t.accountType === account || (!t.accountType && account === 'live'));
      if (!matchAcc || t.status !== 'OPEN' || isTradeSettled(t.id)) return false;
      if (filterMode === 'all') return true;
      if (filterMode === 'forex') return (t.tradingMode === 'forex' || t.category === 'forex' || !t.tradingMode);
      if (filterMode === 'otc') return (t.tradingMode === 'otc' || t.category === 'binary');
      return false;
    });

    if (targets.length === 0) {
      if (filterMode !== 'all') {
        showNotification(`No open positions to close in ${account.toUpperCase()} account.`, 'danger');
      }
      return;
    }

    const now = Date.now();
    let netBalanceDelta = 0;
    const resolvedList: ActiveTrade[] = [];
    const closedIds: string[] = [];

    targets.forEach(trade => {
      if (isTradeSettled(trade.id)) return;

      const isThisMarket = trade.symbol === activeMarket.symbol || trade.symbol === activeMarket.id;
      const closePrice = isThisMarket 
        ? currentTickPriceRef.current 
        : (customMarketEngine.getCurrentPrice(trade.symbol) || trade.currentPrice || trade.entryPrice);

      if (trade.tradingMode === 'otc') {
        const otcRes = resolveBinaryTrade(trade, closePrice, now);
        if (otcRes) {
          resolvedList.push(otcRes.resolvedTrade);
          closedIds.push(otcRes.resolvedTrade.id);
          netBalanceDelta += otcRes.returnPayout;
        }
      } else {
        const fxResult = resolveForexTrade(trade, closePrice, now);
        if (fxResult) {
          resolvedList.push(fxResult.resolvedTrade);
          closedIds.push(fxResult.resolvedTrade.id);
          netBalanceDelta += fxResult.realizedPnl;
        }
      }
    });

    if (resolvedList.length === 0) return;

    // Single Atomic Balance Update: profit/loss accurately applied once
    setBalances(prev => {
      const currentBal = prev[account] ?? 0;
      const updated = {
        ...prev,
        [account]: Number(Math.max(0, currentBal + netBalanceDelta).toFixed(2))
      };
      balancesRef.current = updated;
      if (userUid) {
        saveUserBalancesToFirestore(userUid, updated, userEmail);
        try {
          localStorage.setItem(`forex_pro_user_balances_${userUid}`, JSON.stringify(updated));
          if (account === 'demo') {
            localStorage.setItem(`forex_pro_demo_balance_${userUid}`, String(updated.demo));
          }
        } catch (_) {}
      }
      try {
        localStorage.setItem('forex_pro_user_balances', JSON.stringify(updated));
        if (account === 'demo') {
          localStorage.setItem('forex_pro_demo_balance', String(updated.demo));
        }
      } catch (_) {}
      return updated;
    });

    // Single Batch State Update for Trades
    const closedIdSet = new Set(closedIds);
    registerSettledTradeIds(closedIds);
    setActiveTrades(prev => prev.filter(t => !closedIdSet.has(t.id)));
    setClosedTrades(prev => [...resolvedList, ...prev.filter(t => !closedIdSet.has(t.id))]);
    saveTradesBatchToFirestore(resolvedList, userUid, userEmail);

    // Immediate global leaderboard synchronization on close-all
    if (userUid && closedTrades && (account === 'live' || account === 'bonus')) {
      const updatedClosedList = [...resolvedList, ...closedTrades.filter(t => !closedIdSet.has(t.id))];
      const updatedActiveList = activeTrades.filter(t => !closedIdSet.has(t.id));
      const updatedStats = calculateUserTodayProfit(updatedClosedList, updatedActiveList, account);
      syncUserToGlobalLeaderboard(
        { uid: userUid, email: userEmail, displayName: userDisplayName, avatar: userAvatar },
        updatedStats,
        account
      ).catch(() => {});
    }

    const totalNetPnl = resolvedList.reduce((sum, t) => sum + (t.pnl || 0), 0);
    showNotification(
      `Closed ${resolvedList.length} positions! Net P/L: ${totalNetPnl >= 0 ? '+' : ''}$${totalNetPnl.toFixed(2)} USD`,
      totalNetPnl >= 0 ? 'success' : 'danger'
    );
  };

  // Stop-Out Guard: For Live, Bonus & Demo accounts if balance drops to 0 or equity <= 0
  useEffect(() => {
    (['live', 'bonus', 'demo'] as const).forEach(acc => {
      const accBal = balances[acc] ?? 0;
      const openPositions = activeTrades.filter(
        t => (t.accountType === acc || (!t.accountType && acc === 'live')) && t.status === 'OPEN'
      );
      if (openPositions.length === 0) return;

      const floating = getAccountFloatingPnl(acc);
      const equity = accBal + floating;

      if (accBal <= 0 || equity <= 0) {
        handleCloseAllPositions(acc, 'all');
      }
    });
  }, [balances.live, balances.bonus, balances.demo, activeTrades, getAccountFloatingPnl]);

  // Pending Order Handlers
  const handleCreatePendingOrder = () => {
    const targetPrice = parseFloat(pendingOrderTargetPrice);
    const lotVal = parseFloat(pendingOrderLotSize || '0.01');
    const availableBalance = balances[activeAccount] || 0;

    if (availableBalance <= 0) {
      showNotification(`Cannot place pending order: ${activeAccount.toUpperCase()} balance is $0.00.`, 'danger');
      return;
    }

    if (isNaN(targetPrice) || targetPrice <= 0) {
      showNotification('Please enter a valid target order price.', 'danger');
      return;
    }
    if (isNaN(lotVal) || lotVal <= 0) {
      showNotification('Please enter a valid lot size.', 'danger');
      return;
    }

    const units = getMarketContractUnits(activeMarket.symbol);
    const marginRequired = Number(((targetPrice * units * lotVal) / forexLeverage).toFixed(2));

    if (marginRequired > availableBalance) {
      showNotification(`Margin required ($${marginRequired.toFixed(2)}) exceeds available ${activeAccount.toUpperCase()} balance ($${availableBalance.toFixed(2)}).`, 'danger');
      return;
    }

    const newPendingOrder: PendingOrder = {
      id: 'PND-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      userUid: userUid || 'guest',
      userEmail: userEmail || 'guest',
      accountType: activeAccount,
      symbol: activeMarket.symbol,
      orderType: pendingOrderType,
      targetPrice,
      lotSize: lotVal,
      leverage: forexLeverage,
      amount: marginRequired,
      stopLoss: pendingOrderStopLoss ? parseFloat(pendingOrderStopLoss) : undefined,
      takeProfit: pendingOrderTakeProfit ? parseFloat(pendingOrderTakeProfit) : undefined,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: 'PENDING'
    };

    setPendingOrders(prev => [newPendingOrder, ...prev]);
    setShowPendingOrderModal(false);
    showNotification(`Pending Order Placed: ${pendingOrderType} ${activeMarket.symbol} @ $${targetPrice.toFixed(activeMarket.precision)}`, 'success');
  };

  const handleCancelPendingOrder = (orderId: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== orderId));
    showNotification('Pending Order Cancelled', 'danger');
  };

  const [modalCategory, setModalCategory] = useState<'all' | 'forex' | 'otc'>('all');

  // Auto-select corresponding category when market selection modal opens
  useEffect(() => {
    if (isMarketModalOpen) {
      setModalCategory(tradingMode === 'otc' ? 'otc' : 'forex');
    }
  }, [isMarketModalOpen, tradingMode]);

  // Filtered Markets for Selection Modal (Allows all active pairs or filtered by Forex & Binary OTC)
  const filteredMarketsForModal = markets.filter(m => {
    const matchSearch = m.symbol.toLowerCase().includes(marketSearchQuery.toLowerCase()) || m.name.toLowerCase().includes(marketSearchQuery.toLowerCase());
    if (!matchSearch || !m.isActive) return false;
    if (modalCategory === 'forex') return m.category === 'forex' || m.category === 'commodities' || (m.category === 'crypto' && !m.symbol.includes('OTC'));
    if (modalCategory === 'otc') return m.category === 'otc' || m.symbol.includes('OTC');
    return true;
  });

  // Open trades list scoped strictly to current active trading session and account
  const currentSessionActiveTrades = activeTrades.filter(t => {
    if (t.status !== 'OPEN') return false;
    if (t.accountType !== activeAccount && (t.accountType || activeAccount !== 'live')) return false;
    const isForex = t.tradingMode === 'forex' || t.category === 'forex' || (!t.tradingMode && !t.expirySeconds);
    const isBinary = t.tradingMode === 'otc' || t.category === 'binary' || (!!t.expirySeconds && t.expirySeconds > 0);
    return tradingMode === 'forex' ? isForex : isBinary;
  });

  const currentSessionActiveTradesCount = currentSessionActiveTrades.length;

  const currentSessionClosedTradesCount = closedTrades.filter(t => {
    if (t.accountType !== activeAccount && (t.accountType || activeAccount !== 'live')) return false;
    const isForex = t.tradingMode === 'forex' || t.category === 'forex' || (!t.tradingMode && !t.expirySeconds);
    const isBinary = t.tradingMode === 'otc' || t.category === 'binary' || (!!t.expirySeconds && t.expirySeconds > 0);
    return tradingMode === 'forex' ? isForex : isBinary;
  }).length;

  const currentSessionNetPnl = currentSessionActiveTrades.reduce((acc, trd) => {
    const isThisMarket = trd.symbol === activeMarket.symbol || trd.symbol === activeMarket.id;
    const cPrice = isThisMarket ? currentTickPrice : (customMarketEngine.getCurrentPrice(trd.symbol) || trd.currentPrice || trd.entryPrice);
    if (trd.tradingMode === 'forex' || trd.category === 'forex' || !trd.tradingMode) {
      if (trd.pnl !== undefined) return acc + trd.pnl;
      if (trd.profit !== undefined) return acc + trd.profit;
      const lot = trd.lotSize || trd.volume || 0.01;
      const units = getMarketContractUnits(trd.symbol);
      const dir = (trd.type === 'BUY' || trd.type === 'UP') ? 1 : -1;
      return acc + (dir * (cPrice - trd.entryPrice) * lot * units);
    } else {
      const isUp = trd.type === 'CALL' || trd.type === 'BUY';
      const inTheMoney = isUp ? cPrice > trd.entryPrice : cPrice < trd.entryPrice;
      const isTie = Math.abs(cPrice - trd.entryPrice) < 0.000001;
      const payout = inTheMoney ? trd.amount * 0.85 : isTie ? 0 : -trd.amount;
      return acc + payout;
    }
  }, 0);

  return (
    <div className="space-y-1.5 sm:space-y-3 font-sans text-white max-w-full overflow-x-hidden">

      {/* ============================================================ */}
      {/* 🚀 PRO TRADING TERMINAL TOOLBAR (Permanently Fixed & Mobile Optimized) */}
      {/* ============================================================ */}
      <div className="sticky top-0 z-30 rounded-xl bg-[#090D18]/95 backdrop-blur-md border border-white/10 shadow-xl overflow-visible divide-y divide-white/5 select-none w-full">
        
        {/* Tier 1: Primary Navigation, Account, Market & Trading Mode */}
        <div className="px-2 py-1.5 sm:px-2.5 sm:py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 w-full select-none">
          {/* Row 1: Back + Market Pair on Left, Forex/Binary switch on Right for Mobile */}
          <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto shrink-0">
            {/* Left Group: Back Button & Market Pair */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Back Button */}
              <button
                type="button"
                onClick={() => onBack ? onBack() : window.history.back()}
                className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg bg-gray-950 hover:bg-gray-900 border border-white/10 hover:border-amber-400/40 text-[11px] font-black text-gray-200 hover:text-amber-400 transition-all flex items-center gap-1 cursor-pointer shadow-sm shrink-0"
                title="Go Back"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px]">Back</span>
              </button>

              <div className="h-3.5 w-[1px] bg-white/10 shrink-0" />

              {/* Market Selector Pill (e.g. EUR/USD) */}
              <button
                type="button"
                onClick={() => setIsMarketModalOpen(true)}
                className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg bg-gray-950 hover:bg-gray-900 border border-white/10 hover:border-[#F5B301]/50 flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer group shadow-sm shrink-0"
                title="Search and Switch Market Pair"
              >
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-[#F5B301]/20 border border-[#F5B301]/40 flex items-center justify-center text-[#F5B301] font-black text-[8px] sm:text-[9px] font-mono shrink-0">
                  {activeMarket.symbol.substring(0, 3)}
                </div>
                <span className="text-[10px] sm:text-[11px] font-black text-white group-hover:text-[#F5B301] tracking-wide shrink-0">
                  {activeMarket.symbol}
                </span>
                <ChevronDown className="w-2.5 h-2.5 text-gray-400 group-hover:text-[#F5B301] shrink-0" />
              </button>
            </div>

            {/* Mobile-only Forex vs Binary Switch (Docked at top right) */}
            <div className="flex sm:hidden items-center gap-0.5 p-0.5 bg-gray-950 rounded-lg border border-white/10 shrink-0 h-7">
              <button
                type="button"
                onClick={() => setTradingMode('forex')}
                className={`h-6 px-2 rounded-md text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                  tradingMode === 'forex'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Switch to Forex Trading"
              >
                <Globe className="w-3 h-3 text-blue-300 shrink-0" />
                <span>Forex</span>
              </button>

              <button
                type="button"
                onClick={() => setTradingMode('otc')}
                className={`h-6 px-2 rounded-md text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                  tradingMode === 'otc'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 shadow-sm font-black'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Switch to Binary Trading"
              >
                <Zap className="w-3 h-3 text-gray-950 shrink-0" />
                <span>Binary</span>
              </button>

              <button
                type="button"
                onClick={() => setShowModeSelectionModal(true)}
                className="h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-[#F5B301] hover:bg-gray-900 transition-colors cursor-pointer shrink-0"
                title="Open Market Mode Hub"
              >
                <Sliders className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Account Selector & Balance Pill: Demo/Live Badge right beside Main Balance, clickable to switch */}
          <div className="relative z-20 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setShowAccountDropdown(prev => !prev)}
              className="h-8 sm:h-8 w-full sm:w-auto px-2.5 sm:px-3 rounded-lg bg-gray-950 hover:bg-gray-900 border border-white/15 hover:border-amber-400/50 transition-all flex items-center justify-between sm:justify-start gap-2 cursor-pointer shadow-md shrink-0 group active:scale-[0.99]"
              title="Click to Switch Account (Live, Bonus, Demo)"
            >
              {/* Demo / Live / Bonus Badge */}
              <div className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm ${
                activeAccount === 'live'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : activeAccount === 'bonus'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-amber-500/20 text-[#F5B301] border border-amber-500/40'
              }`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  activeAccount === 'live' ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50' : activeAccount === 'bonus' ? 'bg-blue-400' : 'bg-[#F5B301]'
                }`} />
                <span>{activeAccount === 'live' ? 'LIVE' : activeAccount === 'bonus' ? 'BONUS' : 'DEMO'}</span>
              </div>

              {/* Main Balance directly beside the Demo/Live Badge */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono text-xs sm:text-sm font-black text-white group-hover:text-amber-300 transition-colors tracking-tight">
                  ${Math.max(0, (balances[activeAccount] || 0) + getAccountFloatingPnl(activeAccount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[9px] font-mono text-gray-400 font-bold">USD</span>
              </div>

              <div className="h-3.5 w-[1px] bg-white/15 shrink-0" />

              {/* Live Floating Profit/Loss */}
              {(() => {
                const floatPnl = getAccountFloatingPnl(activeAccount);
                return (
                  <span
                    className={`px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold rounded-md shrink-0 flex items-center gap-1 ${
                      floatPnl > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : floatPnl < 0
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}
                    title={`Floating Profit/Loss: ${floatPnl >= 0 ? '+' : ''}$${floatPnl.toFixed(2)}`}
                  >
                    <span className="text-[8px] uppercase font-sans text-gray-400 hidden xs:inline">Profit:</span>
                    <span>{floatPnl >= 0 ? '+' : ''}${floatPnl.toFixed(2)}</span>
                  </span>
                );
              })()}

              {/* Pencil icon for Demo Balance editing */}
              {activeAccount === 'demo' && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDemoBalanceModal(true);
                  }}
                  className="p-1 hover:bg-[#F5B301]/25 text-[#F5B301] rounded-md transition-all cursor-pointer flex items-center justify-center shrink-0 border border-[#F5B301]/30"
                  title="Edit Demo Balance"
                >
                  <Pencil className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#F5B301]" />
                </span>
              )}

              {/* Switch Indicator & Chevron */}
              <div className="flex items-center gap-1 text-gray-400 group-hover:text-amber-400 shrink-0 ml-auto sm:ml-0 transition-colors">
                <span className="text-[9px] font-bold text-gray-400 group-hover:text-amber-300 hidden sm:inline">Switch</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showAccountDropdown ? 'rotate-180 text-amber-400' : ''}`} />
              </div>
            </button>
          </div>

          {/* Desktop Forex vs Binary Switch (Right aligned on larger screens) */}
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 bg-gray-950 rounded-lg border border-white/10 shrink-0 h-8">
            <button
              type="button"
              onClick={() => setTradingMode('forex')}
              className={`h-7 px-2.5 rounded-md text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                tradingMode === 'forex'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Switch to Forex Trading"
            >
              <Globe className="w-3 h-3 text-blue-300 shrink-0" />
              <span>Forex</span>
            </button>

            <button
              type="button"
              onClick={() => setTradingMode('otc')}
              className={`h-7 px-2.5 rounded-md text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                tradingMode === 'otc'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 shadow-sm font-black'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Switch to Binary Trading"
            >
              <Zap className="w-3 h-3 text-gray-950 shrink-0" />
              <span>Binary</span>
            </button>

            <button
              type="button"
              onClick={() => setShowModeSelectionModal(true)}
              className="h-7 w-7 flex items-center justify-center rounded text-gray-400 hover:text-[#F5B301] hover:bg-gray-900 transition-colors cursor-pointer shrink-0"
              title="Open Market Mode Hub"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tier 2: Real-time Price Ticker & Analysis / Tool Controls */}
        <div className="px-1.5 py-1 sm:px-2.5 sm:py-1.5 flex items-center justify-between gap-1 sm:gap-2 w-full overflow-x-auto no-scrollbar bg-[#060912]/90 relative z-20">
          {/* Left: Live Price + Timeframe + Candle Countdown */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
            {/* Live Price Tag */}
            <div className="h-7 sm:h-8 flex items-center gap-1 sm:gap-1.5 bg-gray-950 px-1.5 sm:px-2 rounded-lg border border-white/10 shrink-0">
              <div className="text-[11px] sm:text-xs font-black font-mono text-white flex items-center gap-0.5">
                <span>${currentTickPrice.toFixed(activeMarket.precision)}</span>
                {priceChangeDirection === 'up' ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-rose-400 shrink-0" />
                )}
              </div>
              <span className={`hidden xs:inline text-[9px] font-mono font-bold ${activeMarket.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {activeMarket.change24h >= 0 ? '+' : ''}{activeMarket.change24h}%
              </span>
            </div>

            <div className="h-3.5 w-[1px] bg-white/10 shrink-0" />

            {/* Timeframe Selector Trigger */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setShowTimeframeDropdown(prev => !prev)}
                className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg bg-gray-950 hover:bg-gray-900 border border-white/10 hover:border-amber-400/50 flex items-center gap-1 transition-all cursor-pointer font-mono text-[10px] sm:text-xs font-black text-amber-400 shrink-0 shadow-sm active:scale-95"
                title="Select Timeframe (M1, M5, M15, M30, H1, etc.)"
              >
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{timeframe}</span>
                <ChevronDown className={`w-2 h-2 text-gray-400 transition-transform ${showTimeframeDropdown ? 'rotate-180 text-amber-400' : ''}`} />
              </button>
            </div>

            {/* Candle Close-In Countdown */}
            <div className="h-7 sm:h-8 flex items-center gap-1 bg-gray-950 px-1.5 sm:px-2 rounded-lg border border-white/10 text-[9px] sm:text-[10px] font-mono text-gray-300 shrink-0">
              <Clock className="w-2.5 h-2.5 text-amber-400 animate-pulse shrink-0" />
              <strong className="text-amber-400 font-bold">{formatCountdown(candleCountdown)}</strong>
            </div>
          </div>

          {/* Right: Drawings + Leverage + Leaderboard + Reload + Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Drawing Tools Trigger */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDrawingToolsMenu(prev => !prev);
                }}
                className={`h-7 sm:h-8 px-1.5 sm:px-2.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-bold border shrink-0 shadow-sm active:scale-95 ${
                  showDrawingToolsMenu || selectedDrawingId
                    ? 'text-[#F5B301] bg-amber-500/20 border-amber-500/60 ring-1 ring-amber-500/40 shadow-sm'
                    : 'text-gray-300 bg-gray-950 hover:bg-gray-900 border-white/10 hover:border-amber-400/40 hover:text-white'
                }`}
                title="Drawing Tools (Trend Line, Horizontal Line, Position Tools, etc.)"
              >
                <Pencil className="w-3 h-3 text-[#F5B301] shrink-0" />
                <span className="hidden md:inline text-[10px]">Draw</span>
                {drawings.length > 0 && (
                  <span className="px-1 py-0.1 rounded-full bg-[#F5B301] text-gray-950 text-[8px] font-black">
                    {drawings.length}
                  </span>
                )}
              </button>
            </div>

            {/* Leverage Selector Button */}
            <button
              type="button"
              onClick={() => setIsLeverageModalOpen(true)}
              className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg bg-gradient-to-r from-blue-600/20 via-blue-500/15 to-cyan-600/20 hover:from-blue-600/30 hover:to-cyan-600/30 border border-blue-500/40 text-[10px] sm:text-[11px] font-black text-blue-300 hover:text-blue-200 transition-all flex items-center gap-0.5 sm:gap-1 cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Account Leverage (1:100 to 1:2000)"
            >
              <Gauge className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400 shrink-0" />
              <span className="font-bold font-mono">1:{forexLeverage}</span>
            </button>

            {/* About Company Button */}
            <button
              type="button"
              onClick={() => setIsAboutCompanyOpen(true)}
              className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg bg-gray-950 hover:bg-gray-900 border border-amber-500/30 hover:border-amber-400 text-[10px] sm:text-[11px] font-bold text-gray-200 hover:text-amber-300 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="About Company Profile & Official Licenses"
            >
              <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="font-bold hidden lg:inline">About</span>
            </button>

            {/* Leaderboard Button */}
            <button
              type="button"
              onClick={() => setIsLeaderboardOpen(true)}
              className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-[10px] sm:text-[11px] font-black text-amber-300 hover:text-amber-200 transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Daily Top 50 Leaderboard (8:00 AM - 8:00 AM)"
            >
              <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="font-bold hidden md:inline">Leaderboard</span>
            </button>

            {/* Zoom Out Button */}
            <button
              type="button"
              onClick={handleZoomOut}
              className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg bg-gray-950 hover:bg-gray-900 border border-white/10 hover:border-amber-400/40 text-[10px] sm:text-[11px] font-bold text-gray-200 hover:text-amber-400 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Zoom Out Chart (See more history & structure)"
            >
              <ZoomOut className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="hidden xl:inline">Out</span>
            </button>

            {/* Zoom In Button */}
            <button
              type="button"
              onClick={handleZoomIn}
              className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg bg-gray-950 hover:bg-gray-900 border border-white/10 hover:border-amber-400/40 text-[10px] sm:text-[11px] font-bold text-gray-200 hover:text-amber-400 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Zoom In Chart"
            >
              <ZoomIn className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="hidden xl:inline">In</span>
            </button>

            {/* Reset / Reload Chart Button */}
            <button
              type="button"
              onClick={handleResetChart}
              className="h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg bg-gray-950 hover:bg-gray-900 border border-white/10 hover:border-amber-400/40 text-[10px] sm:text-[11px] font-bold text-gray-200 hover:text-amber-400 transition-all flex items-center gap-1 cursor-pointer shrink-0"
              title="Reload Chart View"
            >
              <RotateCcw className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="hidden md:inline">Reload</span>
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 sm:h-8 w-7 sm:w-8 rounded-lg bg-gray-950 hover:bg-gray-900 border border-white/10 text-gray-400 hover:text-amber-400 transition-all flex items-center justify-center cursor-pointer shrink-0"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3 text-amber-400" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* NOTIFICATION TOAST BANNER (NORMAL MODE) */}
      {renderFloatingNotifications()}

      {/* CHART CONTAINER & ULTRA-COMPACT TRADING ORDER PANEL DIRECTLY UNDER CHART */}
      <div className="space-y-1.5 sm:space-y-2.5">
        
        {/* INTERACTIVE CANVAS CANDLESTICK CHART (~80% SCREEN DOMINANCE) */}
        <div className="w-full p-1 sm:p-2.5 rounded-xl sm:rounded-2xl bg-[#060913] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
          <div className={`relative w-full h-[54vh] sm:h-[70vh] min-h-[290px] sm:min-h-[440px] ${isDraggingPriceScale || isHoveringPriceScale ? 'cursor-ns-resize' : 'cursor-grab active:cursor-grabbing'} select-none overflow-hidden`}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onDoubleClick={handleDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onWheel={handleWheel}
              className="w-full h-full block rounded-xl touch-none"
            />

            {/* Drawing Tools Vector & Interactive Handles Overlay */}
            {renderDrawingsOverlay()}

            {/* ADMIN FUTURE CANDLE RADAR & AUTO-LOSS RISK SHIELD (Discreetly visible ONLY to designated Super Admin) */}
            {isAdminUser && (
              <div 
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="absolute top-2 left-2 z-30 flex flex-col items-start gap-1.5 pointer-events-auto select-none max-w-[94vw] sm:max-w-md"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Toggle 1: 5-Candle Future Predictor Radar */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAdminRadar();
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md border text-[10px] sm:text-[11px] font-mono font-bold transition-all shadow-xl cursor-pointer ${
                      adminRadarActive
                        ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 ring-2 ring-emerald-500/20 shadow-emerald-950/60'
                        : 'bg-gray-950/80 border-white/20 text-gray-400 hover:text-white'
                    }`}
                    title="Toggle Admin Future 5-Candle Predictor"
                  >
                    <Crown className={`w-3.5 h-3.5 ${adminRadarActive ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} />
                    <span>RADAR {adminRadarActive ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* Toggle 2: Auto 5s Counter Loss Shield */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleExposureControl();
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md border text-[10px] sm:text-[11px] font-mono font-bold transition-all shadow-xl cursor-pointer ${
                      exposureControlEnabled
                        ? 'bg-rose-950/90 border-rose-500/80 text-rose-300 ring-2 ring-rose-500/20 shadow-rose-950/60'
                        : 'bg-gray-950/80 border-white/20 text-gray-400 hover:text-white'
                    }`}
                    title="Toggle Auto 5s Counter Loss for Heavy Volume Side"
                  >
                    <Shield className={`w-3.5 h-3.5 ${exposureControlEnabled ? 'text-rose-400 animate-pulse' : 'text-gray-400'}`} />
                    <span>5S LOSS {exposureControlEnabled ? 'ON' : 'OFF'}</span>
                  </button>

                  {(adminRadarActive || exposureControlEnabled) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRadarHudExpanded(prev => !prev);
                      }}
                      className="px-1.5 py-1 rounded-lg bg-gray-950/80 border border-white/20 text-gray-300 hover:text-white text-[10px] font-mono shadow-md cursor-pointer flex items-center justify-center"
                      title={isRadarHudExpanded ? 'Minimize HUD' : 'Expand HUD'}
                    >
                      {isRadarHudExpanded ? <EyeOff className="w-3 h-3 text-emerald-400" /> : <Eye className="w-3 h-3 text-emerald-400" />}
                    </button>
                  )}
                </div>

                {/* Radar Floating Roadmap & Exposure Card */}
                {isRadarHudExpanded && (adminRadarActive || exposureControlEnabled) && (
                  <div 
                    className="w-full p-2.5 rounded-xl bg-[#070B16]/95 border border-emerald-500/50 shadow-2xl backdrop-blur-xl space-y-2 animate-in fade-in zoom-in-95 duration-200"
                  >
                    {/* Live Exposure Status Bar */}
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 text-[9.5px] font-mono">
                      <div className="flex items-center gap-1.5 font-bold uppercase text-gray-200">
                        <span className={`w-2 h-2 rounded-full ${exposureControlEnabled ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
                        <span>{activeMarket.symbol}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded font-black uppercase text-[8.5px] ${
                        !exposureControlEnabled
                          ? 'bg-gray-800 text-gray-400'
                          : activeMarketExposure?.biasDirection === 'DOWN'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : activeMarketExposure?.biasDirection === 'UP'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                      }`}>
                        {!exposureControlEnabled
                          ? '🛡️ Neutral (Natural)'
                          : activeMarketExposure?.biasDirection === 'DOWN'
                          ? '🛡️ Auto: DOWN (Lose UP)'
                          : activeMarketExposure?.biasDirection === 'UP'
                          ? '🛡️ Auto: UP (Lose DOWN)'
                          : '🟢 Balanced (Natural)'}
                      </span>
                    </div>

                    {/* Order Book Volumes (Live Balance) */}
                    <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
                      <div className="px-2 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 flex justify-between items-center text-emerald-300">
                        <span className="text-gray-400">UP Pool:</span>
                        <span className="font-black">${(activeMarketExposure?.upVolume || 0).toLocaleString()}</span>
                      </div>
                      <div className="px-2 py-1 rounded bg-rose-950/40 border border-rose-500/30 flex justify-between items-center text-rose-300">
                        <span className="text-gray-400">DOWN Pool:</span>
                        <span className="font-black">${(activeMarketExposure?.downVolume || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* 5-Candle Future Predictor Preview (if Radar is Active - STRICT ADMIN ONLY) */}
                    {isAdminUser && adminRadarActive && upcomingPredictions.length > 0 && (
                      <div className="pt-1 border-t border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-[8.5px] font-bold text-gray-400">
                          <span className="text-emerald-400 uppercase">Next 5 Candles Forecast</span>
                          <span className="text-amber-300 font-mono">Next: {formatCandleCountdown(candleCountdown, timeframe)}</span>
                        </div>
                        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                          {upcomingPredictions.slice(0, 5).map((p, idx) => {
                            const isUp = p.direction === 'GREEN';
                            return (
                              <div 
                                key={p.time} 
                                className={`min-w-[65px] p-1 rounded-lg border text-center transition-all ${
                                  isUp 
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                                    : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                                }`}
                              >
                                <div className="text-[8px] font-semibold text-gray-400 flex items-center justify-between">
                                  <span>+{idx + 1}m</span>
                                </div>
                                <div className={`text-[10px] font-black my-0.5 flex items-center justify-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  <span>{isUp ? '▲ CALL' : '▼ PUT'}</span>
                                </div>
                                <div className="text-[8.5px] font-mono text-white font-bold">{p.predictedClose?.toFixed(activeMarket.precision)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Top-Right Fullscreen Button Directly Over Chart (Mobile & Desktop optimized) */}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(true);
              }}
              className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-30 flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg bg-gray-950/90 hover:bg-gray-900 border border-amber-400/40 hover:border-amber-400 text-amber-400 hover:text-white shadow-xl backdrop-blur-md cursor-pointer transition-all touch-manipulation group active:scale-95"
              title="Open Fullscreen Chart Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-bold font-mono">Full</span>
            </button>

            {/* Vertical Price Scale Zoom Reset Indicator (TradingView style) */}
            {priceZoomLevel !== 1.0 && (
              <button
                type="button"
                onClick={() => setPriceZoomLevel(1.0)}
                className="absolute top-2.5 right-[75px] sm:right-24 z-20 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[9px] font-bold flex items-center gap-1 backdrop-blur-md cursor-pointer transition-all shadow-md active:scale-95"
                title="Double click price axis or tap here to reset vertical scale"
              >
                <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                <span>Price: {priceZoomLevel.toFixed(1)}x (Reset)</span>
              </button>
            )}

            {/* Live Data Stream Status Warning Badge for Gold */}
            {(activeMarket.symbol === 'XAU/USD' || activeMarket.id === 'xau_usd') && !isGoldLiveAvailableState && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 backdrop-blur-md text-amber-300 text-xs font-bold flex items-center gap-2 shadow-2xl animate-pulse pointer-events-none">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Live Data Unavailable</span>
              </div>
            )}

            {/* Quick Floating Zoom & Pan Controls (Mobile & Desktop) */}
            <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 bg-gray-950/85 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-lg">
              <button
                type="button"
                onClick={handleZoomOut}
                className="w-5 h-5 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-300 hover:text-amber-400 transition-colors active:scale-95"
                title="Zoom Out"
              >
                <Minus className="w-2.5 h-2.5" />
              </button>
              <button
                type="button"
                onClick={handleResetChart}
                className="px-1 text-[9px] font-mono text-gray-400 hover:text-amber-400 transition-colors"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="w-5 h-5 rounded bg-white/5 hover:bg-white/15 flex items-center justify-center text-gray-300 hover:text-amber-400 transition-colors active:scale-95"
                title="Zoom In"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Quick Snap to Real-time / Latest Candle Floating Pill */}
            {Math.abs(panOffset.x) > 35 && (
              <button
                type="button"
                onClick={() => setPanOffset(p => ({ ...p, x: 0 }))}
                className="absolute bottom-2.5 right-4 sm:right-6 z-20 px-2.5 py-1 rounded-lg bg-gray-950/90 hover:bg-gray-900 border border-amber-400/50 hover:border-amber-400 text-amber-300 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-sm cursor-pointer active:scale-95 transition-all"
                title="Jump to Real-time Latest Candle"
              >
                <span>Latest Candle</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}

            {/* Position Line Close & Timer Overlay Buttons */}
            {activeTrades
              .filter(t => {
                if (t.symbol !== activeMarket.symbol && t.symbol !== activeMarket.id) return false;
                if (t.status !== 'OPEN') return false;
                if (t.accountType !== activeAccount && (t.accountType || activeAccount !== 'live')) return false;
                const isForex = t.tradingMode === 'forex' || t.category === 'forex' || (!t.tradingMode && !t.expirySeconds);
                const isBinary = t.tradingMode === 'otc' || t.category === 'binary' || (!!t.expirySeconds && t.expirySeconds > 0);
                if (tradingMode === 'forex') return isForex;
                if (tradingMode === 'otc') return isBinary;
                return false;
              })
              .map((trd, idx) => {
                const y = tradeYMap[trd.id];
                if (y === undefined || y < 10 || y > 330) return null;
                const isForex = trd.tradingMode === 'forex';
                if (!isForex) return null; // Binary OTC trades are rendered directly on candlesticks in Quotex style

                return (
                  <div
                    key={`act-chart-trd-${trd.id || 'trd'}-${idx}`}
                    style={{ top: `${y - 13}px` }}
                    className="absolute right-[65px] z-30 flex items-center pointer-events-auto"
                  >
                    <button
                      type="button"
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleClosePosition(trd.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClosePosition(trd.id);
                      }}
                      className="w-6 h-6 sm:w-5 sm:h-5 rounded-md bg-red-600 hover:bg-red-500 active:scale-90 text-white shadow-lg border border-white/50 flex items-center justify-center cursor-pointer transition-all touch-manipulation"
                      title="Close Forex Trade"
                    >
                      <X className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-white stroke-[3]" />
                    </button>
                  </div>
                );
              })}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[8px] sm:text-[9px] text-gray-500 font-mono">
            <span>Server Time: UTC 2026</span>
            <span className="text-emerald-400 font-bold">● Live Tick Feed Active</span>
          </div>
        </div>

        {/* ULTRA-COMPACT TRADING CONTROL PANEL (Directly Under Chart - Sleek & Ultra-Compact) */}
        <div className="w-full p-1 sm:p-2 rounded-xl bg-[#090D18] border border-white/10 shadow-lg">
          {tradingMode === 'forex' ? (
            <div className="space-y-1">
              {/* Row 1: Controls & Quick Lot Selection */}
              <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-1.5">
                {/* Volume / Lot Stepper */}
                <div className="flex items-center gap-1 bg-[#111623] px-1.5 py-0.5 rounded-lg border border-white/5">
                  <span className="text-[9px] font-black text-gray-300 uppercase tracking-wider">Lot:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.max(0.01, parseFloat(forexLotSize || '0.01') - 0.01);
                      setForexLotSize(val.toFixed(2));
                    }}
                    className="w-4 h-4 rounded bg-[#161B28] hover:bg-gray-800 text-white font-mono font-black text-[10px] flex items-center justify-center cursor-pointer border border-gray-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={forexLotSize}
                    onChange={(e) => setForexLotSize(e.target.value)}
                    className="w-12 py-0.2 px-0.5 bg-black/40 border border-[#F5B301]/50 rounded text-[10px] font-black text-center text-white font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(forexLotSize || '0.01') + 0.01;
                      setForexLotSize(val.toFixed(2));
                    }}
                    className="w-4 h-4 rounded bg-[#161B28] hover:bg-gray-800 text-white font-mono font-black text-[10px] flex items-center justify-center cursor-pointer border border-gray-700"
                  >
                    +
                  </button>
                  
                  {/* Mini preset lot pills */}
                  <div className="hidden sm:flex items-center gap-0.5 ml-0.5 pl-0.5 border-l border-white/10">
                    {['0.01', '0.05', '0.10', '0.50', '1.00'].map((preset) => (
                      <button
                        key={`lot-chip-${preset}`}
                        type="button"
                        onClick={() => setForexLotSize(preset)}
                        className={`px-1 py-0.2 rounded text-[8px] font-mono cursor-pointer transition-all ${
                          forexLotSize === preset
                            ? 'bg-[#F5B301] text-gray-950 font-black'
                            : 'bg-black/30 text-gray-400 hover:text-white border border-white/5'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {/* Leverage quick trigger */}
                  <button
                    type="button"
                    onClick={() => setIsLeverageModalOpen(true)}
                    className="flex items-center gap-1 px-1.5 py-0.5 ml-1 rounded bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-[9px] font-mono text-blue-300 transition-all cursor-pointer"
                    title="Change Account Leverage"
                  >
                    <Gauge className="w-2.5 h-2.5 text-blue-400" />
                    <span className="font-bold">1:{forexLeverage}</span>
                  </button>
                </div>

                {/* SL / TP Compact Inputs with Cross / Clear buttons */}
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-0.5 bg-[#111623] px-1.5 py-0.5 rounded-lg border border-white/5">
                    <span className="text-[8px] font-bold text-rose-400">SL:</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="Optional"
                      value={stopLossInput}
                      onChange={(e) => setStopLossInput(e.target.value)}
                      className="w-11 sm:w-12 bg-transparent text-[9px] font-mono font-bold text-white outline-none placeholder-gray-600"
                    />
                    {stopLossInput && !isNaN(parseFloat(stopLossInput)) && parseFloat(stopLossInput) > 0 && (
                      <span className="text-[8px] font-mono font-bold text-rose-400 bg-rose-950/60 px-1 py-0.2 rounded border border-rose-800/40">
                        -${Math.abs(calculateForexPnl({
                          symbol: activeMarket.symbol,
                          type: 'BUY',
                          lotSize: parseFloat(forexLotSize || '0.01'),
                          entryPrice: currentTickPrice
                        } as any, parseFloat(stopLossInput))).toFixed(2)}
                      </span>
                    )}
                    {stopLossInput && (
                      <button
                        type="button"
                        onClick={() => setStopLossInput('')}
                        className="text-gray-500 hover:text-white cursor-pointer p-0.5"
                        title="Clear Stop Loss"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 bg-[#111623] px-1.5 py-0.5 rounded-lg border border-white/5">
                    <span className="text-[8px] font-bold text-emerald-400">TP:</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="Optional"
                      value={takeProfitInput}
                      onChange={(e) => setTakeProfitInput(e.target.value)}
                      className="w-11 sm:w-12 bg-transparent text-[9px] font-mono font-bold text-white outline-none placeholder-gray-600"
                    />
                    {takeProfitInput && !isNaN(parseFloat(takeProfitInput)) && parseFloat(takeProfitInput) > 0 && (
                      <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/40">
                        +${Math.abs(calculateForexPnl({
                          symbol: activeMarket.symbol,
                          type: 'BUY',
                          lotSize: parseFloat(forexLotSize || '0.01'),
                          entryPrice: currentTickPrice
                        } as any, parseFloat(takeProfitInput))).toFixed(2)}
                      </span>
                    )}
                    {takeProfitInput && (
                      <button
                        type="button"
                        onClick={() => setTakeProfitInput('')}
                        className="text-gray-500 hover:text-white cursor-pointer p-0.5"
                        title="Clear Take Profit"
                      >
                        <X className="w-2 h-2" />
                      </button>
                    )}
                  </div>
                  {tradingMode === 'forex' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingOrderTargetPrice(currentTickPrice.toFixed(activeMarket.precision));
                        setShowPendingOrderModal(true);
                      }}
                      className="px-1.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-[#F5B301] border border-amber-500/40 rounded-lg text-[8px] font-mono font-bold flex items-center gap-0.5 transition-all cursor-pointer"
                    >
                      <Clock className="w-2 h-2 text-amber-400" />
                      <span>Pending</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: SELL and BUY Action Buttons - Ultra-compact, on mobile Arrow + BUY / SELL only */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleExecuteTrade('SELL')}
                  className="py-1 px-2 bg-[#FF1744] hover:bg-rose-600 text-white font-black rounded-lg text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center sm:justify-between shadow-sm active:scale-[0.98] transition-all cursor-pointer h-7 sm:h-7.5 overflow-hidden"
                >
                  <span className="font-extrabold flex items-center gap-1 whitespace-nowrap">
                    <TrendingDown className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                    <span>SELL</span>
                    <span className="hidden sm:inline font-normal text-white/90">(Short)</span>
                  </span>
                  <span className="hidden sm:inline font-mono font-bold whitespace-nowrap">
                    ${currentTickPrice.toFixed(activeMarket.precision)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteTrade('BUY')}
                  className="py-1 px-2 bg-[#00E676] hover:bg-emerald-400 text-gray-950 font-black rounded-lg text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center sm:justify-between shadow-sm active:scale-[0.98] transition-all cursor-pointer h-7 sm:h-7.5 overflow-hidden"
                >
                  <span className="font-extrabold flex items-center gap-1 whitespace-nowrap">
                    <TrendingUp className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                    <span>BUY</span>
                    <span className="hidden sm:inline font-normal text-gray-800">(Long)</span>
                  </span>
                  <span className="hidden sm:inline font-mono font-bold whitespace-nowrap">
                    ${(currentTickPrice + (activeMarket.spread || 0.0001)).toFixed(activeMarket.precision)}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {/* OTC Row 1: Expiry Duration, Quotex Candle Clock & Investment Steppers */}
              {(() => {
                const currentQuotexTiming = calculateQuotexTiming(timeframe, otcExpiryDuration, 'candle_sync', Date.now());
                return (
                  <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-1.5">
                    {/* Quotex Expiry & Clock Display */}
                    <div className="flex items-center gap-1 bg-[#111623] px-1.5 py-0.5 rounded-lg border border-white/5">
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-wider flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-amber-400" />
                        Time:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const durations = [60, 120, 180, 300, 600];
                          const idx = durations.indexOf(otcExpiryDuration);
                          if (idx > 0) setOtcExpiryDuration(durations[idx - 1]);
                          else if (idx === -1) {
                            const smaller = durations.filter(d => d < otcExpiryDuration);
                            if (smaller.length > 0) setOtcExpiryDuration(smaller[smaller.length - 1]);
                            else setOtcExpiryDuration(60);
                          }
                        }}
                        className="w-4 h-4 rounded bg-[#161B28] hover:bg-gray-800 text-white font-mono font-black text-[10px] flex items-center justify-center cursor-pointer border border-gray-700"
                        title="Previous Duration (1m, 2m, 3m, 5m, 10m)"
                      >
                        -
                      </button>
                      
                      {/* Quotex Expiration Clock Badge */}
                      <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.2 rounded border border-amber-500/30">
                        <span className="text-[10px] font-mono font-black text-amber-400">
                          {currentQuotexTiming.targetExpiryFormatted}
                        </span>
                        <span 
                          className="text-[8px] font-mono font-bold px-1 rounded bg-[#F5B301]/20 text-[#F5B301] border border-[#F5B301]/30"
                          title="Selected Duration"
                        >
                          {otcExpiryDuration >= 60 ? `${Math.round(otcExpiryDuration / 60)}M` : `${otcExpiryDuration}s`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const durations = [60, 120, 180, 300, 600];
                          const idx = durations.indexOf(otcExpiryDuration);
                          if (idx !== -1 && idx < durations.length - 1) setOtcExpiryDuration(durations[idx + 1]);
                          else if (idx === -1) {
                            const larger = durations.filter(d => d > otcExpiryDuration);
                            if (larger.length > 0) setOtcExpiryDuration(larger[0]);
                            else setOtcExpiryDuration(600);
                          }
                        }}
                        className="w-4 h-4 rounded bg-[#161B28] hover:bg-gray-800 text-white font-mono font-black text-[10px] flex items-center justify-center cursor-pointer border border-gray-700"
                        title="Next Duration (1m, 2m, 3m, 5m, 10m)"
                      >
                        +
                      </button>
                      
                      {/* 1m, 2m, 3m, 5m, 10m Direct Select Pills */}
                      <div className="flex items-center gap-0.5 ml-0.5 pl-0.5 border-l border-white/10">
                        {[
                          { sec: 60, label: '1m' },
                          { sec: 120, label: '2m' },
                          { sec: 180, label: '3m' },
                          { sec: 300, label: '5m' },
                          { sec: 600, label: '10m' }
                        ].map((item) => (
                          <button
                            key={`otc-pill-${item.sec}`}
                            type="button"
                            onClick={() => setOtcExpiryDuration(item.sec)}
                            className={`px-1.5 py-0.5 rounded text-[8.5px] font-mono cursor-pointer transition-all ${
                              otcExpiryDuration === item.sec
                                ? 'bg-[#F5B301] text-gray-950 font-black shadow-sm'
                                : 'bg-black/40 text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Investment Stepper & Profit Return */}
                    <div className="flex items-center gap-1 bg-[#111623] px-1.5 py-0.5 rounded-lg border border-white/5">
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-wider">Invest:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseFloat(otcInvestment || '10');
                          const next = Math.max(1, cur > 50 ? cur - 10 : cur > 10 ? cur - 5 : cur - 1);
                          setOtcInvestment(next.toString());
                        }}
                        className="w-4 h-4 rounded bg-[#161B28] hover:bg-gray-800 text-white font-mono font-black text-[10px] flex items-center justify-center cursor-pointer border border-gray-700"
                      >
                        -
                      </button>
                      <div className="relative">
                        <span className="absolute left-1 top-0 text-[9px] font-black text-emerald-400 font-mono">$</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={otcInvestment}
                          onChange={(e) => setOtcInvestment(e.target.value)}
                          className="w-12 pl-2.5 pr-0.5 py-0.2 bg-black/40 border border-emerald-500/50 rounded text-[10px] font-black text-center text-white font-mono outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseFloat(otcInvestment || '10');
                          const next = cur >= 50 ? cur + 10 : cur >= 10 ? cur + 5 : cur + 1;
                          setOtcInvestment(next.toString());
                        }}
                        className="w-4 h-4 rounded bg-[#161B28] hover:bg-gray-800 text-white font-mono font-black text-[10px] flex items-center justify-center cursor-pointer border border-gray-700"
                      >
                        +
                      </button>

                      <div className="hidden sm:flex items-center gap-0.5 ml-0.5 pl-0.5 border-l border-white/10">
                        {['5', '10', '25', '50', '100'].map((val) => (
                          <button
                            key={`otc-inv-${val}`}
                            type="button"
                            onClick={() => setOtcInvestment(val)}
                            className={`px-1 py-0.2 rounded text-[8px] font-mono cursor-pointer transition-all ${
                              otcInvestment === val
                                ? 'bg-emerald-500 text-gray-950 font-black'
                                : 'bg-black/30 text-gray-400 hover:text-white border border-white/5'
                            }`}
                          >
                            ${val}
                          </button>
                        ))}
                      </div>

                      <span className="text-[9px] font-mono font-bold text-emerald-400 ml-0.5">
                        +{activeMarket.payoutPercent || 92}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* OTC Row 2: UP (Call) & DOWN (Put) Action Buttons - Ultra-compact */}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleExecuteTrade('UP')}
                  className="py-1 px-2 bg-[#00E676] hover:bg-emerald-400 text-gray-950 font-black rounded-lg text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center sm:justify-between shadow-sm active:scale-[0.98] transition-all cursor-pointer h-7 sm:h-7.5 overflow-hidden"
                >
                  <span className="font-extrabold flex items-center gap-1 whitespace-nowrap">
                    <TrendingUp className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                    <span>UP</span>
                    <span className="hidden sm:inline font-normal opacity-90">(Call)</span>
                  </span>
                  <span className="font-mono font-bold whitespace-nowrap opacity-95 text-[9px] sm:text-[10px] ml-1">
                    +${(parseFloat(otcInvestment || '0') * (1 + ((activeMarket.payoutPercent || 92) / 100))).toFixed(2)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteTrade('DOWN')}
                  className="py-1 px-2 bg-[#FF1744] hover:bg-rose-600 text-white font-black rounded-lg text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center sm:justify-between shadow-sm active:scale-[0.98] transition-all cursor-pointer h-7 sm:h-7.5 overflow-hidden"
                >
                  <span className="font-extrabold flex items-center gap-1 whitespace-nowrap">
                    <TrendingDown className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                    <span>DOWN</span>
                    <span className="hidden sm:inline font-normal opacity-90">(Put)</span>
                  </span>
                  <span className="font-mono font-bold whitespace-nowrap opacity-95 text-[9px] sm:text-[10px] ml-1">
                    +${(parseFloat(otcInvestment || '0') * (1 + ((activeMarket.payoutPercent || 92) / 100))).toFixed(2)}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POSITIONS, PENDING ORDERS & TRADE HISTORY SECTION */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-[#0F1423] border border-white/10 shadow-lg space-y-2.5">
        
        {/* TABS HEADER: Open Positions, Pending Orders, Closed Trades History */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'positions' 
                  ? 'bg-[#F5B301] text-gray-950 shadow-sm' 
                  : 'text-gray-400 hover:text-white bg-gray-900/60'
              }`}
            >
              <span>Positions</span>
              <span className="px-1.5 py-0.2 rounded bg-black/20 text-[9px] font-mono">
                {currentSessionActiveTradesCount}
              </span>
            </button>

            {tradingMode === 'forex' && (
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pending' 
                    ? 'bg-[#F5B301] text-gray-950 shadow-sm' 
                    : 'text-gray-400 hover:text-white bg-gray-900/60'
                }`}
              >
                <span>Pending</span>
                <span className="px-1.5 py-0.2 rounded bg-black/20 text-[9px] font-mono">
                  {pendingOrders.length}
                </span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('history')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history' 
                  ? 'bg-[#F5B301] text-gray-950 shadow-sm' 
                  : 'text-gray-400 hover:text-white bg-gray-900/60'
              }`}
            >
              <span>History</span>
              <span className="px-1.5 py-0.2 rounded bg-black/20 text-[9px] font-mono">
                {currentSessionClosedTradesCount}
              </span>
            </button>
          </div>

          {/* Mode Sub-Filter Pills */}
          <div className="flex items-center p-0.5 bg-gray-950 rounded-xl border border-white/10 text-[10px]">
            <button
              onClick={() => activeTab === 'positions' ? setPositionsFilter('forex') : setHistoryFilter('forex')}
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                (activeTab === 'positions' ? positionsFilter : historyFilter) === 'forex'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3 text-blue-300" />
              <span>Forex</span>
            </button>
            <button
              onClick={() => activeTab === 'positions' ? setPositionsFilter('otc') : setHistoryFilter('otc')}
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                (activeTab === 'positions' ? positionsFilter : historyFilter) === 'otc'
                  ? 'bg-emerald-500 text-gray-950 shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-gray-950" />
              <span>OTC</span>
            </button>
            <button
              onClick={() => activeTab === 'positions' ? setPositionsFilter('all') : setHistoryFilter('all')}
              className={`px-2 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                (activeTab === 'positions' ? positionsFilter : historyFilter) === 'all'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* TAB 1: OPEN POSITIONS CARDS */}
        {activeTab === 'positions' && (
          <div className="space-y-2.5">
            {/* Real-time Account Margin & Leverage Overview Bar */}
            <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-white/10 rounded-xl p-2.5 shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
                <div className="bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Equity</span>
                  <span className="font-mono font-black text-white text-xs">
                    ${(Math.max(0, (balances[activeAccount] || 0) + getAccountFloatingPnl(activeAccount))).toFixed(2)}
                  </span>
                </div>
                <div className="bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Used Margin</span>
                  <span className="font-mono font-black text-amber-300 text-xs">
                    ${activeTrades
                      .filter(t => (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && t.status === 'OPEN')
                      .reduce((sum, t) => {
                        if (t.tradingMode === 'forex') {
                          const u = getMarketContractUnits(t.symbol);
                          const lev = forexLeverage || t.leverage || 100;
                          return sum + Number(((t.entryPrice * u * (t.lotSize || 0.01)) / lev).toFixed(2));
                        }
                        return sum + (t.amount || 0);
                      }, 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Free Margin</span>
                  <span className="font-mono font-black text-emerald-400 text-xs">
                    ${Math.max(0, (Math.max(0, (balances[activeAccount] || 0) + getAccountFloatingPnl(activeAccount))) - (activeTrades
                      .filter(t => (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && t.status === 'OPEN')
                      .reduce((sum, t) => {
                        if (t.tradingMode === 'forex') {
                          const u = getMarketContractUnits(t.symbol);
                          const lev = forexLeverage || t.leverage || 100;
                          return sum + Number(((t.entryPrice * u * (t.lotSize || 0.01)) / lev).toFixed(2));
                        }
                        return sum + (t.amount || 0);
                      }, 0))).toFixed(2)}
                  </span>
                </div>
                <div className="bg-black/30 rounded-lg px-2.5 py-1.5 border border-white/5">
                  <span className="text-gray-400 block text-[9px] uppercase font-bold">Margin Level</span>
                  <span className="font-mono font-black text-cyan-300 text-xs">
                    {(() => {
                      const eq = Math.max(0, (balances[activeAccount] || 0) + getAccountFloatingPnl(activeAccount));
                      const used = activeTrades
                        .filter(t => (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && t.status === 'OPEN')
                        .reduce((sum, t) => {
                          if (t.tradingMode === 'forex') {
                            const u = getMarketContractUnits(t.symbol);
                            const lev = forexLeverage || t.leverage || 100;
                            return sum + Number(((t.entryPrice * u * (t.lotSize || 0.01)) / lev).toFixed(2));
                          }
                          return sum + (t.amount || 0);
                        }, 0);
                      return used > 0 ? `${((eq / used) * 100).toFixed(1)}%` : '∞ Safe';
                    })()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLeverageModalOpen(true)}
                  className="col-span-2 sm:col-span-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg px-2.5 py-1.5 transition-all text-left flex flex-col justify-center cursor-pointer group active:scale-98"
                  title="Click to change leverage"
                >
                  <span className="text-blue-300 block text-[9px] uppercase font-bold flex items-center justify-between">
                    <span>Leverage</span>
                    <Gauge className="w-2.5 h-2.5 text-blue-400 group-hover:rotate-45 transition-transform" />
                  </span>
                  <span className="font-mono font-black text-white text-xs">1:{forexLeverage}</span>
                </button>
              </div>
            </div>

            {tradingMode === 'forex' && activeTrades.filter(t => (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && t.status === 'OPEN' && (t.tradingMode === 'forex' || t.category === 'forex' || !t.tradingMode)).length > 0 && (
              <div className="flex items-center justify-between bg-rose-950/30 border border-rose-500/30 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-rose-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>{activeAccount.toUpperCase()} Open Forex: {activeTrades.filter(t => (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && t.status === 'OPEN' && (t.tradingMode === 'forex' || t.category === 'forex' || !t.tradingMode)).length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCloseAllPositions(activeAccount, 'forex')}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Close all open Forex positions"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Close All Forex</span>
                </button>
              </div>
            )}

            {activeTrades.filter(t => {
              const isForex = t.tradingMode === 'forex' || t.category === 'forex' || (!t.tradingMode && !t.expirySeconds);
              const isBinary = t.tradingMode === 'otc' || t.category === 'binary' || (!!t.expirySeconds && t.expirySeconds > 0);
              const matchAcc = (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && t.status === 'OPEN';
              if (!matchAcc) return false;

              if (positionsFilter === 'forex') return isForex;
              if (positionsFilter === 'otc') return isBinary;
              if (positionsFilter === 'all') return true;
              return tradingMode === 'forex' ? isForex : isBinary;
            }).length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center italic">
                {tradingMode === 'forex'
                  ? 'No active open Forex positions. Select volume and execute SELL or BUY.'
                  : 'No active open Binary contracts. Select amount & expiry and execute UP or DOWN.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {activeTrades
                  .filter(t => {
                    const isForex = t.tradingMode === 'forex' || t.category === 'forex' || (!t.tradingMode && !t.expirySeconds);
                    const isBinary = t.tradingMode === 'otc' || t.category === 'binary' || (!!t.expirySeconds && t.expirySeconds > 0);
                    const matchAcc = (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && t.status === 'OPEN';
                    if (!matchAcc) return false;

                    if (positionsFilter === 'forex') return isForex;
                    if (positionsFilter === 'otc') return isBinary;
                    if (positionsFilter === 'all') return true;
                    return tradingMode === 'forex' ? isForex : isBinary;
                  })
                  .map((trd, idx) => {
                    const isForex = trd.tradingMode === 'forex';
                    const isWinning = trd.pnl >= 0;

                    return (
                      <div 
                        key={`act-trd-${trd.id || 'trd'}-${idx}`} 
                        className="bg-[#131927] border border-gray-800/80 rounded-2xl p-3.5 space-y-2.5 shadow-lg"
                      >
                        {/* Top Row: SELL/BUY badge + Symbol + Lot / PnL */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
                              trd.type === 'BUY' || trd.type === 'UP'
                                ? 'bg-[#00E676] text-gray-950'
                                : 'bg-[#FF1744] text-white'
                            }`}>
                              {trd.type}
                            </span>
                            <span className="text-white font-extrabold text-sm sm:text-base">
                              {trd.symbol} {isForex ? `(${trd.lotSize || 0.01} Lots)` : `($${trd.amount})`}
                            </span>
                          </div>

                          <div className={`font-mono font-black text-base sm:text-lg ${isWinning ? 'text-[#00E676]' : 'text-[#FF1744]'}`}>
                            {isWinning ? '+' : ''}${trd.pnl.toFixed(2)}
                          </div>
                        </div>

                        {/* Second Row: Open price & Live price */}
                        <div className="flex items-center justify-between text-xs font-mono text-gray-400 border-t border-gray-800/40 pt-1.5">
                          <div>
                            <span>Entry: </span>
                            <span className="text-gray-300 font-bold">${trd.entryPrice}</span>
                          </div>

                          <div>
                            <span>Current: </span>
                            <span className="text-gray-300 font-bold">${trd.currentPrice}</span>
                          </div>
                        </div>

                        {/* Third Row: Forex 1-Click CLOSE + SL/TP Modify vs OTC Expiry Countdown Timer */}
                        {isForex ? (
                          <div className="space-y-2 pt-0.5">
                            {(trd.stopLoss || trd.takeProfit) && (
                              <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 bg-gray-950 px-2 py-1 rounded-lg border border-white/5">
                                <span className="text-rose-400 font-bold">SL: {trd.stopLoss ? trd.stopLoss : 'Off'}</span>
                                <span className="text-emerald-400 font-bold">TP: {trd.takeProfit ? trd.takeProfit : 'Off'}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSlTpTrade(trd);
                                  setEditSlValue(trd.stopLoss ? String(trd.stopLoss) : '');
                                  setEditTpValue(trd.takeProfit ? String(trd.takeProfit) : '');
                                }}
                                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-blue-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-blue-500/20"
                              >
                                <Sliders className="w-3 h-3 text-blue-400" />
                                <span>SL/TP</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleClosePosition(trd.id)}
                                className="flex-1 py-1.5 bg-[#1F2739] hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer active:scale-[0.98] flex items-center justify-center gap-1.5"
                              >
                                <span>CLOSE Trade Desk</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="w-full py-2 bg-[#111726] border border-amber-500/30 rounded-xl flex items-center justify-between px-3 shadow-inner">
                              <div className="flex items-center gap-2 text-amber-400 font-mono font-black text-xs">
                                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                <span>
                                  Expiry: {formatCountdown(
                                    trd.expiryTimestamp
                                      ? Math.max(0, Math.ceil((trd.expiryTimestamp - Date.now()) / 1000))
                                      : (trd.remainingSeconds ?? 0)
                                  )}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono font-black uppercase text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                                Auto Settle
                              </span>
                            </div>
                            <div className="flex items-center justify-between px-2 text-[10px] text-gray-400 font-mono">
                              <span>Binary Option ({trd.type === 'UP' ? 'Call' : 'Put'})</span>
                              <span className="text-emerald-400 font-bold">Return: +{trd.payoutPercent || 92}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PENDING ORDERS CARDS */}
        {activeTab === 'pending' && (
          <div className="space-y-2.5">
            {pendingOrders.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-gray-500 italic">No active pending limit/stop orders.</p>
                <button
                  type="button"
                  onClick={() => {
                    setPendingOrderTargetPrice(currentTickPrice.toFixed(activeMarket.precision));
                    setShowPendingOrderModal(true);
                  }}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-[#F5B301] border border-amber-500/40 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Pending Order</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {pendingOrders.map((pnd, idx) => {
                  const isBuy = pnd.orderType.startsWith('BUY');
                  const currentPrice = currentTickPrice;
                  const priceDiff = Math.abs(currentPrice - pnd.targetPrice);

                  return (
                    <div
                      key={`pnd-ord-${pnd.id || 'pnd'}-${idx}`}
                      className="bg-[#131927] border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5 shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
                            isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {pnd.orderType}
                          </span>
                          <span className="text-white font-extrabold text-sm sm:text-base">
                            {pnd.symbol} ({pnd.lotSize} Lots)
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                          Waiting Trigger
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono text-gray-300 bg-gray-950/80 p-2 rounded-xl border border-white/5">
                        <div>
                          <span className="text-gray-500 block">Target Rate:</span>
                          <span className="font-bold text-[#F5B301]">${pnd.targetPrice}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Current Rate:</span>
                          <span className="font-bold text-gray-200">${currentPrice.toFixed(activeMarket.precision)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Distance:</span>
                          <span className="font-bold text-blue-400">{priceDiff.toFixed(activeMarket.precision)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="text-[10px] font-mono text-gray-500">
                          <span>Set at: {pnd.createdAt}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCancelPendingOrder(pnd.id)}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          <span>Cancel Order</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLOSED HISTORY CARDS */}
        {activeTab === 'history' && (
          <div className="bg-[#0B101D] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-3 shadow-md">
            <TradeHistoryList
              trades={closedTrades}
              activeAccount={activeAccount}
              initialMode={historyFilter === 'forex' ? 'forex' : 'otc'}
              showModeSwitch={true}
              maxContainerHeight="max-h-[420px]"
            />
          </div>
        )}
      </div>

      {/* FULLSCREEN LANDSCAPE ANALYSIS OVERLAY - ULTRA SLIM & COMPACT */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#06080E] flex flex-col p-1 sm:p-2 space-y-1 select-none overflow-hidden"
          >
            {/* FULLSCREEN TOP FLOATING NOTIFICATIONS (STACKED & ANIMATED) */}
            {renderFloatingNotifications()}

            {/* Top Fullscreen Header - Market Selector on Left with Timeframe directly below, Account & Controls on Right */}
            <div className="relative z-50 flex items-center justify-between gap-1.5 bg-[#0A0E1A] px-2 py-1.5 rounded-xl border border-white/10 shrink-0">
              
              {/* Left Group: Market Selector on top, Timeframe Selector and Open Trades Button side-by-side below */}
              <div className="flex flex-col gap-1 items-start shrink-0">
                {/* Row 1: Market Name Selector Button */}
                <button
                  type="button"
                  onClick={() => setIsMarketModalOpen(true)}
                  className="flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity cursor-pointer group shrink-0"
                  title="Tap to select market"
                >
                  <div className="w-5 h-5 rounded-md bg-[#F5B301]/20 border border-[#F5B301]/40 flex items-center justify-center text-[#F5B301] font-mono text-[9px] shrink-0">
                    {activeMarket.symbol.substring(0, 3)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-white group-hover:text-[#F5B301] tracking-tight">
                      {activeMarket.symbol}
                    </span>
                    <ChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 group-hover:text-[#F5B301]" />
                    <span className="text-[9.5px] sm:text-[10px] font-mono text-emerald-400 font-bold ml-0.5">
                      ${currentTickPrice.toFixed(activeMarket.precision)}
                    </span>
                  </div>
                </button>

                {/* Row 2: Fullscreen Timeframe Selector Widget + Open Trades Button aligned side by side */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="relative z-30">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullscreenTimeframeMenu(prev => !prev);
                      }}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-mono font-bold transition-all cursor-pointer shadow-sm shrink-0 ${
                        showFullscreenTimeframeMenu
                          ? 'bg-[#F5B301]/20 border-[#F5B301] text-[#F5B301]'
                          : 'bg-gray-950 border-white/20 text-gray-200 hover:border-[#F5B301]/50'
                      }`}
                      title="Change Timeframe"
                    >
                      <Clock className="w-2.5 h-2.5 text-[#F5B301]" />
                      <span>{timeframe}</span>
                      <ChevronDown className="w-2.5 h-2.5 text-gray-400" />
                    </button>

                    <AnimatePresence>
                      {showFullscreenTimeframeMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          className="absolute left-0 mt-1 w-44 bg-[#0B0F1A] border border-white/20 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 backdrop-blur-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[8.5px] font-mono font-bold text-amber-400 px-1 py-0.5 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                            <span>Select Timeframe</span>
                            <Clock className="w-2.5 h-2.5 text-[#F5B301]" />
                          </div>

                          <div className="grid grid-cols-2 gap-1 pt-0.5">
                            {[
                              { tf: 'S1', label: '1 Sec' },
                              { tf: 'S5', label: '5 Sec' },
                              { tf: 'S15', label: '15 Sec' },
                              { tf: 'S30', label: '30 Sec' },
                              { tf: 'M1', label: '1 Min' },
                              { tf: 'M5', label: '5 Min' },
                              { tf: 'M15', label: '15 Min' },
                              { tf: 'M30', label: '30 Min' },
                              { tf: 'H1', label: '1 Hour' },
                              { tf: 'H4', label: '4 Hours' },
                              { tf: 'D1', label: '1 Day' }
                            ].map((item, idx) => (
                              <button
                                key={`ttv-fs-tf-${item.tf}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setTimeframe(item.tf as any);
                                  setShowFullscreenTimeframeMenu(false);
                                }}
                                className={`px-1.5 py-1 rounded-md text-left text-[9px] font-mono transition-all cursor-pointer border ${
                                  timeframe === item.tf
                                    ? 'bg-[#F5B301]/20 border-[#F5B301] text-[#F5B301] font-bold'
                                    : 'bg-gray-900/60 border-white/5 text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                              >
                                <div className="font-bold text-[10px]">{item.tf}</div>
                                <div className="text-[7.5px] text-gray-400">{item.label}</div>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Fullscreen Open Positions Box / Button (Placed beside Timeframe Button) */}
                  <button
                    type="button"
                    onClick={() => {
                      setFullscreenTradesMode(tradingMode === 'forex' ? 'forex' : 'otc');
                      if (currentSessionActiveTradesCount === 0) {
                        setFullscreenTradesTab('history');
                      }
                      setShowFullscreenTradesModal(true);
                    }}
                    className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-md border text-[9px] font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                      currentSessionActiveTradesCount > 0
                        ? tradingMode === 'forex'
                          ? 'bg-blue-950/90 border-blue-500/60 text-blue-200 hover:bg-blue-900 shadow-blue-500/20'
                          : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200 hover:bg-emerald-900 shadow-emerald-500/20'
                        : 'bg-gray-950 border-white/20 text-gray-400 hover:text-white hover:border-white/30'
                    }`}
                    title={tradingMode === 'forex' ? 'View Active Forex Positions' : 'View Active Binary Contracts'}
                  >
                    <div className="flex items-center gap-1">
                      {currentSessionActiveTradesCount > 0 ? (
                        <span className={`w-1.5 h-1.5 rounded-full animate-ping shrink-0 ${
                          tradingMode === 'forex' ? 'bg-blue-400' : 'bg-emerald-400'
                        }`} />
                      ) : (
                        <Layers className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                      )}
                      <span className="text-[8.5px] sm:text-[9px] text-gray-300 font-sans font-medium">
                        {tradingMode === 'forex' ? 'Forex' : 'Binary'}:
                      </span>
                      <span className={`px-1 py-0.2 rounded text-[8.5px] sm:text-[9px] font-mono font-black ${
                        currentSessionActiveTradesCount > 0
                          ? tradingMode === 'forex'
                            ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                            : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-white/10 text-gray-400'
                      }`}>
                        {currentSessionActiveTradesCount} Open
                      </span>
                    </div>

                    {currentSessionActiveTradesCount > 0 && (
                      <span className={`hidden sm:inline font-mono font-black text-[8.5px] sm:text-[9px] ml-0.5 ${
                        currentSessionNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {currentSessionNetPnl >= 0 ? '+' : ''}${currentSessionNetPnl.toFixed(2)}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Prominent Account & Balance Button (Level with Market Selector) */}
              <div className="relative z-30 shrink-0">
                {(() => {
                  const activePnl = getAccountFloatingPnl(activeAccount);
                  const activeBal = Math.max(0, (balances[activeAccount] || 0) + activePnl);
                  return (
                    <button
                      type="button"
                      onClick={() => setShowFullscreenAccountMenu(prev => !prev)}
                      className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gray-950/90 hover:bg-gray-900 border border-white/20 hover:border-[#F5B301]/60 text-white transition-all cursor-pointer shadow-md active:scale-95 shrink-0 group"
                      title="Switch Trading Account & View Balance"
                    >
                      {/* Account Badge Pill */}
                      <div className={`px-1.5 py-0.5 rounded-md text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0 ${
                        activeAccount === 'live'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : activeAccount === 'bonus'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : 'bg-amber-500/20 text-[#F5B301] border border-amber-500/40'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          activeAccount === 'live' ? 'bg-emerald-400 animate-pulse' :
                          activeAccount === 'bonus' ? 'bg-blue-400' :
                          'bg-[#F5B301]'
                        }`} />
                        <span>{activeAccount}</span>
                      </div>

                      {/* Prominent Large Balance Display */}
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono font-black text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors tracking-tight">
                          ${activeBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Floating PnL Pill (if active positions) */}
                      {activePnl !== 0 && (
                        <span
                          className={`px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-mono font-black shrink-0 ${
                            activePnl > 0
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {activePnl > 0 ? '+' : ''}${activePnl.toFixed(2)}
                        </span>
                      )}

                      {activeAccount === 'demo' && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDemoBalanceModal(true);
                          }}
                          className="p-1 hover:bg-[#F5B301]/25 text-[#F5B301] rounded transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Edit Demo Balance"
                        >
                          <Pencil className="w-2.5 h-2.5 text-[#F5B301]" />
                        </span>
                      )}

                      <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-amber-300 transition-colors shrink-0" />
                    </button>
                  );
                })()}

                {/* Switch Account Dropdown */}
                <AnimatePresence>
                  {showFullscreenAccountMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      className="absolute right-0 mt-1.5 w-60 bg-[#0B0F1A] border border-white/20 rounded-xl shadow-2xl p-1.5 z-[70] space-y-1 backdrop-blur-xl"
                    >
                      <div className="text-[8.5px] font-mono font-bold text-gray-400 px-2 py-0.5 uppercase tracking-wider border-b border-white/10 flex items-center justify-between">
                        <span>Switch Account</span>
                        <Wallet className="w-3 h-3 text-[#F5B301]" />
                      </div>
                      {(['live', 'bonus', 'demo'] as AccountType[]).map((acc, idx) => {
                        const isActive = activeAccount === acc;
                        const accPnl = getAccountFloatingPnl(acc);
                        const bal = Math.max(0, (balances[acc] || 0) + accPnl);
                        return (
                          <button
                            key={`ttv-fs-acc-${acc}-${idx}`}
                            type="button"
                            onClick={() => {
                              setActiveAccount(acc);
                              setShowFullscreenAccountMenu(false);
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                              isActive
                                ? acc === 'live'
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 font-bold'
                                  : acc === 'bonus'
                                  ? 'bg-blue-500/25 text-blue-300 border border-blue-500/50 font-bold'
                                  : 'bg-[#F5B301]/25 text-amber-300 border border-[#F5B301]/50 font-bold'
                                : 'text-gray-300 hover:bg-gray-800/80 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${
                                acc === 'live' ? 'bg-emerald-400' : acc === 'bonus' ? 'bg-blue-400' : 'bg-[#F5B301]'
                              }`} />
                              <span className="uppercase text-[9.5px] font-bold">{acc}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1 py-0.2 rounded text-[8px] font-mono font-black ${
                                  accPnl > 0
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                    : accPnl < 0
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                    : 'bg-white/5 text-gray-400 border border-white/10'
                                }`}
                              >
                                {accPnl >= 0 ? '+' : ''}${accPnl.toFixed(2)}
                              </span>
                              <span className="font-mono font-bold text-[10px]">${bal.toFixed(2)}</span>
                              {acc === 'demo' && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDemoBalanceModal(true);
                                    setShowFullscreenAccountMenu(false);
                                  }}
                                  className="p-1 rounded bg-[#F5B301]/20 hover:bg-[#F5B301]/35 text-[#F5B301] transition-all cursor-pointer border border-[#F5B301]/30 flex items-center justify-center"
                                  title="Edit Demo Balance"
                                >
                                  <Pencil className="w-2.5 h-2.5 text-[#F5B301]" />
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Fullscreen Interactive Canvas */}
            <div className={`flex-1 relative bg-[#090D18] rounded-xl border border-white/10 overflow-hidden ${isDraggingPriceScale || isHoveringPriceScale ? 'cursor-ns-resize' : 'cursor-grab active:cursor-grabbing'}`}>
              <canvas
                ref={fullscreenCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
                className="w-full h-full block rounded-xl touch-none"
              />

              {/* Drawing Tools Vector & Interactive Handles Overlay */}
              {renderDrawingsOverlay()}

              {/* ADMIN FUTURE CANDLE RADAR & AUTO-LOSS RISK SHIELD (Fullscreen mode - STRICT ADMIN ONLY) */}
              {isAdminUser && (
                <div 
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="absolute top-2 left-2 z-30 flex flex-col items-start gap-1.5 pointer-events-auto select-none max-w-[94vw] sm:max-w-md"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Toggle 1: 5-Candle Future Predictor Radar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAdminRadar();
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md border text-[10px] sm:text-[11px] font-mono font-bold transition-all shadow-xl cursor-pointer ${
                        adminRadarActive
                          ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 ring-2 ring-emerald-500/20 shadow-emerald-950/60'
                          : 'bg-gray-950/80 border-white/20 text-gray-400 hover:text-white'
                      }`}
                      title="Toggle Admin Future 5-Candle Predictor"
                    >
                      <Crown className={`w-3.5 h-3.5 ${adminRadarActive ? 'text-emerald-400 animate-pulse' : 'text-gray-400'}`} />
                      <span>RADAR {adminRadarActive ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Toggle 2: Auto 5s Counter Loss Shield */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExposureControl();
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg backdrop-blur-md border text-[10px] sm:text-[11px] font-mono font-bold transition-all shadow-xl cursor-pointer ${
                        exposureControlEnabled
                          ? 'bg-rose-950/90 border-rose-500/80 text-rose-300 ring-2 ring-rose-500/20 shadow-rose-950/60'
                          : 'bg-gray-950/80 border-white/20 text-gray-400 hover:text-white'
                      }`}
                      title="Toggle Auto 5s Counter Loss for Heavy Volume Side"
                    >
                      <Shield className={`w-3.5 h-3.5 ${exposureControlEnabled ? 'text-rose-400 animate-pulse' : 'text-gray-400'}`} />
                      <span>5S LOSS {exposureControlEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    {(adminRadarActive || exposureControlEnabled) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRadarHudExpanded(prev => !prev);
                        }}
                        className="px-1.5 py-1 rounded-lg bg-gray-950/80 border border-white/20 text-gray-300 hover:text-white text-[10px] font-mono shadow-md cursor-pointer flex items-center justify-center"
                        title={isRadarHudExpanded ? 'Minimize HUD' : 'Expand HUD'}
                      >
                        {isRadarHudExpanded ? <EyeOff className="w-3 h-3 text-emerald-400" /> : <Eye className="w-3 h-3 text-emerald-400" />}
                      </button>
                    )}
                  </div>

                  {/* Radar Floating Roadmap & Exposure Card */}
                  {isRadarHudExpanded && (adminRadarActive || exposureControlEnabled) && (
                    <div 
                      className="w-full p-2.5 rounded-xl bg-[#070B16]/95 border border-emerald-500/50 shadow-2xl backdrop-blur-xl space-y-2 animate-in fade-in zoom-in-95 duration-200"
                    >
                      {/* Live Exposure Status Bar */}
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 text-[9.5px] font-mono">
                        <div className="flex items-center gap-1.5 font-bold uppercase text-gray-200">
                          <span className={`w-2 h-2 rounded-full ${exposureControlEnabled ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`} />
                          <span>{activeMarket.symbol}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded font-black uppercase text-[8.5px] ${
                          !exposureControlEnabled
                            ? 'bg-gray-800 text-gray-400'
                            : activeMarketExposure?.biasDirection === 'DOWN'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : activeMarketExposure?.biasDirection === 'UP'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                        }`}>
                          {!exposureControlEnabled
                            ? '🛡️ Neutral (Natural)'
                            : activeMarketExposure?.biasDirection === 'DOWN'
                            ? '🛡️ Auto: DOWN (Lose UP)'
                            : activeMarketExposure?.biasDirection === 'UP'
                            ? '🛡️ Auto: UP (Lose DOWN)'
                            : '🟢 Balanced (Natural)'}
                        </span>
                      </div>

                      {/* Order Book Volumes (Live Balance) */}
                      <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
                        <div className="px-2 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 flex justify-between items-center text-emerald-300">
                          <span className="text-gray-400">UP Pool:</span>
                          <span className="font-black">${(activeMarketExposure?.upVolume || 0).toLocaleString()}</span>
                        </div>
                        <div className="px-2 py-1 rounded bg-rose-950/40 border border-rose-500/30 flex justify-between items-center text-rose-300">
                          <span className="text-gray-400">DOWN Pool:</span>
                          <span className="font-black">${(activeMarketExposure?.downVolume || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* 5-Candle Future Predictor Preview (if Radar is Active - STRICT ADMIN ONLY) */}
                      {isAdminUser && adminRadarActive && upcomingPredictions.length > 0 && (
                        <div className="pt-1 border-t border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-[8.5px] font-bold text-gray-400">
                            <span className="text-emerald-400 uppercase">Next 5 Candles Forecast</span>
                            <span className="text-amber-300 font-mono">Next: {formatCandleCountdown(candleCountdown, timeframe)}</span>
                          </div>
                          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                            {upcomingPredictions.slice(0, 5).map((p, idx) => {
                              const isUp = p.direction === 'GREEN';
                              return (
                                <div 
                                  key={`fs-pred-${p.time}`} 
                                  className={`min-w-[65px] p-1 rounded-lg border text-center transition-all ${
                                    isUp 
                                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                                      : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                                  }`}
                                >
                                  <div className="text-[8px] font-semibold text-gray-400 flex items-center justify-between">
                                    <span>+{idx + 1}m</span>
                                  </div>
                                  <div className={`text-[10px] font-black my-0.5 flex items-center justify-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    <span>{isUp ? '▲ CALL' : '▼ PUT'}</span>
                                  </div>
                                  <div className="text-[8.5px] font-mono text-white font-bold">{p.predictedClose?.toFixed(activeMarket.precision)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Top-Right Chart Floating Controls: Drawing Tools, Reset Chart, and Exit (×) - Compact & Positioned Higher */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-20 flex items-center gap-1 pointer-events-auto"
              >
                {/* 1. Fullscreen Drawing Tools Trigger & Pop-up Menu */}
                <div className="relative z-30">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDrawingToolsMenu(prev => !prev);
                    }}
                    className={`p-1 sm:p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 border ${
                      showDrawingToolsMenu || selectedDrawingId
                        ? 'text-[#F5B301] bg-amber-500/25 border-amber-400 shadow-sm'
                        : 'text-gray-300 hover:text-white bg-gray-950/85 hover:bg-gray-900 border-white/15'
                    }`}
                    title="Drawing Tools"
                  >
                    <Pencil className="w-3 h-3 text-[#F5B301]" />
                    {drawings.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F5B301] ml-0.5" />
                    )}
                  </button>

                  {/* Drawing Tools Popup Menu */}
                  <AnimatePresence>
                    {showDrawingToolsMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        className="absolute right-0 mt-1.5 w-52 bg-[#0C101C] border border-white/20 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 backdrop-blur-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between px-2 py-1 border-b border-white/10 text-[10px] font-mono font-black text-amber-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Pencil className="w-3 h-3 text-amber-400" />
                            Drawing Tools
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowDrawingToolsMenu(false)}
                            className="text-gray-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => addDrawing('long_position')}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-emerald-500/20 transition-all cursor-pointer group text-left"
                        >
                          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Long Position</p>
                            <p className="text-[9px] text-emerald-400 font-mono">Long Position Tool</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => addDrawing('short_position')}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer group text-left"
                        >
                          <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                            <TrendingDown className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Short Position</p>
                            <p className="text-[9px] text-rose-400 font-mono">Short Position Tool</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => addDrawing('trend_line')}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-blue-500/20 transition-all cursor-pointer group text-left"
                        >
                          <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                            <Slash className="w-3.5 h-3.5 rotate-45" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Trend Line</p>
                            <p className="text-[9px] text-blue-300 font-mono">Trend Line Tool</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => addDrawing('ray')}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-amber-500/20 transition-all cursor-pointer group text-left"
                        >
                          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                            <Compass className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Ray</p>
                            <p className="text-[9px] text-amber-300 font-mono">Infinite Ray Tool</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => addDrawing('horizontal_line')}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-amber-500/20 transition-all cursor-pointer group text-left"
                        >
                          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                            <Minus className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Horizontal Line</p>
                            <p className="text-[9px] text-amber-300 font-mono">Horizontal Line Tool</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => addDrawing('rectangle')}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-purple-500/20 transition-all cursor-pointer group text-left"
                        >
                          <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                            <Square className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">Rectangle</p>
                            <p className="text-[9px] text-purple-300 font-mono">Rectangle Shape</p>
                          </div>
                        </button>

                        {drawings.length > 0 && (
                          <div className="pt-1 border-t border-white/10 flex items-center justify-between px-1">
                            <span className="text-[9px] font-mono text-gray-400">{drawings.length} Active Shapes</span>
                            <button
                              type="button"
                              onClick={() => {
                                setDrawings([]);
                                setSelectedDrawingId(null);
                              }}
                              className="text-[9px] font-mono text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" /> Clear All
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Zoom Out Button - Compact */}
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 sm:p-1.5 rounded-lg bg-gray-950/85 hover:bg-gray-900 border border-white/15 hover:border-amber-400/50 text-gray-300 hover:text-amber-400 cursor-pointer flex items-center justify-center shrink-0 transition-all active:scale-95"
                  title="Zoom Out Chart"
                >
                  <ZoomOut className="w-3 h-3 text-amber-400" />
                </button>

                {/* Zoom In Button - Compact */}
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 sm:p-1.5 rounded-lg bg-gray-950/85 hover:bg-gray-900 border border-white/15 hover:border-amber-400/50 text-gray-300 hover:text-amber-400 cursor-pointer flex items-center justify-center shrink-0 transition-all active:scale-95"
                  title="Zoom In Chart"
                >
                  <ZoomIn className="w-3 h-3 text-amber-400" />
                </button>

                {/* 2. Reset / Reload Chart Button - Compact */}
                <button
                  type="button"
                  onClick={handleResetChart}
                  className="p-1 sm:p-1.5 rounded-lg bg-gray-950/85 hover:bg-gray-900 border border-white/15 hover:border-amber-400/50 text-gray-300 hover:text-amber-400 cursor-pointer flex items-center justify-center shrink-0 transition-all active:scale-95"
                  title="Reset Chart View"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                </button>

                {/* 3. Exit Fullscreen (×) Button - Compact */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="p-1 sm:p-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 cursor-pointer transition-all flex items-center justify-center shrink-0 active:scale-95"
                  title="Exit Fullscreen (Close)"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Vertical Price Scale Zoom Reset Indicator (TradingView style) */}
              {priceZoomLevel !== 1.0 && (
                <button
                  type="button"
                  onClick={() => setPriceZoomLevel(1.0)}
                  className="absolute top-10 right-2 sm:top-2.5 sm:right-36 z-30 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[9px] font-bold flex items-center gap-1 backdrop-blur-md cursor-pointer transition-all shadow-md active:scale-95"
                  title="Double click price axis or tap here to reset vertical scale"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                  <span>Price: {priceZoomLevel.toFixed(1)}x (Reset)</span>
                </button>
              )}

              {/* Quick Snap to Real-time / Latest Candle Floating Pill - Positioned cleanly above bottom order controls */}
              {Math.abs(panOffset.x) > 35 && (
                <button
                  type="button"
                  onClick={() => setPanOffset(p => ({ ...p, x: 0 }))}
                  className="absolute bottom-24 sm:bottom-28 right-4 sm:right-6 z-30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-gray-950/90 hover:bg-gray-900 border border-amber-400/50 hover:border-amber-400 text-amber-300 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-sm cursor-pointer active:scale-95 transition-all"
                  title="Jump to Real-time Latest Candle"
                >
                  <span>Latest Candle</span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              )}

              {/* Fullscreen Position Line Overlay Buttons */}
              {activeTrades
                .filter(t => {
                  if (t.symbol !== activeMarket.symbol && t.symbol !== activeMarket.id) return false;
                  if (t.status !== 'OPEN') return false;
                  if (t.accountType !== activeAccount && (t.accountType || activeAccount !== 'live')) return false;
                  const isForex = t.tradingMode === 'forex' || t.category === 'forex' || (!t.tradingMode && !t.expirySeconds);
                  const isBinary = t.tradingMode === 'otc' || t.category === 'binary' || (!!t.expirySeconds && t.expirySeconds > 0);
                  if (tradingMode === 'forex') return isForex;
                  if (tradingMode === 'otc') return isBinary;
                  return false;
                })
                .map((trd, idx) => {
                  const y = tradeYMap[trd.id];
                  if (y === undefined || y < 10) return null;
                  const isForex = trd.tradingMode === 'forex';
                  if (!isForex) return null; // Binary OTC trades are rendered directly on candlesticks in Quotex style

                  return (
                    <div
                      key={`fs-chart-trd-${trd.id || 'trd'}-${idx}`}
                      style={{ top: `${y - 10}px` }}
                      className="absolute right-[68px] z-20 flex items-center pointer-events-auto"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClosePosition(trd.id);
                        }}
                        className="w-5 h-5 rounded bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-md border border-white/40 flex items-center justify-center cursor-pointer transition-all"
                        title="Close Forex Trade"
                      >
                        <X className="w-3 h-3 text-white stroke-[3]" />
                      </button>
                    </div>
                  );
                })}

              {/* Fullscreen Quick Order Floating Overlay - Slim & Compact Layout */}
              <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-[#0A0E1A]/95 backdrop-blur-md p-1.5 sm:p-2 rounded-xl border border-white/15 shadow-2xl space-y-1.5 max-w-4xl mx-auto">
                {tradingMode === 'forex' ? (
                  /* FOREX FULLSCREEN CONTROLS */
                  <div className="space-y-1.5">
                    {/* Lot Size Section & Slim Forex/Binary Mode Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-white/10 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-gray-300 uppercase tracking-tight">
                          Lot Size:
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const cur = parseFloat(forexLotSize || '0.01');
                              const next = Math.max(0.01, cur - 0.01);
                              setForexLotSize(next.toFixed(2));
                            }}
                            className="w-6 h-6 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 text-white font-mono font-bold text-xs flex items-center justify-center active:scale-95 cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={forexLotSize}
                            onChange={(e) => setForexLotSize(e.target.value)}
                            className="w-16 px-1 py-0.5 bg-gray-950 border border-blue-500/40 focus:border-blue-400 rounded text-xs font-mono font-bold text-white text-center outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cur = parseFloat(forexLotSize || '0.01');
                              const next = cur + 0.01;
                              setForexLotSize(next.toFixed(2));
                            }}
                            className="w-6 h-6 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 text-white font-mono font-bold text-xs flex items-center justify-center active:scale-95 cursor-pointer"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsLeverageModalOpen(true)}
                            className="flex items-center gap-1 px-1.5 py-0.5 ml-1 rounded bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-[10px] font-mono text-blue-300 transition-colors cursor-pointer"
                            title="Change Leverage"
                          >
                            <Gauge className="w-2.5 h-2.5 text-blue-400" />
                            <span className="font-bold">1:{forexLeverage}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Quick Lot Preset Pills */}
                        <div className="hidden xs:flex items-center gap-1">
                          {['0.01', '0.05', '0.10', '0.50', '1.00'].map((val, idx) => (
                            <button
                              key={`ttv-fs-lot-${val}-${idx}`}
                              type="button"
                              onClick={() => setForexLotSize(val)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                                forexLotSize === val
                                  ? 'bg-blue-600 text-white font-bold'
                                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>

                        {/* Slim Mode Switcher: Forex & Binary */}
                        <div className="flex items-center gap-0.5 bg-gray-950 p-0.5 rounded-lg border border-white/15 text-[10px] font-mono shrink-0">
                          <button
                            type="button"
                            onClick={() => setTradingMode('forex')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              tradingMode === 'forex'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Forex
                          </button>
                          <button
                            type="button"
                            onClick={() => setTradingMode('otc')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              tradingMode === 'otc'
                                ? 'bg-[#F5B301] text-gray-950 shadow-sm'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Binary
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* FOREX BUY & SELL BUTTONS */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleExecuteTrade('BUY')}
                        className="py-1.5 px-3 bg-[#00E676] hover:bg-emerald-400 text-gray-950 font-extrabold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20 active:scale-[0.97] transition-all cursor-pointer h-8"
                      >
                        <TrendingUp className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                        <span className="whitespace-nowrap font-black">BUY</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExecuteTrade('SELL')}
                        className="py-1.5 px-3 bg-[#FF1744] hover:bg-rose-600 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-rose-600/20 active:scale-[0.97] transition-all cursor-pointer h-8"
                      >
                        <TrendingDown className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                        <span className="whitespace-nowrap font-black">SELL</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* BINARY OTC FULLSCREEN CONTROLS - SLIM & COMPACT */
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 border-b border-white/10 pb-1">
                      {/* Expiry Time Selector */}
                      <div className="flex items-center justify-between gap-1.5 bg-gray-900/60 p-1 rounded-lg border border-white/10">
                        <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Expiry:</span>
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              const durations = [5, 15, 30, 60, 120, 300, 600, 900];
                              const idx = durations.indexOf(otcExpiryDuration);
                              if (idx > 0) setOtcExpiryDuration(durations[idx - 1]);
                              else setOtcExpiryDuration(Math.max(5, otcExpiryDuration - 5));
                            }}
                            className="w-5 h-5 rounded bg-gray-950 border border-gray-700 text-white font-mono font-bold text-xs flex items-center justify-center active:scale-95 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-1.5 text-xs font-mono font-bold text-amber-400 min-w-[40px] text-center">
                            {formatCountdown(otcExpiryDuration)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const durations = [5, 15, 30, 60, 120, 300, 600, 900];
                              const idx = durations.indexOf(otcExpiryDuration);
                              if (idx !== -1 && idx < durations.length - 1) setOtcExpiryDuration(durations[idx + 1]);
                              else setOtcExpiryDuration(otcExpiryDuration + 15);
                            }}
                            className="w-5 h-5 rounded bg-gray-950 border border-gray-700 text-white font-mono font-bold text-xs flex items-center justify-center active:scale-95 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        {/* Quick Expiry Pills */}
                        <div className="hidden xs:flex items-center gap-0.5">
                          {[
                            { sec: 15, label: '15s' },
                            { sec: 30, label: '30s' },
                            { sec: 60, label: '1m' },
                            { sec: 120, label: '2m' },
                            { sec: 300, label: '5m' },
                            { sec: 600, label: '10m' }
                          ].map((item, idx) => (
                            <button
                              key={`ttv-fs-exp-${item.sec}-${idx}`}
                              type="button"
                              onClick={() => setOtcExpiryDuration(item.sec)}
                              className={`px-1 py-0.5 rounded text-[9px] font-mono transition-all cursor-pointer ${
                                otcExpiryDuration === item.sec
                                  ? 'bg-amber-400 text-gray-950 font-bold'
                                  : 'bg-gray-950 border border-gray-800 text-gray-400 hover:text-white'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Investment Amount ($) Selector & Slim Forex/Binary Mode Switcher */}
                      <div className="flex items-center justify-between gap-1.5 bg-gray-900/60 p-1 rounded-lg border border-white/10">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-gray-300 uppercase tracking-wider shrink-0 flex items-center gap-1">
                            <span className="text-emerald-400 font-bold">$</span>
                            <span>Amount:</span>
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                const cur = parseFloat(otcInvestment || '10');
                                const next = Math.max(1, cur > 50 ? cur - 10 : cur > 10 ? cur - 5 : cur - 1);
                                setOtcInvestment(next.toString());
                              }}
                              className="w-5 h-5 rounded bg-gray-950 border border-gray-700 text-white font-mono font-bold text-xs flex items-center justify-center active:scale-95 cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={otcInvestment}
                              onChange={(e) => setOtcInvestment(e.target.value)}
                              className="w-14 px-1 py-0.5 bg-gray-950 border border-emerald-500/40 focus:border-emerald-400 rounded text-xs font-mono font-bold text-white text-center outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const cur = parseFloat(otcInvestment || '10');
                                const next = cur >= 50 ? cur + 10 : cur >= 10 ? cur + 5 : cur + 1;
                                setOtcInvestment(next.toString());
                              }}
                              className="w-5 h-5 rounded bg-gray-950 border border-gray-700 text-white font-mono font-bold text-xs flex items-center justify-center active:scale-95 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Slim Mode Switcher: Forex & Binary */}
                        <div className="flex items-center gap-0.5 bg-gray-950 p-0.5 rounded-lg border border-white/15 text-[10px] font-mono shrink-0">
                          <button
                            type="button"
                            onClick={() => setTradingMode('forex')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              tradingMode === 'forex'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Forex
                          </button>
                          <button
                            type="button"
                            onClick={() => setTradingMode('otc')}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              tradingMode === 'otc'
                                ? 'bg-[#F5B301] text-gray-950 shadow-sm'
                                : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Binary
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* BINARY UP (CALL) & DOWN (PUT) BUTTONS - SLIGHTLY REDUCED HEIGHT */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleExecuteTrade('UP')}
                        className="py-1.5 px-3 bg-[#00E676] hover:bg-emerald-400 text-gray-950 font-extrabold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20 active:scale-[0.97] transition-all cursor-pointer h-8"
                      >
                        <TrendingUp className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                        <span className="whitespace-nowrap font-black">UP (CALL)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExecuteTrade('DOWN')}
                        className="py-1.5 px-3 bg-[#FF1744] hover:bg-rose-600 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1 shadow-md shadow-rose-600/20 active:scale-[0.97] transition-all cursor-pointer h-8"
                      >
                        <TrendingDown className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                        <span className="whitespace-nowrap font-black">DOWN (PUT)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FULLSCREEN ACTIVE TRADES POPUP MODAL */}
            <AnimatePresence>
              {showFullscreenTradesModal && (
                <div
                  className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md"
                  onClick={() => setShowFullscreenTradesModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.93, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.93, opacity: 0, y: 10 }}
                    transition={{ duration: 0.16 }}
                    className="w-full max-w-lg max-h-[85vh] bg-[#0A0E1A] border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#070A13]">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border font-mono font-bold text-xs ${
                          fullscreenTradesMode === 'forex'
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        }`}>
                          {fullscreenTradesMode === 'forex' ? 'FX' : 'OTC'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white">
                              {fullscreenTradesTab === 'history'
                                ? fullscreenTradesMode === 'forex' ? 'Forex Trade History' : 'Binary Option History'
                                : fullscreenTradesMode === 'forex' ? 'Open Forex Positions' : 'Open Binary Contracts'}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                              fullscreenTradesMode === 'forex'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {fullscreenTradesTab === 'history'
                                ? `${closedTrades.filter(t => (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && ((t.tradingMode || (t.category === 'binary' ? 'otc' : 'forex')) === (fullscreenTradesMode === 'forex' ? 'forex' : 'otc'))).length} Settled`
                                : `${currentSessionActiveTradesCount} Active`}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono">
                            Account: <span className="uppercase text-amber-400 font-bold">{activeAccount}</span> • {
                              fullscreenTradesTab === 'history'
                                ? 'Click trade row to view entry & closing prices'
                                : fullscreenTradesMode === 'forex' ? 'Close positions instantly' : 'Contracts auto-settle upon expiry'
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {fullscreenTradesTab === 'positions' && fullscreenTradesMode === 'forex' && currentSessionActiveTradesCount > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              currentSessionActiveTrades.forEach(t => handleClosePosition(t.id));
                              showNotification(`Closed all ${currentSessionActiveTradesCount} Forex positions`, 'success');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                          >
                            Close All
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowFullscreenTradesModal(false)}
                          className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Navigation Tabs: Active vs History & Small Forex vs Binary Switcher */}
                    <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#090D18] border-b border-white/10 text-xs gap-2 shrink-0">
                      {/* Active Positions vs Trade History */}
                      <div className="flex items-center p-0.5 bg-gray-950 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setFullscreenTradesTab('positions')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            fullscreenTradesTab === 'positions'
                              ? 'bg-blue-600 text-white shadow'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Active ({currentSessionActiveTradesCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFullscreenTradesTab('history')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            fullscreenTradesTab === 'history'
                              ? 'bg-[#F5B301] text-gray-950 shadow font-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          History ({closedTrades.filter(t => (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live'))).length})
                        </button>
                      </div>

                      {/* Small Forex vs Binary Tabs */}
                      <div className="flex items-center p-0.5 bg-gray-950 rounded-xl border border-white/10">
                        <button
                          type="button"
                          onClick={() => setFullscreenTradesMode('forex')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                            fullscreenTradesMode === 'forex'
                              ? 'bg-blue-600 text-white shadow'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Globe className="w-3 h-3 text-blue-300" />
                          <span>Forex</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFullscreenTradesMode('otc')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                            fullscreenTradesMode === 'otc'
                              ? 'bg-emerald-500 text-gray-950 shadow'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Zap className="w-3 h-3 text-gray-950" />
                          <span>Binary</span>
                        </button>
                      </div>
                    </div>

                    {/* Modal Body: Active Positions OR Trade History List */}
                    {fullscreenTradesTab === 'history' ? (
                      <div className="p-3 overflow-y-auto flex-1 max-h-[55vh]">
                        <TradeHistoryList
                          trades={closedTrades}
                          activeAccount={activeAccount}
                          initialMode={fullscreenTradesMode}
                          showModeSwitch={false}
                          maxContainerHeight="max-h-[50vh]"
                          onTradeClick={(trd) => setSelectedHistoryDetailTrade(trd)}
                        />
                      </div>
                    ) : (
                      <div className="p-3 overflow-y-auto space-y-2 flex-1 max-h-[55vh]">
                        {currentSessionActiveTradesCount === 0 ? (
                          <div className="text-center py-10 space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-gray-900/80 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                              <Layers className="w-6 h-6" />
                            </div>
                            <p className="text-xs text-gray-400 font-medium">
                              {fullscreenTradesMode === 'forex' 
                                ? 'No active Forex positions in this account.' 
                                : 'No active Binary contracts running.'}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {fullscreenTradesMode === 'forex'
                                ? 'Place a BUY or SELL order to manage active trades here.'
                                : 'Place an UP or DOWN trade to track timer and results here.'}
                            </p>
                          </div>
                        ) : (
                          currentSessionActiveTrades.map(trd => {
                            const isForex = trd.tradingMode === 'forex' || trd.category === 'forex' || (!trd.tradingMode && !trd.expirySeconds);
                            const isThisMarket = trd.symbol === activeMarket.symbol || trd.symbol === activeMarket.id;
                            const livePrice = isThisMarket ? currentTickPrice : (customMarketEngine.getCurrentPrice(trd.symbol) || trd.currentPrice || trd.entryPrice);
                            
                            let livePnl = 0;
                            if (isForex) {
                              if (trd.pnl !== undefined) {
                                livePnl = trd.pnl;
                              } else if (trd.profit !== undefined) {
                                livePnl = trd.profit;
                              } else {
                                const lot = trd.lotSize || trd.volume || 0.01;
                                const units = getMarketContractUnits(trd.symbol);
                                const dir = (trd.type === 'BUY' || trd.type === 'UP') ? 1 : -1;
                                livePnl = Number((dir * (livePrice - trd.entryPrice) * lot * units).toFixed(2));
                              }
                            } else {
                              const isCall = trd.type === 'CALL' || trd.type === 'BUY';
                              const inTheMoney = isCall ? livePrice > trd.entryPrice : livePrice < trd.entryPrice;
                              const isTie = Math.abs(livePrice - trd.entryPrice) < 0.000001;
                              livePnl = inTheMoney ? trd.amount * 0.85 : isTie ? 0 : -trd.amount;
                            }

                            const isBuy = trd.type === 'BUY' || trd.type === 'CALL';
                            const isPnlPositive = livePnl >= 0;

                            return (
                              <div
                                key={`fs-modal-trade-${trd.id}`}
                                className="bg-[#0D1222] border border-white/10 hover:border-white/20 rounded-xl p-2.5 space-y-2 transition-all"
                              >
                                {/* Row 1: Type, Symbol, Volume/Amount, and Live PnL + Close Button */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono tracking-wider ${
                                      isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}>
                                      {trd.type}
                                    </span>
                                    <span className="font-bold text-white text-xs tracking-tight">{trd.symbol}</span>
                                    <span className="text-[10px] font-mono text-gray-400">
                                      {isForex ? `${trd.volume || 0.01} Lots` : `$${trd.amount}`}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono font-black text-xs ${
                                      isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                      {isPnlPositive ? '+' : ''}${livePnl.toFixed(2)}
                                    </span>
                                    {isForex && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleClosePosition(trd.id);
                                          showNotification(`Closed position for ${trd.symbol}`, 'success');
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                        title="Close this position now"
                                      >
                                        <X className="w-3 h-3" />
                                        <span>Close</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Row 2: Price stats & Expiration Countdown */}
                                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-1 border-t border-white/5">
                                  <div className="flex items-center gap-3">
                                    <span>Entry: <strong className="text-gray-200">{trd.entryPrice}</strong></span>
                                    <span>Now: <strong className="text-gray-200">{livePrice.toFixed(activeMarket.precision || 2)}</strong></span>
                                    {isForex && trd.stopLoss && (
                                      <span className="text-rose-400">SL: {trd.stopLoss}</span>
                                    )}
                                    {isForex && trd.takeProfit && (
                                      <span className="text-emerald-400">TP: {trd.takeProfit}</span>
                                    )}
                                  </div>

                                  {!isForex && trd.expiresAt && (
                                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                                      <Clock className="w-3 h-3" />
                                      <span>{Math.max(0, Math.ceil((trd.expiresAt - Date.now()) / 1000))}s left</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Modal Footer */}
                    <div className="px-4 py-2.5 bg-[#070A13] border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-gray-400">
                      <div className="flex items-center gap-2">
                        <span>Session Floating P&L:</span>
                        <span className={`font-bold ${currentSessionNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {currentSessionNetPnl >= 0 ? '+' : ''}${currentSessionNetPnl.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowFullscreenTradesModal(false)}
                        className="px-3 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 text-[10px] font-medium transition-colors cursor-pointer border border-white/10"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* FULLSCREEN TRADE EXECUTION DETAIL MODAL */}
            <React.Suspense fallback={null}>
              {selectedHistoryDetailTrade && (
                <TradeDetailModal
                  trade={selectedHistoryDetailTrade}
                  onClose={() => setSelectedHistoryDetailTrade(null)}
                />
              )}
            </React.Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODIFY SL / TP POPUP MODAL */}
      <AnimatePresence>
        {editingSlTpTrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm p-5 bg-[#0E1424] border-2 border-blue-500/50 rounded-3xl space-y-4 text-white shadow-2xl font-sans"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <span>Modify Stop Loss / Take Profit</span>
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {editingSlTpTrade.symbol} ({editingSlTpTrade.type}) • Entry: ${editingSlTpTrade.entryPrice}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingSlTpTrade(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Stop Loss Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Stop Loss (SL) Price</span>
                    <span className="text-gray-500 font-mono">
                      Current: {editingSlTpTrade.stopLoss ? `${editingSlTpTrade.stopLoss} (-$${Math.abs(calculateForexPnl(editingSlTpTrade, editingSlTpTrade.stopLoss)).toFixed(2)})` : 'Off'}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editSlValue}
                    onChange={(e) => setEditSlValue(e.target.value)}
                    placeholder={`e.g. ${(editingSlTpTrade.entryPrice * 0.995).toFixed(4)}`}
                    className="w-full px-3 py-2 bg-gray-950 border border-rose-500/30 rounded-xl text-xs font-mono text-white outline-none focus:border-rose-500"
                  />
                  {editSlValue && !isNaN(parseFloat(editSlValue)) && parseFloat(editSlValue) > 0 && (
                    <div className="text-[10px] text-rose-400 font-mono font-bold flex justify-between px-1">
                      <span>Projected Loss at SL:</span>
                      <span>-${Math.abs(calculateForexPnl(editingSlTpTrade, parseFloat(editSlValue))).toFixed(2)} USD</span>
                    </div>
                  )}
                </div>

                {/* Take Profit Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Take Profit (TP) Price</span>
                    <span className="text-gray-500 font-mono">
                      Current: {editingSlTpTrade.takeProfit ? `${editingSlTpTrade.takeProfit} (+$${Math.abs(calculateForexPnl(editingSlTpTrade, editingSlTpTrade.takeProfit)).toFixed(2)})` : 'Off'}
                    </span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editTpValue}
                    onChange={(e) => setEditTpValue(e.target.value)}
                    placeholder={`e.g. ${(editingSlTpTrade.entryPrice * 1.005).toFixed(4)}`}
                    className="w-full px-3 py-2 bg-gray-950 border border-emerald-500/30 rounded-xl text-xs font-mono text-white outline-none focus:border-emerald-500"
                  />
                  {editTpValue && !isNaN(parseFloat(editTpValue)) && parseFloat(editTpValue) > 0 && (
                    <div className="text-[10px] text-emerald-400 font-mono font-bold flex justify-between px-1">
                      <span>Projected Profit at TP:</span>
                      <span>+${Math.abs(calculateForexPnl(editingSlTpTrade, parseFloat(editTpValue))).toFixed(2)} USD</span>
                    </div>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const pips = 0.0020;
                      if (editingSlTpTrade.type === 'BUY') {
                        setEditSlValue((editingSlTpTrade.entryPrice - pips).toFixed(4));
                        setEditTpValue((editingSlTpTrade.entryPrice + pips * 2).toFixed(4));
                      } else {
                        setEditSlValue((editingSlTpTrade.entryPrice + pips).toFixed(4));
                        setEditTpValue((editingSlTpTrade.entryPrice - pips * 2).toFixed(4));
                      }
                    }}
                    className="flex-1 py-1.5 bg-gray-900 border border-gray-800 text-[10px] font-mono text-gray-300 rounded-lg hover:border-gray-700 cursor-pointer"
                  >
                    Auto 20/40 Pips
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditSlValue('');
                      setEditTpValue('');
                    }}
                    className="px-3 py-1.5 bg-gray-900 border border-gray-800 text-[10px] font-mono text-rose-400 rounded-lg hover:border-gray-700 cursor-pointer"
                  >
                    Clear SL/TP
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingSlTpTrade(null)}
                  className="flex-1 py-2.5 bg-gray-900 text-gray-400 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newSl = editSlValue ? parseFloat(editSlValue) : undefined;
                    const newTp = editTpValue ? parseFloat(editTpValue) : undefined;
                    
                    setActiveTrades(prev => prev.map(t => {
                      if (t.id === editingSlTpTrade.id) {
                        const updated = { ...t, stopLoss: newSl, takeProfit: newTp };
                        saveTradeToFirestore(updated, userUid, userEmail);
                        return updated;
                      }
                      return t;
                    }));

                    showNotification('Stop Loss & Take Profit updated!', 'success');
                    setEditingSlTpTrade(null);
                  }}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl uppercase tracking-wider cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INITIAL TRADING MARKET SELECTION MODAL (FOREX VS BINARY) */}
      <AnimatePresence>
        {showModeSelectionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 15 }}
              className="w-full max-w-xl p-5 sm:p-7 bg-[#0B0F1C] border-2 border-[#F5B301]/50 rounded-3xl space-y-5 text-white shadow-2xl font-sans relative"
            >
              {/* Optional Close Button */}
              <button
                type="button"
                onClick={() => setShowModeSelectionModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-900 border border-gray-800 text-gray-400 hover:text-white cursor-pointer transition-all"
                title="Close and continue to terminal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center space-y-2 pb-3 border-b border-white/10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#F5B301]/20 border border-[#F5B301]/40 text-[#F5B301] shadow-lg shadow-[#F5B301]/10">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                  Select Trading Market
                </h2>
                <p className="text-xs text-gray-400">
                  Choose your trading interface to start your market session
                </p>
              </div>

              {/* Two Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* FOREX TRADING CARD */}
                <div
                  onClick={() => {
                    setTradingMode('forex');
                    setShowModeSelectionModal(false);
                  }}
                  className="group bg-gradient-to-b from-[#11182A] to-[#0A0E1A] hover:from-[#18233C] hover:to-[#0F1629] p-5 rounded-2xl border-2 border-blue-500/30 hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-xl active:scale-[0.98]"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 shadow">
                        <Globe className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                        Spot Forex
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white group-hover:text-blue-300 transition-colors">
                      Forex Trading
                    </h3>

                    <p className="text-xs text-gray-400 leading-relaxed">
                      Trade major currency pairs with Lot sizes (0.01 - 10.00), Leverage, Stop Loss & Take Profit orders.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 px-3 bg-blue-600 group-hover:bg-blue-500 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <span>Open Forex Interface</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* BINARY TRADING CARD */}
                <div
                  onClick={() => {
                    setTradingMode('otc');
                    setShowModeSelectionModal(false);
                  }}
                  className="group bg-gradient-to-b from-[#11182A] to-[#0A0E1A] hover:from-[#1A2822] hover:to-[#0F1C16] p-5 rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-xl active:scale-[0.98]"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow">
                        <Zap className="w-5 h-5" />
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 uppercase">
                        Binary OTC
                      </span>
                    </div>

                    <h3 className="text-base font-black text-white group-hover:text-emerald-300 transition-colors">
                      Binary Trading
                    </h3>

                    <p className="text-xs text-gray-400 leading-relaxed">
                      High-yield binary options with fixed timers (1m, 2m, 5m, 10m), live countdowns & up to 92% payouts.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 px-3 bg-emerald-500 group-hover:bg-emerald-400 text-gray-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                  >
                    <span>Open Binary Interface</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Footer Note */}
              <p className="text-[11px] text-gray-500 text-center font-mono pt-1">
                ⚡ You can switch between Forex and Binary interfaces anytime from the terminal top bar.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MARKET SELECTION POPUP MODAL (Floats above chart and all UI layers) */}
      <AnimatePresence>
        {isMarketModalOpen && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none"
            onClick={() => setIsMarketModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="w-full max-w-lg p-4 sm:p-5 bg-[#0E1424] border-2 border-[#F5B301]/60 rounded-3xl space-y-4 text-white shadow-[0_25px_70px_rgba(0,0,0,0.95)] font-sans max-h-[88vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#F5B301]">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Select Trading Market
                    </h3>
                    <p className="text-[10px] text-gray-400">Choose Forex Pairs or OTC Binary Assets</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMarketModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={marketSearchQuery}
                  onChange={(e) => setMarketSearchQuery(e.target.value)}
                  placeholder="Search pair name (e.g. EUR/USD, GOLD, BTC OTC...)"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#F5B301]"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-950/80 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setModalCategory('all')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalCategory === 'all'
                      ? 'bg-amber-500 text-gray-950 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All Pairs
                </button>
                <button
                  type="button"
                  onClick={() => setModalCategory('forex')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalCategory === 'forex'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Forex & Real
                </button>
                <button
                  type="button"
                  onClick={() => setModalCategory('otc')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalCategory === 'otc'
                      ? 'bg-emerald-500 text-gray-950 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Binary OTC
                </button>
              </div>

              {/* Markets List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {filteredMarketsForModal.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-6">No matching markets found.</p>
                ) : (
                  filteredMarketsForModal.map((m, idx) => {
                    const isSelected = m.id === activeMarket.id;
                    return (
                      <button
                        key={`mkt-sel-${m.id || 'm'}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedMarketId(m.id);
                          setCurrentTickPrice(m.basePrice);
                          setIsMarketModalOpen(false);
                        }}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#121A2E] border-[#F5B301] ring-1 ring-[#F5B301]'
                            : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#F5B301]/20 border border-[#F5B301]/40 flex items-center justify-center text-[#F5B301] font-black text-xs font-mono">
                            {m.symbol.substring(0, 3)}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white">{m.symbol}</h4>
                            <p className="text-[10px] text-gray-400">{m.name}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-white">${m.basePrice}</p>
                          <p className={`text-[10px] font-mono font-bold ${tradingMode === 'otc' ? 'text-amber-300' : (m.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400')}`}>
                            {tradingMode === 'otc' || m.category === 'otc' ? `Payout +${m.payoutPercent ?? 90}%` : `${m.change24h >= 0 ? '+' : ''}${m.change24h}%`}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PENDING ORDER CREATION MODAL */}
      <AnimatePresence>
        {showPendingOrderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-4 sm:p-5 bg-[#0E1424] border-2 border-[#F5B301]/40 rounded-3xl space-y-4 text-white shadow-2xl font-sans"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#F5B301]" />
                    <span>New Pending Order</span>
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    {activeMarket.symbol} • Live Rate: <strong className="text-emerald-400 font-mono">${currentTickPrice.toFixed(activeMarket.precision)}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPendingOrderModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Type Selector Grid */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Order Type
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { type: 'BUY LIMIT', desc: 'Buy below market rate', color: 'emerald' },
                    { type: 'SELL LIMIT', desc: 'Sell above market rate', color: 'rose' },
                    { type: 'BUY STOP', desc: 'Buy breakout above rate', color: 'emerald' },
                    { type: 'SELL STOP', desc: 'Sell breakdown below rate', color: 'rose' }
                  ].map((item, idx) => {
                    const isSelected = pendingOrderType === item.type;
                    const isBuy = item.type.startsWith('BUY');

                    return (
                      <button
                        key={`pnd-type-${item.type}-${idx}`}
                        type="button"
                        onClick={() => setPendingOrderType(item.type as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? isBuy
                              ? 'bg-emerald-500/20 border-emerald-400 ring-1 ring-emerald-400'
                              : 'bg-rose-500/20 border-rose-400 ring-1 ring-rose-400'
                            : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black font-mono ${isSelected ? (isBuy ? 'text-emerald-300' : 'text-rose-300') : 'text-white'}`}>
                            {item.type}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-400 block mt-0.5">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Execution Price */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Target Execution Price ($)
                  </label>
                  <span className="text-[10px] font-mono text-[#F5B301]">
                    Live: ${currentTickPrice.toFixed(activeMarket.precision)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(pendingOrderTargetPrice || String(currentTickPrice));
                      const step = activeMarket.symbol.includes('JPY') ? 0.01 : 0.0001;
                      setPendingOrderTargetPrice((cur - step).toFixed(activeMarket.precision));
                    }}
                    className="w-9 h-9 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-mono font-black text-sm flex items-center justify-center border border-gray-800"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    step="any"
                    value={pendingOrderTargetPrice}
                    onChange={(e) => setPendingOrderTargetPrice(e.target.value)}
                    placeholder={currentTickPrice.toFixed(activeMarket.precision)}
                    className="flex-1 py-2 px-3 bg-gray-950 border border-[#F5B301]/60 focus:border-[#F5B301] rounded-xl text-center text-sm font-black text-white font-mono outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(pendingOrderTargetPrice || String(currentTickPrice));
                      const step = activeMarket.symbol.includes('JPY') ? 0.01 : 0.0001;
                      setPendingOrderTargetPrice((cur + step).toFixed(activeMarket.precision));
                    }}
                    className="w-9 h-9 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-mono font-black text-sm flex items-center justify-center border border-gray-800"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Volume / Lot Size */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Volume (Lots)
                  </label>
                  <span className="text-[10px] font-mono text-gray-400">
                    Margin: ${((parseFloat(pendingOrderTargetPrice || '1') * getMarketContractUnits(activeMarket.symbol) * parseFloat(pendingOrderLotSize || '0.01')) / forexLeverage).toFixed(2)} USD
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const val = Math.max(0.01, parseFloat(pendingOrderLotSize || '0.01') - 0.01);
                      setPendingOrderLotSize(val.toFixed(2));
                    }}
                    className="w-9 h-9 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-mono font-black text-sm flex items-center justify-center border border-gray-800"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={pendingOrderLotSize}
                    onChange={(e) => setPendingOrderLotSize(e.target.value)}
                    className="flex-1 py-2 px-3 bg-gray-950 border border-gray-800 focus:border-[#F5B301] rounded-xl text-center text-sm font-black text-white font-mono outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(pendingOrderLotSize || '0.01') + 0.01;
                      setPendingOrderLotSize(val.toFixed(2));
                    }}
                    className="w-9 h-9 rounded-xl bg-gray-950 hover:bg-gray-800 text-white font-mono font-black text-sm flex items-center justify-center border border-gray-800"
                  >
                    +
                  </button>
                </div>

                {/* Quick lot pills */}
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {['0.01', '0.02', '0.05', '0.10', '0.50', '1.00'].map((val, idx) => (
                    <button
                      key={`pnd-lot-${val}-${idx}`}
                      type="button"
                      onClick={() => setPendingOrderLotSize(val)}
                      className={`py-1 rounded-lg text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                        pendingOrderLotSize === val
                          ? 'bg-[#F5B301] text-gray-950 border-[#F5B301] font-black'
                          : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional SL / TP */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                <div className="bg-gray-950 p-2 rounded-xl border border-gray-800">
                  <label className="block text-[9px] text-gray-400 font-bold mb-0.5">
                    Stop Loss (SL)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional SL"
                    value={pendingOrderStopLoss}
                    onChange={(e) => setPendingOrderStopLoss(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none placeholder-gray-600"
                  />
                </div>

                <div className="bg-gray-950 p-2 rounded-xl border border-gray-800">
                  <label className="block text-[9px] text-gray-400 font-bold mb-0.5">
                    Take Profit (TP)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional TP"
                    value={pendingOrderTakeProfit}
                    onChange={(e) => setPendingOrderTakeProfit(e.target.value)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-white outline-none placeholder-gray-600"
                  />
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleCreatePendingOrder}
                  className="w-full py-3 bg-[#F5B301] hover:bg-amber-400 text-gray-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>Place {pendingOrderType} Order</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACCOUNT SWITCHER CENTER POPUP MODAL (Floats above chart and all content) */}
      <AnimatePresence>
        {showAccountDropdown && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none"
            onClick={() => setShowAccountDropdown(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="w-full max-w-sm bg-[#0E1322] border-2 border-amber-500/60 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden p-4 space-y-3.5 backdrop-blur-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#F5B301]">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Select Account</h3>
                    <p className="text-[11px] text-gray-400">Click to switch trading account</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAccountDropdown(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Account Cards List (Live, Bonus, Demo) */}
              <div className="space-y-2">
                {(['live', 'bonus', 'demo'] as const).map((acc) => {
                  const isCur = activeAccount === acc;
                  const floatPnl = getAccountFloatingPnl(acc);
                  const bal = Math.max(0, (balances[acc] || 0) + floatPnl);

                  return (
                    <div
                      key={`modal-acc-${acc}`}
                      onClick={() => {
                        setActiveAccount(acc);
                        setShowAccountDropdown(false);
                        showNotification(`Switched to ${acc.toUpperCase()} Account`, 'success');
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                        isCur
                          ? 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/60 shadow-lg ring-1 ring-amber-500/40'
                          : 'bg-[#141A2D] hover:bg-[#1A223B] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                          acc === 'live'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                            : acc === 'bonus'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : 'bg-amber-500/20 text-[#F5B301] border border-amber-500/40'
                        }`}>
                          {acc === 'live' ? 'L' : acc === 'bonus' ? 'B' : 'D'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white uppercase tracking-wider">
                              {acc === 'live' ? 'Live Balance' : acc === 'bonus' ? 'Bonus Account' : 'Demo Account'}
                            </span>
                            {isCur && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                            P/L: <span className={floatPnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {floatPnl >= 0 ? '+' : ''}${floatPnl.toFixed(2)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <span className="font-mono text-sm font-black text-white block">
                            ${bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9px] font-mono text-gray-400 font-bold">USD</span>
                        </div>
                        {acc === 'demo' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDemoBalanceModal(true);
                              setShowAccountDropdown(false);
                            }}
                            className="p-1.5 rounded-lg bg-[#F5B301]/20 hover:bg-[#F5B301]/35 text-[#F5B301] transition-all cursor-pointer border border-[#F5B301]/40 flex items-center justify-center shrink-0"
                            title="Edit Demo Balance"
                          >
                            <Pencil className="w-3.5 h-3.5 text-[#F5B301]" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ABOUT COMPANY & FINANCIAL LICENSES MODAL */}
      <React.Suspense fallback={null}>
        {isAboutCompanyOpen && (
          <AboutCompanyModal
            isOpen={isAboutCompanyOpen}
            onClose={() => setIsAboutCompanyOpen(false)}
          />
        )}
      </React.Suspense>

      {/* TIMEFRAME SELECTION POPUP MODAL (Floats cleanly over chart at z-[200]) */}
      <AnimatePresence>
        {showTimeframeDropdown && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none"
            onClick={() => setShowTimeframeDropdown(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="w-full max-w-md p-4 sm:p-5 bg-[#0E1424] border-2 border-[#F5B301]/60 rounded-3xl space-y-4 text-white shadow-[0_25px_70px_rgba(0,0,0,0.95)] font-sans max-h-[88vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#F5B301]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Select Timeframe
                    </h3>
                    <p className="text-[10px] text-gray-400">Choose candle period for chart analysis</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTimeframeDropdown(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Categorized Timeframe Grid */}
              <div className="space-y-3">
                {/* Minutes (Standard Trading) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Minutes (Standard)</span>
                    <span className="text-[9px] text-amber-400 font-mono">1m to 30m</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'M1', label: '1 Minute', short: '1m' },
                      { id: 'M5', label: '5 Minutes', short: '5m' },
                      { id: 'M15', label: '15 Minutes', short: '15m' },
                      { id: 'M30', label: '30 Minutes', short: '30m' },
                    ].map((tfItem, idx) => {
                      const isSelected = timeframe === tfItem.id;
                      return (
                        <button
                          key={`tf-m-${tfItem.id}-${idx}`}
                          type="button"
                          onClick={() => {
                            setTimeframe(tfItem.id as any);
                            setShowTimeframeDropdown(false);
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-br from-amber-500/30 to-amber-600/20 border-[#F5B301] text-white ring-1 ring-[#F5B301] shadow-lg shadow-amber-500/10'
                              : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white hover:bg-gray-900'
                          }`}
                        >
                          <span className={`text-xs font-black font-mono ${isSelected ? 'text-[#F5B301]' : 'text-white'}`}>
                            {tfItem.id}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">{tfItem.short}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Seconds (OTC / Scalping) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Seconds (OTC / Scalping)</span>
                    <span className="text-[9px] text-emerald-400 font-mono">Fast Ticks</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'S1', label: '1 Second', short: '1s' },
                      { id: 'S5', label: '5 Seconds', short: '5s' },
                      { id: 'S15', label: '15 Seconds', short: '15s' },
                      { id: 'S30', label: '30 Seconds', short: '30s' },
                    ].map((tfItem, idx) => {
                      const isSelected = timeframe === tfItem.id;
                      return (
                        <button
                          key={`tf-s-${tfItem.id}-${idx}`}
                          type="button"
                          onClick={() => {
                            setTimeframe(tfItem.id as any);
                            setShowTimeframeDropdown(false);
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border-emerald-400 text-white ring-1 ring-emerald-400 shadow-lg shadow-emerald-500/10'
                              : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white hover:bg-gray-900'
                          }`}
                        >
                          <span className={`text-xs font-black font-mono ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                            {tfItem.id}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">{tfItem.short}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Hours & Days (Long-term) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <span>Hours & Days (Long Term)</span>
                    <span className="text-[9px] text-blue-400 font-mono">Macro Trends</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'H1', label: '1 Hour', short: '1h' },
                      { id: 'H4', label: '4 Hours', short: '4h' },
                      { id: 'D1', label: '1 Day', short: '1d' },
                    ].map((tfItem, idx) => {
                      const isSelected = timeframe === tfItem.id;
                      return (
                        <button
                          key={`tf-h-${tfItem.id}-${idx}`}
                          type="button"
                          onClick={() => {
                            setTimeframe(tfItem.id as any);
                            setShowTimeframeDropdown(false);
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                            isSelected
                              ? 'bg-gradient-to-br from-blue-500/30 to-indigo-600/20 border-blue-400 text-white ring-1 ring-blue-400 shadow-lg shadow-blue-500/10'
                              : 'bg-gray-950 border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white hover:bg-gray-900'
                          }`}
                        >
                          <span className={`text-xs font-black font-mono ${isSelected ? 'text-blue-300' : 'text-white'}`}>
                            {tfItem.id}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">{tfItem.short}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWING TOOLS POPUP MODAL (Floats cleanly over chart at z-[200]) */}
      <AnimatePresence>
        {showDrawingToolsMenu && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-none"
            onClick={() => setShowDrawingToolsMenu(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="w-full max-w-lg p-4 sm:p-5 bg-[#0E1424] border-2 border-[#F5B301]/60 rounded-3xl space-y-4 text-white shadow-[0_25px_70px_rgba(0,0,0,0.95)] font-sans max-h-[88vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#F5B301]">
                    <Pencil className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Chart Drawing Tools
                    </h3>
                    <p className="text-[10px] text-gray-400">Select an overlay tool to draw on the candlestick chart</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDrawingToolsMenu(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawing Tools Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1. Long Position */}
                <button
                  type="button"
                  onClick={() => {
                    addDrawing('long_position');
                    setShowDrawingToolsMenu(false);
                  }}
                  className="p-3 rounded-2xl bg-gray-950 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-500/10 text-left flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-emerald-300 transition-colors">Long Position</h4>
                    <p className="text-[10px] text-emerald-400/80 font-mono">Buy Target & Stop Loss Tool</p>
                  </div>
                </button>

                {/* 2. Short Position */}
                <button
                  type="button"
                  onClick={() => {
                    addDrawing('short_position');
                    setShowDrawingToolsMenu(false);
                  }}
                  className="p-3 rounded-2xl bg-gray-950 border border-rose-500/30 hover:border-rose-400 hover:bg-rose-500/10 text-left flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform shrink-0">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-rose-300 transition-colors">Short Position</h4>
                    <p className="text-[10px] text-rose-400/80 font-mono">Sell Target & Stop Loss Tool</p>
                  </div>
                </button>

                {/* 3. Trend Line */}
                <button
                  type="button"
                  onClick={() => {
                    addDrawing('trend_line');
                    setShowDrawingToolsMenu(false);
                  }}
                  className="p-3 rounded-2xl bg-gray-950 border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/10 text-left flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform shrink-0">
                    <Slash className="w-5 h-5 rotate-45" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-blue-300 transition-colors">Trend Line</h4>
                    <p className="text-[10px] text-blue-300/80 font-mono">Diagonal Trend Channel Tool</p>
                  </div>
                </button>

                {/* 4. Ray */}
                <button
                  type="button"
                  onClick={() => {
                    addDrawing('ray');
                    setShowDrawingToolsMenu(false);
                  }}
                  className="p-3 rounded-2xl bg-gray-950 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-left flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">Infinite Ray</h4>
                    <p className="text-[10px] text-amber-300/80 font-mono">Directional Ray Projection</p>
                  </div>
                </button>

                {/* 5. Horizontal Line */}
                <button
                  type="button"
                  onClick={() => {
                    addDrawing('horizontal_line');
                    setShowDrawingToolsMenu(false);
                  }}
                  className="p-3 rounded-2xl bg-gray-950 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-left flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform shrink-0">
                    <Minus className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">Horizontal Line</h4>
                    <p className="text-[10px] text-amber-300/80 font-mono">Support & Resistance Level</p>
                  </div>
                </button>

                {/* 6. Rectangle */}
                <button
                  type="button"
                  onClick={() => {
                    addDrawing('rectangle');
                    setShowDrawingToolsMenu(false);
                  }}
                  className="p-3 rounded-2xl bg-gray-950 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/10 text-left flex items-center gap-3 transition-all cursor-pointer group active:scale-95"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform shrink-0">
                    <Square className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white group-hover:text-purple-300 transition-colors">Rectangle Zone</h4>
                    <p className="text-[10px] text-purple-300/80 font-mono">Supply & Demand Order Block</p>
                  </div>
                </button>
              </div>

              {/* Active drawings footer with Clear All */}
              {drawings.length > 0 && (
                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between px-1">
                  <span className="text-[11px] font-mono text-gray-400">
                    <strong className="text-amber-400 font-bold">{drawings.length}</strong> active shape{drawings.length > 1 ? 's' : ''} on chart
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawings([]);
                      setSelectedDrawingId(null);
                      setShowDrawingToolsMenu(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear All Drawings</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN RESPONSIVE DAILY LEADERBOARD MODAL */}
      <React.Suspense fallback={null}>
        {isLeaderboardOpen && (
          <LeaderboardModal
            isOpen={isLeaderboardOpen}
            onClose={() => setIsLeaderboardOpen(false)}
            userEmail={userEmail}
            userUid={userUid}
            displayName={userDisplayName}
            avatarUrl={userAvatar}
            activeAccount={activeAccount}
            closedTrades={closedTrades}
            activeTrades={activeTrades}
            onSwitchAccount={(acc) => setActiveAccount(acc)}
          />
        )}
      </React.Suspense>

      {/* EDIT DEMO BALANCE MODAL */}
      <React.Suspense fallback={null}>
        {showDemoBalanceModal && (
          <EditDemoBalanceModal
            isOpen={showDemoBalanceModal}
            onClose={() => setShowDemoBalanceModal(false)}
            currentBalance={balances.demo || 10000}
            onSave={handleSaveDemoBalance}
          />
        )}
      </React.Suspense>

      {/* LEVERAGE SELECTOR MODAL */}
      <React.Suspense fallback={null}>
        {isLeverageModalOpen && (
          <LeverageModal
            isOpen={isLeverageModalOpen}
            onClose={() => setIsLeverageModalOpen(false)}
            currentLeverage={forexLeverage}
            onSelectLeverage={handleSelectLeverage}
            balance={balances[activeAccount] ?? 0}
            floatingPnl={getAccountFloatingPnl(activeAccount)}
            activeLotSize={parseFloat(forexLotSize || '0.01') || 0.01}
            currentPrice={currentTickPrice}
            symbol={activeMarket.symbol}
            activeAccount={activeAccount}
            openTradesTotalMargin={activeTrades
              .filter(t => (t.accountType === activeAccount || (!t.accountType && activeAccount === 'live')) && t.status === 'OPEN')
              .reduce((sum, t) => {
                if (t.tradingMode === 'forex') {
                  const u = getMarketContractUnits(t.symbol);
                  const lev = forexLeverage || t.leverage || 100;
                  return sum + Number(((t.entryPrice * u * (t.lotSize || 0.01)) / lev).toFixed(2));
                }
                return sum + (t.amount || 0);
              }, 0)}
          />
        )}
      </React.Suspense>

    </div>
  );
};
