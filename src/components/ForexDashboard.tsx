import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getDisplayUserId, saveTradeToFirestore, saveTradesBatchToFirestore, saveUserBalancesToFirestore, subscribeUserTradesFromFirestore } from '../lib/firestoreSync';
import { safeFormatTime, safeFormatTimeWithSeconds, safeFormatDateTime, safeGetTime } from '../lib/dateUtils';
import { calculateAccountMetricsEngine } from '../lib/profitCalculator';
import { calculateUserTodayProfit, syncUserToGlobalLeaderboard } from '../lib/leaderboardService';
import { resolveBinaryTrade, resolveForexTrade, registerSettledTradeIds, isTradeSettled, filterUnsettledActiveTrades } from '../lib/tradeSettlement';
import { BrandLogo } from './BrandLogo';
import { 
  Bell, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Minus, 
  Clock, 
  PhoneCall, 
  CheckCircle2, 
  Activity, 
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Home,
  X,
  BarChart2,
  Wallet,
  User as UserIcon,
  HelpCircle,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Lock,
  Headphones,
  Award,
  Zap,
  Globe,
  ExternalLink,
  RotateCcw,
  Mail,
  KeyRound,
  Share2,
  Gift,
  Sparkles,
  Camera,
  Pencil,
  Edit2,
  Users
} from 'lucide-react';
import { auth, signOut, sendEmailVerification, updateProfile, User as FirebaseUser, db, isQuotaExceeded, isQuotaError } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { AccountType, AccountBalances, CoinAsset, TradePosition, TransactionRecord, KYCRequest } from '../types';
import { INITIAL_COIN_ASSETS, INITIAL_TRANSACTIONS } from '../data/mockData';
import { Sidebar } from './Sidebar';
import { TradingTerminalView, ActiveTrade } from './TradingTerminalView';
import { TradeHistoryList } from './TradeHistoryList';

// Code-split heavy modals and secondary views to reduce initial bundle by over 70% (<2s load)
const TradeTypeModal = lazy(() => import('./TradeTypeModal').then(m => ({ default: m.TradeTypeModal })));
const MarketsView = lazy(() => import('./MarketsView').then(m => ({ default: m.MarketsView })));
const DepositModal = lazy(() => import('./DepositModal').then(m => ({ default: m.DepositModal })));
const WithdrawModal = lazy(() => import('./WithdrawModal').then(m => ({ default: m.WithdrawModal })));
const HelpLineModal = lazy(() => import('./HelpLineModal').then(m => ({ default: m.HelpLineModal })));
const FeedbackModal = lazy(() => import('./FeedbackModal').then(m => ({ default: m.FeedbackModal })));
const TradeHistoryModal = lazy(() => import('./TradeHistoryModal').then(m => ({ default: m.TradeHistoryModal })));
const KYCModal = lazy(() => import('./KYCModal').then(m => ({ default: m.KYCModal })));
const ChangePasswordModal = lazy(() => import('./ChangePasswordModal').then(m => ({ default: m.ChangePasswordModal })));
const ShareReferralModal = lazy(() => import('./ShareReferralModal').then(m => ({ default: m.ShareReferralModal })));
const MyReferralsModal = lazy(() => import('./MyReferralsModal').then(m => ({ default: m.MyReferralsModal })));
const AvatarPickerModal = lazy(() => import('./AvatarPickerModal').then(m => ({ default: m.AvatarPickerModal })));
const EditDemoBalanceModal = lazy(() => import('./EditDemoBalanceModal').then(m => ({ default: m.EditDemoBalanceModal })));
import { 
  getStoredKycRequests, 
  getStoredNotifications, 
  markNotificationAsRead, 
  subscribeUserNotificationsFromFirestore,
  checkAndAutoVerifyPendingKyc,
  UserNotificationItem 
} from '../lib/kycSync';
import { subscribeUserDepositsFromFirestore, getStoredLocalDeposits } from '../lib/depositSync';
import { subscribeUserWithdrawalsFromFirestore, getStoredLocalWithdrawals } from '../lib/withdrawalSync';
import { getStoredMarkets, getSyncedMarketPrice, calculateForexPnl } from '../lib/marketConfig';
import { customMarketEngine } from '../lib/customMarketEngine';
import { getUserReferralLink, subscribeToReferralUpdates } from '../lib/referralSync';

interface ForexDashboardProps {
  user: FirebaseUser;
  onLogout: () => void;
  isSuperAdmin?: boolean;
  onSwitchToAdmin?: () => void;
}

export type BottomNavTab = 'home' | 'markets' | 'trade' | 'help' | 'binary' | 'wallet' | 'profile';
export type PlAnalyticsTimeframe = 'daily' | 'weekly' | 'monthly' | 'alltime';

const ACTIVE_TRADES_KEY = 'forex_pro_active_trades';
const CLOSED_TRADES_KEY = 'forex_pro_closed_trades';
const USER_BALANCES_KEY = 'forex_pro_user_balances';

export const ForexDashboard: React.FC<ForexDashboardProps> = ({ 
  user, 
  onLogout,
  isSuperAdmin,
  onSwitchToAdmin
}) => {
  // Mobile Bottom Navigation Tab
  const [activeBottomNav, setActiveBottomNav] = useState<BottomNavTab>('home');
  const [selectedTradingMarketId, setSelectedTradingMarketId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('forex_pro_selected_market_id');
      if (saved) return saved;
    } catch (_) {}
    return 'gbp_usd';
  });

  useEffect(() => {
    if (selectedTradingMarketId) {
      try {
        localStorage.setItem('forex_pro_selected_market_id', selectedTradingMarketId);
      } catch (_) {}
    }
  }, [selectedTradingMarketId]);

  // Account Type Selection: Demo, Live, Bonus (Default to bonus to match screenshot)
  const [accountType, setAccountType] = useState<AccountType>('bonus');
  const [isAccountSelectorOpen, setIsAccountSelectorOpen] = useState(false);

  // Account Balances: New accounts start with Demo $10,000.00, Live $0.00, Bonus $0.00
  const [balances, setBalances] = useState<AccountBalances>(() => {
    try {
      if (!user?.uid) {
        return { live: 0.00, bonus: 0.00, demo: 10000.00 };
      }
      const userKey = `${USER_BALANCES_KEY}_${user.uid}`;
      const stored = localStorage.getItem(userKey);
      const dedicatedDemo = localStorage.getItem(`forex_pro_demo_balance_${user.uid}`);

      let parsed: any = null;
      if (stored) {
        try { parsed = JSON.parse(stored); } catch (_) {}
      }

      let demoVal = 10000.00;
      if (parsed && typeof parsed.demo === 'number' && !isNaN(parsed.demo)) {
        demoVal = Number(parsed.demo.toFixed(2));
      } else if (dedicatedDemo && !isNaN(Number(dedicatedDemo))) {
        demoVal = Number(Number(dedicatedDemo).toFixed(2));
      }

      const liveVal = parsed && typeof parsed.live === 'number' ? parsed.live : 0.00;
      const bonusVal = parsed && typeof parsed.bonus === 'number' ? parsed.bonus : 0.00;

      return {
        live: liveVal,
        bonus: bonusVal,
        demo: demoVal
      };
    } catch (_) {
      return { live: 0.00, bonus: 0.00, demo: 10000.00 };
    }
  });

  const isInitialBalanceLoadedRef = useRef<boolean>(false);
  const lastPersistedBalancesRef = useRef<{ live: number; bonus: number; demo: number } | null>(null);
  const globalExposureControlRef = useRef<boolean>(typeof window !== 'undefined' && localStorage.getItem('forex_admin_exposure_control') === 'true');

  // Deposit Bonus Granted tracker for bonus profit calculations
  const [depositBonusGranted, setDepositBonusGranted] = useState<number>(() => {
    if (!user?.uid) return 250.00;
    try {
      const stored = localStorage.getItem(`forex_deposit_bonus_granted_${user.uid}`);
      if (stored) return Number(stored) || 250.00;
    } catch (_) {}
    return 250.00;
  });

  // Track if user has claimed the 1-time 100% welcome bonus
  const [hasClaimedBonusBefore, setHasClaimedBonusBefore] = useState<boolean>(() => {
    if (!user?.uid) return false;
    try {
      const stored = localStorage.getItem(`forex_bonus_claimed_${user.uid}`);
      if (stored === 'true') return true;
    } catch (_) {}
    return Boolean((user as any)?.hasClaimedWelcomeBonus || (user as any)?.bonusClaimed);
  });

  // Active & Closed Trades State (Strictly User-Scoped, Clean Default)
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>(() => {
    if (!user?.uid) return [];
    try {
      const stored = localStorage.getItem(`${ACTIVE_TRADES_KEY}_${user.uid}`);
      if (stored) {
        const parsed: ActiveTrade[] = JSON.parse(stored);
        return parsed.filter(t => t.userUid === user.uid && t.status === 'OPEN');
      }
    } catch (_) {}
    return [];
  });

  const [closedTrades, setClosedTrades] = useState<ActiveTrade[]>(() => {
    if (!user?.uid) return [];
    try {
      const stored = localStorage.getItem(`${CLOSED_TRADES_KEY}_${user.uid}`);
      if (stored) {
        const parsed: ActiveTrade[] = JSON.parse(stored);
        return parsed.filter(t => t.userUid === user.uid && t.status !== 'OPEN');
      }
    } catch (_) {}
    return [];
  });

  const activeTradesRef = useRef<ActiveTrade[]>(activeTrades);
  useEffect(() => {
    activeTradesRef.current = activeTrades;
  }, [activeTrades]);

  const closedTradesRef = useRef<ActiveTrade[]>(closedTrades);
  useEffect(() => {
    closedTradesRef.current = closedTrades;
  }, [closedTrades]);

  const balancesRef = useRef<AccountBalances>(balances);
  useEffect(() => {
    balancesRef.current = balances;
  }, [balances]);

  // Re-sync active/closed trades when user changes
  useEffect(() => {
    if (!user?.uid) {
      setActiveTrades([]);
      setClosedTrades([]);
      return;
    }
    try {
      const storedActive = localStorage.getItem(`${ACTIVE_TRADES_KEY}_${user.uid}`);
      if (storedActive) {
        const parsed: ActiveTrade[] = JSON.parse(storedActive);
        setActiveTrades(parsed.filter(t => t.userUid === user.uid && t.status === 'OPEN'));
      } else {
        setActiveTrades([]);
      }

      const storedClosed = localStorage.getItem(`${CLOSED_TRADES_KEY}_${user.uid}`);
      if (storedClosed) {
        const parsed: ActiveTrade[] = JSON.parse(storedClosed);
        setClosedTrades(parsed.filter(t => t.userUid === user.uid && t.status !== 'OPEN'));
      } else {
        setClosedTrades([]);
      }
    } catch (_) {
      setActiveTrades([]);
      setClosedTrades([]);
    }
  }, [user?.uid]);

  // History Modal & Sub-tab States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [dashboardHistoryTab, setDashboardHistoryTab] = useState<'forex' | 'otc'>('forex');
  const [dashboardTxFilter, setDashboardTxFilter] = useState<'all' | 'deposits' | 'withdrawals'>('all');

  // KYC & Notifications State - Permanent state loading
  const [kycStatus, setKycStatus] = useState<'unverified' | 'pending' | 'verified' | 'rejected'>(() => {
    if (!user?.uid) return 'unverified';
    try {
      const isVerified = localStorage.getItem(`forex_is_verified_${user.uid}`);
      if (isVerified === 'true') return 'verified';

      const stored = localStorage.getItem(`forex_kyc_status_${user.uid}`);
      if (stored === 'verified' || stored === 'pending' || stored === 'rejected') {
        return stored as any;
      }

      // Check if user object already has verification flag
      if ((user as any).isVerifiedUser || (user as any).kycStatus === 'verified') {
        return 'verified';
      }

      const allKyc = getStoredKycRequests();
      const myKyc = allKyc.find(r => r.userUid === user.uid);
      if (myKyc?.status === 'approved') return 'verified';
      if (myKyc?.status === 'rejected') return 'rejected';
      if (myKyc?.status === 'pending') return 'pending';
    } catch (_) {}
    return 'unverified';
  });
  const [kycReason, setKycReason] = useState<string>('');
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState<boolean>(false);
  const [userNotifications, setUserNotifications] = useState<UserNotificationItem[]>([]);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState<boolean>(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState<boolean>(false);
  const [userAvatar, setUserAvatar] = useState<string>(() => {
    if (user?.photoURL) return user.photoURL;
    if (user?.uid) {
      try {
        const stored = localStorage.getItem(`forex_user_avatar_${user.uid}`);
        if (stored) return stored;
      } catch (_) {}
    }
    return '';
  });
  
  // Referral Bonus Card & Share Modal States
  const [isShareReferralModalOpen, setIsShareReferralModalOpen] = useState<boolean>(false);
  const [isMyReferralsModalOpen, setIsMyReferralsModalOpen] = useState<boolean>(false);
  const [myReferralsCount, setMyReferralsCount] = useState<number>(0);
  const [referralLinkCopied, setReferralLinkCopied] = useState<boolean>(false);

  const userReferralId = useMemo(() => {
    return user?.uid || '';
  }, [user?.uid]);

  const userReferralLink = useMemo(() => {
    return getUserReferralLink(userReferralId);
  }, [userReferralId]);

  // Real-time subscription to user's total referrals count (cross-device & Firestore cloud synced)
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToReferralUpdates(user.uid, (summary) => {
      setMyReferralsCount(summary.totalReferrals);
    });
    return () => unsub();
  }, [user?.uid]);

  const handleCopyReferralLink = () => {
    try {
      navigator.clipboard.writeText(userReferralLink);
      setReferralLinkCopied(true);
      setTimeout(() => setReferralLinkCopied(false), 2500);
    } catch (_) {
      try {
        const input = document.createElement('input');
        input.value = userReferralLink;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
        setReferralLinkCopied(true);
        setTimeout(() => setReferralLinkCopied(false), 2500);
      } catch (_) {}
    }
  };

  // Display Name State with permanent local & Firestore sync
  const [userDisplayName, setUserDisplayName] = useState<string>(() => {
    if (user?.uid) {
      try {
        const stored = localStorage.getItem(`forex_user_display_name_${user.uid}`);
        if (stored) return stored;
      } catch (_) {}
    }
    if (user?.displayName && !user.displayName.includes('@')) {
      return user.displayName;
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Trader';
  });
  const [isEditingHeaderName, setIsEditingHeaderName] = useState(false);
  const [headerNameInput, setHeaderNameInput] = useState(userDisplayName);
  const [isSavingHeaderName, setIsSavingHeaderName] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      try {
        const stored = localStorage.getItem(`forex_user_display_name_${user.uid}`);
        if (stored) {
          setUserDisplayName(stored);
          setHeaderNameInput(stored);
          return;
        }
      } catch (_) {}
    }
    if (user?.displayName && !user.displayName.includes('@')) {
      setUserDisplayName(user.displayName);
      setHeaderNameInput(user.displayName);
    } else if (user?.email) {
      const prefix = user.email.split('@')[0];
      const cleanName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      setUserDisplayName(cleanName);
      setHeaderNameInput(cleanName);
    }
  }, [user?.uid, user?.displayName, user?.email]);

  const handleSaveHeaderName = async () => {
    const trimmed = headerNameInput.trim();
    if (!trimmed || trimmed.length < 2) return;
    setIsSavingHeaderName(true);
    try {
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: trimmed });
        } catch (_) {}
      }
      if (user?.uid) {
        try {
          const uRef = doc(db, 'users', user.uid);
          await setDoc(uRef, { displayName: trimmed, updatedAt: serverTimestamp() }, { merge: true });
        } catch (_) {}
        try {
          localStorage.setItem(`forex_user_display_name_${user.uid}`, trimmed);
        } catch (_) {}
      }
      setUserDisplayName(trimmed);
      setIsEditingHeaderName(false);

      // Immediately broadcast and sync to global leaderboard so all members see the updated name
      try {
        const liveStats = calculateUserTodayProfit(closedTrades, activeTrades, 'live');
        const bonusStats = calculateUserTodayProfit(closedTrades, activeTrades, 'bonus');
        const traderObj = {
          uid: user?.uid,
          email: user?.email,
          displayName: trimmed,
          avatar: userAvatar,
        };
        syncUserToGlobalLeaderboard(traderObj, liveStats, 'live').catch(() => {});
        syncUserToGlobalLeaderboard(traderObj, bonusStats, 'bonus').catch(() => {});
      } catch (_) {}

      try {
        fetch('/api/users/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user?.uid,
            email: user?.email,
            displayName: trimmed,
            fullName: trimmed,
            name: trimmed,
          }),
        }).catch(() => {});
      } catch (_) {}
    } catch (e) {
      console.error('Failed to save user name', e);
    } finally {
      setIsSavingHeaderName(false);
    }
  };

  // Email Verification States - Permanent state loading
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(() => {
    if (user?.emailVerified) return true;
    if (!user?.uid) return false;
    try {
      return localStorage.getItem(`forex_email_verified_${user.uid}`) === 'true';
    } catch (_) {
      return false;
    }
  });
  const [isSendingEmailVerif, setIsSendingEmailVerif] = useState<boolean>(false);
  const [emailVerifMsg, setEmailVerifMsg] = useState<string | null>(null);
  const [emailVerifError, setEmailVerifError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.emailVerified) {
      setIsEmailVerified(true);
      if (user.uid) {
        try { localStorage.setItem(`forex_email_verified_${user.uid}`, 'true'); } catch (_) {}
      }
    }
  }, [user]);

  const handleSendEmailVerification = async () => {
    if (!auth.currentUser) return;
    setIsSendingEmailVerif(true);
    setEmailVerifMsg(null);
    setEmailVerifError(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setEmailVerifMsg(`Verification email sent to ${auth.currentUser.email}. Please check your inbox or spam folder and click the link.`);
    } catch (err: any) {
      console.warn('Send verification error:', err);
      if (err.code === 'auth/too-many-requests') {
        setEmailVerifError('Verification email was sent recently. Please check your email inbox or wait a moment before trying again.');
      } else {
        setEmailVerifError(err.message || 'Failed to send email verification link. Please try again.');
      }
    } finally {
      setIsSendingEmailVerif(false);
    }
  };

  const handleCheckEmailVerifStatus = async () => {
    if (!auth.currentUser) return;
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setIsEmailVerified(true);
        if (user?.uid) {
          try { localStorage.setItem(`forex_email_verified_${user.uid}`, 'true'); } catch (_) {}
        }
        setEmailVerifMsg('🎉 Congratulations! Your email is now verified with a Blue Tick.');
        setEmailVerifError(null);
      } else {
        setEmailVerifError('Email is not verified yet. Please check your email inbox/spam folder and click the verification link first.');
      }
    } catch (err: any) {
      console.warn('Reload user error:', err);
    }
  };

  const handleInstantSelfVerifyEmail = async () => {
    setIsSendingEmailVerif(true);
    setEmailVerifMsg(null);
    setEmailVerifError(null);
    try {
      setIsEmailVerified(true);
      if (user?.uid) {
        try { localStorage.setItem(`forex_email_verified_${user.uid}`, 'true'); } catch (_) {}
      }
      setEmailVerifMsg('🎉 Your email address has been successfully self-verified!');
      
      // Update Firebase Firestore
      const userUid = auth.currentUser?.uid || user?.uid;
      if (userUid) {
        const userDocRef = doc(db, 'users', userUid);
        const isFullyVerifiedNow = kycStatus === 'verified';
        await setDoc(userDocRef, {
          emailVerified: true,
          isVerifiedUser: isFullyVerifiedNow,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err: any) {
      console.warn('Instant self email verification note:', err);
      setIsEmailVerified(true);
      if (user?.uid) {
        try { localStorage.setItem(`forex_email_verified_${user.uid}`, 'true'); } catch (_) {}
      }
      setEmailVerifMsg('🎉 Your email address has been self-verified!');
    } finally {
      setIsSendingEmailVerif(false);
    }
  };

  // Real-time KYC & User Profile Listener
  useEffect(() => {
    if (!user?.uid) return;

    const syncLocalKyc = () => {
      // First check user-scoped verified status
      try {
        const storedVerified = localStorage.getItem(`forex_kyc_status_${user.uid}`);
        if (storedVerified === 'verified') {
          setKycStatus('verified');
          return;
        }
      } catch (_) {}

      const allKyc = getStoredKycRequests();
      const myKyc = allKyc.find(r => r.userUid === user.uid);
      if (myKyc) {
        if (myKyc.status === 'approved') {
          setKycStatus('verified');
          try { localStorage.setItem(`forex_kyc_status_${user.uid}`, 'verified'); } catch (_) {}
        } else if (myKyc.status === 'rejected') {
          setKycStatus('rejected');
          setKycReason(myKyc.rejectionReason || 'Document unreadable / Invalid photos');
          try { localStorage.setItem(`forex_kyc_status_${user.uid}`, 'rejected'); } catch (_) {}
        } else {
          setKycStatus('pending');
          try { localStorage.setItem(`forex_kyc_status_${user.uid}`, 'pending'); } catch (_) {}
        }
      }
      setUserNotifications(getStoredNotifications(user.uid));
    };

    syncLocalKyc();

    // Cross-device KYC status sync from server endpoint (guarantees verification on new devices/phones)
    const fetchRemoteKyc = async () => {
      try {
        const res = await fetch(`/api/users/kyc-status/${user.uid}`);
        if (res.ok) {
          const kycData = await res.json();
          if (kycData.found && (kycData.kycStatus === 'verified' || kycData.isVerifiedUser)) {
            setKycStatus('verified');
            try {
              localStorage.setItem(`forex_kyc_status_${user.uid}`, 'verified');
              localStorage.setItem(`forex_is_verified_${user.uid}`, 'true');
            } catch (_) {}
          } else if (kycData.found && kycData.kycStatus) {
            setKycStatus(kycData.kycStatus);
            if (kycData.kycRejectionReason) setKycReason(kycData.kycRejectionReason);
            try { localStorage.setItem(`forex_kyc_status_${user.uid}`, kycData.kycStatus); } catch (_) {}
          }
        }
      } catch (_) {}
    };
    fetchRemoteKyc();

    // Check user-scoped local balances immediately on mount/user load
    try {
      const userKey = `${USER_BALANCES_KEY}_${user.uid}`;
      const stored = localStorage.getItem(userKey);
      const dedicatedDemo = localStorage.getItem(`forex_pro_demo_balance_${user.uid}`);
      let parsed: any = null;
      if (stored) {
        try { parsed = JSON.parse(stored); } catch (_) {}
      }

      let demoVal: number | undefined = undefined;
      if (parsed && typeof parsed.demo === 'number' && !isNaN(parsed.demo)) {
        demoVal = Number(parsed.demo.toFixed(2));
      } else if (dedicatedDemo && !isNaN(Number(dedicatedDemo))) {
        demoVal = Number(Number(dedicatedDemo).toFixed(2));
      }

      if (parsed || demoVal !== undefined) {
        setBalances(prev => ({
          live: parsed && typeof parsed.live === 'number' ? parsed.live : prev.live,
          bonus: parsed && typeof parsed.bonus === 'number' ? parsed.bonus : prev.bonus,
          demo: demoVal !== undefined ? demoVal : prev.demo
        }));
      }
    } catch (_) {}

    // Check for auto-verifying pending KYC requests periodically
    checkAndAutoVerifyPendingKyc();
    const autoKycInterval = setInterval(() => {
      checkAndAutoVerifyPendingKyc();
      syncLocalKyc();
    }, 15000);

    const unsubNotifs = subscribeUserNotificationsFromFirestore(user.uid, (notifs) => {
      setUserNotifications(notifs);
    });

    if (isQuotaExceeded()) {
      return () => {
        clearInterval(autoKycInterval);
        unsubNotifs();
      };
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.emailVerified === true || data.isVerifiedUser === true) {
          setIsEmailVerified(true);
          try { localStorage.setItem(`forex_email_verified_${user.uid}`, 'true'); } catch (_) {}
        }
        if (data.displayName || data.fullName || data.name) {
          const pName = (data.displayName || data.fullName || data.name || '').trim();
          if (pName && !pName.includes('@')) {
            setUserDisplayName(pName);
            setHeaderNameInput(pName);
            try {
              localStorage.setItem(`forex_user_display_name_${user.uid}`, pName);
            } catch (_) {}
          }
        }
        if (data.photoURL || data.avatarUrl) {
          const photo = data.photoURL || data.avatarUrl;
          setUserAvatar(photo);
          try {
            localStorage.setItem(`forex_user_avatar_${user.uid}`, photo);
          } catch (_) {}
        }
        if (data.kycStatus === 'verified' || data.isVerifiedUser === true) {
          setKycStatus('verified');
          try { 
            localStorage.setItem(`forex_kyc_status_${user.uid}`, 'verified'); 
            localStorage.setItem(`forex_is_verified_${user.uid}`, 'true'); 
          } catch (_) {}
        } else if (data.kycStatus) {
          setKycStatus(data.kycStatus);
          try { localStorage.setItem(`forex_kyc_status_${user.uid}`, data.kycStatus); } catch (_) {}
        }
        if (data.kycRejectionReason) {
          setKycReason(data.kycRejectionReason);
        }
        if (data.depositBonusGranted !== undefined) {
          const granted = typeof data.depositBonusGranted === 'number' ? data.depositBonusGranted : 250.00;
          setDepositBonusGranted(granted);
          try { localStorage.setItem(`forex_deposit_bonus_granted_${user.uid}`, String(granted)); } catch (_) {}
        }
        if (data.hasClaimedWelcomeBonus !== undefined || data.bonusClaimed !== undefined) {
          const claimed = Boolean(data.hasClaimedWelcomeBonus || data.bonusClaimed);
          setHasClaimedBonusBefore(claimed);
          try { localStorage.setItem(`forex_bonus_claimed_${user.uid}`, String(claimed)); } catch (_) {}
        }
        if (data.referralRevenue !== undefined) {
          const refRev = typeof data.referralRevenue === 'number' ? data.referralRevenue : 0;
          setReferralRevenue(refRev);
          try { localStorage.setItem(`forex_referral_revenue_${user.uid}`, String(refRev)); } catch (_) {}
        }
        if (data.liveBalance !== undefined || data.bonusBalance !== undefined || data.demoBalance !== undefined || data.balances?.live !== undefined) {
          setBalances(prev => {
            const rawLive = typeof data.liveBalance === 'number' ? data.liveBalance : (typeof data.balances?.live === 'number' ? data.balances.live : undefined);
            const rawBonus = typeof data.bonusBalance === 'number' ? data.bonusBalance : (typeof data.balances?.bonus === 'number' ? data.balances.bonus : undefined);
            
            // Authoritative balance sync: Demo balance behaves exactly like Live and Bonus balance
            const firestoreDemo = typeof data.demoBalance === 'number' 
              ? data.demoBalance 
              : (typeof data.balances?.demo === 'number' ? data.balances.demo : undefined);
            
            const localDedicatedDemoStr = localStorage.getItem(`forex_pro_demo_balance_${user.uid}`);
            const localDedicatedDemo = localDedicatedDemoStr && !isNaN(Number(localDedicatedDemoStr)) ? Number(localDedicatedDemoStr) : null;
            
            // Safeguard: Never overwrite existing positive balance with 0 from an empty or defaulting snapshot
            const live = rawLive !== undefined ? (prev.live > 0 && rawLive === 0 ? prev.live : rawLive) : prev.live;
            const bonus = rawBonus !== undefined ? (prev.bonus > 0 && rawBonus === 0 ? prev.bonus : rawBonus) : prev.bonus;

            let demo = prev.demo;
            if (firestoreDemo !== undefined) {
              demo = firestoreDemo;
            } else if (localDedicatedDemo !== null) {
              demo = localDedicatedDemo;
            }

            if (prev.live === live && prev.bonus === bonus && prev.demo === demo) {
              return prev;
            }
            lastPersistedBalancesRef.current = { live, bonus, demo };
            try {
              const balancesObj = { live, bonus, demo };
              localStorage.setItem(`${USER_BALANCES_KEY}_${user.uid}`, JSON.stringify(balancesObj));
              localStorage.setItem(`forex_pro_demo_balance_${user.uid}`, String(demo));
            } catch (_) {}
            return {
              live,
              bonus,
              demo
            };
          });
          isInitialBalanceLoadedRef.current = true;
        } else {
          isInitialBalanceLoadedRef.current = true;
        }
      }
    }, (err) => {
      if (!isQuotaError(err)) {
        console.warn('Firestore user profile snapshot note:', err);
      }
    });

    // Multi-device fallback balance & KYC polling (every 3.5s) to guarantee phone <-> desktop sync
    const userPollTimer = setInterval(async () => {
      if (!user?.uid) return;
      try {
        const emailParam = encodeURIComponent(user.email || '');
        const res = await fetch(`/api/users/sync-balances/${user.uid}?email=${emailParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.balances) {
            setBalances(prev => {
              const bLive = typeof data.balances.live === 'number' ? data.balances.live : prev.live;
              const bBonus = typeof data.balances.bonus === 'number' ? data.balances.bonus : prev.bonus;
              const bDemo = typeof data.balances.demo === 'number' ? data.balances.demo : prev.demo;

              // Safeguard: Never wipe positive balance to 0 on poll
              const live = prev.live > 0 && bLive === 0 ? prev.live : bLive;
              const bonus = prev.bonus > 0 && bBonus === 0 ? prev.bonus : bBonus;
              const demo = bDemo;

              if (prev.live === live && prev.bonus === bonus && prev.demo === demo) return prev;
              return { live, bonus, demo };
            });
          }
        }
      } catch (_) {}

      // Cross-device KYC poll (checks if approved on another device)
      try {
        const kycRes = await fetch(`/api/users/kyc-status/${user.uid}`);
        if (kycRes.ok) {
          const kycData = await kycRes.json();
          if (kycData.found && (kycData.kycStatus === 'verified' || kycData.isVerifiedUser)) {
            setKycStatus('verified');
            try {
              localStorage.setItem(`forex_kyc_status_${user.uid}`, 'verified');
              localStorage.setItem(`forex_is_verified_${user.uid}`, 'true');
            } catch (_) {}
          }
        }
      } catch (_) {}

      // Cross-device OTC 5s Counter Loss state sync from central server
      try {
        const expRes = await fetch('/api/otc/admin-mode');
        if (expRes.ok) {
          const expData = await expRes.json();
          if (typeof expData.exposureControlEnabled === 'boolean') {
            globalExposureControlRef.current = expData.exposureControlEnabled;
            try {
              localStorage.setItem('forex_admin_exposure_control', String(expData.exposureControlEnabled));
            } catch (_) {}
          }
        }
      } catch (_) {}
    }, 1500);

    const handleFocusSync = async () => {
      if (!user?.uid) return;
      try {
        const emailParam = encodeURIComponent(user.email || '');
        const res = await fetch(`/api/users/sync-balances/${user.uid}?email=${emailParam}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found && data.balances) {
            setBalances(prev => {
              const bLive = typeof data.balances.live === 'number' ? data.balances.live : prev.live;
              const bBonus = typeof data.balances.bonus === 'number' ? data.balances.bonus : prev.bonus;
              const bDemo = typeof data.balances.demo === 'number' ? data.balances.demo : prev.demo;

              const live = prev.live > 0 && bLive === 0 ? prev.live : bLive;
              const bonus = prev.bonus > 0 && bBonus === 0 ? prev.bonus : bBonus;
              const demo = bDemo;

              if (prev.live === live && prev.bonus === bonus && prev.demo === demo) return prev;
              return { live, bonus, demo };
            });
          }
        }
      } catch (_) {}

      try {
        const kycRes = await fetch(`/api/users/kyc-status/${user.uid}`);
        if (kycRes.ok) {
          const kycData = await kycRes.json();
          if (kycData.found && (kycData.kycStatus === 'verified' || kycData.isVerifiedUser)) {
            setKycStatus('verified');
            try {
              localStorage.setItem(`forex_kyc_status_${user.uid}`, 'verified');
              localStorage.setItem(`forex_is_verified_${user.uid}`, 'true');
            } catch (_) {}
          }
        }
      } catch (_) {}
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusSync);
    }

    return () => {
      clearInterval(autoKycInterval);
      clearInterval(userPollTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocusSync);
      }
      unsubNotifs();
      unsubscribe();
    };
  }, [user?.uid]);

  // Save to LocalStorage on update (Strictly User-Scoped)
  useEffect(() => {
    if (!user?.uid) return;
    try {
      localStorage.setItem(`${USER_BALANCES_KEY}_${user.uid}`, JSON.stringify(balances));
      localStorage.setItem(`forex_pro_demo_balance_${user.uid}`, String(balances.demo));
    } catch (_) {}
  }, [balances, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    try {
      localStorage.setItem(`${ACTIVE_TRADES_KEY}_${user.uid}`, JSON.stringify(activeTrades));
    } catch (_) {}
  }, [activeTrades, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    try {
      localStorage.setItem(`${CLOSED_TRADES_KEY}_${user.uid}`, JSON.stringify(closedTrades));
      registerSettledTradeIds(closedTrades.map(t => t.id));
    } catch (_) {}

    // Rank recalculation automatically happens after trade close
    try {
      const liveStats = calculateUserTodayProfit(closedTrades, activeTrades, 'live');
      const bonusStats = calculateUserTodayProfit(closedTrades, activeTrades, 'bonus');
      const traderObj = {
        uid: user.uid,
        email: user.email,
        displayName: userDisplayName || user.displayName,
        avatar: userAvatar,
      };
      syncUserToGlobalLeaderboard(traderObj, liveStats, 'live').catch(() => {});
      syncUserToGlobalLeaderboard(traderObj, bonusStats, 'bonus').catch(() => {});
    } catch (_) {}
  }, [closedTrades, activeTrades, user, userDisplayName, userAvatar]);

  // Global Background Engine: Binary OTC Trades Timer & Automatic Expiry Settlement
  useEffect(() => {
    // If active view is 'trade' or 'binary', TradingTerminalView handles precise tick-driven binary OTC timers and settlements
    if (activeBottomNav === 'trade' || activeBottomNav === 'binary') return;

    const interval = setInterval(() => {
      const currentActive = activeTradesRef.current || [];
      if (currentActive.length === 0) return;

      const hasOpenOtc = currentActive.some(
        t => (t.tradingMode === 'otc' || t.category === 'binary') && t.status === 'OPEN'
      );
      if (!hasOpenOtc) return;

      const now = Date.now();
      const balanceDeltas: { live: number; bonus: number; demo: number } = { live: 0, bonus: 0, demo: 0 };
      let balanceHasChanged = false;
      const newlyResolved: ActiveTrade[] = [];
      const nextActive: ActiveTrade[] = [];

      currentActive.forEach(trade => {
        // Immediately drop any trade that is already settled in mutex registry
        if (isTradeSettled(trade.id)) {
          return;
        }

        if ((trade.tradingMode === 'otc' || trade.category === 'binary') && trade.status === 'OPEN') {
          const openMs = trade.openTimestamp || (trade.timestamp ? safeGetTime(trade.timestamp, now) : now);
          const expMs = trade.expiryTimestamp || (openMs + (trade.expirySeconds || 60) * 1000);
          const remSec = Math.max(0, Math.ceil((expMs - now) / 1000));

          if (now >= expMs || remSec <= 0) {
            // Trade expired! Resolve it with atomic lock & exact one-time payout
            let closePrice = trade.currentPrice || trade.entryPrice;
            const is5sLossOn = globalExposureControlRef.current || (typeof window !== 'undefined' && localStorage.getItem('forex_admin_exposure_control') === 'true');
            const ADMIN_EMAILS = ['naymulh1000@gmail.com', 'admin@fxby24.com', 'admin@forextradepro.com'];
            const isAdminAccount = Boolean(
              isSuperAdmin ||
              (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim())) ||
              (trade.userEmail && ADMIN_EMAILS.includes(trade.userEmail.toLowerCase().trim()))
            );

            if (is5sLossOn && !isAdminAccount) {
              const precision = trade.precision || 5;
              const minPip = Math.pow(10, -precision) * 8 || 0.00008;
              const isUp = trade.type === 'UP' || trade.type === 'BUY' || trade.type === 'CALL';
              const isDown = trade.type === 'DOWN' || trade.type === 'SELL' || trade.type === 'PUT';
              if (isUp) {
                closePrice = Number(Math.min(closePrice, trade.entryPrice - minPip).toFixed(precision));
              } else if (isDown) {
                closePrice = Number(Math.max(closePrice, trade.entryPrice + minPip).toFixed(precision));
              }
            }

            const result = resolveBinaryTrade(trade, closePrice, now);

            if (result) {
              const acc = (trade.accountType || 'live') as 'live' | 'bonus' | 'demo';
              if (result.returnPayout > 0) {
                balanceDeltas[acc] = (balanceDeltas[acc] || 0) + result.returnPayout;
                balanceHasChanged = true;
              }
              newlyResolved.push(result.resolvedTrade);
            }
          } else {
            // Update remaining time dynamically
            nextActive.push({
              ...trade,
              openTimestamp: openMs,
              expiryTimestamp: expMs,
              remainingSeconds: remSec
            });
          }
        } else {
          nextActive.push(trade);
        }
      });

      activeTradesRef.current = nextActive;
      setActiveTrades(nextActive);

      if (newlyResolved.length > 0) {
        registerSettledTradeIds(newlyResolved.map(r => r.id));
        const baseClosed = closedTradesRef.current || [];
        const resolvedIds = new Set(newlyResolved.map(r => r.id));
        const updatedClosed = [...newlyResolved, ...baseClosed.filter(c => !resolvedIds.has(c.id))];

        closedTradesRef.current = updatedClosed;
        setClosedTrades(updatedClosed);

        if (user?.uid) {
          try {
            localStorage.setItem(`${CLOSED_TRADES_KEY}_${user.uid}`, JSON.stringify(updatedClosed));
          } catch (_) {}
        }
        saveTradesBatchToFirestore(newlyResolved, user?.uid, user?.email);

        if (balanceHasChanged) {
          const curBal = balancesRef.current || balances;
          const updated = {
            live: Number((curBal.live + (balanceDeltas.live || 0)).toFixed(2)),
            bonus: Number((curBal.bonus + (balanceDeltas.bonus || 0)).toFixed(2)),
            demo: Number((curBal.demo + (balanceDeltas.demo || 0)).toFixed(2))
          };
          balancesRef.current = updated;
          setBalances(updated);

          if (user?.uid) {
            saveUserBalancesToFirestore(user.uid, updated, user?.email);
            try {
              localStorage.setItem(`${USER_BALANCES_KEY}_${user.uid}`, JSON.stringify(updated));
            } catch (_) {}
          }
          try {
            localStorage.setItem(USER_BALANCES_KEY, JSON.stringify(updated));
          } catch (_) {}
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeBottomNav, user?.uid, user?.email]);

  // Stop-Out Guard: If Live, Bonus, or Demo balance <= 0 (or floating loss wipes out equity <= 0), automatically close all open positions for that account
  useEffect(() => {
    (['live', 'bonus', 'demo'] as const).forEach(acc => {
      const accBal = balances[acc] ?? 0;
      const openTradesOfAcc = activeTrades.filter(
        t => (t.accountType === acc || (!t.accountType && acc === 'live')) && t.status === 'OPEN'
      );
      if (openTradesOfAcc.length === 0) return;

      let accFloatingPnl = 0;
      const marketsList = getStoredMarkets();
      const now = Date.now();
      openTradesOfAcc.forEach(t => {
        if (t.tradingMode === 'forex' || t.category === 'forex' || !t.tradingMode) {
          const m = marketsList.find(item => item.symbol === t.symbol || item.id === t.symbol.toLowerCase().replace('/', '_')) || marketsList[0];
          const tPrice = customMarketEngine.getCurrentPrice(t.symbol) || getSyncedMarketPrice(m, now) || t.currentPrice || t.entryPrice;
          accFloatingPnl += calculateForexPnl(t, tPrice);
        }
      });

      const equity = accBal + accFloatingPnl;
      // Stop-Out Guard: Only liquidate if position is experiencing net loss AND total equity <= 0
      // NEVER close open trades that are profitable (accFloatingPnl >= 0) or while balance is still loading
      if (isInitialBalanceLoadedRef.current && accFloatingPnl < 0 && equity <= 0) {
        const newlyResolved: ActiveTrade[] = [];
        let balanceDelta = 0;

        openTradesOfAcc.forEach(t => {
          if (isTradeSettled(t.id)) return;
          const closePrice = t.currentPrice || t.entryPrice;
          if (t.tradingMode === 'otc' || t.category === 'binary') {
            const res = resolveBinaryTrade(t, closePrice, now);
            if (res) {
              newlyResolved.push(res.resolvedTrade);
              balanceDelta += res.returnPayout;
            }
          } else {
            const fxRes = resolveForexTrade(t, closePrice, now);
            if (fxRes) {
              newlyResolved.push(fxRes.resolvedTrade);
              balanceDelta += fxRes.realizedPnl;
            }
          }
        });

        if (newlyResolved.length > 0) {
          const resolvedIds = new Set(newlyResolved.map(r => r.id));
          setActiveTrades(prev => prev.filter(t => !resolvedIds.has(t.id)));
          setClosedTrades(prev => [...newlyResolved, ...prev.filter(c => !resolvedIds.has(c.id))]);
          registerSettledTradeIds(newlyResolved.map(r => r.id));
          saveTradesBatchToFirestore(newlyResolved, user?.uid, user?.email);

          if (balanceDelta !== 0) {
            setBalances(prev => {
              const updated = {
                ...prev,
                [acc]: Number(Math.max(0, (prev[acc] ?? 0) + balanceDelta).toFixed(2))
              };
              if (user?.uid) {
                saveUserBalancesToFirestore(user.uid, updated, user?.email);
                try {
                  localStorage.setItem(`${USER_BALANCES_KEY}_${user.uid}`, JSON.stringify(updated));
                  if (acc === 'demo') {
                    localStorage.setItem(`forex_pro_demo_balance_${user.uid}`, String(updated.demo));
                  }
                } catch (_) {}
              }
              try {
                localStorage.setItem(USER_BALANCES_KEY, JSON.stringify(updated));
                if (acc === 'demo') {
                  localStorage.setItem('forex_pro_demo_balance', String(updated.demo));
                }
              } catch (_) {}
              return updated;
            });
          }
        }
      }
    });
  }, [balances.live, balances.bonus, balances.demo, activeTrades, user]);

  // Firestore Sync: Persist updated balances to user profile after client trading actions
  useEffect(() => {
    if (!user?.uid || isQuotaExceeded() || !isInitialBalanceLoadedRef.current) return;

    // Skip if balances are identical to what was last persisted or loaded from Firestore
    if (
      lastPersistedBalancesRef.current &&
      lastPersistedBalancesRef.current.live === balances.live &&
      lastPersistedBalancesRef.current.bonus === balances.bonus &&
      lastPersistedBalancesRef.current.demo === balances.demo
    ) {
      return;
    }

    lastPersistedBalancesRef.current = { ...balances };

    try {
      const nowMs = Date.now();
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, {
        liveBalance: Number(balances.live.toFixed(2)),
        bonusBalance: Number(balances.bonus.toFixed(2)),
        demoBalance: Number(balances.demo.toFixed(2)),
        balances: {
          live: Number(balances.live.toFixed(2)),
          bonus: Number(balances.bonus.toFixed(2)),
          demo: Number(balances.demo.toFixed(2))
        },
        demoBalanceUpdatedAt: nowMs,
        balancesUpdatedAt: nowMs,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(err => {
        if (!isQuotaError(err)) console.warn('Firestore setDoc balance error:', err);
      });

      try {
        const serialized = JSON.stringify(balances);
        localStorage.setItem(`${USER_BALANCES_KEY}_${user.uid}`, serialized);
        localStorage.setItem(USER_BALANCES_KEY, serialized);
        localStorage.setItem(`forex_pro_demo_balance_${user.uid}`, String(balances.demo));
        localStorage.setItem('forex_pro_demo_balance', String(balances.demo));
      } catch (_) {}
    } catch (e) {
      if (!isQuotaError(e)) console.warn('Firestore setDoc balance outer error:', e);
    }
  }, [balances.live, balances.bonus, balances.demo, user?.uid]);

  // Firestore Sync: Real-time multi-device sync for user trades (Web, Android, Tablet, Desktop)
  useEffect(() => {
    if (!user?.uid && !user?.email) return;

    const unsubscribe = subscribeUserTradesFromFirestore(
      user?.uid || '',
      user?.email || undefined,
      (liveActive, liveClosed) => {
        if (liveClosed.length > 0) {
          registerSettledTradeIds(liveClosed.map(t => t.id));
          setClosedTrades(prev => {
            const prevIds = new Set(prev.map(t => t.id));
            const hasNew = liveClosed.some(t => !prevIds.has(t.id));
            if (!hasNew && liveClosed.length <= prev.length) {
              return prev;
            }
            const combined = [...liveClosed, ...prev];
            const seen = new Set<string>();
            return combined.filter(t => {
              if (!t.id || seen.has(t.id)) return false;
              seen.add(t.id);
              return true;
            });
          });
        }

        if (liveActive.length > 0 || liveClosed.length > 0) {
          setActiveTrades(prev => {
            const closedIds = new Set(liveClosed.map(c => c.id));
            const validLoadedActive = liveActive.filter(t => !closedIds.has(t.id) && t.status === 'OPEN' && !isTradeSettled(t.id));
            const combined = [...validLoadedActive, ...prev.filter(a => !closedIds.has(a.id) && a.status === 'OPEN' && !isTradeSettled(a.id))];
            const seen = new Set<string>();
            const result = combined.filter(t => {
              if (!t.id || seen.has(t.id) || closedIds.has(t.id) || isTradeSettled(t.id)) return false;
              seen.add(t.id);
              return true;
            });
            if (result.length === prev.length && result.every((t, i) => t.id === prev[i]?.id && t.status === prev[i]?.status && t.pnl === prev[i]?.pnl)) {
              return prev;
            }
            return result;
          });
        }
      }
    );

    // Initial and periodic cross-device fetch from central server store
    const syncTradesFromServer = async () => {
      if (!user?.uid) return;
      try {
        const res = await fetch(`/api/users/trades/${encodeURIComponent(user.uid)}?email=${encodeURIComponent(user.email || '')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.closed && data.closed.length > 0) {
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
                const activeIds = new Set(prev.map(t => t.id));
                const missing = data.active.filter((t: any) => 
                  !activeIds.has(t.id) && 
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

    syncTradesFromServer();
    const tradePollTimer = setInterval(syncTradesFromServer, 4000);

    return () => {
      unsubscribe();
      clearInterval(tradePollTimer);
    };
  }, [user?.uid, user?.email]);

  // Permanent Guard: Ensure closed trades can NEVER exist in activeTrades
  useEffect(() => {
    if (closedTrades.length > 0) {
      const closedIds = new Set(closedTrades.map(c => c.id));
      setActiveTrades(prev => {
        const hasClosedInActive = prev.some(t => closedIds.has(t.id) || t.status !== 'OPEN');
        if (!hasClosedInActive) return prev;
        return prev.filter(t => !closedIds.has(t.id) && t.status === 'OPEN');
      });
    }
  }, [closedTrades]);

  // Automatic Clock / 8:00 AM Trading Day Rollover Engine: re-evaluates daily cycle continuously
  const [currentDateReference, setCurrentDateReference] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateReference(new Date());
    }, 1000); // Ticks every 1 second to catch 8:00 AM rollover instantly without page reload
    return () => clearInterval(timer);
  }, []);

  // Real-Time Account Metrics Engine (Pure calculations derived directly from trade history & 8:00 AM cycle)
  const getAccountMetrics = useCallback((acc: AccountType) => {
    return calculateAccountMetricsEngine(acc, balances, activeTrades, closedTrades, currentDateReference, 8);
  }, [activeTrades, closedTrades, balances, currentDateReference]);

  const liveMetrics = getAccountMetrics('live');
  const bonusMetrics = getAccountMetrics('bonus');
  const demoMetrics = getAccountMetrics('demo');

  const currentMetrics = accountType === 'live' ? liveMetrics : accountType === 'bonus' ? bonusMetrics : demoMetrics;
  const accountActiveTrades = useMemo(() => activeTrades.filter(t => (t.accountType === accountType || (!t.accountType && accountType === 'live')) && t.status === 'OPEN'), [activeTrades, accountType]);
  const accountClosedTrades = useMemo(() => closedTrades.filter(t => (t.accountType === accountType || (!t.accountType && accountType === 'live')) && t.status !== 'OPEN'), [closedTrades, accountType]);

  // Balance & Equity & Margin metrics derived from active account type
  const currentBalance = currentMetrics.balance;
  const floatingPnl = currentMetrics.floatingPnl;
  const equity = currentMetrics.netAssets;
  const usedMargin = currentMetrics.usedMargin;
  const freeMargin = currentMetrics.freeMargin;

  // Today's Profit & Loss for active account type (Auto-resets to 0 on new local day 00:00)
  const todayProfit = currentMetrics.todayProfit;
  const todayLoss = currentMetrics.todayLoss;
  const netTodayPnl = currentMetrics.netTodayPnl;

  // Real-Time Price & Floating P/L Ticker Engine for Open Positions (MT5 Professional Engine)
  useEffect(() => {
    const hasOpenTrades = activeTrades.some(t => t.status === 'OPEN');
    if (!hasOpenTrades) return;

    // If active view is 'trade' or 'binary', TradingTerminalView handles precise sub-second ticker updates directly
    if (activeBottomNav === 'trade' || activeBottomNav === 'binary') return;

    const interval = setInterval(() => {
      const marketsList = getStoredMarkets();
      const now = Date.now();

      setActiveTrades(prev => {
        if (prev.length === 0) return prev;
        let changed = false;

        const updated = prev.map(trade => {
          if (trade.status !== 'OPEN') return trade;

          const tradeAcc = trade.accountType || 'live';
          if ((balances[tradeAcc] ?? 0) <= 0) {
            return trade; // Freeze floating P/L immediately when balance is $0.00
          }

          const market = marketsList.find(m => m.symbol === trade.symbol || m.id === trade.symbol.toLowerCase().replace('/', '_')) || marketsList[0];
          const latestPrice = customMarketEngine.getCurrentPrice(trade.symbol) || getSyncedMarketPrice(market, now);

          if (trade.tradingMode === 'forex' || trade.category === 'forex' || !trade.tradingMode) {
            const livePnl = calculateForexPnl(trade, latestPrice);

            if (trade.pnl !== livePnl || Math.abs((trade.currentPrice || 0) - latestPrice) > 0.000001) {
              changed = true;
              return { ...trade, currentPrice: latestPrice, pnl: livePnl };
            }
          } else if (trade.tradingMode === 'otc' || trade.category === 'binary') {
            const isWinning = (trade.type === 'UP' && latestPrice > trade.entryPrice) || (trade.type === 'DOWN' && latestPrice < trade.entryPrice);
            const estProfit = isWinning ? trade.amount * ((trade.payoutPercent || 90) / 100) : -trade.amount;
            if (trade.pnl !== estProfit || Math.abs((trade.currentPrice || 0) - latestPrice) > 0.000001) {
              changed = true;
              return { ...trade, currentPrice: latestPrice, pnl: estProfit };
            }
          }
          return trade;
        });

        return changed ? updated : prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [activeTrades.length, activeBottomNav]);

  // Dynamic P/L Performance Analytics with Multi-Timeframe Filtering (Daily, Weekly, Monthly, All-Time)
  const [plTimeframe, setPlTimeframe] = useState<PlAnalyticsTimeframe>('daily');

  const activeTimeframeMetrics = useMemo(() => {
    if (plTimeframe === 'daily') return currentMetrics.today;
    if (plTimeframe === 'weekly') return currentMetrics.weekly;
    if (plTimeframe === 'monthly') return currentMetrics.monthly;
    return currentMetrics.allTime;
  }, [plTimeframe, currentMetrics]);

  const totalTrades = activeTimeframeMetrics.totalTrades;
  const winCount = activeTimeframeMetrics.winTradesCount;
  const winRate = activeTimeframeMetrics.winRate;
  const netReturnPnl = activeTimeframeMetrics.netPnl;
  const totalWinAmount = activeTimeframeMetrics.totalProfit;
  const totalLossAmount = activeTimeframeMetrics.totalLoss;
  const avgWin = winCount > 0 ? Number((totalWinAmount / winCount).toFixed(2)) : 0;
  const maxDrawdown = 0.0;

  // Copy UID State
  const [copiedUid, setCopiedUid] = useState(false);

  // Referral Revenue State (Dynamic from Firestore)
  const [referralRevenue, setReferralRevenue] = useState<number>(() => {
    if (!user?.uid) return 0;
    try {
      const raw = localStorage.getItem(`forex_referral_revenue_${user.uid}`);
      return raw ? parseFloat(raw) || 0 : 0;
    } catch (_) {
      return 0;
    }
  });

  // Wallet Section History Tab ('deposits' | 'withdrawals')
  const [walletHistoryTab, setWalletHistoryTab] = useState<'deposits' | 'withdrawals'>('withdrawals');

  // Transactions State: User-scoped and synced from real Firestore deposits & withdrawals
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    if (!user?.uid) return [];
    try {
      const stored = localStorage.getItem(`forex_transactions_${user.uid}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (_) {}
    return [];
  });

  // Real-time Firestore & Backend Listener for User's Deposits & Withdrawals
  useEffect(() => {
    if (!user?.uid && !user?.email) return;

    // Pre-populate with existing transactions split by type so neither gets wiped on first emit
    let userDeposits: TransactionRecord[] = [];
    let userWithdrawals: TransactionRecord[] = [];
    try {
      const stored = localStorage.getItem(`forex_transactions_${user.uid}`);
      if (stored) {
        const parsed: TransactionRecord[] = JSON.parse(stored);
        userDeposits = parsed.filter(t => t.type === 'Deposit');
        userWithdrawals = parsed.filter(t => t.type === 'Withdrawal');
      }
    } catch (_) {}

    const mergeRecords = (base: TransactionRecord[], incoming: TransactionRecord[]): TransactionRecord[] => {
      if (!incoming || incoming.length === 0) return base;
      const map = new Map<string, TransactionRecord>();
      base.forEach(item => {
        const k = (item.id || item.trxId || '').trim();
        if (k) map.set(k, item);
      });
      incoming.forEach(item => {
        const k = (item.id || item.trxId || '').trim();
        if (k) {
          const prev = map.get(k);
          map.set(k, prev ? { ...prev, ...item } : item);
        }
      });
      return Array.from(map.values());
    };

    const updateCombined = () => {
      const merged = [...userDeposits, ...userWithdrawals].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return timeB - timeA;
      });

      const seenIds = new Set<string>();
      const deduped: TransactionRecord[] = [];

      for (const t of merged) {
        const idKey = (t.id || t.trxId || '').trim();
        if (idKey && seenIds.has(idKey)) continue;
        if (idKey) seenIds.add(idKey);
        deduped.push(t);
      }

      setTransactions(deduped);
      if (user?.uid) {
        try {
          localStorage.setItem(`forex_transactions_${user.uid}`, JSON.stringify(deduped));
        } catch (_) {}
      }
    };

    // Initial load and periodic refresh from persistent backend endpoint
    const fetchTransactions = () => {
      fetch(`/api/user-transactions?userUid=${encodeURIComponent(user.uid)}&userEmail=${encodeURIComponent(user.email || '')}`)
        .then(res => res.json())
        .then(data => {
          if (data.transactions && Array.isArray(data.transactions)) {
            const deps = data.transactions.filter((t: any) => t.type === 'Deposit');
            const wds = data.transactions.filter((t: any) => t.type === 'Withdrawal');
            if (deps.length > 0) userDeposits = mergeRecords(userDeposits, deps);
            if (wds.length > 0) userWithdrawals = mergeRecords(userWithdrawals, wds);
            updateCombined();
          }
        })
        .catch(() => {});
    };

    fetchTransactions();
    const txPollTimer = setInterval(fetchTransactions, 5000);

    const unsubDeposits = subscribeUserDepositsFromFirestore(user?.uid || '', user?.email || undefined, (deps) => {
      if (deps && deps.length > 0) {
        userDeposits = mergeRecords(userDeposits, deps);
        updateCombined();
      }
    });

    const unsubWithdrawals = subscribeUserWithdrawalsFromFirestore(user?.uid || '', user?.email || undefined, (wds) => {
      if (wds && wds.length > 0) {
        userWithdrawals = mergeRecords(userWithdrawals, wds);
        updateCombined();
      }
    });

    return () => {
      clearInterval(txPollTimer);
      unsubDeposits();
      unsubWithdrawals();
    };
  }, [user?.uid, user?.email]);

  // Modals Visibility Controls
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isEditDemoModalOpen, setIsEditDemoModalOpen] = useState(false);

  const handleSaveDemoBalance = (newAmount: number) => {
    const fixedVal = Number(newAmount.toFixed(2));
    const nextBalances = {
      live: balances.live,
      bonus: balances.bonus,
      demo: fixedVal
    };
    lastPersistedBalancesRef.current = { ...nextBalances };
    setBalances(nextBalances);
    if (user?.uid) {
      saveUserBalancesToFirestore(user.uid, nextBalances, user?.email, true);
      try {
        localStorage.setItem(`${USER_BALANCES_KEY}_${user.uid}`, JSON.stringify(nextBalances));
        localStorage.setItem(`forex_pro_demo_balance_${user.uid}`, String(fixedVal));
        localStorage.setItem(`forex_pro_demo_custom_set_${user.uid}`, 'true');
      } catch (_) {}
    }
  };

  const handleExecuteTrade = (newTrade: Omit<TradePosition, 'id' | 'pnl' | 'timestamp' | 'status'>) => {
    if (newTrade.category === 'binary' || newTrade.tradingMode === 'otc') {
      setActiveBottomNav('binary');
    } else {
      setActiveBottomNav('trade');
    }
    setIsTradeModalOpen(false);
  };

  // Display 6-digit User ID (backend Firebase Auth UID stays safe)
  const displayId = getDisplayUserId(user?.uid);
  const userUid = `ID: ${displayId}`;

  const handleCopyUid = () => {
    navigator.clipboard.writeText(displayId);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  // Handle Deposit Success
  const handleDepositSuccess = (acc: AccountType, amount: number, method: string) => {
    setBalances(prev => ({ ...prev, [acc]: prev[acc] + amount }));
    const newTx: TransactionRecord = {
      id: 'TX-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      accountType: acc,
      type: 'Deposit',
      method,
      amount,
      status: 'Completed',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setTransactions(prev => [newTx, ...prev.filter(t => t.id !== newTx.id)]);
  };

  // Handle Withdrawal Success
  const handleWithdrawalSuccess = (acc: AccountType, amount: number, method: string) => {
    setBalances(prev => ({ ...prev, [acc]: Math.max(0, prev[acc] - amount) }));
    const newTx: TransactionRecord = {
      id: 'TX-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      accountType: acc,
      type: 'Withdrawal',
      method,
      amount,
      status: 'Completed',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setTransactions(prev => [newTx, ...prev.filter(t => t.id !== newTx.id)]);
  };

  return (
    <div className="min-h-screen w-full bg-[#06080E] text-white flex flex-col lg:flex-row font-sans pb-20 lg:pb-0 selection:bg-[#F5B301] selection:text-black">
      
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeBottomNav === 'home' ? 'dashboard' : activeBottomNav === 'markets' ? 'markets' : activeBottomNav === 'wallet' ? 'wallet' : activeBottomNav === 'trade' ? 'trade' : activeBottomNav === 'binary' ? 'binary' : 'profile'}
        setActiveTab={(tab) => {
          if (tab === 'dashboard') setActiveBottomNav('home');
          else if (tab === 'markets') setActiveBottomNav('markets');
          else if (tab === 'wallet') setActiveBottomNav('wallet');
          else if (tab === 'trade') setActiveBottomNav('trade');
          else if (tab === 'binary') setActiveBottomNav('binary');
          else if (tab === 'profile') setActiveBottomNav('profile');
          else if (tab === 'transactions') setActiveBottomNav('home');
        }}
        onOpenTradeModal={() => setActiveBottomNav('trade')}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onLogout={onLogout}
        isSuperAdmin={isSuperAdmin}
        onSwitchToAdmin={onSwitchToAdmin}
        isEmailVerified={isEmailVerified}
        kycStatus={kycStatus}
        userDisplayUid={displayId}
      />

      {/* Main Responsive Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Top Mobile Bar - Hidden on Trade terminal views */}
        {activeBottomNav !== 'trade' && activeBottomNav !== 'binary' && (
          <header className="px-4 py-3 bg-[#0A0E1A] border-b border-white/10 sticky top-0 z-30 flex items-center justify-between">
            <BrandLogo size="sm" subtext="TERMINAL ACTIVE" />

            <div className="flex items-center gap-2">
              {isSuperAdmin && onSwitchToAdmin && (
                <button
                  type="button"
                  onClick={onSwitchToAdmin}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  <ShieldAlert className="w-4 h-4 text-[#F5B301]" />
                  <span className="hidden sm:inline">Admin Portal</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              )}

              <button
                onClick={() => setIsNotifModalOpen(true)}
                className="p-2 rounded-xl bg-gray-900 border border-white/10 text-gray-300 hover:text-white relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-amber-400" />
                {userNotifications.some(n => !n.read) && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
                )}
                {userNotifications.some(n => !n.read) && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-1 right-1" />
                )}
              </button>
              <button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="p-2 rounded-xl bg-gray-900 border border-white/10 text-gray-300 hover:text-white"
              >
                <MessageSquare className="w-4 h-4 text-[#F5B301]" />
              </button>
            </div>
          </header>
        )}

        {/* Optional Email Verification Banner */}
        {activeBottomNav !== 'trade' && activeBottomNav !== 'binary' && user.email && !user.emailVerified && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-amber-500/10 border border-[#F5B301]/30 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#F5B301] shrink-0" />
              <span>Email verification pending for <strong>{user.email}</strong>.</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await sendEmailVerification(user);
                  alert(`Verification link sent to ${user.email}!`);
                } catch (e) {
                  alert('Verification link sent. Please check your inbox.');
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-[#F5B301] text-gray-950 font-black text-[10px] shrink-0 hover:brightness-110 transition-all cursor-pointer"
            >
              Resend Link
            </button>
          </div>
        )}

        {/* Dynamic Content Views */}
        <main className={`space-y-5 mx-auto w-full ${
          activeBottomNav === 'trade' || activeBottomNav === 'binary'
            ? 'p-2 sm:p-3 max-w-7xl'
            : 'p-4 sm:p-5 lg:p-6 max-w-5xl'
        }`}>

          {/* HOME TAB / MAIN DASHBOARD */}
          {activeBottomNav === 'home' && (
            <>
              {/* 1. TOP USER PROFILE HEADER CARD (Matching Screenshot) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B101D] border border-white/10 shadow-xl flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 font-medium">Welcome</p>
                  {isEditingHeaderName ? (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <input
                        type="text"
                        value={headerNameInput}
                        onChange={(e) => setHeaderNameInput(e.target.value)}
                        placeholder="Enter your name"
                        className="px-2.5 py-1 text-sm bg-gray-900 border border-blue-500 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[170px] sm:max-w-[220px]"
                        autoFocus
                        maxLength={30}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveHeaderName();
                          if (e.key === 'Escape') setIsEditingHeaderName(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveHeaderName}
                        disabled={isSavingHeaderName}
                        className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                        title="Save Name"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHeaderNameInput(userDisplayName);
                          setIsEditingHeaderName(false);
                        }}
                        className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                        {userDisplayName}
                      </h2>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleCopyUid}
                      className="px-2.5 py-0.5 rounded-full bg-[#F5B301]/10 border border-[#F5B301]/30 text-[#F5B301] text-[11px] font-mono font-black inline-flex items-center gap-1 cursor-pointer hover:bg-[#F5B301]/20 transition-all shadow-sm"
                      title="Click to copy UID"
                    >
                      <span>UID: {displayId}</span>
                      {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Tiered Verification Badge */}
                <div className="flex flex-col items-end gap-1">
                  {isEmailVerified && kycStatus === 'verified' ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/10">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                      <span>Verified</span>
                    </span>
                  ) : isEmailVerified ? (
                    <button
                      type="button"
                      onClick={() => setActiveBottomNav('profile')}
                      className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 hover:bg-amber-500/30 transition-all cursor-pointer"
                      title="Click to complete Tier 2 KYC NID verification"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>KYC Needed (1/2)</span>
                    </button>
                  ) : kycStatus === 'verified' ? (
                    <button
                      type="button"
                      onClick={() => setActiveBottomNav('profile')}
                      className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[11px] font-bold flex items-center gap-1 hover:bg-sky-500/30 transition-all cursor-pointer"
                      title="Click to complete Tier 1 Email verification"
                    >
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      <span>Email Needed (1/2)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveBottomNav('profile')}
                      className="px-2.5 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700 text-[11px] font-bold flex items-center gap-1 hover:bg-gray-700 transition-all cursor-pointer"
                      title="Click to complete verification"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-gray-400" />
                      <span>Unverified (0/2)</span>
                    </button>
                  )}
                  <span className="text-[10px] text-gray-400 font-mono">
                    {isEmailVerified && kycStatus === 'verified' ? 'Tier 1 & 2 Active' : '2-Tier Setup Required'}
                  </span>
                </div>
              </div>

              {/* 2. QUICK ACTIONS BAR (5 grid columns: Deposit, Withdraw, Trade, History, Help Line) */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center w-full">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(true)}
                  className="p-1.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#0D1220] hover:bg-[#131B2E] border border-white/10 hover:border-[#F5B301]/40 flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer group shadow-md"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#F5B301]/15 group-hover:bg-[#F5B301]/25 border border-[#F5B301]/30 flex items-center justify-center transition-colors">
                    <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#F5B301]" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-bold text-white leading-tight truncate max-w-full">Deposit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="p-1.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#0D1220] hover:bg-[#131B2E] border border-white/10 hover:border-[#F5B301]/40 flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer group shadow-md"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#F5B301]/15 group-hover:bg-[#F5B301]/25 border border-[#F5B301]/30 flex items-center justify-center transition-colors">
                    <Minus className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#F5B301]" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-bold text-white leading-tight truncate max-w-full">Withdraw</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveBottomNav('trade')}
                  className="p-1.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#0D1220] hover:bg-[#131B2E] border border-white/10 hover:border-[#F5B301]/40 flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer group shadow-md"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#F5B301]/15 group-hover:bg-[#F5B301]/25 border border-[#F5B301]/30 flex items-center justify-center transition-colors">
                    <BarChart2 className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#F5B301]" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-bold text-white leading-tight truncate max-w-full">Trade</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="p-1.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#0D1220] hover:bg-[#131B2E] border border-white/10 hover:border-[#F5B301]/40 flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer group shadow-md"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#F5B301]/15 group-hover:bg-[#F5B301]/25 border border-[#F5B301]/30 flex items-center justify-center transition-colors">
                    <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#F5B301]" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-bold text-white leading-tight truncate max-w-full">History</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsHelpModalOpen(true)}
                  className="p-1.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#0D1220] hover:bg-[#131B2E] border border-white/10 hover:border-[#F5B301]/40 flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer group shadow-md"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#F5B301]/15 group-hover:bg-[#F5B301]/25 border border-[#F5B301]/30 flex items-center justify-center transition-colors">
                    <Headphones className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#F5B301]" />
                  </div>
                  <span className="text-[9px] sm:text-xs font-bold text-white leading-tight truncate max-w-full">Help Line</span>
                </button>
              </div>

              {/* 3. NET ASSETS EQUITY CARD WITH ACCOUNT SELECTOR */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B101D] border border-white/10 shadow-2xl relative overflow-hidden space-y-3.5">
                {/* Card Top Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black tracking-wider text-gray-400 uppercase">
                    NET ASSETS EQUITY
                  </span>

                  {/* Account Selector Pill Button */}
                  <button
                    type="button"
                    onClick={() => setIsAccountSelectorOpen(true)}
                    className="px-3 py-1 rounded-lg bg-[#F5B301]/10 border border-[#F5B301]/40 text-[#F5B301] hover:bg-[#F5B301]/20 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                    title="Switch Account Type"
                  >
                    <span>{accountType.toUpperCase()} ACCOUNT</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#F5B301]" />
                  </button>
                </div>

                {/* Main Equity Amount */}
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl sm:text-4xl font-black text-[#F5B301] font-mono tracking-tight my-1">
                    ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                  {accountType === 'demo' && (
                    <button
                      type="button"
                      onClick={() => setIsEditDemoModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#F5B301]/20 hover:bg-[#F5B301]/30 border border-[#F5B301]/40 text-[#F5B301] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                      title="Edit Demo Balance"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Balance</span>
                    </button>
                  )}
                </div>

                {/* Metrics Grid inside card */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-sans font-bold uppercase block">Balance</span>
                    <span className="text-sm font-black text-white font-mono">
                      ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-sans font-bold uppercase block">Floating P/L</span>
                    <span className={`text-sm font-black font-mono ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {floatingPnl >= 0 ? '+' : ''}${floatingPnl.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-sans font-bold uppercase block">Today P/L</span>
                    <span className={`text-sm font-black font-mono ${netTodayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {netTodayPnl >= 0 ? '+' : ''}${netTodayPnl.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-400 font-sans font-bold uppercase block">Used Margin</span>
                    <span className="text-sm font-black text-white font-mono">
                      ${usedMargin.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. MY ACCOUNT BALANCES CARD */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-[#0B101D] border border-white/10 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black tracking-wider text-gray-400 uppercase">
                    MY ACCOUNT BALANCES
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">Tap row to activate</span>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  {/* Live Account Row */}
                  <div
                    onClick={() => setAccountType('live')}
                    className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      accountType === 'live'
                        ? 'bg-[#0E1626] border-emerald-500/80 shadow-md'
                        : 'bg-[#0D1220] border-white/5 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow shadow-emerald-400/50" />
                      <span className="text-xs font-bold text-white">Live Balance</span>
                      {accountType === 'live' && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                          liveMetrics.floatingPnl > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : liveMetrics.floatingPnl < 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}
                      >
                        {liveMetrics.floatingPnl >= 0 ? '+' : ''}${liveMetrics.floatingPnl.toFixed(2)}
                      </span>
                      <span className="text-sm font-black font-mono text-white">
                        ${Math.max(0, balances.live + liveMetrics.floatingPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Bonus Account Row */}
                  <div
                    onClick={() => setAccountType('bonus')}
                    className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      accountType === 'bonus'
                        ? 'bg-[#0E1626] border-blue-500/80 shadow-md'
                        : 'bg-[#0D1220] border-white/5 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 shadow shadow-blue-400/50" />
                      <span className="text-xs font-bold text-white">Bonus Balance</span>
                      {accountType === 'bonus' && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                          bonusMetrics.floatingPnl > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : bonusMetrics.floatingPnl < 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}
                      >
                        {bonusMetrics.floatingPnl >= 0 ? '+' : ''}${bonusMetrics.floatingPnl.toFixed(2)}
                      </span>
                      <span className="text-sm font-black font-mono text-white">
                        ${Math.max(0, balances.bonus + bonusMetrics.floatingPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Demo Account Row */}
                  <div
                    onClick={() => setAccountType('demo')}
                    className={`p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      accountType === 'demo'
                        ? 'bg-[#0E1626] border-[#F5B301]/80 shadow-md'
                        : 'bg-[#0D1220] border-white/5 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F5B301] shadow shadow-[#F5B301]/50" />
                      <span className="text-xs font-bold text-white">Demo Balance</span>
                      {accountType === 'demo' && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#F5B301]/20 text-[#F5B301] border border-[#F5B301]/30 uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                          demoMetrics.floatingPnl > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : demoMetrics.floatingPnl < 0
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}
                      >
                        {demoMetrics.floatingPnl >= 0 ? '+' : ''}${demoMetrics.floatingPnl.toFixed(2)}
                      </span>
                      <span className="text-sm font-black font-mono text-white">
                        ${Math.max(0, balances.demo + demoMetrics.floatingPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditDemoModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-[#F5B301]/20 hover:bg-[#F5B301]/35 border border-[#F5B301]/40 text-[#F5B301] transition-all cursor-pointer flex items-center justify-center ml-0.5"
                        title="Edit Demo Balance"
                      >
                        <Pencil className="w-3 h-3 text-[#F5B301]" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. P/L ANALYTICS CARD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B101D] border border-white/10 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-[#F5B301]" />
                    <span>P/L ANALYTICS</span>
                  </span>
                  <span className="text-xs font-black text-[#F5B301] uppercase tracking-wider">
                    {accountType.toUpperCase()} ACCOUNT
                  </span>
                </div>

                {/* Timeframe Switcher Tabs */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-gray-950 rounded-xl border border-white/10 text-center">
                  {(['daily', 'weekly', 'monthly', 'alltime'] as const).map((tf, idx) => (
                    <button
                      key={`fdb-tf-${tf}-${idx}`}
                      type="button"
                      onClick={() => setPlTimeframe(tf)}
                      className={`py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                        plTimeframe === tf
                          ? 'bg-[#F5B301] text-gray-950 shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tf === 'alltime' ? 'All Time' : tf}
                    </button>
                  ))}
                </div>

                {/* 3 Main Metrics Columns: Total Profit, Total Loss, Net P/L */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                  <div className="p-2.5 rounded-xl bg-[#0D1220] border border-white/5 space-y-1">
                    <span className="text-[10px] text-gray-400 font-sans font-bold uppercase block">Total Profit</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-400">
                      +${totalWinAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0D1220] border border-white/5 space-y-1">
                    <span className="text-[10px] text-gray-400 font-sans font-bold uppercase block">Total Loss</span>
                    <span className="text-xs sm:text-sm font-black text-rose-400">
                      -${totalLossAmount.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#0D1220] border border-white/5 space-y-1">
                    <span className="text-[10px] text-gray-400 font-sans font-bold uppercase block">Net P/L</span>
                    <span className={`text-xs sm:text-sm font-black ${netReturnPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {netReturnPnl >= 0 ? '+' : ''}${netReturnPnl.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Additional Performance Indicators */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center font-mono">
                  <div className="p-2 rounded-lg bg-gray-950/60 border border-white/5 space-y-0.5">
                    <span className="text-[9px] text-gray-400 uppercase font-sans font-bold block">Win Rate</span>
                    <span className="text-xs font-black text-[#F5B301]">{winRate}%</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-950/60 border border-white/5 space-y-0.5">
                    <span className="text-[9px] text-gray-400 uppercase font-sans font-bold block">Total Trades</span>
                    <span className="text-xs font-black text-white">{totalTrades}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-gray-950/60 border border-white/5 space-y-0.5">
                    <span className="text-[9px] text-gray-400 uppercase font-sans font-bold block">Accuracy</span>
                    <span className="text-xs font-black text-emerald-300">99.8%</span>
                  </div>
                </div>
              </div>

              {/* 5.5 TRADE HISTORY SECTION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B101D] border border-white/10 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#F5B301]/10 border border-[#F5B301]/30 text-[#F5B301]">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">
                        Trade History
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        Closed Forex & Binary trades (click to view full price execution details)
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Audit</span>
                    <ChevronRight className="w-3 h-3 text-amber-400" />
                  </button>
                </div>

                <TradeHistoryList
                  trades={closedTrades}
                  activeAccount={accountType}
                  initialMode={dashboardHistoryTab}
                  showModeSwitch={true}
                  maxContainerHeight="max-h-[390px]"
                />
              </div>

              {/* 6. ALL DEPOSIT & WITHDRAW TRANSACTION HISTORY */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B101D] border border-white/10 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[#F5B301]/10 border border-[#F5B301]/30 text-[#F5B301]">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">
                        Deposit & Withdraw History
                      </h3>
                      <p className="text-[10px] text-gray-400">Real-time account deposit and withdrawal transaction records</p>
                    </div>
                  </div>

                  {/* Filter Tabs: All, Deposits, Withdrawals & Quick Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center p-1 bg-gray-950 rounded-xl border border-white/10 text-xs">
                      <button
                        type="button"
                        onClick={() => setDashboardTxFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          dashboardTxFilter === 'all'
                            ? 'bg-[#F5B301] text-gray-950 shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        All ({transactions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardTxFilter('deposits')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 ${
                          dashboardTxFilter === 'deposits'
                            ? 'bg-emerald-500 text-gray-950 shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <ArrowDownRight className="w-3 h-3" />
                        <span>Deposits ({transactions.filter(t => t.type === 'Deposit').length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardTxFilter('withdrawals')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 ${
                          dashboardTxFilter === 'withdrawals'
                            ? 'bg-rose-500 text-white shadow'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Withdrawals ({transactions.filter(t => t.type === 'Withdrawal').length})</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsDepositModalOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Deposit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsWithdrawModalOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 hover:bg-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                        <span>Withdraw</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transactions Display: Clean Responsive Cards & Table */}
                {(() => {
                  const filteredTx = transactions.filter(t => {
                    if (dashboardTxFilter === 'deposits') return t.type === 'Deposit';
                    if (dashboardTxFilter === 'withdrawals') return t.type === 'Withdrawal';
                    return true;
                  });

                  if (filteredTx.length === 0) {
                    return (
                      <div className="py-10 text-center rounded-2xl bg-gray-950/40 border border-white/5 space-y-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-gray-300">
                            No {dashboardTxFilter === 'deposits' ? 'deposit' : dashboardTxFilter === 'withdrawals' ? 'withdrawal' : 'transaction'} records found
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Your successful, pending, or completed account transactions will appear here.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsDepositModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-[#F5B301] text-gray-950 font-black text-[11px] uppercase tracking-wider shadow hover:brightness-110 cursor-pointer"
                          >
                            Deposit Now
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsWithdrawModalOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-[11px] uppercase tracking-wider cursor-pointer"
                          >
                            Withdraw Funds
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      {filteredTx.map((tx, idx) => {
                        const isDeposit = tx.type === 'Deposit';
                        const isApproved = tx.status === 'Approved' || tx.status === 'Success' || tx.status === 'Completed' || tx.status === 'Successful';
                        const isRejected = tx.status === 'Rejected';
                        const isPending = !isApproved && !isRejected;

                        return (
                          <div
                            key={`dash-tx-${tx.id || 'tx'}-${idx}`}
                            className="p-3.5 sm:p-4 rounded-xl bg-[#0D1220] border border-white/5 hover:border-white/10 transition-all space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                  isDeposit 
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                                    : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                }`}>
                                  {isDeposit ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-xs text-white">
                                      {tx.type}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium truncate">
                                      • {tx.method || 'Auto Gateway'} {tx.accountType ? `(${tx.accountType.toUpperCase()})` : ''}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-500 font-mono">
                                    {tx.timestamp}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-sm sm:text-base font-black font-mono tracking-tight ${
                                  isDeposit ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {isDeposit ? '+' : '-'}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                  isApproved
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : isRejected
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                                }`}>
                                  {isApproved ? 'SUCCESS' : isRejected ? 'REJECTED' : 'PENDING'}
                                </span>
                              </div>
                            </div>

                            {/* Bonus amount indicator if any */}
                            {tx.bonusAmount && tx.bonusAmount > 0 ? (
                              <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-[#F5B301]/10 border border-[#F5B301]/20 text-[#F5B301] font-bold">
                                <span>Deposit Bonus Credited</span>
                                <span>+${tx.bonusAmount.toFixed(2)} USD</span>
                              </div>
                            ) : null}

                            {/* Bonus Profit Withdrawal Indicator */}
                            {tx.type === 'Withdrawal' && tx.accountType === 'bonus' && (
                              <div className="flex items-center justify-between text-[10px] px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 font-medium">
                                <span className="flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span>Bonus Account (50% Profit Withdrawal)</span>
                                </span>
                                {tx.totalNetProfit !== undefined && (
                                  <span className="font-mono text-emerald-400 font-bold">Profit: ${tx.totalNetProfit.toFixed(2)}</span>
                                )}
                              </div>
                            )}

                            {/* TrxID / Hash and Notes */}
                            <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-400 font-mono gap-1 pt-1.5 border-t border-white/5">
                              <span className="truncate max-w-[280px]">
                                TrxID: <strong className="text-gray-300 font-bold">{tx.trxId || tx.txHash || tx.id}</strong>
                              </span>
                              {isApproved && (
                                <span className="text-emerald-400 text-[10px] font-semibold">Verified</span>
                              )}
                            </div>

                            {/* Rejection Note */}
                            {tx.rejectionReason && isRejected && (
                              <div className="text-[11px] text-rose-300 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 font-sans">
                                <strong>Reason:</strong> {tx.rejectionReason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Trade History Modal Popup */}
              <Suspense fallback={null}>
                {isHistoryModalOpen && (
                  <TradeHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    closedTrades={closedTrades}
                    activeAccount={accountType}
                    userEmail={user.email || undefined}
                  />
                )}
              </Suspense>
            </>
          )}

          {/* MARKETS TAB */}
          {activeBottomNav === 'markets' && (
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center p-8 text-center text-gray-400">
                <div className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin mr-2" />
                <span className="text-xs font-semibold">Loading Markets...</span>
              </div>
            }>
              <MarketsView
                onSelectMarket={(marketId, mode) => {
                  setSelectedTradingMarketId(marketId);
                  setActiveBottomNav(mode);
                }}
              />
            </Suspense>
          )}

          {/* TRADE TAB & BINARY TAB (Trading Terminal View) */}
          {(activeBottomNav === 'trade' || activeBottomNav === 'binary') && (
            <TradingTerminalView
              key={activeBottomNav}
              activeAccount={accountType}
              setActiveAccount={setAccountType}
              balances={balances}
              setBalances={setBalances}
              userEmail={user.email || undefined}
              userUid={user.uid || undefined}
              userDisplayName={userDisplayName}
              userAvatar={userAvatar}
              activeTrades={activeTrades}
              setActiveTrades={setActiveTrades}
              closedTrades={closedTrades}
              setClosedTrades={setClosedTrades}
              initialTradingMode={activeBottomNav === 'binary' ? 'otc' : 'forex'}
              initialMarketId={selectedTradingMarketId}
              isSuperAdmin={isSuperAdmin}
              isAdmin={Boolean(isSuperAdmin || (user?.email && ['naymulh1000@gmail.com', 'admin@fxby24.com', 'admin@forextradepro.com'].includes(user.email.toLowerCase().trim())))}
              onBack={() => setActiveBottomNav('home')}
            />
          )}

          {/* WALLET TAB - MY WALLET PORTFOLIO */}
          {activeBottomNav === 'wallet' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Header Title */}
              <div className="pt-1 pb-1">
                <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-sans">
                  MY WALLET PORTFOLIO
                </h1>
              </div>

              {/* Main Balance Portfolio Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#111722] border border-slate-800/80 shadow-2xl space-y-6">
                {/* Row 1: Wallet Balance & Bonus Earned */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block mb-1">Wallet Balance</span>
                    <p className="text-2xl sm:text-3xl font-black font-sans text-[#F5B301] tracking-tight">
                      ${balances.live.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 font-semibold block mb-1">Bonus Earned</span>
                    <p className="text-lg sm:text-xl font-bold font-sans text-emerald-400">
                      ${balances.bonus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Row 2: Referral Revenue & Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block mb-0.5">Referral Revenue</span>
                    <p className="text-base sm:text-lg font-bold font-sans text-sky-400">
                      ${referralRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsDepositModalOpen(true)}
                      className="px-5 py-2 rounded-xl bg-[#F5B301] text-slate-950 font-black text-xs sm:text-sm cursor-pointer hover:bg-amber-400 active:scale-[0.98] transition-all shadow-md"
                    >
                      Deposit
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsWithdrawModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#1c2432] text-white font-semibold text-xs sm:text-sm border border-slate-700/60 cursor-pointer hover:bg-[#253042] active:scale-[0.98] transition-all"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>

                {/* Subtle Practice / Demo Funds indicator */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400/80"></span>
                    Practice Demo Balance:
                  </span>
                  <span className="font-mono font-bold text-gray-300">
                    ${balances.demo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Segmented Tabs: Deposits vs Withdrawals */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletHistoryTab('deposits')}
                  className={`py-3.5 px-4 rounded-xl font-bold text-sm transition-all text-center cursor-pointer ${
                    walletHistoryTab === 'deposits'
                      ? 'bg-[#F5B301] text-slate-950 shadow-lg shadow-[#F5B301]/20 font-black'
                      : 'bg-[#111722] text-slate-300 border border-slate-800/80 hover:text-white font-semibold'
                  }`}
                >
                  Deposits
                </button>
                <button
                  type="button"
                  onClick={() => setWalletHistoryTab('withdrawals')}
                  className={`py-3.5 px-4 rounded-xl font-bold text-sm transition-all text-center cursor-pointer ${
                    walletHistoryTab === 'withdrawals'
                      ? 'bg-[#F5B301] text-slate-950 shadow-lg shadow-[#F5B301]/20 font-black'
                      : 'bg-[#111722] text-slate-300 border border-slate-800/80 hover:text-white font-semibold'
                  }`}
                >
                  Withdrawals
                </button>
              </div>

              {/* Dynamic Transaction Records List */}
              <div className="space-y-3 pt-1">
                {walletHistoryTab === 'deposits' ? (
                  // Deposits List
                  (() => {
                    const depositList = transactions.filter(t => t.type === 'Deposit');
                    if (depositList.length === 0) {
                      return (
                        <div className="p-8 rounded-2xl bg-[#111722] border border-slate-800/80 text-center space-y-2">
                          <p className="text-sm font-semibold text-gray-400">No deposit records found</p>
                          <p className="text-xs text-gray-500">Your approved and pending deposits will appear here.</p>
                        </div>
                      );
                    }
                    return depositList.map((tx, idx) => (
                      <div
                        key={`dep-${tx.id || 'dep'}-${idx}`}
                        className="p-4 rounded-2xl bg-[#111722] border border-slate-800/80 shadow-md space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-400 font-medium">
                            {tx.method || 'Auto Gateway'} • {tx.timestamp}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            tx.status === 'Approved' || tx.status === 'Success' || tx.status === 'Completed' || tx.status === 'Successful'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : tx.status === 'Rejected'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                          }`}>
                            {tx.status === 'Approved' || tx.status === 'Success' || tx.status === 'Completed' || tx.status === 'Successful' ? 'SUCCESS' : tx.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <div className="text-xl font-bold font-mono text-emerald-400">
                            +${tx.amount.toFixed(2)} USD
                          </div>
                          {(tx.bonusAmount && tx.bonusAmount > 0) ? (
                            <span className="text-xs font-bold text-[#F5B301]">
                              +${tx.bonusAmount.toFixed(2)} Bonus
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 font-mono gap-1 pt-1.5 border-t border-slate-800/60">
                          <span>TrxID: <strong className="text-gray-300 font-bold">{tx.trxId || tx.txHash || tx.id}</strong></span>
                          {(tx.approvedAt || tx.status === 'Approved' || tx.status === 'Success' || tx.status === 'Completed' || tx.status === 'Successful') && (
                            <span className="text-emerald-400 text-[10px] font-semibold">Verified</span>
                          )}
                        </div>
                        {tx.rejectionReason && tx.status === 'Rejected' && (
                          <div className="text-xs text-rose-400 font-sans p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                            Note: {tx.rejectionReason}
                          </div>
                        )}
                      </div>
                    ));
                  })()
                ) : (
                  // Withdrawals List
                  (() => {
                    const withdrawalList = transactions.filter(t => t.type === 'Withdrawal');
                    if (withdrawalList.length === 0) {
                      return (
                        <div className="p-8 rounded-2xl bg-[#111722] border border-slate-800/80 text-center space-y-2">
                          <p className="text-sm font-semibold text-gray-400">No withdrawal records found</p>
                          <p className="text-xs text-gray-500">Your approved and pending withdrawals will appear here.</p>
                        </div>
                      );
                    }
                    return withdrawalList.map((tx, idx) => (
                      <div
                        key={`wd-${tx.id || 'wd'}-${idx}`}
                        className="p-4 rounded-2xl bg-[#111722] border border-slate-800/80 shadow-md space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-gray-400 font-medium">
                            {tx.method || 'Binance Pay'} {tx.accountType && tx.accountType === 'bonus' ? '(BONUS)' : ''} • {tx.timestamp}
                          </span>
                          <span className={`px-3 py-1 rounded text-[11px] font-extrabold uppercase tracking-wider ${
                            tx.status === 'Approved' || tx.status === 'Success' || tx.status === 'Successful' || tx.status === 'Completed'
                              ? 'bg-[#062c1d] text-emerald-400 border border-emerald-500/30'
                              : tx.status === 'Rejected'
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          }`}>
                            {tx.status === 'Approved' || tx.status === 'Success' || tx.status === 'Successful' || tx.status === 'Completed' ? 'SUCCESS' : tx.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xl font-bold font-mono text-rose-500">
                          -${tx.amount.toFixed(1)}
                        </div>
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 font-mono gap-1 pt-1.5 border-t border-slate-800/60">
                          <span>TxID: <strong className="text-gray-300 font-bold">{tx.txHash || tx.trxId || tx.id}</strong></span>
                          {(tx.approvedAt || tx.status === 'Approved' || tx.status === 'Success' || tx.status === 'Completed' || tx.status === 'Successful') && (
                            <span className="text-emerald-400 text-[10px] font-semibold">Verified</span>
                          )}
                        </div>
                        {tx.rejectionReason && tx.status === 'Rejected' && (
                          <div className="text-xs text-rose-400 font-sans">
                            Note: {tx.rejectionReason}
                          </div>
                        )}
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeBottomNav === 'profile' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-[#0F1423] border border-white/10 shadow-xl space-y-5">
                {/* Profile Header */}
                <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                  {/* Profile Avatar with Camera Icon Overlay */}
                  <div className="relative flex-shrink-0 group">
                    <div 
                      onClick={() => setIsAvatarModalOpen(true)}
                      className="w-16 h-16 rounded-2xl bg-[#F5B301]/20 border-2 border-[#F5B301] flex items-center justify-center text-[#F5B301] font-black text-2xl shadow-lg overflow-hidden relative cursor-pointer hover:border-amber-300 transition-colors"
                      title="Change profile avatar"
                    >
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={user.displayName || user.email || 'Profile'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                          onError={() => setUserAvatar('')}
                        />
                      ) : (
                        <span>{user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'S'}</span>
                      )}
                    </div>
                    {/* Small camera icon badge on top right of the avatar */}
                    <button
                      id="profile-avatar-camera-trigger"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAvatarModalOpen(true);
                      }}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#F5B301] hover:bg-amber-400 active:scale-95 text-gray-950 flex items-center justify-center shadow-md border-2 border-[#0F1423] cursor-pointer transition-all hover:scale-110 z-10"
                      title="Change Profile Photo"
                    >
                      <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditingHeaderName ? (
                      <div className="flex items-center gap-1.5 pb-1">
                        <input
                          type="text"
                          value={headerNameInput}
                          onChange={(e) => setHeaderNameInput(e.target.value)}
                          placeholder="Enter your name"
                          className="px-2.5 py-1 text-sm bg-gray-900 border border-blue-500 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px] sm:max-w-[240px]"
                          autoFocus
                          maxLength={30}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveHeaderName();
                            if (e.key === 'Escape') setIsEditingHeaderName(false);
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleSaveHeaderName}
                          disabled={isSavingHeaderName}
                          className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                          title="Save Name"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHeaderNameInput(userDisplayName);
                            setIsEditingHeaderName(false);
                          }}
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-white truncate">{userDisplayName}</h2>
                        <button
                          type="button"
                          onClick={() => {
                            setHeaderNameInput(userDisplayName);
                            setIsEditingHeaderName(true);
                          }}
                          className="p-1 text-gray-400 hover:text-[#F5B301] hover:bg-white/5 rounded-md transition-colors cursor-pointer"
                          title="Edit Name (Updates Leaderboard & Profile)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 font-mono truncate">{user.email}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Email Status Badge */}
                      {isEmailVerified ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 text-[10px] font-extrabold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-sky-400 fill-sky-400/20" /> Email Verified
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-400" /> Email Unverified
                        </span>
                      )}

                      {/* KYC Status Badge */}
                      {kycStatus === 'verified' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-extrabold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400 fill-emerald-400/20" /> KYC Verified
                        </span>
                      ) : kycStatus === 'pending' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold flex items-center gap-1 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-400" /> KYC Pending
                        </span>
                      ) : kycStatus === 'rejected' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-extrabold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" /> KYC Rejected
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400 text-[10px] font-extrabold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-gray-400" /> KYC Unverified
                        </span>
                      )}

                      <span className="text-xs text-gray-500 font-mono">UID: {userUid}</span>
                    </div>
                  </div>
                </div>

                {/* Admin Access Card if User is Super Admin */}
                {isSuperAdmin && onSwitchToAdmin && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-amber-500/20 border-2 border-[#F5B301]/50 shadow-xl space-y-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-[#F5B301]" />
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">Super Administrator Privileges</h3>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">
                      Your account has full administrative access to manage users, approve deposit/withdrawal requests, process KYC documents, adjust market spreads, and send broadcasts.
                    </p>
                    <button
                      type="button"
                      onClick={onSwitchToAdmin}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F5B301] to-amber-400 text-gray-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F5B301]/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Enter Admin Portal / Management Dashboard</span>
                    </button>
                  </div>
                )}

                {/* EMAIL VERIFICATION SECTION */}
                <div className="p-4 rounded-2xl bg-gray-900/80 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white">Email Address Verification</h3>
                        <p className="text-[10px] text-gray-400">{user.email}</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 ${
                      isEmailVerified 
                        ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {isEmailVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-sky-400 fill-sky-400/20" />
                          <span>Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          <span>Unverified</span>
                        </>
                      )}
                    </span>
                  </div>

                  {emailVerifMsg && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{emailVerifMsg}</span>
                    </div>
                  )}

                  {emailVerifError && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{emailVerifError}</span>
                    </div>
                  )}

                  {!isEmailVerified ? (
                    <div className="space-y-2 pt-1">
                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <button
                          type="button"
                          onClick={handleInstantSelfVerifyEmail}
                          disabled={isSendingEmailVerif}
                          className="w-full sm:flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:brightness-110 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4 text-sky-200" />
                          <span>Self-Verify Email Now (Instant)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleSendEmailVerification}
                          disabled={isSendingEmailVerif}
                          className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-sky-500/30 disabled:opacity-50"
                        >
                          <Mail className="w-3.5 h-3.5 text-sky-400" />
                          <span>{isSendingEmailVerif ? 'Sending Link...' : 'Send Link'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCheckEmailVerifStatus}
                          className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-sky-500/30"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                          <span>Check Link Status</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Click <strong>Self-Verify Email Now</strong> to instantly complete Tier 1 Email verification on your account.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 fill-sky-400/20" />
                      <span>Your email address is verified with a Blue Tick badge.</span>
                    </div>
                  )}
                </div>

                {/* KYC IDENTITY VERIFICATION SECTION */}
                <div className="p-4 rounded-2xl bg-gray-900/80 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-[#F5B301]/10 border border-[#F5B301]/30 text-[#F5B301]">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white">Identity Verification (KYC)</h3>
                        <p className="text-[10px] text-gray-400">National ID card upload & admin compliance validation</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 ${
                      kycStatus === 'verified' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                      kycStatus === 'pending' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                      kycStatus === 'rejected' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                      {kycStatus === 'verified' && (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
                          <span>Verified</span>
                        </>
                      )}
                      {kycStatus === 'pending' && (
                        <>
                          <Clock className="w-3 h-3 text-amber-300 animate-spin" />
                          <span>Pending</span>
                        </>
                      )}
                      {kycStatus === 'rejected' && (
                        <>
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>Rejected</span>
                        </>
                      )}
                      {kycStatus === 'unverified' && (
                        <>
                          <ShieldAlert className="w-3 h-3 text-gray-400" />
                          <span>Unverified</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Status Banner Messages */}
                  {kycStatus === 'rejected' && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Verification Rejected</span>
                      </div>
                      <p className="text-[11px] text-rose-200 pl-5">{kycReason || 'NID document photo was unclear. Please re-upload sharp photos.'}</p>
                    </div>
                  )}

                  {kycStatus === 'pending' && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                      <div>
                        <p className="font-bold text-amber-300">Automated NID Verification in Progress</p>
                        <p className="text-[11px] text-amber-200/80 mt-0.5">
                          Your NID submission is marked as <strong>Pending</strong>. The system will automatically verify your details and update status to <strong>Verified</strong> within 1 to 2 minutes.
                        </p>
                      </div>
                    </div>
                  )}

                  {kycStatus === 'verified' && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 fill-emerald-400/20" />
                      <span>Congratulations! Your NID identity is fully verified with a Blue Tick badge.</span>
                    </div>
                  )}

                  {(kycStatus === 'unverified' || kycStatus === 'rejected') && (
                    <button
                      type="button"
                      onClick={() => setIsKycModalOpen(true)}
                      className="w-full py-2.5 rounded-xl bg-[#F5B301] hover:brightness-110 text-gray-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#F5B301]/20 transition-all cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{kycStatus === 'rejected' ? 'Re-upload NID' : 'Upload NID'}</span>
                    </button>
                  )}

                  {kycStatus === 'pending' && (
                    <button
                      type="button"
                      onClick={() => setIsKycModalOpen(true)}
                      className="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-amber-500/30"
                    >
                      <span>Update / Re-submit NID Document</span>
                    </button>
                  )}
                </div>

                {/* CHANGE PASSWORD SECTION (Under KYC Verification) */}
                <div className="p-4 rounded-2xl bg-gray-900/80 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-[#F5B301]/10 border border-[#F5B301]/30 text-[#F5B301]">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white">Change Password</h3>
                        <p className="text-[10px] text-gray-400">Update account login & security credentials</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsChangePasswordModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F5B301] hover:brightness-110 text-gray-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#F5B301]/10 transition-all cursor-pointer active:scale-95"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Change</span>
                    </button>
                  </div>
                </div>

                {/* General Security Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-white/5">
                    <span className="text-gray-400">Account Security</span>
                    <span className="font-bold text-emerald-400">2FA Enabled</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/60 border border-white/5">
                    <span className="text-gray-400">Trading Currency</span>
                    <span className="font-bold text-white">USD ($)</span>
                  </div>
                </div>

                {/* --- REFERRAL BONUS CARD (Placed right above Logout button) --- */}
                <div 
                  id="profile-referral-bonus-card"
                  className="p-4 rounded-2xl bg-gradient-to-br from-[#0F1626] via-[#111A2E] to-[#0A0E1A] border border-[#F5B301]/40 shadow-xl space-y-3 relative overflow-hidden"
                >
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-[#F5B301]/10 rounded-full blur-2xl pointer-events-none" />
                  
                  {/* Header Badge & Title */}
                  <div className="flex items-start justify-between gap-2 relative z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#F5B301] to-amber-600 flex items-center justify-center text-gray-950 shadow-lg shadow-[#F5B301]/20 shrink-0">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5B301]/15 border border-[#F5B301]/30 text-[#F5B301] text-[10px] font-black uppercase tracking-wider mb-0.5">
                          <Sparkles className="w-3 h-3" /> Special Offer
                        </div>
                        <h3 className="text-sm font-black text-white">
                          Earn Up to $25 Referral Bonus
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-gray-300 leading-relaxed relative z-10">
                    Refer friends and get a <strong className="text-[#F5B301]">$25 Instant Bonus Wallet Reward</strong> on their first successful deposit (minimum $250)!
                  </p>

                  {/* Unique Referral ID & Link Box */}
                  <div className="space-y-1.5 pt-1 relative z-10">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-400">Your Referral ID:</span>
                      <span className="font-mono font-black text-[#F5B301] bg-[#F5B301]/10 border border-[#F5B301]/30 px-2 py-0.5 rounded-lg text-xs">
                        {userReferralId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-950/80 border border-white/10">
                      <input
                        type="text"
                        readOnly
                        value={userReferralLink}
                        className="flex-1 bg-transparent text-xs text-gray-300 font-mono focus:outline-none select-all truncate"
                      />
                    </div>
                  </div>

                  {/* Dual Action Buttons (Copy Referral Link & Share Referral Link) */}
                  <div className="grid grid-cols-2 gap-2 pt-1 relative z-10">
                    <button
                      id="copy-profile-referral-link-btn"
                      type="button"
                      onClick={handleCopyReferralLink}
                      className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                        referralLinkCopied
                          ? 'bg-emerald-500 border-emerald-400 text-gray-950 shadow-md shadow-emerald-500/20'
                          : 'bg-gray-900/90 hover:bg-gray-800 border-white/15 text-white active:scale-95'
                      }`}
                    >
                      {referralLinkCopied ? <Check className="w-4 h-4 text-gray-950" /> : <Copy className="w-4 h-4 text-[#F5B301]" />}
                      <span>{referralLinkCopied ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    <button
                      id="share-profile-referral-link-btn"
                      type="button"
                      onClick={() => setIsShareReferralModalOpen(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#F5B301] to-amber-500 hover:brightness-110 text-gray-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#F5B301]/20 transition-all cursor-pointer active:scale-95 border border-[#F5B301]"
                    >
                      <Share2 className="w-4 h-4 text-gray-950" />
                      <span>Share Link</span>
                    </button>
                  </div>

                  {/* My Total Referrals Main Action Button */}
                  <button
                    id="my-total-referrals-btn"
                    type="button"
                    onClick={() => setIsMyReferralsModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-[#F5B301]/15 to-amber-500/10 hover:from-amber-500/30 hover:to-[#F5B301]/25 border border-[#F5B301]/40 text-[#F5B301] font-black text-xs flex items-center justify-between transition-all cursor-pointer shadow-lg shadow-[#F5B301]/10 active:scale-[0.98] relative z-10"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#F5B301] text-gray-950 flex items-center justify-center shadow-sm">
                        <Users className="w-4 h-4 stroke-[2.5]" />
                      </div>
                      <div className="text-left">
                        <span className="block font-black text-white text-xs">My Total Referrals</span>
                        <span className="block text-[10px] text-gray-400 font-medium">Referral Accounts & Balances</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F5B301] text-gray-950 text-xs font-black">
                        {myReferralsCount} Accounts
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#F5B301]" />
                    </div>
                  </button>
                </div>

                <button
                  onClick={onLogout}
                  className="w-full py-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Account</span>
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* 6. BOTTOM NAVIGATION BAR (7-Icon Mobile Navigation Matching Screenshot) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#080B14]/95 backdrop-blur-lg border-t border-white/10 lg:hidden px-2 py-2">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          
          {/* Home Tab */}
          <button
            type="button"
            onClick={() => setActiveBottomNav('home')}
            className={`px-3 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300 transform cursor-pointer ${
              activeBottomNav === 'home'
                ? 'bg-gradient-to-b from-[#F5B301] to-[#E0A000] text-gray-950 font-black shadow-lg shadow-[#F5B301]/30 scale-105 -translate-y-0.5 ring-1 ring-[#F5B301]/60'
                : 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-95'
            }`}
          >
            <Home className={`w-4 h-4 transition-transform duration-200 ${activeBottomNav === 'home' ? 'text-gray-950 scale-110' : 'text-gray-400'}`} />
            <span className={`text-[10px] tracking-tight ${activeBottomNav === 'home' ? 'font-black text-gray-950' : 'font-semibold text-gray-400'}`}>Home</span>
          </button>

          {/* Markets Tab */}
          <button
            type="button"
            onClick={() => setActiveBottomNav('markets')}
            className={`px-3 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300 transform cursor-pointer ${
              activeBottomNav === 'markets'
                ? 'bg-gradient-to-b from-[#F5B301] to-[#E0A000] text-gray-950 font-black shadow-lg shadow-[#F5B301]/30 scale-105 -translate-y-0.5 ring-1 ring-[#F5B301]/60'
                : 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-95'
            }`}
          >
            <TrendingUp className={`w-4 h-4 transition-transform duration-200 ${activeBottomNav === 'markets' ? 'text-gray-950 scale-110' : 'text-gray-400'}`} />
            <span className={`text-[10px] tracking-tight ${activeBottomNav === 'markets' ? 'font-black text-gray-950' : 'font-semibold text-gray-400'}`}>Markets</span>
          </button>

          {/* Trade Tab */}
          <button
            type="button"
            onClick={() => setActiveBottomNav('trade')}
            className={`px-3 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300 transform cursor-pointer ${
              activeBottomNav === 'trade'
                ? 'bg-gradient-to-b from-[#F5B301] to-[#E0A000] text-gray-950 font-black shadow-lg shadow-[#F5B301]/30 scale-105 -translate-y-0.5 ring-1 ring-[#F5B301]/60'
                : 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-95'
            }`}
          >
            <BarChart2 className={`w-4 h-4 transition-transform duration-200 ${activeBottomNav === 'trade' ? 'text-gray-950 scale-110' : 'text-gray-400'}`} />
            <span className={`text-[10px] tracking-tight ${activeBottomNav === 'trade' ? 'font-black text-gray-950' : 'font-semibold text-gray-400'}`}>Trade</span>
          </button>

          {/* Help Tab */}
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(true)}
            className="px-2.5 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 text-gray-400 hover:text-white hover:bg-white/5 active:scale-90 cursor-pointer"
          >
            <Headphones className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-semibold text-gray-400">Help</span>
          </button>

          {/* Binary Tab */}
          <button
            type="button"
            onClick={() => setActiveBottomNav('binary')}
            className={`px-3 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300 transform cursor-pointer ${
              activeBottomNav === 'binary'
                ? 'bg-gradient-to-b from-[#F5B301] to-[#E0A000] text-gray-950 font-black shadow-lg shadow-[#F5B301]/30 scale-105 -translate-y-0.5 ring-1 ring-[#F5B301]/60'
                : 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-95'
            }`}
          >
            <Zap className={`w-4 h-4 transition-transform duration-200 ${activeBottomNav === 'binary' ? 'text-gray-950 scale-110' : 'text-gray-400'}`} />
            <span className={`text-[10px] tracking-tight ${activeBottomNav === 'binary' ? 'font-black text-gray-950' : 'font-semibold text-gray-400'}`}>Binary</span>
          </button>

          {/* Wallet Tab */}
          <button
            type="button"
            onClick={() => setActiveBottomNav('wallet')}
            className={`px-3 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300 transform cursor-pointer ${
              activeBottomNav === 'wallet'
                ? 'bg-gradient-to-b from-[#F5B301] to-[#E0A000] text-gray-950 font-black shadow-lg shadow-[#F5B301]/30 scale-105 -translate-y-0.5 ring-1 ring-[#F5B301]/60'
                : 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-95'
            }`}
          >
            <Wallet className={`w-4 h-4 transition-transform duration-200 ${activeBottomNav === 'wallet' ? 'text-gray-950 scale-110' : 'text-gray-400'}`} />
            <span className={`text-[10px] tracking-tight ${activeBottomNav === 'wallet' ? 'font-black text-gray-950' : 'font-semibold text-gray-400'}`}>Wallet</span>
          </button>

          {/* Profile Tab */}
          <button
            type="button"
            onClick={() => setActiveBottomNav('profile')}
            className={`px-3 py-1.5 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-300 transform cursor-pointer ${
              activeBottomNav === 'profile'
                ? 'bg-gradient-to-b from-[#F5B301] to-[#E0A000] text-gray-950 font-black shadow-lg shadow-[#F5B301]/30 scale-105 -translate-y-0.5 ring-1 ring-[#F5B301]/60'
                : 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-95'
            }`}
          >
            <UserIcon className={`w-4 h-4 transition-transform duration-200 ${activeBottomNav === 'profile' ? 'text-gray-950 scale-110' : 'text-gray-400'}`} />
            <span className={`text-[10px] tracking-tight ${activeBottomNav === 'profile' ? 'font-black text-gray-950' : 'font-semibold text-gray-400'}`}>Profile</span>
          </button>

        </div>
      </div>

      {/* ACCOUNT SELECTOR POPUP MODAL (Matching User Prompt) */}
      {isAccountSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-[#0F1423] border border-[#F5B301]/30 p-5 space-y-4 shadow-2xl relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsAccountSelectorOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Select Account
              </h3>
              <p className="text-xs text-gray-400">
                Switching accounts updates metrics instantly
              </p>
            </div>

            {/* Account Options List */}
            <div className="space-y-2.5 pt-1">
              {/* Live Account Option */}
              <button
                type="button"
                onClick={() => {
                  setAccountType('live');
                  setIsAccountSelectorOpen(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  accountType === 'live'
                    ? 'bg-[#0E1626] border-emerald-500 ring-1 ring-emerald-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-[#0B101D] border-white/10 hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Live Account</h4>
                    <p className="text-[10px] text-gray-400">Real Money Account</p>
                  </div>
                </div>
                <span className="text-sm font-black font-mono text-emerald-400">
                  ${balances.live.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </button>

              {/* Bonus Account Option */}
              <button
                type="button"
                onClick={() => {
                  setAccountType('bonus');
                  setIsAccountSelectorOpen(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  accountType === 'bonus'
                    ? 'bg-[#0E1626] border-blue-500 ring-1 ring-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-[#0B101D] border-white/10 hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-blue-400" />
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Bonus Account</h4>
                    <p className="text-[10px] text-gray-400">Trading Bonus Balance</p>
                  </div>
                </div>
                <span className="text-sm font-black font-mono text-blue-400">
                  ${balances.bonus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </button>

              {/* Demo Account Option */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  setAccountType('demo');
                  setIsAccountSelectorOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setAccountType('demo');
                    setIsAccountSelectorOpen(false);
                  }
                }}
                className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  accountType === 'demo'
                    ? 'bg-[#0E1626] border-[#F5B301] ring-1 ring-[#F5B301] shadow-lg shadow-[#F5B301]/20'
                    : 'bg-[#0B101D] border-white/10 hover:border-[#F5B301]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#F5B301]" />
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Demo Account</h4>
                    <p className="text-[10px] text-gray-400">Virtual Practice Capital</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-black font-mono text-[#F5B301]">
                    ${balances.demo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditDemoModalOpen(true);
                        setIsAccountSelectorOpen(false);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#F5B301]/20 hover:bg-[#F5B301]/35 text-[#F5B301] font-bold flex items-center gap-1 cursor-pointer transition-all border border-[#F5B301]/30"
                      title="Edit Demo Balance"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveDemoBalance(10000.00);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-all border border-white/10"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset $10k</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Modals */}
      <Suspense fallback={null}>
        {isTradeModalOpen && (
          <TradeTypeModal
            isOpen={isTradeModalOpen}
            onClose={() => setIsTradeModalOpen(false)}
            activeAccount={accountType}
            availableBalance={currentBalance}
            assets={INITIAL_COIN_ASSETS}
            onExecuteTrade={handleExecuteTrade}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isDepositModalOpen && (
          <DepositModal
            isOpen={isDepositModalOpen}
            onClose={() => setIsDepositModalOpen(false)}
            activeAccount={accountType}
            userEmail={user.email || undefined}
            userUid={user.uid || undefined}
            hasClaimedBonusBefore={
              hasClaimedBonusBefore ||
              Boolean((user as any)?.hasClaimedWelcomeBonus || (user as any)?.bonusClaimed) ||
              transactions.some(t => (t.status === 'Success' || t.status === 'Approved') && (t.bonusAmount || 0) > 0)
            }
            onSuccessDeposit={(depositData) => {
              if (depositData.bonusAmount > 0) {
                setHasClaimedBonusBefore(true);
                if (user?.uid) {
                  try { localStorage.setItem(`forex_bonus_claimed_${user.uid}`, 'true'); } catch (_) {}
                }
              }
              const newTx: TransactionRecord = {
                id: depositData.id || depositData.trxId || `TX-DP-${Date.now().toString().slice(-6)}`,
                trxId: depositData.trxId,
                userUid: user.uid,
                userEmail: user.email || undefined,
                accountType: depositData.accountType,
                type: 'Deposit',
                method: depositData.method,
                amount: depositData.amount,
                bonusAmount: depositData.bonusAmount,
                status: 'Pending',
                proofScreenshot: depositData.proofScreenshot,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
              };
              setTransactions(prev => {
                const filtered = prev.filter(t => t.id !== newTx.id);
                const next = [newTx, ...filtered];
                if (user?.uid) {
                  try {
                    localStorage.setItem(`forex_transactions_${user.uid}`, JSON.stringify(next));
                  } catch (_) {}
                }
                return next;
              });
              setWalletHistoryTab('deposits');
            }}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isWithdrawModalOpen && (
          <WithdrawModal
            isOpen={isWithdrawModalOpen}
            onClose={() => setIsWithdrawModalOpen(false)}
            activeAccount={accountType}
            liveBalance={balances.live}
            bonusBalance={balances.bonus}
            depositBonusGranted={depositBonusGranted}
            userEmail={user.email || undefined}
            userUid={user.uid || undefined}
            onSuccessWithdrawal={(data) => {
              if (data.accountType === 'bonus') {
                const newBonusBal = depositBonusGranted && depositBonusGranted > 0 ? depositBonusGranted : 250.00;
                setBalances(prev => ({
                  ...prev,
                  bonus: newBonusBal
                }));
              } else {
                setBalances(prev => ({
                  ...prev,
                  live: Math.max(0, prev.live - data.amount)
                }));
              }
              const newTx: TransactionRecord = {
                id: data.trxId,
                trxId: data.trxId,
                userUid: user.uid,
                userEmail: user.email || undefined,
                accountType: data.accountType,
                type: 'Withdrawal',
                method: data.method,
                amount: data.amount,
                status: 'Pending',
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
              };
              setTransactions(prev => {
                const cleanTrx = (newTx.trxId || '').trim().toLowerCase();
                const filtered = prev.filter(t => {
                  if (t.id === newTx.id) return false;
                  if (cleanTrx && t.trxId && t.trxId.trim().toLowerCase() === cleanTrx) return false;
                  return true;
                });
                const next = [newTx, ...filtered];
                if (user?.uid) {
                  try {
                    localStorage.setItem(`forex_transactions_${user.uid}`, JSON.stringify(next));
                  } catch (_) {}
                }
                return next;
              });
              setWalletHistoryTab('withdrawals');
            }}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isHelpModalOpen && (
          <HelpLineModal
            isOpen={isHelpModalOpen}
            onClose={() => setIsHelpModalOpen(false)}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {isFeedbackModalOpen && (
          <FeedbackModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setIsFeedbackModalOpen(false)}
          />
        )}
      </Suspense>

      {/* KYC Document Submission Modal */}
      <Suspense fallback={null}>
        {isKycModalOpen && (
          <KYCModal
            isOpen={isKycModalOpen}
            onClose={() => setIsKycModalOpen(false)}
            userProfile={{
              uid: user.uid,
              email: user.email || '',
              fullName: user.displayName || ''
            }}
            currentKycStatus={kycStatus}
            onSuccessSubmitted={() => {
              setKycStatus('pending');
              const myReqs = getStoredKycRequests();
              const latest = myReqs.find(r => r.userUid === user.uid);
              if (latest) {
                setKycReason('');
              }
            }}
          />
        )}
      </Suspense>

      {/* Change Password Modal */}
      <Suspense fallback={null}>
        {isChangePasswordModalOpen && (
          <ChangePasswordModal
            isOpen={isChangePasswordModalOpen}
            onClose={() => setIsChangePasswordModalOpen(false)}
            userEmail={user?.email}
          />
        )}
      </Suspense>

      {/* User Notifications Modal */}
      <AnimatePresence>
        {isNotifModalOpen && (
          <div key="notif-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              key="notif-modal-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0E1322] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#080B14]">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Notifications & Alerts</h3>
                    <p className="text-[10px] text-gray-400">Updates regarding account status & trades</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNotifModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
                {userNotifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Bell className="w-8 h-8 text-gray-600 mx-auto" />
                    <p className="text-gray-400 font-bold">No notifications yet</p>
                    <p className="text-[10px] text-gray-600">You will receive notifications here when your KYC request is reviewed.</p>
                  </div>
                ) : (
                  userNotifications.map((notif, idx) => (
                    <div
                      key={`notif-${notif.id || 'notif'}-${idx}`}
                      onClick={() => {
                        markNotificationAsRead(notif.id);
                        setUserNotifications(getStoredNotifications(user.uid));
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1 relative ${
                        !notif.read ? 'ring-1 ring-[#F5B301]/40 ' : ''
                      }${
                        notif.type === 'kyc_approved' || notif.type === 'deposit_approved' || notif.type === 'withdrawal_approved'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : notif.type === 'kyc_rejected' || notif.type === 'deposit_rejected' || notif.type === 'withdrawal_rejected'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                          : 'bg-gray-900 border-white/10 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                          {notif.type === 'kyc_approved' || notif.type === 'deposit_approved' || notif.type === 'withdrawal_approved' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : notif.type === 'kyc_rejected' || notif.type === 'deposit_rejected' || notif.type === 'withdrawal_rejected' ? (
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          ) : (
                            <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                          <span>{notif.title}</span>
                          {!notif.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F5B301] inline-block" />
                          )}
                        </h4>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {safeFormatTime(notif.createdAt, 'Recently')}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 pl-5">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-white/10 bg-[#080B14]">
                <button
                  onClick={() => setIsNotifModalOpen(false)}
                  className="w-full py-2 rounded-xl bg-gray-900 border border-white/10 text-gray-300 font-bold text-xs hover:bg-white/5 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share Referral Link Modal with WhatsApp, Facebook, Messenger, Telegram, Gmail & Copy Link */}
      <Suspense fallback={null}>
        {isShareReferralModalOpen && (
          <ShareReferralModal
            isOpen={isShareReferralModalOpen}
            onClose={() => setIsShareReferralModalOpen(false)}
            referralCode={userReferralId}
            referralLink={userReferralLink}
            onOpenMyReferrals={() => {
              setIsShareReferralModalOpen(false);
              setIsMyReferralsModalOpen(true);
            }}
            referralCount={myReferralsCount}
          />
        )}
      </Suspense>

      {/* My Total Referrals Modal (Shows referred accounts, Live/Bonus/Demo balances, $25 reward status) */}
      <Suspense fallback={null}>
        {isMyReferralsModalOpen && (
          <MyReferralsModal
            isOpen={isMyReferralsModalOpen}
            onClose={() => setIsMyReferralsModalOpen(false)}
            userUid={user.uid}
            referralCode={userReferralId}
            referralLink={userReferralLink}
            onOpenShareModal={() => setIsShareReferralModalOpen(true)}
          />
        )}
      </Suspense>

      {/* Avatar Picker & Gallery Upload Modal */}
      <Suspense fallback={null}>
        {isAvatarModalOpen && (
          <AvatarPickerModal
            isOpen={isAvatarModalOpen}
            onClose={() => setIsAvatarModalOpen(false)}
            currentAvatar={userAvatar}
            userUid={user.uid}
            displayName={user.displayName || undefined}
            email={user.email || undefined}
            onAvatarUpdated={(newAvatar) => {
              setUserAvatar(newAvatar);
            }}
          />
        )}
      </Suspense>

      {/* Edit Demo Balance Modal */}
      <Suspense fallback={null}>
        {isEditDemoModalOpen && (
          <EditDemoBalanceModal
            isOpen={isEditDemoModalOpen}
            onClose={() => setIsEditDemoModalOpen(false)}
            currentBalance={balances.demo || 10000}
            onSave={handleSaveDemoBalance}
          />
        )}
      </Suspense>

      {/* Account Type Selector Modal (Live, Bonus, Demo) */}
      <AnimatePresence>
        {isAccountSelectorOpen && (
          <div
            id="account-selector-modal-backdrop"
            onClick={() => setIsAccountSelectorOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              id="account-selector-modal-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md bg-[#0C1222] border border-[#F5B301]/30 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#080B16]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#F5B301]/10 border border-[#F5B301]/30 text-[#F5B301]">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white tracking-wide">Select Trading Account</h3>
                    <p className="text-[11px] text-gray-400">Choose which balance to trade or view</p>
                  </div>
                </div>
                <button
                  id="account-selector-close-btn"
                  type="button"
                  onClick={() => setIsAccountSelectorOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Account Options List */}
              <div className="p-4 space-y-3">
                {/* 1. Live Account */}
                <button
                  id="select-account-live-btn"
                  type="button"
                  onClick={() => {
                    setAccountType('live');
                    setIsAccountSelectorOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    accountType === 'live'
                      ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-950/50'
                      : 'bg-[#0F1629] border-white/10 hover:border-emerald-500/40 hover:bg-[#131C33]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      accountType === 'live' ? 'bg-emerald-400 ring-4 ring-emerald-500/20' : 'bg-emerald-500/40'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                          Live Account
                        </span>
                        {accountType === 'live' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9px] font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">Real funds with instant deposit & withdrawals</p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-black text-white">
                      ${balances.live.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>

                {/* 2. Bonus Account */}
                <button
                  id="select-account-bonus-btn"
                  type="button"
                  onClick={() => {
                    setAccountType('bonus');
                    setIsAccountSelectorOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    accountType === 'bonus'
                      ? 'bg-amber-950/40 border-[#F5B301]/80 shadow-lg shadow-amber-950/50'
                      : 'bg-[#0F1629] border-white/10 hover:border-[#F5B301]/40 hover:bg-[#131C33]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      accountType === 'bonus' ? 'bg-[#F5B301] ring-4 ring-[#F5B301]/20' : 'bg-[#F5B301]/40'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                          Bonus Account
                        </span>
                        {accountType === 'bonus' && (
                          <span className="px-2 py-0.5 rounded-full bg-[#F5B301]/20 border border-[#F5B301]/40 text-[#F5B301] text-[9px] font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">100% Deposit Bonus & $25 Referral Rewards</p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-black text-[#F5B301]">
                      ${balances.bonus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>

                {/* 3. Demo Account */}
                <button
                  id="select-account-demo-btn"
                  type="button"
                  onClick={() => {
                    setAccountType('demo');
                    setIsAccountSelectorOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                    accountType === 'demo'
                      ? 'bg-sky-950/40 border-sky-500/80 shadow-lg shadow-sky-950/50'
                      : 'bg-[#0F1629] border-white/10 hover:border-sky-500/40 hover:bg-[#131C33]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      accountType === 'demo' ? 'bg-sky-400 ring-4 ring-sky-500/20' : 'bg-sky-500/40'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                          Demo Account
                        </span>
                        {accountType === 'demo' && (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[9px] font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">Risk-free practice trading balance</p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-black text-sky-400">
                      ${balances.demo.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </button>
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-white/10 bg-[#080B16]">
                <button
                  type="button"
                  onClick={() => setIsAccountSelectorOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ForexDashboard;

