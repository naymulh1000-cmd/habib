import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, isQuotaError } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { BrandLogo } from '../BrandLogo';
import { 
  Users, 
  Wallet, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  PlusCircle, 
  MinusCircle, 
  Shield,
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Send, 
  ExternalLink, 
  Clock, 
  DollarSign, 
  Activity, 
  BellRing,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Radio,
  FileText,
  Settings,
  Sparkles,
  Zap,
  Save,
  QrCode,
  Globe,
  Eye,
  Camera,
  ZoomIn,
  Image as ImageIcon,
  Upload,
  Compass,
  Target,
  Trophy,
  Crown,
  Flame,
  RotateCcw,
  UserCheck,
  UserX,
  Layers,
  History,
  CreditCard,
  ChevronRight,
  Filter,
  Check,
  X,
  Pencil,
  Headphones,
  MessageSquare,
  Mail,
  PhoneCall,
  MessageCircle,
  Share2
} from 'lucide-react';
import { HelpLineModal } from '../HelpLineModal';
import {
  HelplineConfig,
  DEFAULT_HELPLINE,
  getStoredHelpline,
  saveHelplineConfig,
  subscribeToHelpline,
  formatHelplineUrl,
  openHelplineTarget,
} from '../../lib/helplineConfig';
import { 
  LeaderboardEntry, 
  LeaderboardConfig, 
  getStoredLeaderboardConfig, 
  saveLeaderboardConfigToFirestore, 
  subscribeToLeaderboardConfig,
  DEFAULT_BENCHMARK_LIVE,
  DEFAULT_BENCHMARK_BONUS,
  getDailyCycleWindow,
  formatResetCountdown
} from '../../lib/leaderboardService';
import { COUNTRIES, Country } from '../../data/countries';
import { 
  UserProfileData
} from '../../lib/firestoreSync';
import {
  AdminAuditLog,
  getStoredAuditLogs,
  getStoredUsersCache,
  subscribeAllUsersFromFirestore,
  subscribeAdminAuditLogsFromFirestore,
  updateUserBalancesInFirestore,
  issueDirectDepositCreditInFirestore,
  toggleUserBlockInFirestore,
  toggleUserVerificationInFirestore,
  updateUserProfileInFirestore,
  deleteUserPermanentlyFromFirestore,
  addAdminAuditLogToFirestore,
  isFakeMockUser
} from '../../lib/adminSync';
import { TransactionRecord, TradePosition, KYCRequest } from '../../types';
import { safeFormatTime, safeFormatTimeWithSeconds, safeFormatDateTime, safeIsoString } from '../../lib/dateUtils';
import { 
  getStoredKycRequests, 
  saveStoredKycRequests, 
  subscribeAllKycRequestsFromFirestore,
  approveKycVerification, 
  rejectKycVerification 
} from '../../lib/kycSync';
import { 
  subscribeAllDepositsFromFirestore, 
  approveDepositInFirestore, 
  rejectDepositInFirestore 
} from '../../lib/depositSync';
import {
  subscribeAllWithdrawalsFromFirestore,
  approveWithdrawalInFirestore,
  rejectWithdrawalInFirestore
} from '../../lib/withdrawalSync';
import { INITIAL_TRADES } from '../../data/mockData';
import { 
  getStoredGateways, 
  saveStoredGateways, 
  saveGatewaysToFirestore,
  getStoredDepositRules, 
  saveStoredDepositRules, 
  saveRulesToFirestore,
  subscribeToDepositConfig,
  compressQrImage,
  PaymentGatewayConfig, 
  DepositRulesConfig 
} from '../../lib/depositConfig';
import {
  getStoredWithdrawalMethods,
  saveStoredWithdrawalMethods,
  saveWithdrawalMethodsToFirestore,
  saveWithdrawalRulesToFirestore,
  getStoredWithdrawalRules,
  subscribeToWithdrawalConfig,
  WithdrawalMethodConfig,
  WithdrawalRulesConfig
} from '../../lib/withdrawalConfig';
import {
  subscribeToBranding,
  saveBrandingConfig,
  getStoredBranding
} from '../../lib/brandingConfig';
import {
  BroadcastSignal,
  subscribeToBroadcasts,
  sendBroadcastSignal,
  deleteBroadcastSignal,
  getStoredBroadcasts
} from '../../lib/broadcastSync';
import {
  getStoredMarkets,
  saveStoredMarkets,
  subscribeToMarketConfig,
  MarketPairConfig
} from '../../lib/marketConfig';
import { getDisplayUserId } from '../../lib/firestoreSync';
import { CustomFirebaseModal } from '../CustomFirebaseModal';

interface AdminDashboardProps {
  adminEmail: string;
  onLogoutAdmin: () => void;
  onOpenUserSite: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminEmail,
  onLogoutAdmin,
  onOpenUserSite
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'gateways' | 'markets' | 'trades' | 'broadcast' | 'logs' | 'kyc' | 'branding' | 'leaderboard' | 'helpline'>('users');
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  // 24/7 Helpline & Support Links State (Cross-device synced)
  const [helplineState, setHelplineState] = useState<HelplineConfig>(getStoredHelpline);
  const [telegramUrlInput, setTelegramUrlInput] = useState(helplineState.telegramUrl);
  const [telegramLabelInput, setTelegramLabelInput] = useState(helplineState.telegramLabel || 'Telegram Chat');
  const [gmailUrlInput, setGmailUrlInput] = useState(helplineState.gmailUrl);
  const [gmailLabelInput, setGmailLabelInput] = useState(helplineState.gmailLabel || 'Email Desk');
  const [hotlinePhoneInput, setHotlinePhoneInput] = useState(helplineState.hotlinePhone);
  const [hotlineLabelInput, setHotlineLabelInput] = useState(helplineState.hotlineLabel || '24/7 Priority Support Hotline');
  const [whatsappUrlInput, setWhatsappUrlInput] = useState(helplineState.whatsappUrl || '');
  const [whatsappLabelInput, setWhatsappLabelInput] = useState(helplineState.whatsappLabel || 'WhatsApp Support');
  const [customLinkUrlInput, setCustomLinkUrlInput] = useState(helplineState.customLinkUrl || '');
  const [customLinkTitleInput, setCustomLinkTitleInput] = useState(helplineState.customLinkTitle || '');
  const [supportNoticeInput, setSupportNoticeInput] = useState(helplineState.supportNotice || '');
  const [helplineSaveSuccess, setHelplineSaveSuccess] = useState(false);
  const [helplineIsSaving, setHelplineIsSaving] = useState(false);
  const [previewHelpModalOpen, setPreviewHelpModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToHelpline((cfg) => {
      setHelplineState(cfg);
      if (!helplineIsSaving) {
        setTelegramUrlInput(cfg.telegramUrl);
        setTelegramLabelInput(cfg.telegramLabel || 'Telegram Chat');
        setGmailUrlInput(cfg.gmailUrl);
        setGmailLabelInput(cfg.gmailLabel || 'Email Desk');
        setHotlinePhoneInput(cfg.hotlinePhone);
        setHotlineLabelInput(cfg.hotlineLabel || '24/7 Priority Support Hotline');
        setWhatsappUrlInput(cfg.whatsappUrl || '');
        setWhatsappLabelInput(cfg.whatsappLabel || 'WhatsApp Support');
        setCustomLinkUrlInput(cfg.customLinkUrl || '');
        setCustomLinkTitleInput(cfg.customLinkTitle || '');
        setSupportNoticeInput(cfg.supportNotice || '');
      }
    });
    return () => unsub();
  }, [helplineIsSaving]);

  // Leaderboard Management State
  const [leaderboardConfig, setLeaderboardConfig] = useState<LeaderboardConfig>(getStoredLeaderboardConfig());
  const [leaderboardAdminTab, setLeaderboardAdminTab] = useState<'live' | 'bonus'>('live');
  const [leaderboardSaveSuccess, setLeaderboardSaveSuccess] = useState(false);
  const [selectedBenchmarkForEdit, setSelectedBenchmarkForEdit] = useState<LeaderboardEntry | null>(null);
  const [benchmarkUsernameInput, setBenchmarkUsernameInput] = useState('');
  const [benchmarkAvatarInput, setBenchmarkAvatarInput] = useState('');
  const [benchmarkCountryCode, setBenchmarkCountryCode] = useState('DE');
  const [benchmarkProfitInput, setBenchmarkProfitInput] = useState('');
  const [benchmarkWinRateInput, setBenchmarkWinRateInput] = useState('80');
  const [benchmarkTradesInput, setBenchmarkTradesInput] = useState('25');
  const [benchmarkGainPercentInput, setBenchmarkGainPercentInput] = useState('20');

  useEffect(() => {
    const unsub = subscribeToLeaderboardConfig((cfg) => {
      setLeaderboardConfig(cfg);
    });
    return () => unsub();
  }, []);

  // Master Branding & Logo State (Cross-device synced)
  const [masterLogoUrlInput, setMasterLogoUrlInput] = useState<string>(() => {
    const b = getStoredBranding();
    return b.logoUrl === '/logo.png' ? '' : b.logoUrl;
  });
  const [logoSaveSuccess, setLogoSaveSuccess] = useState(false);

  useEffect(() => {
    const unsub = subscribeToBranding((branding) => {
      setMasterLogoUrlInput(branding.logoUrl === '/logo.png' ? '' : branding.logoUrl);
    });
    return () => unsub();
  }, []);

  // KYC Verification Requests State
  const [kycRequests, setKycRequests] = useState<KYCRequest[]>([]);
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [kycSearch, setKycSearch] = useState('');
  const [kycPage, setKycPage] = useState(1);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedKycForReject, setSelectedKycForReject] = useState<KYCRequest | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);
  
  // Loading and Processing states to prevent double-clicks
  const [processingTxId, setProcessingTxId] = useState<string | null>(null);
  const [processingKycId, setProcessingKycId] = useState<string | null>(null);

  // Financial Requests (Deposits & Withdrawals) Filters & Rejection Modal State
  const [rejectTxModalOpen, setRejectTxModalOpen] = useState(false);
  const [selectedTxForReject, setSelectedTxForReject] = useState<TransactionRecord | null>(null);
  const [rejectTxReasonInput, setRejectTxReasonInput] = useState('');
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [requestsTypeFilter, setRequestsTypeFilter] = useState<'all' | 'Deposit' | 'Withdrawal'>('all');
  const [requestsSearch, setRequestsSearch] = useState('');
  const [requestsPage, setRequestsPage] = useState(1);

  // Market Pairs Configuration State
  const [marketConfigs, setMarketConfigs] = useState<MarketPairConfig[]>(getStoredMarkets());

  useEffect(() => {
    const unsubscribe = subscribeToMarketConfig((remoteMarkets) => {
      setMarketConfigs(remoteMarkets);
    });
    return () => unsubscribe();
  }, []);
  const [showAddMarketModal, setShowAddMarketModal] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'forex' | 'otc'>('forex');
  const [newBasePrice, setNewBasePrice] = useState('1.00000');
  const [newSpread, setNewSpread] = useState('0.00010');
  const [newTrendBias, setNewTrendBias] = useState<'UP' | 'DOWN' | 'SIDEWAYS'>('SIDEWAYS');
  const [newVolatility, setNewVolatility] = useState<'SMOOTH' | 'MODERATE' | 'VOLATILE'>('SMOOTH');
  const [newUpdateSpeedMs, setNewUpdateSpeedMs] = useState(250);
  const [newPayoutPercent, setNewPayoutPercent] = useState(90);
  const [newPrecision, setNewPrecision] = useState(5);

  const handleAddMarketPair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    const newMarketObj: MarketPairConfig = {
      id: `market_${Date.now()}_${newSymbol.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      symbol: newSymbol.trim().toUpperCase(),
      name: newName.trim() || `${newSymbol.trim().toUpperCase()} Pair`,
      category: newCategory,
      basePrice: parseFloat(newBasePrice) || 1.0,
      spread: parseFloat(newSpread) || 0.0001,
      change24h: 0.5,
      payoutPercent: newCategory === 'otc' ? newPayoutPercent : 90,
      isActive: true,
      precision: newPrecision,
      trendBias: newTrendBias,
      volatility: newVolatility,
      wickSize: 'NATURAL',
      pullbackFreq: 'BALANCED',
      updateSpeedMs: newUpdateSpeedMs,
      trendStrength: 'MODERATE',
      spikeProbability: 'RARE',
      maxCandleCap: 'STANDARD'
    };

    const updated = [newMarketObj, ...marketConfigs];
    setMarketConfigs(updated);
    saveStoredMarkets(updated);
    addAuditLog(`Added New Market Pair: ${newMarketObj.symbol}`);
    
    setNewSymbol('');
    setNewName('');
    setShowAddMarketModal(false);
    alert(`Market pair ${newMarketObj.symbol} added successfully!`);
  };

  const handleDeleteMarketPair = (id: string, symbol: string) => {
    if (confirm(`Are you sure you want to delete market pair "${symbol}"?`)) {
      const updated = marketConfigs.filter(m => m.id !== id);
      setMarketConfigs(updated);
      saveStoredMarkets(updated);
      addAuditLog(`Deleted Market Pair: ${symbol}`);
    }
  };
  
  // OTC Exposure & Admin 5-Candle Predictor State
  const [adminPredictorMode, setAdminPredictorMode] = useState<boolean>(false);
  const [exposureControlEnabled, setExposureControlEnabled] = useState<boolean>(false);
  const [otcExposureData, setOtcExposureData] = useState<Record<string, any>>({});
  const [activeLiveOtcCount, setActiveLiveOtcCount] = useState<number>(0);
  const [selectedForecastSymbol, setSelectedForecastSymbol] = useState<string>('EUR/USD OTC');
  const [forecastCandles, setForecastCandles] = useState<any[]>([]);

  useEffect(() => {
    const fetchExposure = () => {
      fetch('/api/otc/exposure')
        .then(r => r.json())
        .then(data => {
          if (data && data.success) {
            setOtcExposureData(data.marketsExposure || {});
            setActiveLiveOtcCount(data.activeLiveOrdersCount || 0);
            setAdminPredictorMode(Boolean(data.adminPredictorMode));
            setExposureControlEnabled(Boolean(data.exposureControlEnabled));
          }
        })
        .catch(() => {});
    };

    fetchExposure();
    const timer = setInterval(fetchExposure, 2500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchForecast = () => {
      if (!selectedForecastSymbol) return;
      fetch(`/api/otc/forecast/${encodeURIComponent(selectedForecastSymbol)}/M1?count=5`)
        .then(r => r.json())
        .then(data => {
          if (data && Array.isArray(data.forecast)) {
            setForecastCandles(data.forecast);
          }
        })
        .catch(() => {});
    };

    fetchForecast();
    const timer = setInterval(fetchForecast, 3000);
    return () => clearInterval(timer);
  }, [selectedForecastSymbol]);

  const handleToggleAdminPredictor = async () => {
    const newMode = !adminPredictorMode;
    const newExposureState = newMode ? false : exposureControlEnabled;
    try {
      const res = await fetch('/api/otc/admin-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPredictorMode: newMode, exposureControlEnabled: newExposureState }),
      });
      if (res.ok) {
        setAdminPredictorMode(newMode);
        if (newMode) setExposureControlEnabled(false);
        try {
          localStorage.setItem('forex_admin_radar_active', String(newMode));
          if (newMode) localStorage.setItem('forex_admin_exposure_control', 'false');
        } catch (_) {}
        addAuditLog(`${newMode ? 'Enabled' : 'Disabled'} Admin 5-Candle Future Predictor Mode`);
      }
    } catch (_) {}
  };

  const handleToggleExposureControl = async () => {
    const newExposureState = !exposureControlEnabled;
    const newPredictorMode = newExposureState ? false : true;
    try {
      const res = await fetch('/api/otc/admin-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPredictorMode: newPredictorMode, exposureControlEnabled: newExposureState }),
      });
      if (res.ok) {
        setExposureControlEnabled(newExposureState);
        setAdminPredictorMode(newPredictorMode);
        try {
          localStorage.setItem('forex_admin_exposure_control', String(newExposureState));
          localStorage.setItem('forex_admin_radar_active', String(newPredictorMode));
        } catch (_) {}
        addAuditLog(`${newExposureState ? 'Enabled 5s Loss (Forces Trade Loss in Last 5 Seconds)' : 'Disabled 5s Loss (Enabled Admin 5-Candle Future Forecast)'}`);
      }
    } catch (_) {}
  };

  // States
  const [users, setUsers] = useState<UserProfileData[]>(() => getStoredUsersCache().filter(u => !isFakeMockUser(u)));
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [trades, setTrades] = useState<TradePosition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'blocked' | 'verified' | 'unverified'>('all');
  const [selectedScreenshotTx, setSelectedScreenshotTx] = useState<TransactionRecord | null>(null);

  // Sync all live & closed trades from server persistent store
  useEffect(() => {
    const fetchServerTrades = () => {
      fetch('/api/admin/trades')
        .then(r => r.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.trades)) {
            setTrades(prev => {
              if (prev.length === 0) return data.trades;
              const map = new Map<string, TradePosition>();
              data.trades.forEach((t: TradePosition) => map.set(t.id, t));
              prev.forEach(t => map.set(t.id, t));
              return Array.from(map.values());
            });
          }
        })
        .catch(() => {});
    };
    fetchServerTrades();
    const interval = setInterval(fetchServerTrades, 3000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to real-time deposit requests from Firestore
  useEffect(() => {
    const unsubscribe = subscribeAllDepositsFromFirestore((depositRequests) => {
      setTransactions(prev => {
        const nonDeposits = prev.filter(t => t.type !== 'Deposit');
        return [...depositRequests, ...nonDeposits];
      });
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time withdrawal requests from Firestore
  useEffect(() => {
    const unsubscribe = subscribeAllWithdrawalsFromFirestore((wdList) => {
      setTransactions(prev => {
        const nonWithdrawals = prev.filter(t => t.type !== 'Withdrawal');
        return [...nonWithdrawals, ...wdList];
      });
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time KYC verification requests from Firestore
  useEffect(() => {
    const unsubscribe = subscribeAllKycRequestsFromFirestore((loadedKyc) => {
      setKycRequests(loadedKyc);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Registered Users in real-time from Firestore
  useEffect(() => {
    const unsubscribe = subscribeAllUsersFromFirestore((loadedUsers) => {
      setUsers(loadedUsers);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Admin Security Audit Logs in real-time from Firestore
  useEffect(() => {
    const unsubscribe = subscribeAdminAuditLogsFromFirestore((loadedLogs) => {
      setAuditLogs(loadedLogs);
    });
    return () => unsubscribe();
  }, []);

  // Admin Trades Control Sub-tabs & Search
  const [adminTradeTab, setAdminTradeTab] = useState<'forex' | 'otc' | 'open'>('forex');
  const [adminTradeSearch, setAdminTradeSearch] = useState('');
  const [adminAccFilter, setAdminAccFilter] = useState<'all' | 'live' | 'bonus' | 'demo'>('all');

  // Payment Gateways & Bonus Rules state
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>(getStoredGateways());
  const [depositRules, setDepositRules] = useState<DepositRulesConfig>(getStoredDepositRules());
  const [selectedGatewayForEdit, setSelectedGatewayForEdit] = useState<PaymentGatewayConfig | null>(null);

  // Withdrawal Gateways State
  const [gatewaySubTab, setGatewaySubTab] = useState<'deposit' | 'withdrawal'>('deposit');
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethodConfig[]>(getStoredWithdrawalMethods());
  const [selectedWmForEdit, setSelectedWmForEdit] = useState<WithdrawalMethodConfig | null>(null);

  // Selected User for Editing & Full Profile Inspection
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [userModalTab, setUserModalTab] = useState<'balance' | 'credit' | 'profile' | 'trades' | 'transactions'>('balance');
  const [editBalanceAmount, setEditBalanceAmount] = useState<string>('');
  const [editBalanceNote, setEditBalanceNote] = useState<string>('');
  const [editAccountType, setEditAccountType] = useState<'live' | 'bonus' | 'demo'>('live');
  const [editOperation, setEditOperation] = useState<'add' | 'subtract' | 'set'>('add');
  const [directCreditAmount, setDirectCreditAmount] = useState<string>('');
  const [directCreditWallet, setDirectCreditWallet] = useState<'live' | 'bonus' | 'demo'>('live');
  const [directCreditNote, setDirectCreditNote] = useState<string>('');
  const [editUserName, setEditUserName] = useState<string>('');
  const [editUserPhone, setEditUserPhone] = useState<string>('');
  const [editUserCountry, setEditUserCountry] = useState<string>('');
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);

  // Broadcast Signal State (Cross-device synced via Firestore & server)
  const [signalTitle, setSignalTitle] = useState('');
  const [signalMessage, setSignalMessage] = useState('');
  const [signalType, setSignalType] = useState<'buy' | 'sell' | 'announcement'>('buy');
  const [broadcastList, setBroadcastList] = useState<BroadcastSignal[]>(getStoredBroadcasts());

  useEffect(() => {
    const unsub = subscribeToBroadcasts((signals) => {
      setBroadcastList(signals);
    });
    return () => unsub();
  }, []);

  // Admin Activity Logs state & filter
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(getStoredAuditLogs());
  const [auditLogFilter, setAuditLogFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState<string>('');

  const addAuditLog = async (
    msg: string, 
    extra?: { 
      actionType?: AdminAuditLog['actionType']; 
      targetUserId?: string; 
      targetUserEmail?: string; 
      targetUserName?: string; 
      amount?: number; 
      walletType?: 'live' | 'bonus' | 'demo' 
    }
  ) => {
    await addAdminAuditLogToFirestore({
      adminId: 'ADMIN-MASTER-01',
      adminEmail,
      targetUserId: extra?.targetUserId,
      targetUserEmail: extra?.targetUserEmail,
      targetUserName: extra?.targetUserName,
      actionType: extra?.actionType || 'GENERAL',
      amount: extra?.amount,
      walletType: extra?.walletType,
      details: msg
    });
  };

  // Load KYC Requests
  useEffect(() => {
    const loadKyc = async () => {
      try {
        const local = getStoredKycRequests();
        setKycRequests(local);

        const querySnap = await getDocs(collection(db, 'kyc_requests'));
        if (!querySnap.empty) {
          const loaded: KYCRequest[] = [];
          querySnap.forEach(snap => {
            const d = snap.data();
            loaded.push({
              id: d.id || snap.id,
              userUid: d.userUid || snap.id,
              userEmail: d.userEmail || '',
              userName: d.userName || 'User',
              nidNumber: d.nidNumber || '',
              nidFrontUrl: d.nidFrontUrl || '',
              nidBackUrl: d.nidBackUrl || '',
              status: d.status || 'pending',
              rejectionReason: d.rejectionReason,
              submittedAt: safeFormatDateTime(d.submittedAt, 'Recently')
            });
          });
          if (loaded.length > 0) {
            setKycRequests(loaded);
            saveStoredKycRequests(loaded);
          }
        }
      } catch (e) {
        console.warn('KYC requests fetch note:', e);
      }
    };
    loadKyc();
  }, []);

  // Handle Approve KYC
  const handleApproveKyc = async (req: KYCRequest) => {
    if (processingKycId) return;
    if (confirm(`Approve KYC Verification for ${req.userName} (${req.userEmail})?`)) {
      setProcessingKycId(req.id);
      try {
        await approveKycVerification(req.userUid, req.id);
        setKycRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' as const, rejectionReason: undefined } : r));
        setUsers(prev => prev.map(u => u.uid === req.userUid ? { ...u, isVerifiedUser: true, kycStatus: 'verified' as const } : u));
        addAuditLog(`Approved KYC Verification for user ${req.userName} (${req.userEmail})`);
      } catch (err) {
        console.error('Failed to approve KYC:', err);
      } finally {
        setProcessingKycId(null);
      }
    }
  };

  // Handle Reject KYC Modal
  const handleOpenRejectModal = (req: KYCRequest) => {
    setSelectedKycForReject(req);
    setRejectReasonInput('NID photo image unreadable or blurry. Please re-upload clear photos.');
    setRejectModalOpen(true);
  };

  const handleConfirmRejectKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKycForReject || processingKycId) return;
    const reason = rejectReasonInput.trim() || 'Document image unreadable / Invalid ID';
    setProcessingKycId(selectedKycForReject.id);

    try {
      await rejectKycVerification(selectedKycForReject.userUid, reason, selectedKycForReject.id);
      setKycRequests(prev => prev.map(r => r.id === selectedKycForReject.id ? { ...r, status: 'rejected' as const, rejectionReason: reason } : r));
      setUsers(prev => prev.map(u => u.uid === selectedKycForReject.userUid ? { ...u, isVerifiedUser: false, kycStatus: 'rejected' as const, kycRejectionReason: reason } : u));
      addAuditLog(`Rejected KYC Verification for user ${selectedKycForReject.userName}. Reason: ${reason}`);
      
      setRejectModalOpen(false);
      setSelectedKycForReject(null);
    } catch (err) {
      console.error('Failed to reject KYC:', err);
    } finally {
      setProcessingKycId(null);
    }
  };

  // Subscribe to All User Trades in real-time from Firestore for Admin Oversight
  useEffect(() => {
    let unsubTrades: () => void = () => {};
    try {
      unsubTrades = onSnapshot(collection(db, 'trades'), (snap) => {
        if (!snap.empty) {
          const loaded: TradePosition[] = [];
          snap.forEach(docSnap => {
            const d = docSnap.data();
            loaded.push({
              id: docSnap.id,
              userUid: d.userUid,
              userEmail: d.userEmail || 'trader@forexpro.com',
              accountType: d.accountType || 'live',
              tradingMode: d.tradingMode || 'forex',
              symbol: d.symbol || 'EUR/USD',
              type: d.type || 'BUY',
              lotSize: d.lotSize || 0.01,
              leverage: d.leverage || 100,
              amount: d.amount || 10,
              entryPrice: d.entryPrice || 0,
              currentPrice: d.closePrice || d.currentPrice || d.entryPrice || 0,
              exitPrice: d.closePrice || d.exitPrice,
              stopLoss: d.stopLoss,
              takeProfit: d.takeProfit,
              payoutPercent: d.payoutPercent,
              expirySeconds: d.expirySeconds,
              pnl: d.pnl || 0,
              timestamp: safeFormatTimeWithSeconds(d.createdAt, 'Today'),
              openTime: d.openTime,
              closeTime: d.closeTime,
              status: d.status || 'CLOSED'
            });
          });

          if (loaded.length > 0) {
            setTrades(loaded);
          }
        }
      }, (err) => {
        if (!isQuotaError(err)) console.warn('Admin trades onSnapshot listener note:', err);
      });
    } catch (err) {
      if (!isQuotaError(err)) console.warn('Trades subscription error:', err);
    }

    // Subscribe to deposit gateways & rules in Firestore
    const unsubDeposit = subscribeToDepositConfig((updatedGateways, updatedRules) => {
      setGateways(updatedGateways);
      setDepositRules(updatedRules);
    });

    // Subscribe to withdrawal methods & rules in Firestore
    const unsubWithdrawal = subscribeToWithdrawalConfig((updatedMethods) => {
      setWithdrawalMethods(updatedMethods);
    });

    return () => {
      unsubTrades();
      unsubDeposit();
      unsubWithdrawal();
    };
  }, []);

  // Save Gateway Modifications permanently to Firestore database
  const handleSaveGateway = async (updatedGw: PaymentGatewayConfig) => {
    const exists = gateways.some(g => g.id === updatedGw.id);
    const updatedList = exists 
      ? gateways.map(g => g.id === updatedGw.id ? updatedGw : g)
      : [...gateways, updatedGw];
    setGateways(updatedList);
    const success = await saveGatewaysToFirestore(updatedList);
    if (success) {
      addAuditLog(`Updated Payment Gateway details for ${updatedGw.name}`);
      setSelectedGatewayForEdit(null);
      alert(`Payment details for ${updatedGw.name} saved permanently to database and synced live to all users!`);
    } else {
      alert(`Failed to save gateway details to database. Please check image size or network connection.`);
    }
  };

  // Quick toggle gateway active status
  const handleToggleGatewayActive = async (gwId: string) => {
    const updatedList = gateways.map(g => g.id === gwId ? { ...g, isActive: !g.isActive } : g);
    setGateways(updatedList);
    await saveGatewaysToFirestore(updatedList);
    const target = updatedList.find(g => g.id === gwId);
    if (target) {
      addAuditLog(`Toggled Payment Gateway ${target.name} ${target.isActive ? 'ON' : 'OFF'}`);
    }
  };

  // Save Withdrawal Method Modifications permanently to Firestore database
  const handleSaveWithdrawalMethod = async (updatedWm: WithdrawalMethodConfig) => {
    const updatedList = withdrawalMethods.map(m => m.id === updatedWm.id ? updatedWm : m);
    setWithdrawalMethods(updatedList);
    const success = await saveWithdrawalMethodsToFirestore(updatedList);
    if (success) {
      addAuditLog(`Updated Withdrawal Method settings for ${updatedWm.name}`);
      setSelectedWmForEdit(null);
      alert(`Withdrawal settings for ${updatedWm.name} saved permanently to database and synced live to all users!`);
    } else {
      alert(`Failed to save withdrawal settings to database. Please check network connection.`);
    }
  };

  // Save Deposit Rules Modifications permanently to Firestore database
  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveRulesToFirestore(depositRules);
    addAuditLog('Updated Auto Deposit & Supercharge Bonus rules');
    alert('Deposit & Bonus settings saved permanently to database!');
  };

  // User Search & Status Filter
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.uid && u.uid.toLowerCase().includes(q)) ||
      (u.displayUserId && u.displayUserId.toLowerCase().includes(q)) ||
      (u.phoneNumber && u.phoneNumber.includes(q)) ||
      (u.country && u.country.toLowerCase().includes(q)) ||
      getDisplayUserId(u.uid).toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (userStatusFilter === 'active') return !u.isBlocked;
    if (userStatusFilter === 'blocked') return u.isBlocked;
    if (userStatusFilter === 'verified') return u.isVerifiedUser;
    if (userStatusFilter === 'unverified') return !u.isVerifiedUser;
    return true;
  });

  // Total Calculations
  const totalPlatformUsers = users.length;
  const totalLiveDeposits = users.reduce((acc, u) => acc + (u.balances?.live ?? 0), 0);
  const totalDemoHoldings = users.reduce((acc, u) => acc + (u.balances?.demo ?? 0), 0);
  const pendingDeposits = transactions.filter(t => t.status === 'Pending' && t.type === 'Deposit');
  const pendingWithdrawals = transactions.filter(t => t.status === 'Pending' && t.type === 'Withdrawal');

  // Open User Edit Modal and populate initial state
  const handleOpenUserModal = (u: UserProfileData, tab: 'balance' | 'credit' | 'profile' | 'trades' | 'transactions' = 'balance') => {
    setSelectedUser(u);
    setUserModalTab(tab);
    setEditBalanceAmount('');
    setEditBalanceNote('');
    setEditAccountType('live');
    setEditOperation('add');
    setDirectCreditAmount('');
    setDirectCreditWallet('live');
    setDirectCreditNote('');
    setEditUserName(u.fullName || u.displayName || '');
    setEditUserPhone(u.phoneNumber || '');
    setEditUserCountry(u.country || '');
  };

  // Handle Balance Edit / Adjustment with Firestore Persistence & Audit Log
  const handleApplyBalanceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSavingUser) return;
    const val = parseFloat(editBalanceAmount);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    setIsSavingUser(true);
    try {
      const current = selectedUser.balances[editAccountType] || 0;
      let updatedVal = current;
      if (editOperation === 'add') {
        updatedVal = current + val;
      } else if (editOperation === 'subtract') {
        updatedVal = Math.max(0, current - val);
      } else if (editOperation === 'set') {
        updatedVal = val;
      }

      const updatedBalances = {
        ...selectedUser.balances,
        [editAccountType]: updatedVal
      };

      // Instant optimistic UI update
      setUsers(prevUsers => prevUsers.map(u => 
        u.uid === selectedUser.uid ? { ...u, balances: updatedBalances } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, balances: updatedBalances } : null);

      await updateUserBalancesInFirestore(
        selectedUser.uid,
        updatedBalances,
        {
          adminId: 'ADMIN-MASTER-01',
          adminEmail,
          targetUser: selectedUser,
          deltaAmount: val,
          deltaType: editAccountType,
          operation: editOperation,
          actionNote: editBalanceNote.trim() || undefined
        }
      );

      alert(`Successfully updated ${editAccountType.toUpperCase()} balance for ${selectedUser.displayName} to $${updatedVal.toFixed(2)}!`);
      setEditBalanceAmount('');
      setEditBalanceNote('');
    } catch (err) {
      console.error('Failed to update user balance:', err);
      alert('Failed to update balance in database.');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Handle Direct Deposit Credit (Instantly credits balance + creates approved transaction record)
  const handleApplyDirectDepositCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSavingUser) return;
    const val = parseFloat(directCreditAmount);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid positive amount to credit');
      return;
    }

    setIsSavingUser(true);
    try {
      await issueDirectDepositCreditInFirestore(
        selectedUser.uid,
        val,
        directCreditWallet,
        {
          adminId: 'ADMIN-MASTER-01',
          adminEmail,
          targetUser: selectedUser,
          note: directCreditNote.trim() || `Direct deposit credit by Super Administrator`
        }
      );

      // Optimistic update
      const current = selectedUser.balances[directCreditWallet] || 0;
      const updatedBalances = {
        ...selectedUser.balances,
        [directCreditWallet]: current + val
      };

      setUsers(prev => prev.map(u => 
        u.uid === selectedUser.uid ? { ...u, balances: updatedBalances } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, balances: updatedBalances } : null);

      alert(`Direct Deposit Credit of $${val.toFixed(2)} (${directCreditWallet.toUpperCase()}) successfully credited to ${selectedUser.displayName}!`);
      setDirectCreditAmount('');
      setDirectCreditNote('');
    } catch (err) {
      console.error('Failed to issue direct credit:', err);
      alert('Failed to issue direct deposit credit.');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Toggle Verification with Firestore Persistence
  const handleToggleVerification = async (uid: string) => {
    const userToToggle = users.find(u => u.uid === uid);
    if (!userToToggle) return;
    const nextState = !userToToggle.isVerifiedUser;

    setUsers(prev => prev.map(u => 
      u.uid === uid ? { ...u, isVerifiedUser: nextState, kycStatus: nextState ? 'verified' : 'unverified' } : u
    ));
    if (selectedUser && selectedUser.uid === uid) {
      setSelectedUser(prev => prev ? { ...prev, isVerifiedUser: nextState, kycStatus: nextState ? 'verified' : 'unverified' } : null);
    }

    await toggleUserVerificationInFirestore(uid, nextState, {
      adminId: 'ADMIN-MASTER-01',
      adminEmail,
      targetUser: userToToggle
    });
  };

  // Toggle Block / Unblock User with Firestore Persistence
  const handleToggleBlock = async (uid: string) => {
    const userToToggle = users.find(u => u.uid === uid);
    if (!userToToggle) return;
    const nextState = !userToToggle.isBlocked;

    const actionText = nextState ? 'BLOCK & SUSPEND' : 'UNBLOCK & RESTORE';
    if (!confirm(`Are you sure you want to ${actionText} access for user "${userToToggle.displayName}" (${userToToggle.email})?`)) {
      return;
    }

    setUsers(prev => prev.map(u => 
      u.uid === uid ? { ...u, isBlocked: nextState, accountStatus: nextState ? 'blocked' : 'active' } : u
    ));
    if (selectedUser && selectedUser.uid === uid) {
      setSelectedUser(prev => prev ? { ...prev, isBlocked: nextState, accountStatus: nextState ? 'blocked' : 'active' } : null);
    }

    await toggleUserBlockInFirestore(uid, nextState, {
      adminId: 'ADMIN-MASTER-01',
      adminEmail,
      targetUser: userToToggle
    });
  };

  // Delete User Permanently from Firebase
  const handleDeleteUser = async (uid: string) => {
    const userToDelete = users.find(u => u.uid === uid);
    if (!userToDelete) return;

    if (!confirm(`⚠️ DANGER: Are you absolutely sure you want to PERMANENTLY DELETE user "${userToDelete.displayName}" (${userToDelete.email})?\n\nThis will completely erase their account from Firebase Firestore.`)) {
      return;
    }

    setUsers(prev => prev.filter(u => u.uid !== uid));
    if (selectedUser && selectedUser.uid === uid) {
      setSelectedUser(null);
    }

    await deleteUserPermanentlyFromFirestore(uid, {
      adminId: 'ADMIN-MASTER-01',
      adminEmail,
      targetUser: userToDelete
    });

    alert(`User ${userToDelete.displayName} has been permanently deleted from Firebase.`);
  };

  // Save User Profile Information
  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || isSavingUser) return;

    setIsSavingUser(true);
    try {
      const updates = {
        fullName: editUserName.trim() || selectedUser.displayName,
        displayName: editUserName.trim() || selectedUser.displayName,
        phoneNumber: editUserPhone.trim(),
        country: editUserCountry.trim()
      };

      await updateUserProfileInFirestore(
        selectedUser.uid,
        updates,
        {
          adminId: 'ADMIN-MASTER-01',
          adminEmail,
          targetUser: selectedUser
        }
      );

      setUsers(prev => prev.map(u => 
        u.uid === selectedUser.uid ? { ...u, ...updates } : u
      ));
      setSelectedUser(prev => prev ? { ...prev, ...updates } : null);

      alert(`Profile info for ${selectedUser.displayName} updated successfully!`);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile.');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Handle Approve Transaction
  const handleApproveTransaction = async (tx: TransactionRecord) => {
    if (processingTxId) return;
    setProcessingTxId(tx.id);

    try {
      if (tx.type === 'Deposit') {
        await approveDepositInFirestore(tx);
      } else if (tx.type === 'Withdrawal') {
        await approveWithdrawalInFirestore(tx);
      }

      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'Success', rejectionReason: undefined } : t));
      
      // Auto update user balance in state (both Live and Bonus if applicable)
      setUsers(prev => prev.map(u => {
        const isMatch = (tx.userUid && u.uid === tx.userUid) || 
                        (tx.userEmail && u.email === tx.userEmail);
        if (isMatch) {
          const acc = tx.accountType || 'live';
          const currLive = u.balances.live;
          const currBonus = u.balances.bonus;

          if (tx.type === 'Deposit') {
            const bonusCredit = typeof tx.bonusAmount === 'number' 
              ? tx.bonusAmount 
              : (Boolean((tx as any).claimBonus) && tx.amount >= depositRules.bonusMinDepositUsd && tx.amount <= depositRules.bonusMaxDepositUsd ? tx.amount : 0);
            return { 
              ...u, 
              hasClaimedWelcomeBonus: bonusCredit > 0 ? true : Boolean((u as any).hasClaimedWelcomeBonus),
              bonusClaimed: bonusCredit > 0 ? true : Boolean((u as any).bonusClaimed),
              balances: { 
                ...u.balances, 
                live: currLive + tx.amount,
                bonus: currBonus + bonusCredit
              } 
            };
          } else {
            return {
              ...u,
              balances: {
                ...u.balances,
                [acc]: Math.max(0, u.balances[acc] - tx.amount)
              }
            };
          }
        }
        return u;
      }));

      if (selectedScreenshotTx?.id === tx.id) {
        setSelectedScreenshotTx(null);
      }

      addAuditLog(`APPROVED ${tx.type} Request ${tx.id} of $${tx.amount} (${tx.method})`);
    } catch (err) {
      console.error('Failed to approve transaction:', err);
    } finally {
      setProcessingTxId(null);
    }
  };

  // Unified Handle Reject Transaction (direct 1-click or from modal)
  const handleRejectTransaction = async (tx: TransactionRecord, customReason?: string) => {
    if (!tx || (processingTxId && processingTxId === tx.id)) return;
    setProcessingTxId(tx.id);

    const defaultReason = tx.type === 'Deposit' 
      ? 'Payment screenshot unreadable / TrxID mismatch' 
      : 'Account verification required or invalid wallet address';
    const reason = (customReason || rejectTxReasonInput || '').trim() || defaultReason;

    // Optimistically update transactions list immediately so admin sees rejection instantly
    setTransactions(prev => prev.map(t => 
      (t.id === tx.id || (t.trxId && t.trxId === tx.id) || (t.txHash && t.txHash === tx.id))
        ? { ...t, status: 'Rejected', rejectionReason: reason, rejectedAt: new Date().toISOString() } 
        : t
    ));

    // If withdrawal, refund user balances immediately in AdminDashboard users state
    if ((tx.type || '').toLowerCase().includes('withdrawal')) {
      setUsers(prev => prev.map(u => {
        const isMatch = (tx.userUid && u.uid === tx.userUid) || 
                        (tx.userEmail && u.email === tx.userEmail);
        if (isMatch) {
          const acc = tx.accountType || 'live';
          const refundAmount = Number(tx.amount) + Number(tx.systemDeductedProfitAmount || 0);
          return {
            ...u,
            balances: {
              ...u.balances,
              [acc]: Number(((u.balances[acc] || 0) + refundAmount).toFixed(2))
            }
          };
        }
        return u;
      }));
    }

    if (selectedScreenshotTx?.id === tx.id) {
      setSelectedScreenshotTx(null);
    }
    setRejectTxModalOpen(false);
    setSelectedTxForReject(null);

    addAuditLog(`REJECTED ${tx.type} Request ${tx.id} ($${tx.amount}) - ${reason}`);

    try {
      const isDeposit = (tx.type || '').toLowerCase().includes('deposit');
      if (isDeposit) {
        await rejectDepositInFirestore(tx.id, reason, tx);
      } else {
        await rejectWithdrawalInFirestore(tx.id, reason, tx);
      }
    } catch (err) {
      console.error('Failed to reject transaction:', err);
    } finally {
      setProcessingTxId(null);
    }
  };

  // Handle Open Reject Transaction Modal
  const handleOpenRejectTxModal = (tx: TransactionRecord) => {
    setSelectedTxForReject(tx);
    setRejectTxReasonInput(tx.type === 'Deposit' ? 'Payment screenshot unreadable / TrxID mismatch' : 'Account verification required or invalid wallet address');
    setRejectTxModalOpen(true);
  };

  // Handle Confirm Reject Transaction
  const handleConfirmRejectTx = async (e?: React.SyntheticEvent | React.FormEvent) => {
    e?.preventDefault?.();
    if (!selectedTxForReject) return;
    await handleRejectTransaction(selectedTxForReject, rejectTxReasonInput);
  };

  // Handle Trade Intervention (Synced to Firestore)
  const handleInterveneTrade = async (tradeId: string, forceResult: 'profit' | 'loss') => {
    try {
      const targetTrade = trades.find(tr => tr.id === tradeId);
      const pnlValue = forceResult === 'profit' ? 120.00 : -100.00;

      // Optimistic local state update
      setTrades(prev => prev.map(tr => {
        if (tr.id === tradeId) {
          return { ...tr, status: 'Closed', pnl: pnlValue };
        }
        return tr;
      }));

      addAuditLog(`Force-closed Trade ${tradeId} as ${forceResult.toUpperCase()} ($${pnlValue})`);

      // Write to Firestore trades document so trader's phone and all other sessions receive closed trade
      await setDoc(doc(db, 'trades', tradeId), {
        status: 'Closed',
        pnl: pnlValue,
        closeTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        closeTimestamp: Date.now(),
        updatedAt: serverTimestamp(),
        intervenedBy: adminEmail
      }, { merge: true });

      // If target trade belongs to a user, update their balance in Firestore
      if (targetTrade?.userUid) {
        const userToCredit = users.find(u => u.uid === targetTrade.userUid);
        if (userToCredit) {
          const accType = (targetTrade.accountType || 'live') as 'live' | 'bonus' | 'demo';
          const returnAmount = forceResult === 'profit' ? (targetTrade.amount || 10) + pnlValue : 0;
          if (returnAmount > 0) {
            const currentBal = userToCredit.balances[accType] || 0;
            const newBal = currentBal + returnAmount;
            const updatedBalances = { ...userToCredit.balances, [accType]: newBal };
            await updateUserBalancesInFirestore(userToCredit.uid, updatedBalances, {
              adminId: 'ADMIN-MASTER-01',
              adminEmail,
              targetUser: userToCredit,
              deltaAmount: returnAmount,
              deltaType: accType,
              operation: 'add',
              actionNote: `Trade ${tradeId} manual intervention (${forceResult})`
            });
          }
        }
      }
    } catch (err) {
      console.warn('Intervention sync note:', err);
    }
  };

  // Send Signal (Synced to Firestore & Server for all devices)
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signalTitle || !signalMessage) return;

    await sendBroadcastSignal({
      title: signalTitle,
      text: signalMessage,
      time: 'Just now',
      type: signalType,
      author: 'Admin'
    });

    addAuditLog(`Broadcast Signal Published: "${signalTitle}"`);
    setSignalTitle('');
    setSignalMessage('');
    alert('Broadcast signal published to all active traders and synced to all devices!');
  };

  const handleDeleteBroadcast = async (id: string) => {
    await deleteBroadcastSignal(id);
    addAuditLog(`Deleted Broadcast Signal ID: ${id}`);
  };

  return (
    <div className="min-h-screen bg-[#06080E] text-white flex flex-col font-sans selection:bg-[#F5B301] selection:text-black">
      
      {/* Top Admin Navigation Header */}
      <header className="px-4 lg:px-8 py-4 bg-[#0A0E1A] border-b border-[#F5B301]/30 sticky top-0 z-40 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <BrandLogo size="md" subtext="ADMIN CONSOLE — MASTER CONTROL" />
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Firebase Live Sync
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFirebaseModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#F5B301]/10 hover:bg-[#F5B301]/20 border border-[#F5B301]/40 text-[#F5B301] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Firebase Credentials</span>
          </button>

          <button
            onClick={onOpenUserSite}
            className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-white/10 text-gray-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Open User App</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#F5B301]" />
          </button>

          <button
            onClick={onLogoutAdmin}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Admin</span>
          </button>
        </div>
      </header>

      {/* Main Admin Dashboard Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

        {/* TOP SYSTEM OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Registered Users</p>
              <h3 className="text-2xl font-black text-white mt-1 font-mono">{totalPlatformUsers}</h3>
              <p className="text-[10px] text-emerald-400 mt-1">100% Synced via Firebase</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total User Holdings</p>
              <h3 className="text-2xl font-black text-[#F5B301] mt-1 font-mono">
                ${totalLiveDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                <span>Live: <b className="text-white">${totalLiveDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></span>
                <span className="text-amber-400">Demo: <b className="text-amber-300 font-mono">${totalDemoHoldings.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b></span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#F5B301]/15 border border-[#F5B301]/30 flex items-center justify-center text-[#F5B301]">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pending Deposits</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1 font-mono">{pendingDeposits.length}</h3>
              <p className="text-[10px] text-amber-400 mt-1">
                ${pendingDeposits.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} awaiting approval
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pending Withdrawals</p>
              <h3 className="text-2xl font-black text-rose-400 mt-1 font-mono">{pendingWithdrawals.length}</h3>
              <p className="text-[10px] text-rose-300 mt-1">
                ${pendingWithdrawals.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} awaiting approval
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <MinusCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ADMIN SECTION TAB SWITCHER */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
          {[
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'kyc', label: `KYC Verification (${kycRequests.filter(r => r.status === 'pending').length})`, icon: ShieldCheck },
            { id: 'requests', label: `Pending Requests (${pendingDeposits.length + pendingWithdrawals.length})`, icon: Clock },
            { id: 'gateways', label: 'Payment Gateways & Bonus Control', icon: Settings },
            { id: 'markets', label: 'Trading Markets & OTC Control', icon: Globe },
            { id: 'trades', label: 'Active Positions Oversight', icon: Activity },
            { id: 'broadcast', label: 'Publish Market Signals', icon: Radio },
            { id: 'helpline', label: '24/7 Helpline Links', icon: Headphones },
            { id: 'branding', label: 'Master Branding & Logo', icon: Sparkles },
            { id: 'leaderboard', label: 'Leaderboard (Top 50 Control)', icon: Trophy },
            { id: 'logs', label: 'Audit Trail', icon: FileText },
          ].map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`adm-tab-${tab.id}-${idx}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#F5B301] text-gray-950 shadow-md shadow-[#F5B301]/20 font-black'
                    : 'bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB: KYC VERIFICATION MANAGEMENT */}
        {activeTab === 'kyc' && (
          <div className="space-y-5">
            {/* Stats Header Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[#0F1423] border border-white/10 shadow-lg">
                <p className="text-[11px] text-gray-400 font-bold uppercase">Total Submissions</p>
                <p className="text-xl font-black text-white font-mono mt-1">{kycRequests.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F1423] border border-amber-500/30 shadow-lg bg-amber-500/5">
                <p className="text-[11px] text-amber-400 font-bold uppercase">Pending Review</p>
                <p className="text-xl font-black text-amber-300 font-mono mt-1">
                  {kycRequests.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F1423] border border-emerald-500/30 shadow-lg bg-emerald-500/5">
                <p className="text-[11px] text-emerald-400 font-bold uppercase">Approved & Verified</p>
                <p className="text-xl font-black text-emerald-300 font-mono mt-1">
                  {kycRequests.filter(r => r.status === 'approved').length}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F1423] border border-rose-500/30 shadow-lg bg-rose-500/5">
                <p className="text-[11px] text-rose-400 font-bold uppercase">Rejected Requests</p>
                <p className="text-xl font-black text-rose-300 font-mono mt-1">
                  {kycRequests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
            </div>

            {/* Controls Bar: Filters & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0F1423] p-4 rounded-2xl border border-white/10">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((f, idx) => (
                  <button
                    key={`adm-kyc-f-${f}-${idx}`}
                    onClick={() => setKycFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                      kycFilter === f
                        ? 'bg-[#F5B301] text-gray-950 font-black shadow-md'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {f} ({
                      f === 'all' ? kycRequests.length : kycRequests.filter(r => r.status === f).length
                    })
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={kycSearch}
                  onChange={(e) => setKycSearch(e.target.value)}
                  placeholder="Search by name, email, NID..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-900 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#F5B301] font-mono"
                />
              </div>
            </div>

            {/* KYC Requests List */}
            {kycRequests.filter(r => {
              if (kycFilter !== 'all' && r.status !== kycFilter) return false;
              if (kycSearch.trim()) {
                const q = kycSearch.toLowerCase();
                return (
                  r.userName.toLowerCase().includes(q) ||
                  r.userEmail.toLowerCase().includes(q) ||
                  r.nidNumber.includes(q) ||
                  r.userUid.includes(q)
                );
              }
              return true;
            }).length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0F1423] border border-white/10 space-y-2">
                <ShieldCheck className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm font-bold text-gray-400">No KYC verification requests found</p>
                <p className="text-xs text-gray-600">Try changing filter criteria or searching with another term</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kycRequests.filter(r => {
                  if (kycFilter !== 'all' && r.status !== kycFilter) return false;
                  if (kycSearch.trim()) {
                    const q = kycSearch.toLowerCase();
                    return (
                      r.userName.toLowerCase().includes(q) ||
                      r.userEmail.toLowerCase().includes(q) ||
                      r.nidNumber.includes(q) ||
                      r.userUid.includes(q)
                    );
                  }
                  return true;
                }).map((req, idx) => (
                  <div 
                    key={`kyc-req-${req.id || 'req'}-${idx}`} 
                    className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 space-y-4 hover:border-white/20 transition-all shadow-xl"
                  >
                    {/* Header: User Info & Status */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F5B301]/20 border border-[#F5B301]/40 flex items-center justify-center text-[#F5B301] font-black text-sm">
                          {req.userName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-white">{req.userName}</h4>
                          <p className="text-xs text-gray-400 font-mono">{req.userEmail}</p>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                            UID: <span className="text-amber-400">{req.userUid}</span> • {req.submittedAt}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider shrink-0 ${
                        req.status === 'approved' 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : req.status === 'rejected'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      }`}>
                        {req.status === 'approved' ? '✓ Verified' : req.status === 'rejected' ? '✕ Rejected' : '⏱ Pending'}
                      </span>
                    </div>

                    {/* NID Details & Thumbnails */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono bg-gray-900/60 p-2.5 rounded-xl border border-white/5">
                        <span className="text-gray-400">NID Number:</span>
                        <span className="text-white font-bold tracking-wider">{req.nidNumber}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {/* Front Image Thumbnail */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400">NID Front Side</p>
                          {req.nidFrontUrl ? (
                            <div 
                              onClick={() => setPreviewImageModal({ url: req.nidFrontUrl, title: `${req.userName} - NID Front` })}
                              className="relative h-28 rounded-xl overflow-hidden border border-white/10 bg-black cursor-pointer group"
                            >
                              <img src={req.nidFrontUrl} alt="NID Front" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-300 text-xs font-bold gap-1">
                                <Eye className="w-4 h-4" />
                                <span>Inspect</span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-28 rounded-xl bg-gray-900 border border-white/5 flex items-center justify-center text-gray-600 text-[10px]">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Back Image Thumbnail */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-gray-400">NID Back Side</p>
                          {req.nidBackUrl ? (
                            <div 
                              onClick={() => setPreviewImageModal({ url: req.nidBackUrl!, title: `${req.userName} - NID Back` })}
                              className="relative h-28 rounded-xl overflow-hidden border border-white/10 bg-black cursor-pointer group"
                            >
                              <img src={req.nidBackUrl} alt="NID Back" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-300 text-xs font-bold gap-1">
                                <Eye className="w-4 h-4" />
                                <span>Inspect</span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-28 rounded-xl bg-gray-900 border border-white/5 flex items-center justify-center text-gray-600 text-[10px]">
                              Not Uploaded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rejection Reason display if rejected */}
                    {req.status === 'rejected' && req.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                        <p className="font-bold text-rose-400">Rejection Reason:</p>
                        <p className="mt-0.5">{req.rejectionReason}</p>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex items-center gap-2 border-t border-white/10">
                      {req.status === 'approved' ? (
                        <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 font-mono">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
                          <span>Permanent Verified Record</span>
                        </div>
                      ) : (
                        <>
                          <button
                            disabled={processingKycId === req.id}
                            onClick={() => handleApproveKyc(req)}
                            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                          >
                            {processingKycId === req.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>{processingKycId === req.id ? 'Processing...' : 'Approve Verification'}</span>
                          </button>

                          <button
                            disabled={processingKycId === req.id}
                            onClick={() => handleOpenRejectModal(req)}
                            className="flex-1 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>Reject Request</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0F1423] p-4 rounded-2xl border border-white/10 shadow-lg">
              <div className="relative w-full md:max-w-md">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Name, Email, Phone, Country, or ID..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#F5B301]"
                />
              </div>

              {/* Status Filter Badges */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {(
                  [
                    { key: 'all', label: 'All Users', count: users.length },
                    { key: 'active', label: 'Active', count: users.filter(u => !u.isBlocked).length },
                    { key: 'blocked', label: 'Blocked', count: users.filter(u => u.isBlocked).length },
                    { key: 'verified', label: 'Verified', count: users.filter(u => u.isVerifiedUser).length },
                    { key: 'unverified', label: 'Unverified', count: users.filter(u => !u.isVerifiedUser).length }
                  ] as const
                ).map((f) => (
                  <button
                    key={`user-filter-${f.key}`}
                    type="button"
                    onClick={() => setUserStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      userStatusFilter === f.key
                        ? 'bg-[#F5B301] text-gray-950 border-[#F5B301] shadow-md shadow-[#F5B301]/20'
                        : 'bg-gray-950/80 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      userStatusFilter === f.key ? 'bg-gray-950 text-[#F5B301]' : 'bg-gray-800 text-gray-300'
                    }`}>
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#0F1423] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-950/80 border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">User Details</th>
                      <th className="py-3.5 px-4">Verification</th>
                      <th className="py-3.5 px-4">Live Balance</th>
                      <th className="py-3.5 px-4">Bonus Balance</th>
                      <th className="py-3.5 px-4">Demo Balance</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-gray-500 font-mono">
                          No users found matching your search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u, idx) => (
                        <tr key={`user-${u.uid}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#F5B301]/10 border border-[#F5B301]/30 flex items-center justify-center font-bold text-[#F5B301] shadow-inner">
                                {(u.displayName || u.email || 'T')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white flex items-center gap-1.5">
                                  <span>{u.displayName || u.fullName || 'Trader'}</span>
                                  {u.role === 'admin' ? (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[#F5B301] text-[9px] font-black tracking-wider">ADMIN</span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 text-[9px] font-bold">TRADER</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono">
                                  {u.email} • ID: <span className="text-[#F5B301] font-bold">{u.displayUserId || getDisplayUserId(u.uid)}</span>
                                </p>
                                {(u.phoneNumber || u.country) && (
                                  <p className="text-[9px] text-gray-500">
                                    {u.country ? `🌍 ${u.country} ` : ''}{u.phoneNumber ? `📞 ${u.phoneNumber}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleVerification(u.uid)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                                u.isVerifiedUser 
                                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                                  : 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700'
                              }`}
                              title="Click to toggle KYC verification status"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>{u.isVerifiedUser ? 'Verified' : 'Unverified'}</span>
                            </button>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            ${(u.balances?.live ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                            ${(u.balances?.bonus ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                            ${(u.balances?.demo ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit ${
                              u.isBlocked 
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.isBlocked ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                              <span>{u.isBlocked ? 'Blocked' : 'Active'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* ✏️ Edit Balance & Full User Profile */}
                              <button
                                type="button"
                                onClick={() => handleOpenUserModal(u, 'balance')}
                                className="px-2.5 py-1.5 rounded-xl bg-[#F5B301] text-gray-950 font-black text-[11px] hover:brightness-110 flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                                title="Edit Balances & Full User Profile"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {/* 🔒/🔓 Block or Unblock */}
                              <button
                                type="button"
                                onClick={() => handleToggleBlock(u.uid)}
                                className={`p-1.5 rounded-xl border cursor-pointer transition-all ${
                                  u.isBlocked 
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30' 
                                    : 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
                                }`}
                                title={u.isBlocked ? 'Unblock User Account' : 'Block & Suspend User'}
                              >
                                {u.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </button>

                              {/* 🗑️ Delete User Permanently */}
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.uid)}
                                className="p-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-400 cursor-pointer transition-all"
                                title="Delete User Permanently from Firebase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FINANCIAL REQUESTS (DEPOSITS & WITHDRAWALS) */}
        {activeTab === 'requests' && (
          <div className="space-y-5">
            {/* Stats Header Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-[#0F1423] border border-white/10 shadow-lg">
                <p className="text-[11px] text-gray-400 font-bold uppercase">Total Requests</p>
                <p className="text-xl font-black text-white font-mono mt-1">{transactions.length}</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F1423] border border-amber-500/30 shadow-lg bg-amber-500/5">
                <p className="text-[11px] text-amber-400 font-bold uppercase">Pending Review</p>
                <p className="text-xl font-black text-amber-300 font-mono mt-1">
                  {transactions.filter(t => t.status === 'Pending').length}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F1423] border border-emerald-500/30 shadow-lg bg-emerald-500/5">
                <p className="text-[11px] text-emerald-400 font-bold uppercase">Approved & Settled</p>
                <p className="text-xl font-black text-emerald-300 font-mono mt-1">
                  {transactions.filter(t => t.status === 'Approved' || t.status === 'Success').length}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#0F1423] border border-rose-500/30 shadow-lg bg-rose-500/5">
                <p className="text-[11px] text-rose-400 font-bold uppercase">Rejected Requests</p>
                <p className="text-xl font-black text-rose-300 font-mono mt-1">
                  {transactions.filter(t => t.status === 'Rejected').length}
                </p>
              </div>
            </div>

            {/* Controls Bar: Filters & Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#0F1423] p-4 rounded-2xl border border-white/10">
              {/* Status & Type Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                  {(['pending', 'all', 'approved', 'rejected'] as const).map((st, sIdx) => (
                    <button
                      key={`adm-req-f-${st}-${sIdx}`}
                      onClick={() => { setRequestsFilter(st); setRequestsPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                        requestsFilter === st
                          ? 'bg-[#F5B301] text-gray-950 font-black shadow-md'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {st} ({
                        st === 'all' 
                          ? transactions.length 
                          : transactions.filter(t => t.status.toLowerCase() === st || (st === 'approved' && t.status.toLowerCase() === 'success')).length
                      })
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                  {(['all', 'Deposit', 'Withdrawal'] as const).map((tp, tIdx) => (
                    <button
                      key={`adm-req-tp-${tp}-${tIdx}`}
                      onClick={() => { setRequestsTypeFilter(tp); setRequestsPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        requestsTypeFilter === tp
                          ? 'bg-white/20 text-white font-black'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tp === 'all' ? 'All Types' : `${tp}s`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={requestsSearch}
                  onChange={(e) => { setRequestsSearch(e.target.value); setRequestsPage(1); }}
                  placeholder="Search by TrxID, email, method..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-900 border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#F5B301] font-mono"
                />
              </div>
            </div>

            {/* Filtered Transactions List */}
            {(() => {
              const filtered = transactions.filter(tx => {
                if (requestsFilter !== 'all' && tx.status.toLowerCase() !== requestsFilter && !(requestsFilter === 'approved' && tx.status.toLowerCase() === 'success')) return false;
                if (requestsTypeFilter !== 'all' && tx.type !== requestsTypeFilter) return false;
                if (requestsSearch.trim()) {
                  const q = requestsSearch.toLowerCase();
                  return (
                    (tx.id && tx.id.toLowerCase().includes(q)) ||
                    (tx.userEmail && tx.userEmail.toLowerCase().includes(q)) ||
                    (tx.userUid && tx.userUid.toLowerCase().includes(q)) ||
                    (tx.txHash && tx.txHash.toLowerCase().includes(q)) ||
                    (tx.method && tx.method.toLowerCase().includes(q))
                  );
                }
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-12 text-center bg-[#0F1423] rounded-2xl border border-white/10 text-gray-400 text-xs space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="font-bold text-white text-sm">No transaction requests found</p>
                    <p className="text-gray-500">There are no records matching your current filter criteria.</p>
                  </div>
                );
              }

              const itemsPerPage = 8;
              const totalPages = Math.ceil(filtered.length / itemsPerPage);
              const paginated = filtered.slice((requestsPage - 1) * itemsPerPage, requestsPage * itemsPerPage);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paginated.map((tx, idx) => {
                      const isProcessing = processingTxId === tx.id;
                      return (
                        <div 
                          key={`adm-tx-${tx.id || 'tx'}-${idx}`} 
                          className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 flex flex-col justify-between space-y-4 shadow-xl hover:border-white/20 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2.5 rounded-xl ${tx.type === 'Deposit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {tx.type === 'Deposit' ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-extrabold text-sm text-white">{tx.type} Request</p>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${
                                    tx.status === 'Approved' || tx.status === 'Success'
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                      : tx.status === 'Rejected'
                                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                                  }`}>
                                    {tx.status === 'Approved' || tx.status === 'Success' ? 'SUCCESS' : tx.status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">ID: {tx.id} • {tx.timestamp}</p>
                              </div>
                            </div>

                            <span className="text-xl font-black text-[#F5B301] font-mono">
                              ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-gray-950 border border-white/5 text-xs space-y-2">
                            <p className="text-gray-400">User: <strong className="text-white">{tx.userEmail || tx.userUid || 'Anonymous User'}</strong></p>
                            <p className="text-gray-400">Method: <strong className="text-white">{tx.method}</strong></p>
                            {tx.destinationAddress && (
                              <p className="text-gray-400 font-mono text-[11px] break-all">Destination / Wallet: <strong className="text-amber-300">{tx.destinationAddress}</strong></p>
                            )}
                            {tx.txHash && <p className="text-gray-400 font-mono">TrxID / Hash: <strong className="text-emerald-400 break-all">{tx.txHash}</strong></p>}
                            <p className="text-gray-400">Account Target: <strong className="text-amber-300 uppercase">{tx.accountType} Account</strong></p>
                            {tx.type === 'Withdrawal' && tx.accountType === 'bonus' && (
                              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] space-y-1">
                                <p className="font-bold flex items-center gap-1 text-amber-200">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Bonus Account: 50% Profit Withdrawal</span>
                                </p>
                                {tx.totalNetProfit !== undefined && (
                                  <p className="text-gray-400">Total Net Profit: <strong className="text-emerald-400 font-mono">${tx.totalNetProfit.toFixed(2)}</strong></p>
                                )}
                                {tx.depositBonusGranted !== undefined && (
                                  <p className="text-gray-400">Base Bonus Preserved: <strong className="text-amber-300 font-mono">${tx.depositBonusGranted.toFixed(2)}</strong></p>
                                )}
                              </div>
                            )}
                            {tx.type === 'Deposit' && (tx.bonusAmount ? tx.bonusAmount > 0 : tx.amount >= depositRules.bonusMinDepositUsd) && (
                              <p className="text-emerald-400 font-bold text-[11px] flex items-center gap-1 pt-0.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Includes 100% Supercharge Bonus (+${tx.bonusAmount || tx.amount} Bonus Account)</span>
                              </p>
                            )}

                            {/* Rejection Reason Display */}
                            {tx.status === 'Rejected' && tx.rejectionReason && (
                              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px]">
                                <p className="font-bold text-rose-400">Rejection Reason:</p>
                                <p className="mt-0.5">{tx.rejectionReason}</p>
                              </div>
                            )}

                            {/* PAYMENT PROOF SCREENSHOT PREVIEW */}
                            {tx.proofScreenshot ? (
                              <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    onClick={() => setSelectedScreenshotTx(tx)}
                                    className="w-12 h-12 rounded-lg bg-black border border-amber-500/40 overflow-hidden shrink-0 cursor-pointer group/img relative"
                                  >
                                    <img src={tx.proofScreenshot} alt="Proof" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                      <ZoomIn className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                                      <Camera className="w-3 h-3 text-[#F5B301]" />
                                      <span>Screenshot Attached</span>
                                    </p>
                                    <p className="text-[10px] text-gray-400">Uploaded by user</p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setSelectedScreenshotTx(tx)}
                                  className="px-3 py-1.5 bg-[#F5B301]/20 hover:bg-[#F5B301]/30 text-[#F5B301] border border-[#F5B301]/40 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                                >
                                  <ZoomIn className="w-3.5 h-3.5" />
                                  <span>View Proof</span>
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            {tx.status !== 'Approved' && tx.status !== 'Success' && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleApproveTransaction(tx)}
                                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-gray-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-emerald-500/20"
                              >
                                {isProcessing ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                                <span>{isProcessing ? 'Processing...' : 'Approve Request'}</span>
                              </button>
                            )}

                            {tx.status !== 'Rejected' && (
                              <div className="flex-1 flex items-center gap-1.5">
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleRejectTransaction(tx)}
                                  className="flex-1 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 text-rose-400 border border-rose-500/40 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                  title="Click to reject this request directly"
                                >
                                  {isProcessing ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                  <span>{isProcessing ? 'Rejecting...' : (tx.status === 'Approved' || tx.status === 'Success' ? 'Revoke / Reject' : 'Reject Request')}</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleOpenRejectTxModal(tx)}
                                  className="p-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-gray-400 hover:text-white border border-white/10 rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all"
                                  title="Reject with custom reason note"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0F1423] border border-white/10">
                      <p className="text-xs text-gray-400 font-mono">
                        Page {requestsPage} of {totalPages} ({filtered.length} total items)
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={requestsPage <= 1}
                          onClick={() => setRequestsPage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 rounded-xl bg-gray-900 border border-white/10 text-xs font-bold text-gray-300 disabled:opacity-40 hover:bg-white/5 cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          disabled={requestsPage >= totalPages}
                          onClick={() => setRequestsPage(prev => Math.min(totalPages, prev + 1))}
                          className="px-3 py-1.5 rounded-xl bg-gray-900 border border-white/10 text-xs font-bold text-gray-300 disabled:opacity-40 hover:bg-white/5 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: PAYMENT GATEWAYS & BONUS CONFIG EDITOR */}
        {activeTab === 'gateways' && (
          <div className="space-y-6">
            {/* Supercharge Bonus Settings Form */}
            <div className="p-6 rounded-2xl bg-[#0F1423] border border-[#F5B301]/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#F5B301]" />
                  <h3 className="text-base font-black text-white">100% Supercharge Bonus Settings</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#F5B301]/20 text-[#F5B301] text-xs font-black">
                  LIVE DEPOSIT BONUS
                </span>
              </div>

              <form onSubmit={handleSaveRules} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Min Deposit for Bonus ($)</label>
                  <input
                    type="number"
                    value={depositRules.bonusMinDepositUsd}
                    onChange={(e) => setDepositRules({ ...depositRules, bonusMinDepositUsd: parseFloat(e.target.value) || 245 })}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Default: $245 USD</p>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Max Deposit for Bonus ($)</label>
                  <input
                    type="number"
                    value={depositRules.bonusMaxDepositUsd}
                    onChange={(e) => setDepositRules({ ...depositRules, bonusMaxDepositUsd: parseFloat(e.target.value) || 5000 })}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Default: $5,000 USD</p>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Withdrawable Profit %</label>
                  <input
                    type="number"
                    value={depositRules.bonusWithdrawalProfitPercent}
                    onChange={(e) => setDepositRules({ ...depositRules, bonusWithdrawalProfitPercent: parseFloat(e.target.value) || 50 })}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Default: 50% Profit Withdrawable</p>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#F5B301] hover:brightness-110 text-gray-950 font-black rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Bonus Rules</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Payment & Withdrawal Gateways Sub-Tabs */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#F5B301]" />
                  <h3 className="text-base font-black text-white uppercase tracking-wider">Gateway Configuration</h3>
                </div>

                <div className="flex items-center p-1 bg-gray-950 rounded-xl border border-white/10">
                  <button
                    onClick={() => setGatewaySubTab('deposit')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      gatewaySubTab === 'deposit'
                        ? 'bg-[#F5B301] text-gray-950 shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Deposit Gateways ({gateways.length})
                  </button>
                  <button
                    onClick={() => setGatewaySubTab('withdrawal')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      gatewaySubTab === 'withdrawal'
                        ? 'bg-[#F5B301] text-gray-950 shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Withdrawal Methods ({withdrawalMethods.length})
                  </button>
                </div>
              </div>

              {/* Deposit Gateways */}
              {gatewaySubTab === 'deposit' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 font-bold">
                      Centralized Deposit Gateways (Synced permanently via Firestore to all members)
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedGatewayForEdit({
                        id: `gw_${Date.now()}`,
                        name: 'New Deposit Gateway',
                        type: 'crypto',
                        symbol: 'CUSTOM',
                        accountOrAddress: '',
                        instructions: 'Please transfer exact USD amount to the wallet address / number above.',
                        fee: '0%',
                        minUsd: 100,
                        isActive: true,
                        qrCodeUrl: ''
                      })}
                      className="px-3 py-1.5 bg-[#F5B301] hover:brightness-110 text-gray-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <span>+ Add New Gateway</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {gateways.map((gw, idx) => (
                      <div key={`adm-gw-${gw.id || 'gw'}-${idx}`} className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 flex flex-col justify-between space-y-3 shadow-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-[#F5B301] px-2 py-0.5 rounded bg-[#F5B301]/10 border border-[#F5B301]/30">
                            {gw.symbol}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            gw.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {gw.isActive ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-extrabold text-white">{gw.name}</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">Fee: {gw.fee} {gw.currencyConversionRate ? `• 1 USD = ${gw.currencyConversionRate} BDT` : ''}</p>
                        </div>

                        <div className="p-3 bg-gray-950 rounded-xl border border-white/5 space-y-1">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Address / Account Number</p>
                          <p className="text-xs font-mono text-emerald-400 font-bold break-all">{gw.accountOrAddress || 'No address set yet'}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleGatewayActive(gw.id)}
                            className={`px-3 py-2 border font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              gw.isActive
                                ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300'
                                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-400'
                            }`}
                            title={gw.isActive ? 'Turn OFF Method' : 'Turn ON Method'}
                          >
                            <span>{gw.isActive ? 'Turn OFF' : 'Turn ON'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedGatewayForEdit(gw)}
                            className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 border border-white/10 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Edit className="w-3.5 h-3.5 text-[#F5B301]" />
                            <span>Edit Details</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Withdrawal Gateways */}
              {gatewaySubTab === 'withdrawal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {withdrawalMethods.map((wm, idx) => (
                    <div key={`adm-wm-${wm.id || 'wm'}-${idx}`} className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 flex flex-col justify-between space-y-3 shadow-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30">
                          {wm.symbol}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          wm.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {wm.isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-white">{wm.name}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Fee: {wm.fee} • Min: ${wm.minUsd} USD</p>
                      </div>

                      <div className="p-3 bg-gray-950 rounded-xl border border-white/5 space-y-1">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Input Label / Type</p>
                        <p className="text-xs font-mono text-amber-300 font-bold truncate">{wm.inputLabel}</p>
                      </div>

                      <button
                        onClick={() => setSelectedWmForEdit(wm)}
                        className="w-full py-2 bg-gray-900 hover:bg-gray-800 border border-white/10 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Edit className="w-3.5 h-3.5 text-rose-400" />
                        <span>Edit Withdrawal Method</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ACTIVE & HISTORICAL TRADES OVERSIGHT */}
        {activeTab === 'trades' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#F5B301]" />
                  <span>Trade History & Active Positions Control</span>
                </h3>
                <p className="text-xs text-gray-400">Master database of all Forex & Binary Option trades across all users</p>
              </div>

              {/* Forex vs Binary History vs Open Sub-tabs */}
              <div className="flex items-center p-1 bg-gray-950 rounded-2xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setAdminTradeTab('forex')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminTradeTab === 'forex'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-300" />
                  <span>Forex History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTradeTab('otc')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminTradeTab === 'otc'
                      ? 'bg-emerald-500 text-gray-950 shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-gray-950" />
                  <span>Binary History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTradeTab('open')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminTradeTab === 'open'
                      ? 'bg-[#F5B301] text-gray-950 shadow-lg'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-gray-950" />
                  <span>Open Positions ({trades.filter(t => t.status === 'OPEN' || t.status === 'Open').length})</span>
                </button>
              </div>
            </div>

            {/* Admin Filters: Search User / Trade ID & Account Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={adminTradeSearch}
                  onChange={(e) => setAdminTradeSearch(e.target.value)}
                  placeholder="Search User Email, Trade ID, Symbol..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#F5B301]"
                />
              </div>

              <div className="sm:col-span-4 flex items-center gap-1 bg-gray-950 p-1 rounded-xl border border-white/10 text-xs">
                <span className="text-[10px] text-gray-500 uppercase font-bold px-2">Account:</span>
                {(['all', 'live', 'bonus', 'demo'] as const).map((acc, idx) => (
                  <button
                    key={`adm-acc-${acc}-${idx}`}
                    type="button"
                    onClick={() => setAdminAccFilter(acc)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                      adminAccFilter === acc
                        ? 'bg-gray-800 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </div>

            {/* Admin Trades Table */}
            <div className="bg-[#0F1423] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-950/80 border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Trade ID</th>
                      <th className="py-3.5 px-4">Trader Email</th>
                      <th className="py-3.5 px-4">Symbol / Asset</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Volume / Amount</th>
                      <th className="py-3.5 px-4">Entry / Exit Rate</th>
                      <th className="py-3.5 px-4">Account</th>
                      <th className="py-3.5 px-4">Result / PnL</th>
                      <th className="py-3.5 px-4">Status / Time</th>
                      <th className="py-3.5 px-4 text-right">Intervention</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {trades
                      .filter(t => {
                        const mode = t.tradingMode || (t.category === 'binary' ? 'otc' : 'forex');
                        if (adminTradeTab === 'forex' && (mode !== 'forex' || t.status === 'OPEN')) return false;
                        if (adminTradeTab === 'otc' && (mode !== 'otc' || t.status === 'OPEN')) return false;
                        if (adminTradeTab === 'open' && t.status !== 'OPEN' && t.status !== 'Open') return false;

                        if (adminAccFilter !== 'all' && t.accountType !== adminAccFilter) return false;

                        if (adminTradeSearch.trim()) {
                          const q = adminTradeSearch.toLowerCase().trim();
                          const matchId = (t.id || '').toLowerCase().includes(q);
                          const matchEmail = (t.userEmail || '').toLowerCase().includes(q);
                          const matchSym = (t.symbol || '').toLowerCase().includes(q);
                          if (!matchId && !matchEmail && !matchSym) return false;
                        }

                        return true;
                      })
                      .length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-gray-500 italic">
                            No trade records found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        trades
                          .filter(t => {
                            const mode = t.tradingMode || (t.category === 'binary' ? 'otc' : 'forex');
                            if (adminTradeTab === 'forex' && (mode !== 'forex' || t.status === 'OPEN')) return false;
                            if (adminTradeTab === 'otc' && (mode !== 'otc' || t.status === 'OPEN')) return false;
                            if (adminTradeTab === 'open' && t.status !== 'OPEN' && t.status !== 'Open') return false;

                            if (adminAccFilter !== 'all' && t.accountType !== adminAccFilter) return false;

                            if (adminTradeSearch.trim()) {
                              const q = adminTradeSearch.toLowerCase().trim();
                              const matchId = (t.id || '').toLowerCase().includes(q);
                              const matchEmail = (t.userEmail || '').toLowerCase().includes(q);
                              const matchSym = (t.symbol || '').toLowerCase().includes(q);
                              if (!matchId && !matchEmail && !matchSym) return false;
                            }

                            return true;
                          })
                          .map((tr, idx) => {
                            const isWin = tr.pnl >= 0 || tr.status === 'WON';
                            const isForex = (tr.tradingMode || 'forex') === 'forex';

                            return (
                              <tr key={`adm-trade-${tr.id}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3.5 px-4 font-mono text-gray-300 font-bold">{tr.id}</td>
                                <td className="py-3.5 px-4 font-bold text-white text-[11px]">{tr.userEmail || 'trader@forexpro.com'}</td>
                                <td className="py-3.5 px-4 font-bold text-amber-300">{tr.symbol}</td>
                                <td className="py-3.5 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                    tr.type === 'BUY' || tr.type === 'UP' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                  }`}>
                                    {tr.type}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-white">
                                  {isForex ? `${tr.lotSize || 0.01} Lot` : `$${tr.amount} USD`}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-gray-300">
                                  ${tr.entryPrice} {tr.exitPrice ? `→ $${tr.exitPrice}` : ''}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-gray-800 text-gray-300">
                                    {tr.accountType || 'LIVE'}
                                  </span>
                                </td>
                                <td className={`py-3.5 px-4 font-mono font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {isWin ? '+' : '-'}${Math.abs(tr.pnl).toFixed(2)} USD
                                </td>
                                <td className="py-3.5 px-4 text-gray-400 text-[11px]">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold block mb-0.5 ${
                                    tr.status === 'OPEN' ? 'bg-amber-500/20 text-amber-300' : isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                  }`}>
                                    {tr.status}
                                  </span>
                                  <span>{tr.closeTime || tr.timestamp}</span>
                                </td>
                                <td className="py-3.5 px-4 text-right space-x-1.5">
                                  {tr.status === 'OPEN' || tr.status === 'Open' ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleInterveneTrade(tr.id, 'profit')}
                                        className="px-2.5 py-1 rounded bg-emerald-500 text-gray-950 font-black text-[10px] cursor-pointer hover:brightness-110"
                                      >
                                        Force Win
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleInterveneTrade(tr.id, 'loss')}
                                        className="px-2.5 py-1 rounded bg-rose-500 text-white font-black text-[10px] cursor-pointer hover:brightness-110"
                                      >
                                        Force Loss
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-[10px] text-emerald-400 font-mono font-bold">● Recorded</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PUBLISH MARKET SIGNALS */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 p-5 rounded-2xl bg-[#0F1423] border border-white/10 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#F5B301]" />
                <span>Publish Trader Signal</span>
              </h3>

              <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Signal Type</label>
                  <select
                    value={signalType}
                    onChange={(e: any) => setSignalType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white"
                  >
                    <option value="buy">BUY SIGNAL (Green)</option>
                    <option value="sell">SELL SIGNAL (Red)</option>
                    <option value="announcement">SYSTEM ANNOUNCEMENT (Gold)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Signal Title</label>
                  <input
                    type="text"
                    required
                    value={signalTitle}
                    onChange={(e) => setSignalTitle(e.target.value)}
                    placeholder="e.g. XAU/USD Gold Breakout Signal"
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Description / Analysis</label>
                  <textarea
                    required
                    rows={4}
                    value={signalMessage}
                    onChange={(e) => setSignalMessage(e.target.value)}
                    placeholder="Enter technical details, entry price, stop loss, and take profit..."
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#F5B301] text-gray-950 font-black rounded-xl text-xs uppercase tracking-wider hover:brightness-110 cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Broadcast to All Traders</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0F1423] border border-white/10 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Active Broadcast History</h3>
              
              <div className="space-y-3">
                {broadcastList.map((sig, idx) => (
                  <div key={`adm-sig-${sig.id || 'sig'}-${idx}`} className="p-4 rounded-xl bg-gray-950 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          sig.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : sig.type === 'sell' ? 'bg-rose-500/20 text-rose-400' : 'bg-[#F5B301]/20 text-[#F5B301]'
                        }`}>
                          {sig.type}
                        </span>
                        {sig.author && <span className="text-[10px] text-gray-400">by {sig.author}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">{sig.time}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteBroadcast(sig.id)}
                          className="px-2 py-0.5 text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                          title="Delete broadcast for all traders"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-white pt-1">{sig.title}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">{sig.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TRADING MARKETS & OTC CONTROL */}
        {activeTab === 'markets' && (
          <div className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#F5B301]" />
                  <span>Market Pairs & Binary OTC Control</span>
                </h3>
                <p className="text-xs text-gray-400">Configure enabled trading pairs, OTC payouts, and spreads across the platform</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddMarketModal(true)}
                  className="px-3.5 py-2 bg-[#F5B301] hover:bg-[#e0a200] text-gray-950 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#F5B301]/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add New Pair</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    saveStoredMarkets(marketConfigs);
                    addAuditLog('Updated Market Pair Configurations & OTC Payouts');
                    alert('Market configurations saved and broadcast to all traders!');
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Save & Deploy Changes
                </button>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {/* OTC MASTER RISK MANAGEMENT & ADMIN 5-CANDLE PREDICTOR CONTROL UNIT        */}
            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-gray-950 to-emerald-500/10 border border-[#F5B301]/40 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#F5B301] fill-[#F5B301]/20" />
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      OTC House Risk Shield & Admin 5-Candle Predictor
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      QUOTEX-GRADE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 mt-0.5">
                    Real-time exposure management automatically settles higher-volume live balance trades in loss in the last 3-5 seconds. Toggle Admin Predictor to view future 5 candles and win 100% on admin trades.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleExposureControl}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 border ${
                      exposureControlEnabled
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                    }`}
                    title="Toggle automatic counter-direction loss for higher dollar side in last 5 seconds"
                  >
                    <Shield className="w-4 h-4" />
                    <span>{exposureControlEnabled ? '🛡️ 5s Counter Loss: ON' : '⚪ 5s Counter Loss: OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleAdminPredictor}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 border ${
                      adminPredictorMode
                        ? 'bg-emerald-500 text-gray-950 border-emerald-400 shadow-emerald-500/30 hover:bg-emerald-400'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                    title="Toggle Admin 5-candle predictor mode"
                  >
                    <Crown className="w-4 h-4" />
                    <span>{adminPredictorMode ? '👑 5-Candle Predictor: ON' : '👑 5-Candle Predictor: OFF'}</span>
                  </button>
                </div>
              </div>

              {/* 5-CANDLE FUTURE FORECAST VISUAL GRID */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-black text-white uppercase">Next 5-Candles Future Forecast</span>
                    <span className="text-[10px] text-cyan-300 font-mono">
                      {adminPredictorMode ? '(Admin Live Profit Forecast Active)' : '(Preview Mode)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">Select OTC Pair:</span>
                    <select
                      value={selectedForecastSymbol}
                      onChange={(e) => setSelectedForecastSymbol(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-gray-900 border border-white/20 text-xs font-mono font-bold text-white cursor-pointer focus:outline-none focus:border-[#F5B301]"
                    >
                      {marketConfigs
                        .filter(m => m.category === 'otc' || m.symbol.includes('OTC'))
                        .map(m => (
                          <option key={`opt-${m.symbol}`} value={m.symbol}>
                            {m.symbol}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {forecastCandles.map((fc, i) => (
                    <div
                      key={`fc-card-${i}`}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                        fc.direction === 'UP'
                          ? 'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400 shadow-sm shadow-emerald-500/10'
                          : 'bg-rose-950/40 border-rose-500/40 hover:border-rose-400 shadow-sm shadow-rose-500/10'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                        <span className="text-[10px] font-mono font-black text-gray-300">
                          Candle +{fc.index}M
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono ${
                          fc.direction === 'UP' ? 'bg-emerald-500 text-gray-950' : 'bg-rose-500 text-white'
                        }`}>
                          {fc.direction === 'UP' ? '▲ CALL (UP)' : '▼ PUT (DOWN)'}
                        </span>
                      </div>

                      <div className="py-2 space-y-1 font-mono text-[11px]">
                        <div className="flex justify-between text-gray-400 text-[10px]">
                          <span>Open:</span>
                          <span className="text-gray-200">{fc.open}</span>
                        </div>
                        <div className="flex justify-between text-gray-400 text-[10px]">
                          <span>Close:</span>
                          <span className={fc.direction === 'UP' ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
                            {fc.close}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-400 text-[10px]">
                          <span>Delta:</span>
                          <span className={fc.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {fc.delta >= 0 ? `+${fc.delta}` : fc.delta}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-gray-400">
                        <span>Confidence:</span>
                        <span className="text-[#F5B301] font-bold">{fc.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REAL-TIME LIVE BALANCE EXPOSURE HEATMAP */}
              <div className="p-3.5 bg-gray-950/80 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-black text-white uppercase">Live Balance Exposure Monitor</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400">
                    Active Live Orders: <strong className="text-amber-300 font-bold">{activeLiveOtcCount}</strong>
                  </span>
                </div>

                {Object.keys(otcExposureData).length === 0 || activeLiveOtcCount === 0 ? (
                  <div className="p-3 rounded-lg bg-gray-900/60 border border-dashed border-gray-800 text-center">
                    <p className="text-xs text-gray-400 font-mono">
                      🟢 No heavy live exposure active. All OTC markets operating in 100% natural organic price action with standard multi-wave trends.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {Object.values(otcExposureData).map((exp: any) => (
                      <div key={`exp-${exp.symbol}`} className="p-3 rounded-xl bg-gray-900 border border-white/10 space-y-2 font-mono text-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-white/10">
                          <span className="font-black text-white">{exp.symbol}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            exp.biasDirection === 'DOWN'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : exp.biasDirection === 'UP'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-gray-800 text-gray-400'
                          }`}>
                            {exp.biasDirection === 'DOWN' ? '🛡️ Auto-Drive: DOWN (Win PUT)' : exp.biasDirection === 'UP' ? '🛡️ Auto-Drive: UP (Win CALL)' : 'Balanced'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-1.5 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
                            <span className="block text-gray-400 text-[9px]">UP Volume:</span>
                            <span className="font-black text-xs">${exp.upVolume?.toLocaleString() || 0}</span>
                          </div>
                          <div className="p-1.5 rounded bg-rose-950/30 border border-rose-500/20 text-rose-300">
                            <span className="block text-gray-400 text-[9px]">DOWN Volume:</span>
                            <span className="font-black text-xs">${exp.downVolume?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-400 leading-tight">
                          Net Exposure: <span className="text-amber-300 font-bold">${Math.abs(exp.netExposure || 0).toLocaleString()}</span>
                          {exp.netExposure > 0 ? ' (UP heavy → settling DOWN)' : exp.netExposure < 0 ? ' (DOWN heavy → settling UP)' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketConfigs.map((m, idx) => (
                <div key={`adm-mkt-${m.id || 'm'}-${idx}`} className="p-4 rounded-xl bg-gray-950 border border-white/10 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#F5B301]/20 text-[#F5B301]">
                        {m.category}
                      </span>
                      <span className="text-sm font-black text-white">{m.symbol}</span>
                      <span className="text-[10px] text-gray-400">({m.name})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Engine Start / Stop Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...marketConfigs];
                          const newStatus = !(updated[idx].isRunning ?? true);
                          updated[idx].isRunning = newStatus;
                          setMarketConfigs(updated);
                          saveStoredMarkets(updated);
                          addAuditLog(`${newStatus ? 'Started' : 'Paused'} Market Engine for ${m.symbol}`);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                          (m.isRunning ?? true)
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                        }`}
                        title={(m.isRunning ?? true) ? 'Pause Live Engine' : 'Resume Live Engine'}
                      >
                        {(m.isRunning ?? true) ? '▶ RUNNING' : '⏸ PAUSED'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...marketConfigs];
                          updated[idx].isActive = !updated[idx].isActive;
                          setMarketConfigs(updated);
                          saveStoredMarkets(updated);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          m.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-800 text-gray-400 border border-white/5'
                        }`}
                      >
                        {m.isActive ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMarketPair(m.id, m.symbol)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition-all cursor-pointer"
                        title="Delete Market Pair"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* PROMINENT REAL-TIME MARKET CONTROL PANEL */}
                  <div className="bg-gradient-to-r from-gray-900 via-gray-950 to-gray-900 p-3.5 rounded-xl border border-[#F5B301]/40 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#F5B301] uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-[#F5B301] fill-[#F5B301]/30" />
                        <span>Market Control (Live Engine)</span>
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black border ${
                        !(m.isRunning ?? true)
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : (m.controlMode || m.trendBias) === 'UP'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : (m.controlMode || m.trendBias) === 'DOWN'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : (m.controlMode || m.trendBias) === 'REVERSAL'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      }`}>
                        {!(m.isRunning ?? true) 
                          ? '⏸ PAUSED' 
                          : (m.controlMode || m.trendBias) === 'UP' 
                          ? `📈 UP ${m.targetPrice ? `(🎯 ${m.targetPrice})` : ''}` 
                          : (m.controlMode || m.trendBias) === 'DOWN' 
                          ? `📉 DOWN ${m.targetPrice ? `(🎯 ${m.targetPrice})` : ''}` 
                          : (m.controlMode || m.trendBias) === 'REVERSAL' 
                          ? '🔄 REVERSAL' 
                          : '⚡ DEFAULT (AUTO)'}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-400 leading-tight">
                      Target Price & Direction Control. Synchronized across all users in real time with natural wave pullbacks without unnatural jumps.
                    </p>

                    {/* TARGET PRICE INPUT & SETTINGS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-950/80 p-2.5 rounded-lg border border-gray-800">
                      <div>
                        <label className="text-[10px] text-gray-400 block font-sans font-bold mb-1">Target Price (Optional)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            placeholder={`e.g. ${(m.basePrice * 1.002).toFixed(m.precision || 5)}`}
                            value={m.targetPrice ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseFloat(e.target.value);
                              const updated = [...marketConfigs];
                              if (val === null || isNaN(val)) {
                                updated[idx].targetPrice = null;
                                updated[idx].targetInitialPrice = null;
                                updated[idx].targetSetTimestamp = null;
                                updated[idx].targetDirection = null;
                              } else {
                                updated[idx].targetPrice = val;
                                updated[idx].targetInitialPrice = updated[idx].basePrice;
                                updated[idx].targetSetTimestamp = Date.now();
                                updated[idx].targetSpeedSeconds = updated[idx].targetSpeedSeconds || 50;
                                updated[idx].targetReachedAction = updated[idx].targetReachedAction || 'REVERSE';
                                updated[idx].targetDirection = val >= updated[idx].basePrice ? 'UP' : 'DOWN';
                              }
                              setMarketConfigs(updated);
                            }}
                            className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs focus:border-[#F5B301] focus:outline-none"
                          />
                          {m.targetPrice && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...marketConfigs];
                                updated[idx].targetPrice = null;
                                updated[idx].targetInitialPrice = null;
                                updated[idx].targetSetTimestamp = null;
                                updated[idx].targetDirection = null;
                                setMarketConfigs(updated);
                                saveStoredMarkets(updated);
                                addAuditLog(`Cleared target price for ${m.symbol}`);
                              }}
                              className="absolute right-2 top-2 text-gray-400 hover:text-rose-400 text-xs cursor-pointer"
                              title="Clear Target"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 block font-sans font-bold mb-1">Reach Duration</label>
                        <select
                          value={m.targetSpeedSeconds || 50}
                          onChange={(e) => {
                            const updated = [...marketConfigs];
                            updated[idx].targetSpeedSeconds = parseInt(e.target.value) || 50;
                            setMarketConfigs(updated);
                            saveStoredMarkets(updated);
                          }}
                          className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs font-bold"
                        >
                          <option value={20}>⚡ 20s (Fast Move)</option>
                          <option value={45}>🚀 45s (Natural Wave)</option>
                          <option value={60}>⚖️ 60s (Standard Wave)</option>
                          <option value={120}>🐢 2m (Gradual Trend)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-gray-400 block font-sans font-bold mb-1">Post-Target Action</label>
                        <select
                          value={m.targetReachedAction || 'REVERSE'}
                          onChange={(e: any) => {
                            const updated = [...marketConfigs];
                            updated[idx].targetReachedAction = e.target.value;
                            setMarketConfigs(updated);
                            saveStoredMarkets(updated);
                          }}
                          className="w-full p-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs font-bold"
                        >
                          <option value="REVERSE">🔄 Touch & Reverse</option>
                          <option value="CONSOLIDATE">↔ Touch & Consolidate</option>
                          <option value="AUTO">⚡ Touch & Continue (Auto)</option>
                        </select>
                      </div>
                    </div>

                    {/* PRIMARY 3 DIRECTION BUTTONS: UP, DOWN, DEFAULT */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {/* DIRECTION UP */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...marketConfigs];
                          updated[idx].controlMode = 'UP';
                          updated[idx].trendBias = 'UP';
                          updated[idx].targetDirection = 'UP';
                          
                          // If no target price set, set natural +30 pips target
                          if (!updated[idx].targetPrice) {
                            const step = (m.symbol.includes('JPY') ? 0.30 : (m.symbol.includes('BTC') ? 250 : m.symbol.includes('XAU') ? 15 : 0.0030));
                            updated[idx].targetPrice = Number((m.basePrice + step).toFixed(m.precision || 5));
                            updated[idx].targetInitialPrice = m.basePrice;
                            updated[idx].targetSetTimestamp = Date.now();
                            updated[idx].targetSpeedSeconds = updated[idx].targetSpeedSeconds || 50;
                            updated[idx].targetReachedAction = updated[idx].targetReachedAction || 'REVERSE';
                          } else {
                            updated[idx].targetInitialPrice = updated[idx].targetInitialPrice || m.basePrice;
                            updated[idx].targetSetTimestamp = Date.now();
                          }

                          setMarketConfigs(updated);
                          saveStoredMarkets(updated);
                          addAuditLog(`Set Market ${m.symbol} Direction UP (Target: ${updated[idx].targetPrice})`);
                        }}
                        className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border active:scale-95 shadow-sm ${
                          m.controlMode === 'UP' || m.trendBias === 'UP'
                            ? 'bg-emerald-500 text-gray-950 border-emerald-300 shadow-md shadow-emerald-500/30'
                            : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4 stroke-[3]" />
                        <span>Direction UP</span>
                      </button>

                      {/* DIRECTION DOWN */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...marketConfigs];
                          updated[idx].controlMode = 'DOWN';
                          updated[idx].trendBias = 'DOWN';
                          updated[idx].targetDirection = 'DOWN';

                          // If no target price set, set natural -30 pips target
                          if (!updated[idx].targetPrice) {
                            const step = (m.symbol.includes('JPY') ? 0.30 : (m.symbol.includes('BTC') ? 250 : m.symbol.includes('XAU') ? 15 : 0.0030));
                            updated[idx].targetPrice = Number((m.basePrice - step).toFixed(m.precision || 5));
                            updated[idx].targetInitialPrice = m.basePrice;
                            updated[idx].targetSetTimestamp = Date.now();
                            updated[idx].targetSpeedSeconds = updated[idx].targetSpeedSeconds || 50;
                            updated[idx].targetReachedAction = updated[idx].targetReachedAction || 'REVERSE';
                          } else {
                            updated[idx].targetInitialPrice = updated[idx].targetInitialPrice || m.basePrice;
                            updated[idx].targetSetTimestamp = Date.now();
                          }

                          setMarketConfigs(updated);
                          saveStoredMarkets(updated);
                          addAuditLog(`Set Market ${m.symbol} Direction DOWN (Target: ${updated[idx].targetPrice})`);
                        }}
                        className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border active:scale-95 shadow-sm ${
                          m.controlMode === 'DOWN' || m.trendBias === 'DOWN'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30'
                            : 'bg-rose-950/40 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        <TrendingDown className="w-4 h-4 stroke-[3]" />
                        <span>Direction DOWN</span>
                      </button>

                      {/* DIRECTION DEFAULT (AUTO) */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...marketConfigs];
                          updated[idx].controlMode = 'AUTO';
                          updated[idx].trendBias = 'SIDEWAYS';
                          updated[idx].targetPrice = null;
                          updated[idx].targetInitialPrice = null;
                          updated[idx].targetSetTimestamp = null;
                          updated[idx].targetDirection = null;
                          setMarketConfigs(updated);
                          saveStoredMarkets(updated);
                          addAuditLog(`Set Market ${m.symbol} Direction to DEFAULT (Auto Generation)`);
                        }}
                        className={`py-2.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border active:scale-95 shadow-sm ${
                          (!m.controlMode || m.controlMode === 'AUTO') && (m.trendBias === 'SIDEWAYS' || !m.trendBias) && !m.targetPrice
                            ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                            : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                        }`}
                      >
                        <span className="text-sm">⚡</span>
                        <span>DEFAULT</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <label className="text-[10px] text-gray-400 block font-sans font-bold">Base Price ($)</label>
                      <input
                        type="number"
                        step="any"
                        value={m.basePrice}
                        onChange={(e) => {
                          const updated = [...marketConfigs];
                          updated[idx].basePrice = parseFloat(e.target.value) || 0;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-400 block font-sans font-bold">Spread ($)</label>
                      <input
                        type="number"
                        step="any"
                        value={m.spread}
                        onChange={(e) => {
                          const updated = [...marketConfigs];
                          updated[idx].spread = parseFloat(e.target.value) || 0;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-emerald-400 block font-sans font-bold">Market Trend Bias</label>
                      <select
                        value={m.trendBias || 'SIDEWAYS'}
                        onChange={(e: any) => {
                          const updated = [...marketConfigs];
                          updated[idx].trendBias = e.target.value;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-emerald-500/30 rounded-lg text-white font-bold"
                      >
                        <option value="UP">📈 Bullish (UP Trend)</option>
                        <option value="DOWN">📉 Bearish (DOWN Trend)</option>
                        <option value="SIDEWAYS">↔ Ranging (Natural Oscillation)</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-blue-400 block font-sans font-bold">Volatility (Spike Control)</label>
                      <select
                        value={m.volatility || 'SMOOTH'}
                        onChange={(e: any) => {
                          const updated = [...marketConfigs];
                          updated[idx].volatility = e.target.value;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-blue-500/30 rounded-lg text-white font-bold"
                      >
                        <option value="SMOOTH">🌊 Ultra-Smooth (No Spikes)</option>
                        <option value="MODERATE">⚡ Moderate (Natural Micro-pikes)</option>
                        <option value="VOLATILE">🔥 High Volatility</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-amber-400 block font-sans font-bold">Candle Wick Size</label>
                      <select
                        value={m.wickSize || 'NATURAL'}
                        onChange={(e: any) => {
                          const updated = [...marketConfigs];
                          updated[idx].wickSize = e.target.value;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-amber-500/30 rounded-lg text-white font-bold"
                      >
                        <option value="SMALL">🤏 Small Wicks</option>
                        <option value="NATURAL">🕯️ Natural Wicks (No Doji Spam)</option>
                        <option value="LONG">📏 Long Shadow Wicks</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-purple-400 block font-sans font-bold">Trend Pullbacks</label>
                      <select
                        value={m.pullbackFreq || 'BALANCED'}
                        onChange={(e: any) => {
                          const updated = [...marketConfigs];
                          updated[idx].pullbackFreq = e.target.value;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-purple-500/30 rounded-lg text-white font-bold"
                      >
                        <option value="BALANCED">⚖️ Balanced Pullbacks</option>
                        <option value="STRONG_TREND">🚀 Strong Trend (Infrequent Pullbacks)</option>
                        <option value="CHOPPY">🌊 Choppy Ranging</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-cyan-400 block font-sans font-bold">Tick Update Speed (ms)</label>
                      <select
                        value={m.updateSpeedMs || 250}
                        onChange={(e: any) => {
                          const updated = [...marketConfigs];
                          updated[idx].updateSpeedMs = parseInt(e.target.value) || 250;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-cyan-500/30 rounded-lg text-white font-bold"
                      >
                        <option value={100}>⚡ 100ms (Ultra Fast Tick)</option>
                        <option value={200}>🚀 200ms (Smooth Dynamic)</option>
                        <option value={250}>🎯 250ms (Normal Default)</option>
                        <option value={500}>🐢 500ms (Relaxed)</option>
                        <option value={1000}>⏱️ 1000ms (Slow 1-Sec Tick)</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-indigo-400 block font-sans font-bold">Trend Strength</label>
                      <select
                        value={m.trendStrength || 'MODERATE'}
                        onChange={(e: any) => {
                          const updated = [...marketConfigs];
                          updated[idx].trendStrength = e.target.value;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-indigo-500/30 rounded-lg text-white font-bold"
                      >
                        <option value="WEAK">🍃 Weak Momentum</option>
                        <option value="MODERATE">⚖️ Moderate Trend Momentum</option>
                        <option value="STRONG">🚀 Strong Directional Trend</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-rose-400 block font-sans font-bold">Spike Probability</label>
                      <select
                        value={m.spikeProbability || 'RARE'}
                        onChange={(e: any) => {
                          const updated = [...marketConfigs];
                          updated[idx].spikeProbability = e.target.value;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-rose-500/30 rounded-lg text-white font-bold"
                      >
                        <option value="RARE">🛡️ Rare Spikes (1% Chance)</option>
                        <option value="LOW">📊 Low Spikes (3% Chance)</option>
                        <option value="MEDIUM">⚡ Medium Spikes (7% Chance)</option>
                        <option value="HIGH">🔥 High Volatile Spikes (15% Chance)</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-yellow-400 block font-sans font-bold">Max Candle Size Cap</label>
                      <select
                        value={m.maxCandleCap || 'STANDARD'}
                        onChange={(e: any) => {
                          const updated = [...marketConfigs];
                          updated[idx].maxCandleCap = e.target.value;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-yellow-500/30 rounded-lg text-white font-bold"
                      >
                        <option value="SMALL">🤏 Small Cap (Max 0.15% body)</option>
                        <option value="STANDARD">📐 Standard Cap (Max 0.30% body)</option>
                        <option value="EXPANDED">📏 Expanded Cap (Max 0.60% body)</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[10px] text-amber-300 block font-sans font-bold">Binary Profit Return (%)</label>
                      <input
                        type="number"
                        min="50"
                        max="99"
                        value={m.payoutPercent ?? 90}
                        onChange={(e) => {
                          const updated = [...marketConfigs];
                          updated[idx].payoutPercent = parseInt(e.target.value) || 90;
                          setMarketConfigs(updated);
                        }}
                        className="w-full p-2 bg-gray-900 border border-amber-500/40 rounded-lg text-amber-300 font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT TRAIL LOGS */}
        {activeTab === 'logs' && (
          <div className="p-6 rounded-3xl bg-[#0F1423] border border-white/10 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#F5B301]" />
                  <span>Real-Time Admin Security Audit Trail</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Immutable log of all administrative actions, balance modifications, KYC verifications, and financial overrides stored in Firebase.
                </p>
              </div>
              <div className="text-xs text-gray-400 font-mono">
                Total Logs: <span className="text-[#F5B301] font-bold">{auditLogs.length}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="p-12 text-center bg-gray-950 rounded-2xl border border-white/5 text-gray-500 font-mono text-xs">
                  No administrative audit logs recorded yet. All future admin activities will appear here in real-time.
                </div>
              ) : (
                auditLogs.map((log, idx) => (
                  <div 
                    key={`adm-log-${log.id || 'log'}-${idx}`} 
                    className="p-4 rounded-2xl bg-gray-950/80 border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          (log.action || '').toLowerCase().includes('balance') || (log.action || '').toLowerCase().includes('credit')
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : (log.action || '').toLowerCase().includes('delete') || (log.action || '').toLowerCase().includes('block')
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {log.action || 'ADMIN_ACTION'}
                        </span>
                        <span className="text-white font-bold">{log.details || log.action}</span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono flex-wrap">
                        {log.adminEmail && (
                          <span>By: <span className="text-gray-300">{log.adminEmail}</span></span>
                        )}
                        {log.targetUserEmail && (
                          <span>Target: <span className="text-[#F5B301]">{log.targetUserEmail}</span></span>
                        )}
                        {log.amount !== undefined && (
                          <span>Amount: <span className="text-emerald-400 font-bold">${log.amount.toFixed(2)}</span></span>
                        )}
                      </div>
                    </div>

                    <div className="text-right sm:text-right shrink-0">
                      <span className="text-gray-500 text-[10px] font-mono block">
                        {log.timestamp || 'Just now'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 7: MASTER BRANDING & LOGO CONTROL */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0F1423] border border-white/10 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#F5B301]" />
                    <span>Master Branding & Global Logo Control</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Manage the official Forex Trade Pro master logo shown across the landing page, login screen, terminal, and emails.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenUserSite}
                    className="px-3 py-2 rounded-xl bg-[#F5B301] text-gray-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#F5B301]/20 cursor-pointer"
                  >
                    <span>View Public Landing Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Master Logo Live Multi-Theme Preview */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">
                  Live Master Logo Previews (Automatic Dark & Light Theme Contrast)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dark Theme Canvas Preview */}
                  <div className="p-6 rounded-2xl bg-[#0B0F19] border border-white/15 flex flex-col items-center justify-center min-h-[160px] space-y-3 relative overflow-hidden">
                    <span className="absolute top-2.5 left-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                      Dark Background Preview
                    </span>
                    <div className="pt-3">
                      <BrandLogo size="xl" layout="horizontal" theme="dark" customLogoUrl={masterLogoUrlInput.trim() || undefined} />
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">Used in: Trading Terminal, Auth Card, Admin Panel</p>
                  </div>

                  {/* Light Theme Canvas Preview */}
                  <div className="p-6 rounded-2xl bg-white border border-gray-200 flex flex-col items-center justify-center min-h-[160px] space-y-3 relative overflow-hidden shadow-inner">
                    <span className="absolute top-2.5 left-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-full border border-gray-300">
                      Light Background Preview
                    </span>
                    <div className="pt-3">
                      <BrandLogo size="xl" layout="horizontal" theme="light" customLogoUrl={masterLogoUrlInput.trim() || undefined} />
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">Used in: Welcome/Landing Hero, Calculator, Public FAQs</p>
                  </div>
                </div>
              </div>

              {/* Logo URL / Upload Configuration */}
              <div className="p-5 rounded-2xl bg-gray-950 border border-white/5 space-y-4">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Update Official Master Logo Asset
                </h4>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block font-medium">
                    Master Logo Image URL (PNG, SVG, or WebP)
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="url"
                      value={masterLogoUrlInput}
                      onChange={(e) => {
                        setMasterLogoUrlInput(e.target.value);
                        setLogoSaveSuccess(false);
                      }}
                      placeholder="e.g., https://your-domain.com/logo.png (or leave blank for default SVG emblem)"
                      className="flex-1 w-full px-4 py-2.5 bg-[#0F1423] border border-white/15 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#F5B301]"
                    />

                    {/* Local Image File Reader helper */}
                    <label className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-white/10 rounded-xl text-gray-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0">
                      <Upload className="w-3.5 h-3.5 text-[#F5B301]" />
                      <span>Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (typeof event.target?.result === 'string') {
                                setMasterLogoUrlInput(event.target.result);
                                setLogoSaveSuccess(false);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const urlToSave = masterLogoUrlInput.trim() || '/logo.png';
                      await saveBrandingConfig({ logoUrl: urlToSave });
                      setLogoSaveSuccess(true);
                      addAuditLog(`Updated Master Brand Logo setting`);
                      setTimeout(() => setLogoSaveSuccess(false), 4000);
                    }}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Master Logo</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await saveBrandingConfig({ logoUrl: '/logo.png' });
                      setMasterLogoUrlInput('');
                      setLogoSaveSuccess(true);
                      addAuditLog(`Reset Master Brand Logo to official default`);
                      setTimeout(() => setLogoSaveSuccess(false), 4000);
                    }}
                    className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    <span>Reset to Default Official Vector Emblem</span>
                  </button>

                  {logoSaveSuccess && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 className="w-4 h-4" />
                      Master Logo updated successfully across all views!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: 24/7 HELPLINE & SUPPORT LINKS CONFIGURATION */}
        {activeTab === 'helpline' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0F1423] border border-white/10 space-y-6 shadow-xl">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-[#F5B301]" />
                    <span>24/7 Helpline & Support Links Control Panel</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    এডমিন প্যানেল থেকে হেল্পলাইনের যে কোনো লিংক (টেলিগ্রাম, জিমেইল, হটলাইন ফোন, হোয়াটসঅ্যাপ) বসাতে পারবেন। ইউজার ক্লিক করলেই সাথে সাথে নির্ধারিত লিংকে নিয়ে যাবে।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewHelpModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#F5B301] text-gray-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#F5B301]/20 cursor-pointer hover:bg-amber-400 transition-colors"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Preview User Popup</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Real-time Interactive Test / Live Preview Card */}
              <div className="p-5 rounded-2xl bg-[#0B0F19] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live Trader Preview & Instant Link Tester (ইউজাররা যা দেখবে)</span>
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Updated: {new Date(helplineState.updatedAt || Date.now()).toLocaleTimeString()}
                  </span>
                </div>

                {/* Priority Phone Hotline Live Preview */}
                <div className="p-3.5 bg-gradient-to-r from-[#F5B301]/10 to-amber-500/10 border border-[#F5B301]/30 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#F5B301] text-xs">{hotlineLabelInput || '24/7 Priority Support Hotline'}</p>
                    <p className="text-white font-mono text-sm font-bold mt-0.5">{hotlinePhoneInput || '+1 (800) 842-8829'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openHelplineTarget(hotlinePhoneInput, 'phone')}
                    className="px-3 py-1.5 bg-[#F5B301] hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 shadow"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Test Dial</span>
                  </button>
                </div>

                {/* Telegram & Gmail Preview Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-cyan-400">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <MessageSquare className="w-4 h-4 shrink-0 text-cyan-400" />
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate text-cyan-300">{telegramLabelInput || 'Telegram Chat'}</p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">
                          {telegramUrlInput ? formatHelplineUrl(telegramUrlInput, 'telegram') : 'https://t.me/ftpsupport24'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openHelplineTarget(telegramUrlInput, 'telegram')}
                      className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Test Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-emerald-400">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Mail className="w-4 h-4 shrink-0 text-emerald-400" />
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate text-emerald-300">{gmailLabelInput || 'Email Desk'}</p>
                        <p className="text-[10px] text-gray-400 truncate font-mono">
                          {gmailUrlInput ? formatHelplineUrl(gmailUrlInput, 'email') : 'mailto:forextradepro24@gmail.com'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openHelplineTarget(gmailUrlInput, 'email')}
                      className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Test Open</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* WhatsApp & Custom Link Preview (if present) */}
                {(whatsappUrlInput || customLinkUrlInput) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {whatsappUrlInput && (
                      <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-emerald-400">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">{whatsappLabelInput || 'WhatsApp Support'}</p>
                            <p className="text-[10px] text-gray-400 truncate font-mono">{formatHelplineUrl(whatsappUrlInput, 'whatsapp')}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openHelplineTarget(whatsappUrlInput, 'whatsapp')}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span>Test</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {customLinkUrlInput && (
                      <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-[#F5B301]">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <ExternalLink className="w-4 h-4 shrink-0 text-[#F5B301]" />
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">{customLinkTitleInput || 'VIP Link'}</p>
                            <p className="text-[10px] text-gray-400 truncate font-mono">{formatHelplineUrl(customLinkUrlInput, 'generic')}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openHelplineTarget(customLinkUrlInput, 'generic')}
                          className="px-2.5 py-1 bg-[#F5B301]/20 hover:bg-[#F5B301]/30 text-[#F5B301] border border-[#F5B301]/40 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <span>Test</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* EDIT FORM FIELDS */}
              <div className="space-y-5">
                {/* 1. Telegram Link Configuration */}
                <div className="p-5 rounded-2xl bg-gray-950 border border-cyan-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          1. Telegram Support Link / Username (টেলিগ্রাম লিংক)
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          যে কোনো টেলিগ্রাম চ্যানেল, গ্রুপ বা পার্সোনাল ইউজারনেম লিংক বসাতে পারেন।
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] text-gray-300 font-semibold block">
                        Telegram URL or Username
                      </label>
                      <input
                        type="text"
                        value={telegramUrlInput}
                        onChange={(e) => {
                          setTelegramUrlInput(e.target.value);
                          setHelplineSaveSuccess(false);
                        }}
                        placeholder="https://t.me/yourusername or @yourusername"
                        className="w-full px-3.5 py-2.5 bg-[#0F1423] border border-white/15 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                      />
                      <p className="text-[10px] text-gray-500">
                        Resolved link: <span className="font-mono text-cyan-400">{formatHelplineUrl(telegramUrlInput, 'telegram')}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-300 font-semibold block">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={telegramLabelInput}
                        onChange={(e) => {
                          setTelegramLabelInput(e.target.value);
                          setHelplineSaveSuccess(false);
                        }}
                        placeholder="e.g. Telegram Chat"
                        className="w-full px-3.5 py-2.5 bg-[#0F1423] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Gmail / Email Desk Link Configuration */}
                <div className="p-5 rounded-2xl bg-gray-950 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          2. Gmail / Email Support Link (জিমেইল বা ইমেইল লিংক)
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          সরাসরি জিমেইল ওয়েব লিংক, মেইলটো লিংক অথবা যেকোনো অফিসিয়াল ইমেইল এড্রেস বসাতে পারেন।
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] text-gray-300 font-semibold block">
                        Gmail Web Link, Mailto URL, or Email Address
                      </label>
                      <input
                        type="text"
                        value={gmailUrlInput}
                        onChange={(e) => {
                          setGmailUrlInput(e.target.value);
                          setHelplineSaveSuccess(false);
                        }}
                        placeholder="e.g., support@fxby24.com or https://mail.google.com/mail/?view=cm&fs=1&to=your@gmail.com"
                        className="w-full px-3.5 py-2.5 bg-[#0F1423] border border-white/15 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                      />

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] text-gray-500">Quick Helpers:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const emailClean = gmailUrlInput.replace(/mailto:/i, '').trim() || 'support@fxby24.com';
                            setGmailUrlInput(`https://mail.google.com/mail/?view=cm&fs=1&to=${emailClean}`);
                          }}
                          className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px] font-mono cursor-pointer"
                        >
                          Use Direct Gmail Web URL
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const match = gmailUrlInput.match(/to=([^&]+)/) || gmailUrlInput.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                            const mail = match ? match[1] : (gmailUrlInput.replace(/mailto:/i, '').trim() || 'support@fxby24.com');
                            setGmailUrlInput(`mailto:${mail}`);
                          }}
                          className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px] font-mono cursor-pointer"
                        >
                          Use Native mailto:
                        </button>
                      </div>

                      <p className="text-[10px] text-gray-500 pt-0.5">
                        Resolved link: <span className="font-mono text-emerald-400">{formatHelplineUrl(gmailUrlInput, 'email')}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-300 font-semibold block">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={gmailLabelInput}
                        onChange={(e) => {
                          setGmailLabelInput(e.target.value);
                          setHelplineSaveSuccess(false);
                        }}
                        placeholder="e.g. Email Desk or Gmail Support"
                        className="w-full px-3.5 py-2.5 bg-[#0F1423] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. 24/7 Phone Hotline Configuration */}
                <div className="p-5 rounded-2xl bg-gray-950 border border-[#F5B301]/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[#F5B301]/10 text-[#F5B301]">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#F5B301] uppercase tracking-wider">
                        3. 24/7 Phone Support Hotline (সরাসরি হেল্পলাইন নম্বর)
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        মোবাইল ও ডেস্কে ক্লিকের সাথে সাথে কল ডায়ালারে চলে যাবে।
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] text-gray-300 font-semibold block">
                        Hotline Phone Number
                      </label>
                      <input
                        type="text"
                        value={hotlinePhoneInput}
                        onChange={(e) => {
                          setHotlinePhoneInput(e.target.value);
                          setHelplineSaveSuccess(false);
                        }}
                        placeholder="+1 (800) 842-8829"
                        className="w-full px-3.5 py-2.5 bg-[#0F1423] border border-white/15 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#F5B301]"
                      />
                      <p className="text-[10px] text-gray-500">
                        Dial string: <span className="font-mono text-amber-400">{formatHelplineUrl(hotlinePhoneInput, 'phone')}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-gray-300 font-semibold block">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={hotlineLabelInput}
                        onChange={(e) => {
                          setHotlineLabelInput(e.target.value);
                          setHelplineSaveSuccess(false);
                        }}
                        placeholder="e.g. 24/7 Priority Support Hotline"
                        className="w-full px-3.5 py-2.5 bg-[#0F1423] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#F5B301]"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Optional Extra Channels (WhatsApp & Custom Link) */}
                <div className="p-5 rounded-2xl bg-gray-950 border border-white/10 space-y-4">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>4. Additional Channels: WhatsApp & Custom VIP Link (ঐচ্ছিক চ্যানেল)</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* WhatsApp */}
                    <div className="space-y-2 p-3 bg-gray-900/60 border border-white/5 rounded-xl">
                      <label className="text-[11px] text-gray-300 font-semibold block flex items-center gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WhatsApp Number or Link (Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={whatsappUrlInput}
                        onChange={(e) => {
                          setWhatsappUrlInput(e.target.value);
                          setHelplineSaveSuccess(false);
                        }}
                        placeholder="e.g. https://wa.me/1234567890 or +1234567890"
                        className="w-full px-3 py-2 bg-[#0F1423] border border-white/15 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-emerald-400"
                      />
                      <input
                        type="text"
                        value={whatsappLabelInput}
                        onChange={(e) => setWhatsappLabelInput(e.target.value)}
                        placeholder="Label (e.g. WhatsApp Support)"
                        className="w-full px-3 py-1.5 bg-[#0F1423] border border-white/10 rounded-lg text-white text-xs focus:outline-none"
                      />
                    </div>

                    {/* Custom URL */}
                    <div className="space-y-2 p-3 bg-gray-900/60 border border-white/5 rounded-xl">
                      <label className="text-[11px] text-gray-300 font-semibold block flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-[#F5B301]" />
                        <span>Any Custom URL (Discord, WebChat, VIP Form)</span>
                      </label>
                      <input
                        type="url"
                        value={customLinkUrlInput}
                        onChange={(e) => {
                          setCustomLinkUrlInput(e.target.value);
                          setHelplineSaveSuccess(false);
                        }}
                        placeholder="https://example.com/live-chat"
                        className="w-full px-3 py-2 bg-[#0F1423] border border-white/15 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-[#F5B301]"
                      />
                      <input
                        type="text"
                        value={customLinkTitleInput}
                        onChange={(e) => setCustomLinkTitleInput(e.target.value)}
                        placeholder="Label (e.g. VIP Live Chat)"
                        className="w-full px-3 py-1.5 bg-[#0F1423] border border-white/10 rounded-lg text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Support Notice / Market Hours */}
                <div className="p-5 rounded-2xl bg-gray-950 border border-white/10 space-y-2">
                  <label className="text-[11px] text-gray-300 font-semibold block">
                    Support Notice & Operating Hours Message (হেল্পলাইন নোটিশ টেক্সট)
                  </label>
                  <textarea
                    rows={2}
                    value={supportNoticeInput}
                    onChange={(e) => {
                      setSupportNoticeInput(e.target.value);
                      setHelplineSaveSuccess(false);
                    }}
                    placeholder="Trading Desk operates 24/5 for Forex & 24/7 for Crypto & Binary Options..."
                    className="w-full px-3.5 py-2.5 bg-[#0F1423] border border-white/15 rounded-xl text-white text-xs focus:outline-none focus:border-[#F5B301]"
                  />
                </div>

                {/* SAVE CONTROLS */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={helplineIsSaving}
                    onClick={async () => {
                      setHelplineIsSaving(true);
                      try {
                        await saveHelplineConfig({
                          telegramUrl: telegramUrlInput.trim(),
                          telegramLabel: telegramLabelInput.trim() || 'Telegram Chat',
                          gmailUrl: gmailUrlInput.trim(),
                          gmailLabel: gmailLabelInput.trim() || 'Email Desk',
                          hotlinePhone: hotlinePhoneInput.trim(),
                          hotlineLabel: hotlineLabelInput.trim() || '24/7 Priority Support Hotline',
                          whatsappUrl: whatsappUrlInput.trim(),
                          whatsappLabel: whatsappLabelInput.trim() || 'WhatsApp Support',
                          customLinkUrl: customLinkUrlInput.trim(),
                          customLinkTitle: customLinkTitleInput.trim(),
                          supportNotice: supportNoticeInput.trim(),
                        });
                        setHelplineSaveSuccess(true);
                        addAuditLog(`Updated 24/7 Helpline Links Configuration (Telegram, Gmail, Phone)`);
                        setTimeout(() => setHelplineSaveSuccess(false), 5000);
                      } finally {
                        setHelplineIsSaving(false);
                      }
                    }}
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{helplineIsSaving ? 'Saving & Syncing...' : 'Save Helpline Links (সেভ করুন)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Reset all helpline links to official defaults?')) {
                        await saveHelplineConfig(DEFAULT_HELPLINE);
                        setTelegramUrlInput(DEFAULT_HELPLINE.telegramUrl);
                        setTelegramLabelInput(DEFAULT_HELPLINE.telegramLabel || 'Telegram Chat');
                        setGmailUrlInput(DEFAULT_HELPLINE.gmailUrl);
                        setGmailLabelInput(DEFAULT_HELPLINE.gmailLabel || 'Email Desk');
                        setHotlinePhoneInput(DEFAULT_HELPLINE.hotlinePhone);
                        setHotlineLabelInput(DEFAULT_HELPLINE.hotlineLabel || '24/7 Priority Support Hotline');
                        setWhatsappUrlInput('');
                        setCustomLinkUrlInput('');
                        setSupportNoticeInput(DEFAULT_HELPLINE.supportNotice || '');
                        setHelplineSaveSuccess(true);
                        addAuditLog(`Reset 24/7 Helpline Links to default configuration`);
                        setTimeout(() => setHelplineSaveSuccess(false), 4000);
                      }
                    }}
                    className="px-4 py-3 bg-gray-900 hover:bg-gray-800 border border-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
                  >
                    <span>Reset to Defaults</span>
                  </button>

                  {helplineSaveSuccess && (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 className="w-4 h-4" />
                      Helpline links saved & synced across all user devices successfully!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LEADERBOARD MANAGEMENT (Top 50 Real-time Ranking & Benchmarks) */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            {/* Header / Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#0F1423] border border-white/10 shadow-lg">
                <p className="text-[11px] text-gray-400 font-bold uppercase">Daily Cycle Window</p>
                <h3 className="text-lg font-black text-amber-400 font-mono mt-1">08:00 AM – 08:00 AM</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Automated 24h Daily Reset</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F1423] border border-emerald-500/30 shadow-lg bg-emerald-500/5">
                <p className="text-[11px] text-emerald-400 font-bold uppercase">Live Leaderboard</p>
                <h3 className="text-lg font-black text-white font-mono mt-1">
                  {leaderboardConfig.benchmarkEntriesLive.length} Top Rankers
                </h3>
                <p className="text-[10px] text-emerald-300 mt-0.5">Real Accounts Active</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F1423] border border-blue-500/30 shadow-lg bg-blue-500/5">
                <p className="text-[11px] text-blue-400 font-bold uppercase">Bonus Leaderboard</p>
                <h3 className="text-lg font-black text-white font-mono mt-1">
                  {leaderboardConfig.benchmarkEntriesBonus.length} Top Rankers
                </h3>
                <p className="text-[10px] text-blue-300 mt-0.5">Bonus Accounts Active</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F1423] border border-white/10 shadow-lg flex flex-col justify-center">
                <p className="text-[11px] text-gray-400 font-bold uppercase">PnL Engine Status</p>
                <h3 className="text-lg font-black text-emerald-400 font-mono mt-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>100% Operational</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">50k+ Capacity Synced</p>
              </div>
            </div>

            {/* Main Leaderboard Control Panel */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#0F1423] border border-white/10 shadow-2xl space-y-6">
              
              {/* Header Title + Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>Top 50 Daily Leaderboard Engine</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Configure high-volume benchmark accounts and manage real-time ranking algorithms
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...leaderboardConfig,
                        lastResetTimestamp: Date.now(),
                      };
                      setLeaderboardConfig(updated);
                      saveLeaderboardConfigToFirestore(updated);
                      addAuditLog('Triggered manual 8:00 AM daily leaderboard cycle reset');
                      setLeaderboardSaveSuccess(true);
                      setTimeout(() => setLeaderboardSaveSuccess(false), 3000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Force 8:00 AM Reset Cycle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const restored = {
                        ...leaderboardConfig,
                        benchmarkEntriesLive: DEFAULT_BENCHMARK_LIVE,
                        benchmarkEntriesBonus: DEFAULT_BENCHMARK_BONUS,
                      };
                      setLeaderboardConfig(restored);
                      saveLeaderboardConfigToFirestore(restored);
                      addAuditLog('Restored default 20 benchmark accounts for Live and Bonus leaderboards');
                      setLeaderboardSaveSuccess(true);
                      setTimeout(() => setLeaderboardSaveSuccess(false), 3000);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>Restore Defaults</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await saveLeaderboardConfigToFirestore(leaderboardConfig);
                      addAuditLog('Saved all leaderboard configurations to Firestore');
                      setLeaderboardSaveSuccess(true);
                      setTimeout(() => setLeaderboardSaveSuccess(false), 3000);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>

              {leaderboardSaveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Leaderboard configurations saved and synced to Firestore in real-time!</span>
                </div>
              )}

              {/* Account Type Selector Tab for Admin */}
              <div className="flex items-center gap-2 p-1 bg-gray-950 rounded-2xl border border-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => setLeaderboardAdminTab('live')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    leaderboardAdminTab === 'live'
                      ? 'bg-emerald-500 text-gray-950 shadow-md font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-gray-950" />
                  <span>Live Account Top 50</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLeaderboardAdminTab('bonus')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    leaderboardAdminTab === 'bonus'
                      ? 'bg-blue-500 text-white shadow-md font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span>Bonus Account Top 50</span>
                </button>
              </div>

              {/* Benchmark Accounts Table */}
              <div className="bg-gray-950 rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-900/80 border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Trader Details</th>
                        <th className="py-3 px-4">Country & Flag</th>
                        <th className="py-3 px-4">Today's Profit</th>
                        <th className="py-3 px-4">Win Rate</th>
                        <th className="py-3 px-4">Trades</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {(leaderboardAdminTab === 'live' 
                        ? leaderboardConfig.benchmarkEntriesLive 
                        : leaderboardConfig.benchmarkEntriesBonus
                      ).map((entry, idx) => (
                        <tr key={`adm-bm-${entry.id}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-black">
                            <span className={`w-6 h-6 rounded-lg inline-flex items-center justify-center text-xs ${
                              idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                              idx === 1 ? 'bg-slate-300 text-slate-950 font-black' :
                              idx === 2 ? 'bg-amber-600 text-white font-black' :
                              'bg-white/5 text-gray-400 border border-white/10'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={entry.avatar}
                                alt={entry.username}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-lg object-cover border border-white/20 shrink-0"
                              />
                              <div>
                                <p className="font-bold text-white font-sans text-xs">{entry.username}</p>
                                <p className="text-[10px] text-gray-500 font-mono">ID: {entry.id}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-sans text-xs text-gray-300">
                            <span className="text-base mr-1.5">{entry.countryFlag}</span>
                            <span>{entry.countryName} ({entry.countryCode})</span>
                          </td>

                          <td className="py-3 px-4 font-black text-emerald-400 font-mono text-sm">
                            +${entry.todayProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-4 text-emerald-400 font-bold font-mono">
                            {entry.winRate}%
                          </td>

                          <td className="py-3 px-4 text-gray-300 font-mono">
                            {entry.totalTrades}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBenchmarkForEdit(entry);
                                setBenchmarkUsernameInput(entry.username);
                                setBenchmarkAvatarInput(entry.avatar);
                                setBenchmarkCountryCode(entry.countryCode);
                                setBenchmarkProfitInput(entry.todayProfit.toString());
                                setBenchmarkWinRateInput(entry.winRate.toString());
                                setBenchmarkTradesInput(entry.totalTrades.toString());
                                setBenchmarkGainPercentInput(entry.profitPercentage.toString());
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1 ml-auto cursor-pointer transition-all"
                            >
                              <Edit className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* EDIT USER BALANCE & FULL PROFILE INSPECTOR MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0E1424] border-2 border-[#F5B301]/40 rounded-3xl space-y-4 shadow-2xl my-6 max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 bg-gray-950/60 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5B301]/10 border border-[#F5B301]/40 flex items-center justify-center font-black text-lg text-[#F5B301]">
                    {(selectedUser.displayName || selectedUser.email || 'T')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-white">{selectedUser.displayName || selectedUser.fullName || 'Trader'}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                        selectedUser.isBlocked 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {selectedUser.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                      </span>
                      {selectedUser.isVerifiedUser ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                          ✓ VERIFIED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 text-[9px] font-bold">
                          UNVERIFIED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      {selectedUser.email} • ID: <span className="text-[#F5B301] font-bold">{selectedUser.displayUserId || getDisplayUserId(selectedUser.uid)}</span>
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Wallet Balances Summary Strip */}
              <div className="px-5 grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-gray-950/80 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Live Wallet</p>
                  <p className="text-sm font-black text-white font-mono mt-0.5">
                    ${(selectedUser.balances?.live ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-950/80 border border-white/5 text-center">
                  <p className="text-[10px] text-blue-400 uppercase font-bold">Bonus Wallet</p>
                  <p className="text-sm font-black text-blue-400 font-mono mt-0.5">
                    ${(selectedUser.balances?.bonus ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-950/80 border border-white/5 text-center">
                  <p className="text-[10px] text-amber-300 uppercase font-bold">Demo Wallet</p>
                  <p className="text-sm font-black text-amber-300 font-mono mt-0.5">
                    ${(selectedUser.balances?.demo ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="px-5 flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-2">
                {(
                  [
                    { id: 'balance', label: 'Balance Adjuster', icon: DollarSign },
                    { id: 'credit', label: 'Direct Credit (+ Tx)', icon: PlusCircle },
                    { id: 'profile', label: 'User Profile & KYC', icon: Users },
                    { id: 'trades', label: 'Trade Activity', icon: Activity },
                    { id: 'transactions', label: 'Transactions', icon: CreditCard }
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={`user-modal-tab-${tab.id}`}
                      type="button"
                      onClick={() => setUserModalTab(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                        userModalTab === tab.id
                          ? 'bg-[#F5B301] text-gray-950 font-black shadow-md shadow-[#F5B301]/20'
                          : 'bg-gray-950 text-gray-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Body */}
              <div className="px-5 pb-5 overflow-y-auto flex-1 space-y-4">
                {/* 1. BALANCE ADJUSTER TAB */}
                {userModalTab === 'balance' && (
                  <form onSubmit={handleApplyBalanceChange} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-gray-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
                        1. Select Target Account Wallet
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['live', 'bonus', 'demo'] as const).map((acc) => (
                          <button
                            type="button"
                            key={`adm-bal-acc-${acc}`}
                            onClick={() => setEditAccountType(acc)}
                            className={`py-2.5 rounded-xl border text-center font-black uppercase transition-all cursor-pointer ${
                              editAccountType === acc 
                                ? 'bg-[#F5B301] text-gray-950 border-[#F5B301] shadow-lg shadow-[#F5B301]/20' 
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                            }`}
                          >
                            {acc} Wallet (${(selectedUser.balances?.[acc] ?? 0).toFixed(2)})
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
                        2. Select Operation
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditOperation('add')}
                          className={`py-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            editOperation === 'add' 
                              ? 'bg-emerald-500 text-gray-950 border-emerald-500 font-black' 
                              : 'bg-gray-950 text-gray-400 border-gray-800'
                          }`}
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Deposit / Add (+)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditOperation('subtract')}
                          className={`py-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            editOperation === 'subtract' 
                              ? 'bg-rose-500 text-white border-rose-500 font-black' 
                              : 'bg-gray-950 text-gray-400 border-gray-800'
                          }`}
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                          <span>Deduct (-)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditOperation('set')}
                          className={`py-2 rounded-xl border text-center font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                            editOperation === 'set' 
                              ? 'bg-blue-500 text-white border-blue-500 font-black' 
                              : 'bg-gray-950 text-gray-400 border-gray-800'
                          }`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Set Exact (=)</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-gray-300 font-bold uppercase text-[10px] tracking-wider">
                          3. Amount ($ USD)
                        </label>
                        <div className="flex items-center gap-1">
                          {[50, 100, 500, 1000, 5000].map((quick) => (
                            <button
                              key={`quick-bal-${quick}`}
                              type="button"
                              onClick={() => setEditBalanceAmount(quick.toString())}
                              className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-white text-[10px] font-mono cursor-pointer"
                            >
                              +${quick}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="number"
                        step="any"
                        required
                        value={editBalanceAmount}
                        onChange={(e) => setEditBalanceAmount(e.target.value)}
                        placeholder="Enter amount (e.g. 500)"
                        className="w-full p-3 rounded-xl bg-gray-950 border border-gray-800 font-mono text-sm text-white focus:border-[#F5B301] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
                        4. Admin Note / Audit Reason (Optional)
                      </label>
                      <input
                        type="text"
                        value={editBalanceNote}
                        onChange={(e) => setEditBalanceNote(e.target.value)}
                        placeholder="e.g. VIP deposit adjustment / Manual correction"
                        className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white placeholder-gray-600 focus:border-[#F5B301] outline-none"
                      />
                    </div>

                    {/* Balance Preview Box */}
                    {parseFloat(editBalanceAmount) > 0 && (
                      <div className="p-3 rounded-xl bg-gray-950 border border-white/10 flex items-center justify-between text-xs font-mono">
                        <span className="text-gray-400">Current: ${(selectedUser.balances?.[editAccountType] ?? 0).toFixed(2)}</span>
                        <ChevronRight className="w-4 h-4 text-[#F5B301]" />
                        <span className="text-emerald-400 font-black">
                          New Balance: $
                          {(
                            editOperation === 'add'
                              ? (selectedUser.balances?.[editAccountType] ?? 0) + parseFloat(editBalanceAmount)
                              : editOperation === 'subtract'
                              ? Math.max(0, (selectedUser.balances?.[editAccountType] ?? 0) - parseFloat(editBalanceAmount))
                              : parseFloat(editBalanceAmount)
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="w-full py-3 bg-[#F5B301] hover:brightness-110 disabled:opacity-50 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F5B301]/20"
                    >
                      {isSavingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{isSavingUser ? 'Saving & Syncing...' : 'Save & Sync Real-Time to Firebase'}</span>
                    </button>
                  </form>
                )}

                {/* 2. DIRECT DEPOSIT CREDIT TAB */}
                {userModalTab === 'credit' && (
                  <form onSubmit={handleApplyDirectDepositCredit} className="space-y-4 text-xs">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs">
                      <p className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>Direct Deposit Credit System</span>
                      </p>
                      <p className="mt-1 text-[11px] text-gray-300">
                        This action will immediately credit the selected wallet AND write an Approved Deposit Transaction into Firebase Firestore for full financial auditing.
                      </p>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
                        Target Wallet
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['live', 'bonus', 'demo'] as const).map((w) => (
                          <button
                            type="button"
                            key={`adm-cred-wallet-${w}`}
                            onClick={() => setDirectCreditWallet(w)}
                            className={`py-2.5 rounded-xl border text-center font-bold uppercase transition-all cursor-pointer ${
                              directCreditWallet === w
                                ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20 font-black'
                                : 'bg-gray-950 border-gray-800 text-gray-400'
                            }`}
                          >
                            {w} Wallet
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
                        Credit Amount ($ USD)
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={directCreditAmount}
                        onChange={(e) => setDirectCreditAmount(e.target.value)}
                        placeholder="Enter amount to credit e.g. 250"
                        className="w-full p-3 rounded-xl bg-gray-950 border border-gray-800 font-mono text-sm text-white focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 font-bold mb-1.5 uppercase text-[10px] tracking-wider">
                        Transaction Reference / Admin Note
                      </label>
                      <input
                        type="text"
                        value={directCreditNote}
                        onChange={(e) => setDirectCreditNote(e.target.value)}
                        placeholder="e.g. VIP Direct Wire Credit / Special Reward"
                        className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white placeholder-gray-600 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                      {isSavingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                      <span>{isSavingUser ? 'Crediting...' : 'Issue Direct Deposit Credit'}</span>
                    </button>
                  </form>
                )}

                {/* 3. USER PROFILE & KYC TAB */}
                {userModalTab === 'profile' && (
                  <form onSubmit={handleSaveUserProfile} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-400 font-bold mb-1">Full / Display Name</label>
                        <input
                          type="text"
                          required
                          value={editUserName}
                          onChange={(e) => setEditUserName(e.target.value)}
                          className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:border-[#F5B301] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 font-bold mb-1">Email Address</label>
                        <input
                          type="email"
                          disabled
                          value={selectedUser.email}
                          className="w-full p-2.5 rounded-xl bg-gray-950/60 border border-gray-800 text-xs text-gray-500 font-mono cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 font-bold mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={editUserPhone}
                          onChange={(e) => setEditUserPhone(e.target.value)}
                          placeholder="+880 1712 345678"
                          className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:border-[#F5B301] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 font-bold mb-1">Country</label>
                        <input
                          type="text"
                          value={editUserCountry}
                          onChange={(e) => setEditUserCountry(e.target.value)}
                          placeholder="Bangladesh, United States, etc."
                          className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:border-[#F5B301] outline-none"
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-950 border border-white/5 space-y-2">
                      <p className="text-[11px] font-bold text-gray-300">Identity & Verification Control</p>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">KYC Status:</span>
                        <button
                          type="button"
                          onClick={() => handleToggleVerification(selectedUser.uid)}
                          className={`px-3 py-1 rounded-full font-bold text-xs cursor-pointer ${
                            selectedUser.isVerifiedUser 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {selectedUser.isVerifiedUser ? '✓ Verified Account' : '✗ Unverified'} (Click to Toggle)
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-gray-400">Account Access:</span>
                        <button
                          type="button"
                          onClick={() => handleToggleBlock(selectedUser.uid)}
                          className={`px-3 py-1 rounded-full font-bold text-xs cursor-pointer ${
                            selectedUser.isBlocked 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          }`}
                        >
                          {selectedUser.isBlocked ? '🔒 Account Blocked' : '🔓 Active Account'} (Click to Toggle)
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="w-full py-2.5 bg-[#F5B301] hover:brightness-110 disabled:opacity-50 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      {isSavingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save Profile Details</span>
                    </button>
                  </form>
                )}

                {/* 4. USER TRADE ACTIVITY TAB */}
                {userModalTab === 'trades' && (
                  <div className="space-y-3 text-xs">
                    <p className="text-gray-400 text-xs font-mono">
                      Recent Trades for {selectedUser.displayName} ({selectedUser.uid}):
                    </p>
                    {(() => {
                      const userTrades = trades.filter(t => 
                        t.userUid === selectedUser.uid || t.userId === selectedUser.uid || t.traderName === selectedUser.displayName
                      );
                      if (userTrades.length === 0) {
                        return (
                          <div className="p-8 text-center bg-gray-950 rounded-2xl border border-white/5 text-gray-500 font-mono">
                            No trade positions found for this user.
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {userTrades.map((t, idx) => (
                            <div key={`usr-trade-${t.id}-${idx}`} className="p-3 rounded-xl bg-gray-950 border border-white/5 flex items-center justify-between">
                              <div>
                                <p className="font-bold text-white flex items-center gap-1.5">
                                  <span>{t.symbol}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                    t.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                  }`}>
                                    {t.type}
                                  </span>
                                  <span className="text-gray-500 text-[10px] uppercase font-mono">{t.accountType || 'live'}</span>
                                </p>
                                <p className="text-[10px] text-gray-500 font-mono">
                                  Amount: ${t.amount || t.volume} • Open: {t.openPrice} • Status: {t.status || 'OPEN'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`font-black font-mono ${
                                  (t.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {(t.pnl || 0) >= 0 ? '+' : ''}${(t.pnl || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 5. USER TRANSACTIONS TAB */}
                {userModalTab === 'transactions' && (
                  <div className="space-y-3 text-xs">
                    <p className="text-gray-400 text-xs font-mono">
                      Financial Requests for {selectedUser.displayName}:
                    </p>
                    {(() => {
                      const userTxs = transactions.filter(t => 
                        (t.userUid && t.userUid === selectedUser.uid) || 
                        (t.userEmail && t.userEmail === selectedUser.email)
                      );
                      if (userTxs.length === 0) {
                        return (
                          <div className="p-8 text-center bg-gray-950 rounded-2xl border border-white/5 text-gray-500 font-mono">
                            No financial requests or deposits logged yet for this user.
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {userTxs.map((tx, idx) => (
                            <div key={`usr-tx-${tx.id}-${idx}`} className="p-3 rounded-xl bg-gray-950 border border-white/5 flex items-center justify-between">
                              <div>
                                <p className="font-bold text-white flex items-center gap-1.5">
                                  <span>{tx.type} via {tx.method}</span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                    tx.status === 'Approved' || tx.status === 'Success' ? 'bg-emerald-500/20 text-emerald-400' :
                                    tx.status === 'Rejected' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-300'
                                  }`}>
                                    {tx.status === 'Approved' || tx.status === 'Success' ? 'SUCCESS' : tx.status}
                                  </span>
                                </p>
                                <p className="text-[10px] text-gray-500 font-mono">
                                  ID: {tx.id} • {tx.timestamp}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold text-white">
                                  ${tx.amount.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Modal Footer / Permanent Delete Button */}
              <div className="p-4 border-t border-white/10 bg-gray-950/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteUser(selectedUser.uid)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User Permanently</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PAYMENT GATEWAY MODAL */}
      <AnimatePresence>
        {selectedGatewayForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 bg-[#0E1424] border-2 border-[#F5B301]/40 rounded-3xl space-y-4 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-base font-black text-white">Edit Payment Gateway</h3>
                  <p className="text-xs text-[#F5B301] font-bold">{selectedGatewayForEdit.name} ({selectedGatewayForEdit.symbol})</p>
                </div>
                <button 
                  onClick={() => setSelectedGatewayForEdit(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-xl bg-gray-900 border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveGateway(selectedGatewayForEdit);
              }} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Gateway Name</label>
                    <input
                      type="text"
                      required
                      value={selectedGatewayForEdit.name}
                      onChange={(e) => setSelectedGatewayForEdit({ ...selectedGatewayForEdit, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold"
                      placeholder="e.g. Binance Pay (Auto)"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Symbol / Tag</label>
                    <input
                      type="text"
                      required
                      value={selectedGatewayForEdit.symbol}
                      onChange={(e) => setSelectedGatewayForEdit({ ...selectedGatewayForEdit, symbol: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-amber-400 font-mono font-bold uppercase"
                      placeholder="e.g. USDT-TRC20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">
                    Wallet Address / Binance Pay ID / Account Number
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={selectedGatewayForEdit.accountOrAddress}
                    onChange={(e) => setSelectedGatewayForEdit({ ...selectedGatewayForEdit, accountOrAddress: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 font-mono text-emerald-400 font-bold text-xs"
                    placeholder="Enter wallet address or pay ID..."
                  />
                  <p className="text-[10px] text-gray-500 mt-1">This address is permanently saved to database and displayed live to all users.</p>
                </div>

                {/* QR Code URL & Live Preview Card */}
                <div className="p-3 bg-gray-950 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[#F5B301] font-black uppercase text-[10px] tracking-wider">
                      📷 Custom QR Code Image (Upload File or Enter URL)
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {selectedGatewayForEdit.qrCodeUrl?.trim() ? 'Custom QR Set' : 'Auto-Generated QR Active'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      value={selectedGatewayForEdit.qrCodeUrl || ''}
                      onChange={(e) => setSelectedGatewayForEdit({ ...selectedGatewayForEdit, qrCodeUrl: e.target.value })}
                      className="flex-1 p-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs font-mono"
                      placeholder="Image URL (e.g., https://... or paste base64)"
                    />
                    <label className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/30 shrink-0">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upload QR File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressedDataUrl = await compressQrImage(file);
                              setSelectedGatewayForEdit({ ...selectedGatewayForEdit, qrCodeUrl: compressedDataUrl });
                            } catch (err) {
                              console.error('Failed to compress uploaded QR code:', err);
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                if (evt.target?.result) {
                                  setSelectedGatewayForEdit({ ...selectedGatewayForEdit, qrCodeUrl: evt.target.result as string });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }
                        }}
                      />
                    </label>
                    {Boolean(selectedGatewayForEdit.qrCodeUrl?.trim()) && (
                      <button
                        type="button"
                        onClick={() => setSelectedGatewayForEdit({ ...selectedGatewayForEdit, qrCodeUrl: '' })}
                        className="px-2.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/40 shrink-0"
                        title="Reset to Auto-Generated QR"
                      >
                        Reset QR
                      </button>
                    )}
                  </div>

                  {/* QR Live Preview */}
                  <div className="p-3 bg-black/60 rounded-xl border border-gray-800 flex items-center gap-3">
                    <div className="shrink-0 p-1.5 bg-white rounded-lg border border-amber-400/40">
                      <img
                        src={selectedGatewayForEdit.qrCodeUrl?.trim() || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedGatewayForEdit.accountOrAddress || 'PREVIEW')}`}
                        alt="QR Code Live Preview"
                        className="w-16 h-16 object-contain rounded"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedGatewayForEdit.accountOrAddress || 'PREVIEW')}`;
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                      />
                    </div>
                    <div className="text-left space-y-0.5">
                      <p className="text-xs font-bold text-white">Live User QR Preview</p>
                      <p className="text-[10px] text-gray-400">
                        This is the exact scannable QR Code that will appear in the deposit section for all website & mobile users.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Payment Instructions for Users</label>
                  <textarea
                    rows={2}
                    value={selectedGatewayForEdit.instructions}
                    onChange={(e) => setSelectedGatewayForEdit({ ...selectedGatewayForEdit, instructions: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-gray-300 text-xs"
                    placeholder="e.g. Send exact USD amount using TRC20 Tron Network."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Network Fee</label>
                    <input
                      type="text"
                      value={selectedGatewayForEdit.fee}
                      onChange={(e) => setSelectedGatewayForEdit({ ...selectedGatewayForEdit, fee: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white"
                      placeholder="0% or 1 USDT"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Rate (1 USD = BDT)</label>
                    <input
                      type="number"
                      value={selectedGatewayForEdit.currencyConversionRate || ''}
                      onChange={(e) => setSelectedGatewayForEdit({ ...selectedGatewayForEdit, currencyConversionRate: parseFloat(e.target.value) || undefined })}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white"
                      placeholder="125"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Status</label>
                    <button
                      type="button"
                      onClick={() => setSelectedGatewayForEdit({ ...selectedGatewayForEdit, isActive: !selectedGatewayForEdit.isActive })}
                      className={`w-full p-2.5 rounded-xl border font-bold text-center transition-colors cursor-pointer ${
                        selectedGatewayForEdit.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      }`}
                    >
                      {selectedGatewayForEdit.isActive ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#F5B301] hover:brightness-110 text-gray-950 font-black rounded-xl uppercase tracking-wider cursor-pointer shadow-lg transition-all"
                  >
                    Save Gateway & Sync Globally
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT WITHDRAWAL METHOD MODAL */}
      <AnimatePresence>
        {selectedWmForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 bg-[#0E1424] border-2 border-rose-500/40 rounded-3xl space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">Edit Withdrawal Method</h3>
                  <p className="text-xs text-gray-400">{selectedWmForEdit.name}</p>
                </div>
                <button 
                  onClick={() => setSelectedWmForEdit(null)}
                  className="p-1 text-gray-400 hover:text-white rounded-lg bg-gray-900"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleSaveWithdrawalMethod(selectedWmForEdit);
              }} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Method Name</label>
                  <input
                    type="text"
                    value={selectedWmForEdit.name}
                    onChange={(e) => setSelectedWmForEdit({ ...selectedWmForEdit, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Input Label (e.g. Wallet Address / Account No)</label>
                  <input
                    type="text"
                    value={selectedWmForEdit.inputLabel}
                    onChange={(e) => setSelectedWmForEdit({ ...selectedWmForEdit, inputLabel: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-amber-300 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Fee</label>
                    <input
                      type="text"
                      value={selectedWmForEdit.fee}
                      onChange={(e) => setSelectedWmForEdit({ ...selectedWmForEdit, fee: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Min USD Amount</label>
                    <input
                      type="number"
                      value={selectedWmForEdit.minUsd}
                      onChange={(e) => setSelectedWmForEdit({ ...selectedWmForEdit, minUsd: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Status</label>
                  <button
                    type="button"
                    onClick={() => setSelectedWmForEdit({ ...selectedWmForEdit, isActive: !selectedWmForEdit.isActive })}
                    className={`w-full p-2.5 rounded-xl border font-bold text-center ${
                      selectedWmForEdit.isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    }`}
                  >
                    {selectedWmForEdit.isActive ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-rose-500 text-white font-black rounded-xl uppercase tracking-wider hover:brightness-110 cursor-pointer"
                >
                  Save Method Settings
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD NEW MARKET PAIR MODAL */}
      <AnimatePresence>
        {showAddMarketModal && (
          <div key="adm-add-market-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              key="adm-add-market-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 bg-[#0E1424] border-2 border-[#F5B301]/40 rounded-3xl space-y-4 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#F5B301]" />
                  <span>Add New Market Pair</span>
                </h3>

                <button
                  type="button"
                  onClick={() => setShowAddMarketModal(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddMarketPair} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Pair Symbol (e.g., EUR/BDT)</label>
                    <input
                      type="text"
                      required
                      placeholder="EUR/BDT OTC"
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Market Name</label>
                    <input
                      type="text"
                      placeholder="Euro / Bangladeshi Taka OTC"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e: any) => setNewCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold"
                    >
                      <option value="forex">🌐 Forex Standard</option>
                      <option value="otc">⚡ Binary OTC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Base Starting Price ($)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newBasePrice}
                      onChange={(e) => setNewBasePrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Spread ($)</label>
                    <input
                      type="number"
                      step="any"
                      value={newSpread}
                      onChange={(e) => setNewSpread(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Price Precision (Decimals)</label>
                    <select
                      value={newPrecision}
                      onChange={(e: any) => setNewPrecision(parseInt(e.target.value) || 5)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold font-mono"
                    >
                      <option value={2}>2 Decimals (e.g. 2388.50)</option>
                      <option value={3}>3 Decimals (e.g. 154.250)</option>
                      <option value={5}>5 Decimals (e.g. 1.08520)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-emerald-400 font-bold mb-1">Initial Trend Direction</label>
                    <select
                      value={newTrendBias}
                      onChange={(e: any) => setNewTrendBias(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-emerald-500/30 text-white font-bold"
                    >
                      <option value="UP">📈 Bullish (UP Trend)</option>
                      <option value="DOWN">📉 Bearish (DOWN Trend)</option>
                      <option value="SIDEWAYS">↔ Ranging (Natural)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-blue-400 font-bold mb-1">Volatility</label>
                    <select
                      value={newVolatility}
                      onChange={(e: any) => setNewVolatility(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-blue-500/30 text-white font-bold"
                    >
                      <option value="SMOOTH">🌊 Ultra-Smooth</option>
                      <option value="MODERATE">⚡ Moderate</option>
                      <option value="VOLATILE">🔥 High Volatility</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-cyan-400 font-bold mb-1">Candle Speed / Tick</label>
                    <select
                      value={newUpdateSpeedMs}
                      onChange={(e: any) => setNewUpdateSpeedMs(parseInt(e.target.value) || 250)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-cyan-500/30 text-white font-bold font-mono"
                    >
                      <option value={100}>⚡ 100ms (Fastest)</option>
                      <option value={200}>🚀 200ms</option>
                      <option value={250}>🎯 250ms (Normal)</option>
                      <option value={500}>🐢 500ms</option>
                      <option value={1000}>⏱️ 1000ms (1 Sec)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-amber-300 font-bold mb-1">OTC Profit Return (%)</label>
                    <input
                      type="number"
                      min="50"
                      max="99"
                      value={newPayoutPercent}
                      onChange={(e) => setNewPayoutPercent(parseInt(e.target.value) || 90)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-amber-500/30 text-amber-300 font-bold font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 mt-2 bg-gradient-to-r from-[#F5B301] to-amber-500 text-gray-950 font-black rounded-xl uppercase tracking-wider hover:brightness-110 cursor-pointer shadow-lg shadow-[#F5B301]/20"
                >
                  Create Market Pair
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Custom Firebase Configuration Modal */}
      <CustomFirebaseModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
      />

      {/* Admin Rejection Reason Modal for KYC */}
      <AnimatePresence>
        {rejectModalOpen && selectedKycForReject && (
          <div key="adm-kyc-reject-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              key="adm-kyc-reject-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0F1423] border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span>Reject KYC Request</span>
                </h3>
                <button
                  onClick={() => setRejectModalOpen(false)}
                  className="text-gray-400 hover:text-white p-1 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-gray-300">
                  You are rejecting KYC for user <strong className="text-amber-400">{selectedKycForReject.userName}</strong> ({selectedKycForReject.userEmail}).
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">Specify Reason for Rejection:</label>
                  <textarea
                    rows={3}
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    placeholder="e.g. NID photo image unreadable or blurry. Please re-upload clear photos."
                    className="w-full p-3 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectKyc}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs shadow-lg shadow-rose-500/20 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Rejection Modal for Financial Transactions (Deposits & Withdrawals) */}
      <AnimatePresence>
        {rejectTxModalOpen && selectedTxForReject && (
          <div key="adm-tx-reject-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              key="adm-tx-reject-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0F1423] border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span>Reject {selectedTxForReject.type} Request</span>
                </h3>
                <button
                  onClick={() => setRejectTxModalOpen(false)}
                  className="text-gray-400 hover:text-white p-1 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-950 border border-white/5 space-y-1">
                  <p className="text-gray-400">Request ID: <strong className="text-white font-mono">{selectedTxForReject.id}</strong></p>
                  <p className="text-gray-400">Amount: <strong className="text-[#F5B301] font-mono">${selectedTxForReject.amount}</strong> ({selectedTxForReject.method})</p>
                  <p className="text-gray-400">User: <strong className="text-white">{selectedTxForReject.userEmail || selectedTxForReject.userUid}</strong></p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 mb-1">Select / Specify Reason for Rejection:</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {[
                      'Invalid payment proof / screenshot blurry',
                      'TrxID mismatch or duplicate submission',
                      'Amount not received in account',
                      'Invalid destination wallet address',
                      'KYC verification required first'
                    ].map((preset, pIdx) => (
                      <button
                        key={`adm-tx-reject-preset-${pIdx}`}
                        type="button"
                        onClick={() => setRejectTxReasonInput(preset)}
                        className="px-2 py-1 bg-gray-900 border border-white/10 hover:border-amber-400 text-gray-300 text-[10px] rounded-lg cursor-pointer transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={rejectTxReasonInput}
                    onChange={(e) => setRejectTxReasonInput(e.target.value)}
                    placeholder="Enter reason details to display to the user..."
                    className="w-full p-3 rounded-xl bg-gray-950 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTxModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processingTxId === selectedTxForReject.id}
                  onClick={handleConfirmRejectTx}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-rose-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {processingTxId === selectedTxForReject.id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <span>Confirm Rejection</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Preview Modal */}
      <AnimatePresence>
        {previewImageModal && (
          <div 
            key="adm-preview-img-backdrop"
            onClick={() => setPreviewImageModal(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              key="adm-preview-img-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full bg-[#0F1423] border border-white/20 rounded-2xl p-4 space-y-3 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h4 className="text-xs font-bold text-amber-400 font-mono">{previewImageModal.title}</h4>
                <button
                  onClick={() => setPreviewImageModal(null)}
                  className="text-gray-400 hover:text-white p-1 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[80vh] flex items-center justify-center overflow-auto rounded-xl bg-black p-2">
                <img src={previewImageModal.url} alt="Document Preview" className="max-h-[75vh] w-auto object-contain rounded-lg" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Screenshot Viewer Modal for Admin */}
      <AnimatePresence>
        {selectedScreenshotTx && (
          <div 
            key="adm-screenshot-view-backdrop"
            onClick={() => setSelectedScreenshotTx(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              key="adm-screenshot-view-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-[#0D1222] border-2 border-[#F5B301] rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#F5B301]" />
                  <div>
                    <h3 className="text-sm font-black text-white">Payment Proof Screenshot</h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Deposit Request ID: {selectedScreenshotTx.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedScreenshotTx(null)}
                  className="p-1 text-gray-400 hover:text-white rounded-xl bg-gray-900 border border-white/10 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Deposit Details Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 rounded-2xl bg-gray-950 border border-white/5">
                <div>
                  <p className="text-[10px] text-gray-400">User Email</p>
                  <p className="font-bold text-white truncate">{selectedScreenshotTx.userEmail || selectedScreenshotTx.userUid}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Deposit Amount</p>
                  <p className="font-mono font-black text-[#F5B301]">${selectedScreenshotTx.amount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Gateway</p>
                  <p className="font-bold text-white">{selectedScreenshotTx.method}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">TrxID / Hash</p>
                  <p className="font-mono font-bold text-emerald-400 truncate">{selectedScreenshotTx.txHash || 'N/A'}</p>
                </div>
              </div>

              {/* Screenshot Image Frame */}
              <div className="max-h-[58vh] flex items-center justify-center overflow-auto rounded-2xl bg-black border border-white/10 p-2">
                {selectedScreenshotTx.proofScreenshot ? (
                  <img 
                    src={selectedScreenshotTx.proofScreenshot} 
                    alt="Payment Proof Screenshot Full" 
                    className="max-h-[52vh] w-auto object-contain rounded-xl" 
                  />
                ) : (
                  <div className="p-8 text-center text-gray-500 text-xs">
                    No image screenshot attached for this request.
                  </div>
                )}
              </div>

              {/* Quick Approval / Rejection Action Buttons inside Modal */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={processingTxId === selectedScreenshotTx.id}
                  onClick={() => handleApproveTransaction(selectedScreenshotTx)}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {processingTxId === selectedScreenshotTx.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{processingTxId === selectedScreenshotTx.id ? 'Processing...' : 'Approve & Credit Balance'}</span>
                </button>

                <div className="flex-1 flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={processingTxId === selectedScreenshotTx.id}
                    onClick={() => handleRejectTransaction(selectedScreenshotTx)}
                    className="flex-1 py-3 bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 text-rose-400 border border-rose-500/40 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {processingTxId === selectedScreenshotTx.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>{processingTxId === selectedScreenshotTx.id ? 'Rejecting...' : 'Reject Request'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={processingTxId === selectedScreenshotTx.id}
                    onClick={() => {
                      const txToReject = selectedScreenshotTx;
                      setSelectedScreenshotTx(null);
                      handleOpenRejectTxModal(txToReject);
                    }}
                    className="p-3 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-gray-400 hover:text-white border border-white/10 rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all"
                    title="Reject with custom reason note"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT BENCHMARK TRADER MODAL */}
      <AnimatePresence>
        {selectedBenchmarkForEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 bg-[#0E1424] border-2 border-amber-400/40 rounded-3xl space-y-4 shadow-2xl my-8"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Edit Leaderboard Trader</h3>
                    <p className="text-xs text-amber-400 font-mono">{selectedBenchmarkForEdit.username}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBenchmarkForEdit(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-xl bg-gray-900 border border-white/10"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const targetCountry = COUNTRIES.find(c => c.code === benchmarkCountryCode) || COUNTRIES[0];
                  const updatedEntry: LeaderboardEntry = {
                    ...selectedBenchmarkForEdit,
                    username: benchmarkUsernameInput.trim() || selectedBenchmarkForEdit.username,
                    avatar: benchmarkAvatarInput.trim() || selectedBenchmarkForEdit.avatar,
                    countryCode: targetCountry.code,
                    countryName: targetCountry.name,
                    countryFlag: targetCountry.flag,
                    todayProfit: parseFloat(benchmarkProfitInput) || selectedBenchmarkForEdit.todayProfit,
                    winRate: parseFloat(benchmarkWinRateInput) || selectedBenchmarkForEdit.winRate,
                    totalTrades: parseInt(benchmarkTradesInput, 10) || selectedBenchmarkForEdit.totalTrades,
                    profitPercentage: parseFloat(benchmarkGainPercentInput) || selectedBenchmarkForEdit.profitPercentage,
                  };

                  const listKey = leaderboardAdminTab === 'live' ? 'benchmarkEntriesLive' : 'benchmarkEntriesBonus';
                  const currentList = leaderboardConfig[listKey];
                  const updatedList = currentList.map(item => item.id === updatedEntry.id ? updatedEntry : item);

                  // Re-sort descending by todayProfit
                  updatedList.sort((a, b) => b.todayProfit - a.todayProfit);

                  const newConfig: LeaderboardConfig = {
                    ...leaderboardConfig,
                    [listKey]: updatedList,
                  };

                  setLeaderboardConfig(newConfig);
                  saveLeaderboardConfigToFirestore(newConfig);
                  addAuditLog(`Updated Leaderboard Trader ${updatedEntry.username} ($${updatedEntry.todayProfit})`);
                  setSelectedBenchmarkForEdit(null);
                  setLeaderboardSaveSuccess(true);
                  setTimeout(() => setLeaderboardSaveSuccess(false), 3000);
                }}
                className="space-y-3.5 text-xs font-sans"
              >
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Username / Masked Name</label>
                  <input
                    type="text"
                    required
                    value={benchmarkUsernameInput}
                    onChange={(e) => setBenchmarkUsernameInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Avatar Image URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      required
                      value={benchmarkAvatarInput}
                      onChange={(e) => setBenchmarkAvatarInput(e.target.value)}
                      className="flex-1 p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white text-xs font-mono"
                    />
                    <img
                      src={benchmarkAvatarInput || selectedBenchmarkForEdit.avatar}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-xl object-cover border border-white/20 shrink-0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-bold mb-1">Country & National Flag</label>
                  <select
                    value={benchmarkCountryCode}
                    onChange={(e) => setBenchmarkCountryCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold text-xs"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={`opt-c-${c.code}`} value={c.code}>
                        {c.flag} {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Today's Profit ($ USD)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={benchmarkProfitInput}
                      onChange={(e) => setBenchmarkProfitInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-emerald-400 font-mono font-black text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Win Rate (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={benchmarkWinRateInput}
                      onChange={(e) => setBenchmarkWinRateInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Total Trades Today</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={benchmarkTradesInput}
                      onChange={(e) => setBenchmarkTradesInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold mb-1">Profit Percentage (%)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={benchmarkGainPercentInput}
                      onChange={(e) => setBenchmarkGainPercentInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black rounded-xl uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all cursor-pointer mt-2"
                >
                  Save Trader Ranking Details
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN PREVIEW OF HELPLINE MODAL */}
      <HelpLineModal
        isOpen={previewHelpModalOpen}
        onClose={() => setPreviewHelpModalOpen(false)}
      />

    </div>
  );
};
