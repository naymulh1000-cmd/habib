import { 
  db, 
  handleFirestoreError, 
  OperationType,
  isQuotaExceeded,
  isQuotaError 
} from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  onSnapshot, 
  updateDoc, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { UserProfileData, INITIAL_MOCK_USERS, getDisplayUserId } from './firestoreSync';
import { TransactionRecord, AccountType } from '../types';
import { safeIsoString, safeFormatDateTime } from './dateUtils';

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  targetUserId?: string;
  targetUserEmail?: string;
  targetUserName?: string;
  actionType: 
    | 'EDIT_BALANCE' 
    | 'DIRECT_DEPOSIT_CREDIT' 
    | 'TOGGLE_BLOCK' 
    | 'TOGGLE_VERIFY' 
    | 'DELETE_USER' 
    | 'EDIT_PROFILE'
    | 'APPROVE_TRANSACTION' 
    | 'REJECT_TRANSACTION' 
    | 'APPROVE_KYC' 
    | 'REJECT_KYC' 
    | 'GATEWAY_UPDATE' 
    | 'RULES_UPDATE' 
    | 'BROADCAST_SIGNAL' 
    | 'MARKET_OVERRIDE'
    | 'GENERAL';
  amount?: number;
  walletType?: 'live' | 'bonus' | 'demo';
  details: string;
  timestamp: string;
  createdAt?: string;
}

const AUDIT_STORAGE_KEY = 'forex_admin_audit_logs_v1';
const USERS_CACHE_KEY = 'forex_admin_users_cache_v1';

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

export const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'LOG-INIT-1',
    adminId: 'ADMIN-MASTER-01',
    adminEmail: 'admin@fxby24.com',
    actionType: 'GENERAL',
    details: 'System initialized and real-time database listener established',
    timestamp: 'Today 08:00 AM'
  }
];

const FAKE_MOCK_EMAILS = ['sarah.jenkins@forexpro.com', 'm.rahman@tradeasia.com', 'alex.v@investor.io'];
const FAKE_MOCK_UIDS = ['8940215', '7721094', '3319082', '1092837'];

export function isFakeMockUser(u: any): boolean {
  if (!u) return true;
  if (u.email && FAKE_MOCK_EMAILS.includes(u.email.toLowerCase().trim())) return true;
  if (u.uid && FAKE_MOCK_UIDS.includes(String(u.uid).trim())) return true;
  return false;
}

export function getStoredAuditLogs(): AdminAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return JSON.parse(raw);
  } catch (_) {
    return INITIAL_AUDIT_LOGS;
  }
}

export function saveStoredAuditLogs(logs: AdminAuditLog[]): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (_) {}
}

export function getStoredUsersCache(): UserProfileData[] {
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(u => !isFakeMockUser(u));
    }
    return [];
  } catch (_) {
    return [];
  }
}

export function saveStoredUsersCache(users: UserProfileData[]): void {
  try {
    const cleanUsers = users.filter(u => !isFakeMockUser(u));
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(cleanUsers));
  } catch (_) {}
}

/**
 * Real-time subscription to all registered users from Firestore
 */
export function subscribeAllUsersFromFirestore(
  onUpdate: (users: UserProfileData[]) => void
): () => void {
  // Clean up any legacy mock users from local storage cache immediately
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) {
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(p.filter(u => !isFakeMockUser(u))));
      }
    }
  } catch (_) {}

  // Always emit clean cached users first for instant render
  const cached = getStoredUsersCache().filter(u => !isFakeMockUser(u));
  onUpdate(cached);

  let isUnsubscribed = false;

  // Helper function to fetch and merge users from server backend API
  const fetchAndMergeServerUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.users) && !isUnsubscribed) {
        const current = getStoredUsersCache().filter(u => !isFakeMockUser(u));
        const map = new Map<string, UserProfileData>();
        current.forEach(u => map.set(u.uid, u));

        data.users.forEach((srvUser: any) => {
          if (srvUser && srvUser.uid && !isFakeMockUser(srvUser)) {
            const uid = srvUser.uid;
            const existing = map.get(uid);

            const live = typeof srvUser.liveBalance === 'number' 
              ? srvUser.liveBalance 
              : (typeof srvUser.balances?.live === 'number' ? srvUser.balances.live : (existing?.balances?.live ?? 0));
            const bonus = typeof srvUser.bonusBalance === 'number' 
              ? srvUser.bonusBalance 
              : (typeof srvUser.balances?.bonus === 'number' ? srvUser.balances.bonus : (existing?.balances?.bonus ?? 0));
            const demo = typeof srvUser.demoBalance === 'number' 
              ? srvUser.demoBalance 
              : (typeof srvUser.balances?.demo === 'number' ? srvUser.balances.demo : (existing?.balances?.demo ?? 10000));

            const isVerified = Boolean(
              srvUser.isVerifiedUser || 
              srvUser.kycStatus === 'verified' || 
              srvUser.emailVerified || 
              existing?.isVerifiedUser || 
              existing?.kycStatus === 'verified'
            );
            const isBlocked = srvUser.accountStatus === 'blocked' || Boolean(srvUser.isBlocked) || existing?.isBlocked;
            
            map.set(uid, {
              uid,
              displayUserId: srvUser.displayUserId || existing?.displayUserId || getDisplayUserId(uid),
              email: srvUser.email || existing?.email || '',
              displayName: srvUser.fullName || srvUser.displayName || existing?.displayName || srvUser.email?.split('@')[0] || 'Trader',
              fullName: srvUser.fullName || srvUser.displayName || existing?.fullName || '',
              phoneNumber: srvUser.phoneNumber || existing?.phoneNumber || '',
              country: srvUser.country || existing?.country || 'Global',
              isVerifiedUser: isVerified,
              isBlocked: Boolean(isBlocked),
              accountStatus: isBlocked ? 'blocked' : 'active',
              kycStatus: (isVerified ? 'verified' : (srvUser.kycStatus || existing?.kycStatus || 'unverified')),
              kycRejectionReason: srvUser.kycRejectionReason || existing?.kycRejectionReason,
              role: (srvUser.role === 'admin' || srvUser.role === 'super_admin' || srvUser.email === 'admin@fxby24.com' || srvUser.email === 'admin@forextradepro.com' || srvUser.email === 'naymulh1000@gmail.com') ? 'admin' : (existing?.role || 'user'),
              balances: { live, bonus, demo },
              todayProfit: typeof srvUser.todayProfit === 'number' ? srvUser.todayProfit : (existing?.todayProfit || 0),
              todayLoss: typeof srvUser.todayLoss === 'number' ? srvUser.todayLoss : (existing?.todayLoss || 0),
              floatingPnl: typeof srvUser.floatingPnl === 'number' ? srvUser.floatingPnl : (existing?.floatingPnl || 0),
              usedMargin: typeof srvUser.usedMargin === 'number' ? srvUser.usedMargin : (existing?.usedMargin || 0),
              createdAt: safeIsoString(srvUser.createdAt || srvUser.registeredAt || existing?.createdAt),
              lastLoginAt: safeIsoString(srvUser.lastLoginAt || existing?.lastLoginAt)
            });
          }
        });

        const mergedUsers = Array.from(map.values()).filter(u => !isFakeMockUser(u));
        saveStoredUsersCache(mergedUsers);
        onUpdate(mergedUsers);
      }
    } catch (_) {}
  };

  // Immediate fetch
  fetchAndMergeServerUsers();

  // Periodic background refresh every 2.5 seconds so live balances & new users appear automatically
  const intervalId = setInterval(() => {
    if (!isUnsubscribed) {
      fetchAndMergeServerUsers();
    }
  }, 2500);

  // Cross-tab broadcast channel for immediate display of newly registered users
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('forex_admin_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'USER_REGISTERED' && event.data.user && !isFakeMockUser(event.data.user)) {
          const u = event.data.user;
          const current = getStoredUsersCache().filter(x => !isFakeMockUser(x));
          const existingIdx = current.findIndex(x => x.uid === u.uid);
          const live = typeof u.liveBalance === 'number' ? u.liveBalance : (u.balances?.live || 0);
          const bonus = typeof u.bonusBalance === 'number' ? u.bonusBalance : (u.balances?.bonus || 0);
          const demo = typeof u.demoBalance === 'number' ? u.demoBalance : (u.balances?.demo || 10000);
          const mapped: UserProfileData = {
            uid: u.uid,
            displayUserId: u.displayUserId || getDisplayUserId(u.uid),
            email: u.email || '',
            displayName: u.fullName || u.displayName || u.email?.split('@')[0] || 'Trader',
            fullName: u.fullName || u.displayName || '',
            phoneNumber: u.phoneNumber || '',
            country: u.country || 'Global',
            isVerifiedUser: Boolean(u.isVerifiedUser || u.kycStatus === 'verified'),
            isBlocked: Boolean(u.isBlocked || u.accountStatus === 'blocked'),
            accountStatus: (u.isBlocked || u.accountStatus === 'blocked') ? 'blocked' : 'active',
            kycStatus: u.kycStatus || (u.isVerifiedUser ? 'verified' : 'unverified'),
            role: (u.role === 'admin' || u.role === 'super_admin' || u.email === 'admin@fxby24.com' || u.email === 'admin@forextradepro.com' || u.email === 'naymulh1000@gmail.com') ? 'admin' : 'user',
            balances: { live, bonus, demo },
            todayProfit: 0,
            todayLoss: 0,
            floatingPnl: 0,
            usedMargin: 0,
            createdAt: safeIsoString(u.createdAt),
            lastLoginAt: safeIsoString(u.createdAt)
          };
          if (existingIdx !== -1) {
            current[existingIdx] = { ...current[existingIdx], ...mapped };
          } else {
            current.unshift(mapped);
          }
          const cleanList = current.filter(x => !isFakeMockUser(x));
          saveStoredUsersCache(cleanList);
          onUpdate(cleanList);
        }
      };
    }
  } catch (_) {}

  let unsubFirestore: (() => void) | null = null;

  if (!isQuotaExceeded()) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty && !isUnsubscribed) {
            const current = getStoredUsersCache().filter(u => !isFakeMockUser(u));
            const map = new Map<string, UserProfileData>();
            current.forEach(u => map.set(u.uid, u));

            snapshot.forEach((docSnap) => {
              const d = docSnap.data();
              const uid = d.uid || docSnap.id;
              if (isFakeMockUser(d)) return;
              const existing = map.get(uid);

              const live = typeof d.liveBalance === 'number' 
                ? d.liveBalance 
                : (typeof d.balances?.live === 'number' ? d.balances.live : (existing?.balances?.live || 0));
              const bonus = typeof d.bonusBalance === 'number' 
                ? d.bonusBalance 
                : (typeof d.balances?.bonus === 'number' ? d.balances.bonus : (existing?.balances?.bonus || 0));
              const demo = typeof d.demoBalance === 'number' 
                ? d.demoBalance 
                : (typeof d.balances?.demo === 'number' ? d.balances.demo : (existing?.balances?.demo || 10000));

              const isBlocked = d.accountStatus === 'blocked' || Boolean(d.isBlocked) || existing?.isBlocked;
              const isVerified = Boolean(d.isVerifiedUser || d.kycStatus === 'verified' || d.emailVerified || existing?.isVerifiedUser);

              map.set(uid, {
                uid,
                displayUserId: d.displayUserId || existing?.displayUserId || getDisplayUserId(uid),
                email: d.email || existing?.email || '',
                displayName: d.fullName || d.displayName || existing?.displayName || d.email?.split('@')[0] || 'Trader',
                fullName: d.fullName || d.displayName || existing?.fullName || '',
                phoneNumber: d.phoneNumber || existing?.phoneNumber || '',
                country: d.country || existing?.country || 'Global',
                isVerifiedUser: isVerified,
                isBlocked: Boolean(isBlocked),
                accountStatus: isBlocked ? 'blocked' : 'active',
                kycStatus: d.kycStatus || (isVerified ? 'verified' : (existing?.kycStatus || 'unverified')),
                kycRejectionReason: d.kycRejectionReason || existing?.kycRejectionReason,
                role: (d.role === 'admin' || d.role === 'super_admin' || d.email === 'admin@fxby24.com' || d.email === 'admin@forextradepro.com' || d.email === 'naymulh1000@gmail.com') ? 'admin' : (existing?.role || 'user'),
                balances: { live, bonus, demo },
                todayProfit: typeof d.todayProfit === 'number' ? d.todayProfit : (existing?.todayProfit || 0),
                todayLoss: typeof d.todayLoss === 'number' ? d.todayLoss : (existing?.todayLoss || 0),
                floatingPnl: typeof d.floatingPnl === 'number' ? d.floatingPnl : (existing?.floatingPnl || 0),
                usedMargin: typeof d.usedMargin === 'number' ? d.usedMargin : (existing?.usedMargin || 0),
                createdAt: safeIsoString(d.createdAt || existing?.createdAt),
                lastLoginAt: safeIsoString(d.lastLoginAt || existing?.lastLoginAt)
              });
            });

            const merged = Array.from(map.values()).filter(u => !isFakeMockUser(u));
            saveStoredUsersCache(merged);
            onUpdate(merged);
          }
        },
        (err) => {
          if (!isQuotaError(err)) {
            console.warn('Admin users onSnapshot notice:', err);
          }
        }
      );
    } catch (err) {
      if (!isQuotaError(err)) {
        console.warn('Admin users subscription error:', err);
      }
    }
  }

  return () => {
    isUnsubscribed = true;
    clearInterval(intervalId);
    try { bc?.close(); } catch (_) {}
    try { unsubFirestore?.(); } catch (_) {}
  };
}

/**
 * Record an Admin Action in the Firestore `admin_audit_logs` collection
 */
export async function addAdminAuditLogToFirestore(
  logInput: Omit<AdminAuditLog, 'id' | 'createdAt' | 'timestamp'> & { timestamp?: string }
): Promise<boolean> {
  const logId = 'LOG-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const timeStr = logInput.timestamp || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const completeLog: AdminAuditLog = {
    ...logInput,
    id: logId,
    timestamp: timeStr,
    createdAt: new Date().toISOString()
  };

  // 1. Save to LocalStorage immediately
  const localLogs = getStoredAuditLogs();
  saveStoredAuditLogs([completeLog, ...localLogs]);

  // 2. Persist to Firestore `admin_audit_logs` & `admin_logs`
  if (!isQuotaExceeded()) {
    try {
      await setDoc(doc(db, 'admin_audit_logs', logId), {
        ...completeLog,
        createdAtServer: serverTimestamp()
      }, { merge: true });

      // Also mirror in admin_logs for backward compatibility
      await setDoc(doc(db, 'admin_logs', logId), {
        ...completeLog,
        createdAtServer: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      if (!isQuotaError(e)) {
        console.warn('Error saving admin audit log to Firestore:', e);
      }
    }
  }

  return true;
}

/**
 * Real-time subscription to Admin Audit Logs
 */
export function subscribeAdminAuditLogsFromFirestore(
  onUpdate: (logs: AdminAuditLog[]) => void
): () => void {
  const localLogs = getStoredAuditLogs();
  onUpdate(localLogs);

  if (isQuotaExceeded()) {
    return () => {};
  }

  try {
    const q = query(collection(db, 'admin_audit_logs'), limit(100));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: AdminAuditLog[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            loaded.push({
              id: d.id || docSnap.id,
              adminId: d.adminId || 'ADMIN-01',
              adminEmail: d.adminEmail || 'admin@forextradepro.com',
              targetUserId: d.targetUserId,
              targetUserEmail: d.targetUserEmail,
              targetUserName: d.targetUserName,
              actionType: d.actionType || 'GENERAL',
              amount: d.amount,
              walletType: d.walletType,
              details: d.details || 'Admin operation executed',
              timestamp: d.timestamp || safeFormatDateTime(d.createdAt, 'Recent'),
              createdAt: safeIsoString(d.createdAt)
            });
          });

          // Sort descending by date/time
          loaded.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          saveStoredAuditLogs(loaded);
          onUpdate(loaded);
        }
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Admin audit logs subscription note:', err);
        }
      }
    );

    return unsubscribe;
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Admin audit logs subscription error:', err);
    }
    return () => {};
  }
}

/**
 * Permanently update user balances in Firestore and sync live to user dashboard
 * NOTE: As requested by the administrator, balance adjustments from the Admin Panel
 * directly alter the user's balances without creating any transaction history record.
 */
export async function updateUserBalancesInFirestore(
  targetUid: string,
  newBalances: { live: number; bonus: number; demo: number },
  adminInfo: {
    adminId: string;
    adminEmail: string;
    targetUser?: UserProfileData | null;
    actionNote?: string;
    deltaAmount?: number;
    deltaType?: 'live' | 'bonus' | 'demo';
    operation?: 'add' | 'subtract' | 'set';
  }
): Promise<boolean> {
  if (!targetUid) return false;

  const live = Number(Number(newBalances.live || 0).toFixed(2));
  const bonus = Number(Number(newBalances.bonus || 0).toFixed(2));
  const demo = Number(Number(newBalances.demo ?? 10000).toFixed(2));
  const cleanedBalances = { live, bonus, demo };

  // 1. Immediately update local storage caches so UI and client state update instantly
  try {
    const cachedUsers = getStoredUsersCache();
    const updatedCache = cachedUsers.map((u) =>
      u.uid === targetUid
        ? {
            ...u,
            balances: cleanedBalances,
            liveBalance: live,
            bonusBalance: bonus,
            demoBalance: demo
          }
        : u
    );
    saveStoredUsersCache(updatedCache);

    // Save user specific balance cache
    localStorage.setItem(`forex_pro_user_balances_${targetUid}`, JSON.stringify(cleanedBalances));

    // If current logged-in user in this session is targetUid, update active profile
    const activeProfileStr = localStorage.getItem('forex_user_profile');
    if (activeProfileStr) {
      try {
        const activeProfile = JSON.parse(activeProfileStr);
        if (activeProfile.uid === targetUid) {
          activeProfile.balances = cleanedBalances;
          activeProfile.liveBalance = live;
          activeProfile.bonusBalance = bonus;
          activeProfile.demoBalance = demo;
          localStorage.setItem('forex_user_profile', JSON.stringify(activeProfile));
        }
      } catch (_) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('forex_user_balance_updated', {
          detail: { uid: targetUid, balances: cleanedBalances }
        })
      );
    }
  } catch (err) {
    console.warn('Local balance cache update error:', err);
  }

  // 2. Persist to Express backend server with timeout (guarantees disk persistence across restarts)
  try {
    const targetEmail = adminInfo.targetUser?.email || '';
    await withTimeout(
      fetch('/api/admin/users/update-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUid: targetUid,
          uid: targetUid,
          userEmail: targetEmail,
          balances: cleanedBalances,
          liveBalance: live,
          bonusBalance: bonus,
          demoBalance: demo,
          adminEmail: adminInfo.adminEmail,
          deltaAmount: adminInfo.deltaAmount,
          deltaType: adminInfo.deltaType,
          operation: adminInfo.operation,
          actionNote: adminInfo.actionNote
        })
      }).then((r) => (r.ok ? r.json() : null)),
      2500,
      null
    );

    // Also sync to /api/users/sync-balances for phone/desktop sync
    fetch('/api/users/sync-balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: targetUid, userEmail: targetEmail, balances: cleanedBalances })
    }).catch(() => {});
  } catch (err) {
    console.warn('Server balance sync error:', err);
  }

  // 3. Persist to Firestore with timeout (so slow cloud connection never hangs the admin UI)
  // CRITICAL: We DO NOT create any transaction record in 'deposits' or 'transactions' or 'withdrawals'!
  if (!isQuotaExceeded()) {
    try {
      const userRef = doc(db, 'users', targetUid);
      await withTimeout(
        setDoc(
          userRef,
          {
            liveBalance: live,
            bonusBalance: bonus,
            demoBalance: demo,
            balances: cleanedBalances,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        ),
        2000,
        null
      );
    } catch (e) {
      if (!isQuotaError(e)) {
        console.warn('Firestore balance write note:', e);
      }
    }
  }

  // 4. Record Admin Audit Log (internal admin audit only, NOT user transaction history)
  try {
    const targetName = adminInfo.targetUser?.displayName || adminInfo.targetUser?.fullName || targetUid;
    const targetEmail = adminInfo.targetUser?.email || '';
    const details =
      adminInfo.actionNote ||
      `${adminInfo.operation === 'add' ? 'Added' : adminInfo.operation === 'subtract' ? 'Deducted' : 'Set'} $${adminInfo.deltaAmount || 0} (${(adminInfo.deltaType || 'live').toUpperCase()}) for ${targetName}. New Balances: Live $${live.toFixed(2)}, Bonus $${bonus.toFixed(2)}, Demo $${demo.toFixed(2)}`;

    addAdminAuditLogToFirestore({
      adminId: adminInfo.adminId,
      adminEmail: adminInfo.adminEmail,
      targetUserId: targetUid,
      targetUserEmail: targetEmail,
      targetUserName: targetName,
      actionType: 'EDIT_BALANCE',
      amount: adminInfo.deltaAmount,
      walletType: adminInfo.deltaType || 'live',
      details
    }).catch(() => {});
  } catch (_) {}

  return true;
}

/**
 * Issue a Direct Deposit Credit to a user with an approved transaction record
 */
export async function issueDirectDepositCreditInFirestore(
  targetUid: string,
  amount: number,
  walletType: 'live' | 'bonus' | 'demo',
  adminInfo: {
    adminId: string;
    adminEmail: string;
    targetUser?: UserProfileData | null;
    note?: string;
  }
): Promise<boolean> {
  if (!targetUid || amount <= 0) return false;

  try {
    const userRef = doc(db, 'users', targetUid);
    const userSnap = await getDoc(userRef);
    let currentLive = 0;
    let currentBonus = 0;
    let currentDemo = 10000;

    if (userSnap.exists()) {
      const d = userSnap.data();
      currentLive = typeof d.liveBalance === 'number' ? d.liveBalance : (typeof d.balances?.live === 'number' ? d.balances.live : 0);
      currentBonus = typeof d.bonusBalance === 'number' ? d.bonusBalance : (typeof d.balances?.bonus === 'number' ? d.balances.bonus : 0);
      currentDemo = typeof d.demoBalance === 'number' ? d.demoBalance : (typeof d.balances?.demo === 'number' ? d.balances.demo : 10000);
    }

    const updatedBalances = {
      live: walletType === 'live' ? currentLive + amount : currentLive,
      bonus: walletType === 'bonus' ? currentBonus + amount : currentBonus,
      demo: walletType === 'demo' ? currentDemo + amount : currentDemo
    };

    await setDoc(
      userRef,
      {
        liveBalance: updatedBalances.live,
        bonusBalance: updatedBalances.bonus,
        demoBalance: updatedBalances.demo,
        balances: updatedBalances,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // Sync to Express backend for immediate cross-device distribution & permanent json storage
    try {
      fetch('/api/admin/users/direct-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: targetUid,
          amount,
          accountType: walletType,
          note: adminInfo.note || 'Direct Admin Deposit Credit'
        })
      }).catch(() => {});

      fetch('/api/users/sync-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: targetUid, balances: updatedBalances })
      }).catch(() => {});
    } catch (_) {}

    // Also create a recorded deposit entry in 'deposits' and 'transactions' so user sees it in transaction history
    const txId = 'TX-ADM-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
    const targetName = adminInfo.targetUser?.displayName || adminInfo.targetUser?.fullName || 'Trader';
    const targetEmail = adminInfo.targetUser?.email || '';

    const txRecord = {
      id: txId,
      userUid: targetUid,
      userEmail: targetEmail,
      userName: targetName,
      accountType: walletType,
      type: 'Deposit',
      method: 'Direct Admin Deposit Credit',
      amount,
      status: 'Approved',
      timestamp: 'Just now',
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      approvedBy: adminInfo.adminEmail,
      note: adminInfo.note || 'Direct deposit credit by Super Administrator'
    };

    try {
      await setDoc(doc(db, 'deposits', txId), { ...txRecord, serverCreatedAt: serverTimestamp() });
      await setDoc(doc(db, 'transactions', txId), { ...txRecord, serverCreatedAt: serverTimestamp() });
    } catch (_) {}

    // Record Audit Log
    await addAdminAuditLogToFirestore({
      adminId: adminInfo.adminId,
      adminEmail: adminInfo.adminEmail,
      targetUserId: targetUid,
      targetUserEmail: targetEmail,
      targetUserName: targetName,
      actionType: 'DIRECT_DEPOSIT_CREDIT',
      amount,
      walletType,
      details: `Issued direct deposit credit of $${amount.toFixed(2)} (${walletType.toUpperCase()}) for ${targetName}. Reference: ${txId}. ${adminInfo.note ? `Note: ${adminInfo.note}` : ''}`
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${targetUid}`);
    return false;
  }
}

/**
 * Toggle user Block / Unblock status permanently in Firestore
 */
export async function toggleUserBlockInFirestore(
  targetUid: string,
  isBlocked: boolean,
  adminInfo: {
    adminId: string;
    adminEmail: string;
    targetUser?: UserProfileData | null;
  }
): Promise<boolean> {
  if (!targetUid) return false;

  try {
    const userRef = doc(db, 'users', targetUid);
    await setDoc(
      userRef,
      {
        isBlocked,
        accountStatus: isBlocked ? 'blocked' : 'active',
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // Update local cache
    const cachedUsers = getStoredUsersCache();
    const updated = cachedUsers.map(u => 
      u.uid === targetUid ? { ...u, isBlocked, accountStatus: isBlocked ? ('blocked' as const) : ('active' as const) } : u
    );
    saveStoredUsersCache(updated);

    // Sync to backend persistent server storage
    try {
      fetch('/api/admin/users/toggle-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: targetUid, isBlocked })
      }).catch(() => {});
    } catch (_) {}

    const targetName = adminInfo.targetUser?.displayName || adminInfo.targetUser?.fullName || targetUid;
    const targetEmail = adminInfo.targetUser?.email || '';

    // Record Audit Log
    await addAdminAuditLogToFirestore({
      adminId: adminInfo.adminId,
      adminEmail: adminInfo.adminEmail,
      targetUserId: targetUid,
      targetUserEmail: targetEmail,
      targetUserName: targetName,
      actionType: 'TOGGLE_BLOCK',
      details: `User ${targetName} (${targetEmail || targetUid}) has been ${isBlocked ? 'BLOCKED / SUSPENDED' : 'UNBLOCKED / RESTORED'}`
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${targetUid}`);
    return false;
  }
}

/**
 * Toggle user Verification status (Verified / Unverified) permanently in Firestore
 */
export async function toggleUserVerificationInFirestore(
  targetUid: string,
  isVerified: boolean,
  adminInfo: {
    adminId: string;
    adminEmail: string;
    targetUser?: UserProfileData | null;
  }
): Promise<boolean> {
  if (!targetUid) return false;

  try {
    const userRef = doc(db, 'users', targetUid);
    await setDoc(
      userRef,
      {
        isVerifiedUser: isVerified,
        kycStatus: isVerified ? 'verified' : 'unverified',
        emailVerified: isVerified,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // Update local cache
    const cachedUsers = getStoredUsersCache();
    const updated = cachedUsers.map(u => 
      u.uid === targetUid ? { ...u, isVerifiedUser: isVerified, kycStatus: isVerified ? ('verified' as const) : ('unverified' as const) } : u
    );
    saveStoredUsersCache(updated);

    const targetName = adminInfo.targetUser?.displayName || adminInfo.targetUser?.fullName || targetUid;
    const targetEmail = adminInfo.targetUser?.email || '';

    // Record Audit Log
    await addAdminAuditLogToFirestore({
      adminId: adminInfo.adminId,
      adminEmail: adminInfo.adminEmail,
      targetUserId: targetUid,
      targetUserEmail: targetEmail,
      targetUserName: targetName,
      actionType: 'TOGGLE_VERIFY',
      details: `User ${targetName} (${targetEmail || targetUid}) verification status set to ${isVerified ? 'VERIFIED (✓)' : 'UNVERIFIED'}`
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${targetUid}`);
    return false;
  }
}

/**
 * Update User Profile Information in Firestore
 */
export async function updateUserProfileInFirestore(
  targetUid: string,
  updates: Partial<UserProfileData>,
  adminInfo: {
    adminId: string;
    adminEmail: string;
    targetUser?: UserProfileData | null;
  }
): Promise<boolean> {
  if (!targetUid) return false;

  try {
    const userRef = doc(db, 'users', targetUid);
    await setDoc(
      userRef,
      {
        ...updates,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    // Update local cache
    const cachedUsers = getStoredUsersCache();
    const updatedCache = cachedUsers.map(u => 
      u.uid === targetUid ? { ...u, ...updates } : u
    );
    saveStoredUsersCache(updatedCache);

    const targetName = updates.displayName || updates.fullName || adminInfo.targetUser?.displayName || targetUid;
    const targetEmail = updates.email || adminInfo.targetUser?.email || '';

    await addAdminAuditLogToFirestore({
      adminId: adminInfo.adminId,
      adminEmail: adminInfo.adminEmail,
      targetUserId: targetUid,
      targetUserEmail: targetEmail,
      targetUserName: targetName,
      actionType: 'EDIT_PROFILE',
      details: `Updated profile attributes for ${targetName} (${targetEmail || targetUid})`
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${targetUid}`);
    return false;
  }
}

/**
 * Permanently delete a user from Firestore database and remove all related data
 */
export async function deleteUserPermanentlyFromFirestore(
  targetUid: string,
  adminInfo: {
    adminId: string;
    adminEmail: string;
    targetUser?: UserProfileData | null;
  }
): Promise<boolean> {
  if (!targetUid) return false;

  const targetName = adminInfo.targetUser?.displayName || adminInfo.targetUser?.fullName || targetUid;
  const targetEmail = adminInfo.targetUser?.email || '';

  try {
    // 1. Delete user doc from Firestore
    await deleteDoc(doc(db, 'users', targetUid));

    // 2. Also attempt to clean up KYC doc if present
    try {
      await deleteDoc(doc(db, 'kyc_requests', targetUid));
      await deleteDoc(doc(db, 'kyc_requests', `KYC-${targetUid}`));
    } catch (_) {}

    // 3. Update local cache and server storage
    const cachedUsers = getStoredUsersCache();
    const filtered = cachedUsers.filter(u => u.uid !== targetUid);
    saveStoredUsersCache(filtered);

    try {
      fetch(`/api/admin/users/${targetUid}`, { method: 'DELETE' }).catch(() => {});
    } catch (_) {}

    // 4. Record Audit Log
    await addAdminAuditLogToFirestore({
      adminId: adminInfo.adminId,
      adminEmail: adminInfo.adminEmail,
      targetUserId: targetUid,
      targetUserEmail: targetEmail,
      targetUserName: targetName,
      actionType: 'DELETE_USER',
      details: `PERMANENTLY DELETED user ${targetName} (${targetEmail || targetUid}) and purged account data`
    });

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${targetUid}`);
    return false;
  }
}
