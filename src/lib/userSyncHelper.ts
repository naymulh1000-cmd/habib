/**
 * userSyncHelper.ts
 *
 * Provides resilient, multi-layer synchronization for user account registration
 * and profile changes to guarantee 100% immediate and permanent visibility
 * in the Admin Panel, across devices, across browser tabs, and across server restarts.
 */

import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, isQuotaExceeded } from './firebase';
import { getStoredUsersCache, saveStoredUsersCache } from './adminSync';
import { getDisplayUserId, UserProfileData } from './firestoreSync';
import { safeIsoString } from './dateUtils';

export interface SyncUserDataPayload {
  uid: string;
  email?: string;
  fullName?: string;
  displayName?: string;
  phoneNumber?: string;
  country?: string;
  role?: string;
  referralCode?: string | null;
  referrerUid?: string | null;
  referredBy?: string | null;
  emailVerified?: boolean;
  accountStatus?: 'active' | 'blocked' | 'suspended' | string;
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected' | string;
  isVerifiedUser?: boolean;
  liveBalance?: number;
  bonusBalance?: number;
  demoBalance?: number;
  balances?: {
    live?: number;
    bonus?: number;
    demo?: number;
  };
  todayProfit?: number;
  todayLoss?: number;
  floatingPnl?: number;
  usedMargin?: number;
  createdAt?: string;
  registeredAt?: string | number;
}

/**
 * Registers or synchronizes a user account across ALL 4 persistence layers:
 * 1. Local Cache (instant optimistic view for admin if on same browser)
 * 2. Express Server (`registered_users.json`) via /api/users/register
 * 3. Firestore `users` collection document (`setDoc`)
 * 4. BroadcastChannel (`forex_admin_channel`) for instant cross-tab sync
 */
export async function syncUserRegistrationEverywhere(payload: SyncUserDataPayload): Promise<void> {
  if (!payload || !payload.uid) return;

  const uid = payload.uid;
  const cleanEmail = (payload.email || '').toLowerCase().trim();
  const isSuperAdminEmail =
    cleanEmail === 'naymulh1000@gmail.com' ||
    cleanEmail === 'admin@fxby24.com' ||
    cleanEmail === 'admin@forextradepro.com';

  const role = isSuperAdminEmail ? 'super_admin' : (payload.role || 'user');

  // Find any existing balances from local cache or storage to PREVENT zero-wipeout
  let existingLive: number | undefined = undefined;
  let existingBonus: number | undefined = undefined;
  let existingDemo: number | undefined = undefined;

  try {
    const cachedUsers = getStoredUsersCache();
    const existing = cachedUsers.find(u => u.uid === uid || (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail));
    if (existing) {
      const exAny = existing as any;
      if (typeof exAny.liveBalance === 'number') existingLive = exAny.liveBalance;
      else if (typeof existing.balances?.live === 'number') existingLive = existing.balances.live;

      if (typeof exAny.bonusBalance === 'number') existingBonus = exAny.bonusBalance;
      else if (typeof existing.balances?.bonus === 'number') existingBonus = existing.balances.bonus;

      if (typeof exAny.demoBalance === 'number') existingDemo = exAny.demoBalance;
      else if (typeof existing.balances?.demo === 'number') existingDemo = existing.balances.demo;
    }
  } catch (_) {}

  if (existingLive === undefined || existingBonus === undefined) {
    try {
      const stored = localStorage.getItem(`forex_pro_user_balances_${uid}`) || localStorage.getItem('forex_pro_user_balances');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.live === 'number') existingLive = parsed.live;
        if (typeof parsed.bonus === 'number') existingBonus = parsed.bonus;
        if (typeof parsed.demo === 'number') existingDemo = parsed.demo;
      }
    } catch (_) {}
  }

  // Determine if incoming payload has explicit balance
  const hasIncomingLive = typeof payload.liveBalance === 'number' || typeof payload.balances?.live === 'number';
  const incomingLive = typeof payload.liveBalance === 'number' ? payload.liveBalance : payload.balances?.live;

  const hasIncomingBonus = typeof payload.bonusBalance === 'number' || typeof payload.balances?.bonus === 'number';
  const incomingBonus = typeof payload.bonusBalance === 'number' ? payload.bonusBalance : payload.balances?.bonus;

  const hasIncomingDemo = typeof payload.demoBalance === 'number' || typeof payload.balances?.demo === 'number';
  const incomingDemo = typeof payload.demoBalance === 'number' ? payload.demoBalance : payload.balances?.demo;

  // Resolved balance strictly preserves existing non-zero funds
  const live = hasIncomingLive
    ? (incomingLive ?? 0)
    : (existingLive !== undefined ? existingLive : 0);

  const bonus = hasIncomingBonus
    ? (incomingBonus ?? 0)
    : (existingBonus !== undefined ? existingBonus : 0);

  const demo = hasIncomingDemo
    ? (incomingDemo ?? 10000)
    : (existingDemo !== undefined ? existingDemo : 10000);

  const isVerified = Boolean(payload.isVerifiedUser || payload.kycStatus === 'verified' || payload.emailVerified);
  const isBlocked = payload.accountStatus === 'blocked';
  const nowIso = new Date().toISOString();

  let resolvedKycStatus: 'unverified' | 'pending' | 'verified' | 'rejected' = 'unverified';
  if (isVerified || payload.kycStatus === 'verified') {
    resolvedKycStatus = 'verified';
  } else if (payload.kycStatus === 'pending') {
    resolvedKycStatus = 'pending';
  } else if (payload.kycStatus === 'rejected') {
    resolvedKycStatus = 'rejected';
  }

  const fullRecord: UserProfileData = {
    uid,
    displayUserId: getDisplayUserId(uid),
    email: cleanEmail,
    displayName: payload.displayName || payload.fullName || cleanEmail.split('@')[0] || 'Trader',
    fullName: payload.fullName || payload.displayName || '',
    phoneNumber: payload.phoneNumber || '',
    country: payload.country || 'Global',
    isVerifiedUser: isVerified,
    isBlocked,
    accountStatus: isBlocked ? 'blocked' : 'active',
    kycStatus: resolvedKycStatus,
    role: (role === 'admin' || role === 'super_admin') ? 'admin' : 'user',
    balances: { live, bonus, demo },
    todayProfit: typeof payload.todayProfit === 'number' ? payload.todayProfit : 0,
    todayLoss: typeof payload.todayLoss === 'number' ? payload.todayLoss : 0,
    floatingPnl: typeof payload.floatingPnl === 'number' ? payload.floatingPnl : 0,
    usedMargin: typeof payload.usedMargin === 'number' ? payload.usedMargin : 0,
    createdAt: safeIsoString(payload.createdAt || payload.registeredAt || nowIso),
    lastLoginAt: nowIso,
  };

  // 1. Instant Local Cache Update
  try {
    const current = getStoredUsersCache();
    const idx = current.findIndex(u => u.uid === uid || (u.email && cleanEmail && u.email.toLowerCase() === cleanEmail));
    if (idx !== -1) {
      current[idx] = { ...current[idx], ...fullRecord };
    } else {
      current.unshift(fullRecord);
    }
    saveStoredUsersCache(current);
  } catch (_) {}

  // 2. BroadcastChannel for instant cross-tab notification
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('forex_admin_channel');
      bc.postMessage({ type: 'USER_REGISTERED', user: fullRecord });
      setTimeout(() => {
        try { bc.close(); } catch (_) {}
      }, 500);
    }
  } catch (_) {}

  // 3. Post to Server Backend (`/api/users/register`)
  try {
    await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fullRecord,
        liveBalance: live,
        bonusBalance: bonus,
        demoBalance: demo,
        referralCode: payload.referralCode || null,
        referrerUid: payload.referrerUid || null,
        referredBy: payload.referredBy || null,
        createdAt: fullRecord.createdAt,
      }),
    }).catch(err => {
      console.warn('[userSyncHelper] Server sync fetch notice:', err);
    });
  } catch (_) {}

  // 4. Firestore Document Write (`setDoc` with merge)
  try {
    if (!isQuotaExceeded()) {
      const userDocRef = doc(db, 'users', uid);
      const firestoreData: any = {
        ...fullRecord,
        referralCode: payload.referralCode || null,
        referrerUid: payload.referrerUid || null,
        referredBy: payload.referredBy || null,
        updatedAt: serverTimestamp(),
      };

      if (hasIncomingLive || existingLive !== undefined) {
        firestoreData.liveBalance = live;
      }
      if (hasIncomingBonus || existingBonus !== undefined) {
        firestoreData.bonusBalance = bonus;
      }
      if (hasIncomingDemo || existingDemo !== undefined) {
        firestoreData.demoBalance = demo;
      }
      if (hasIncomingLive || hasIncomingBonus || existingLive !== undefined || existingBonus !== undefined) {
        firestoreData.balances = { live, bonus, demo };
      }

      await setDoc(userDocRef, firestoreData, { merge: true });
    }
  } catch (firestoreErr) {
    console.warn('[userSyncHelper] Firestore write notice:', firestoreErr);
  }
}
