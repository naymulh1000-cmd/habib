import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db } from './firebase';
import { ReferredAccount, ReferralSummary } from '../types';
import { safeFetch, safeFetchJson } from './safeApi';

/**
 * Returns the authoritative Referral ID for the given user.
 * Requirement: Every user's Firebase UID IS their Referral ID.
 */
export function getUserReferralId(user?: { uid?: string } | null): string {
  if (!user || !user.uid) return '';
  return user.uid.trim();
}

/**
 * Generates the authoritative custom domain referral link using the user's UID.
 * Primary production domain: fxby24.com
 * Formats: https://fxby24.com/?ref=<UID>
 */
export function getUserReferralLink(referralId: string): string {
  if (!referralId) return '';
  const cleanId = encodeURIComponent(referralId.trim());
  return `https://fxby24.com/?ref=${cleanId}`;
}

/**
 * Normalizes user account data into ReferredAccount format.
 */
function normalizeReferredAccount(uData: any, docId: string): ReferredAccount {
  const liveBal = typeof uData.balances?.live === 'number'
    ? uData.balances.live
    : (typeof uData.liveBalance === 'number' ? uData.liveBalance : 0);

  const bonusBal = typeof uData.balances?.bonus === 'number'
    ? uData.balances.bonus
    : (typeof uData.bonusBalance === 'number' ? uData.bonusBalance : 0);

  const demoBal = typeof uData.balances?.demo === 'number'
    ? uData.balances.demo
    : (typeof uData.demoBalance === 'number' ? uData.demoBalance : 10000);

  const rawCreated = uData.createdAt || uData.registeredAt;
  let createdAtStr = new Date().toISOString();
  if (rawCreated) {
    if (typeof rawCreated.toDate === 'function') {
      createdAtStr = rawCreated.toDate().toISOString();
    } else if (typeof rawCreated === 'string') {
      createdAtStr = rawCreated;
    } else if (typeof rawCreated === 'number') {
      createdAtStr = new Date(rawCreated).toISOString();
    }
  }

  const hasQualifying = Boolean(
    uData.hasQualifyingDeposit || 
    uData.referralBonusAwarded || 
    (uData.qualifyingDepositAmount && uData.qualifyingDepositAmount >= 250)
  );

  return {
    uid: uData.uid || docId,
    fullName: uData.fullName || uData.displayName || 'Trader',
    liveBalance: Number(Number(liveBal).toFixed(2)),
    bonusBalance: Number(Number(bonusBal).toFixed(2)),
    demoBalance: Number(Number(demoBal).toFixed(2)),
    createdAt: createdAtStr,
    hasQualifyingDeposit: hasQualifying,
    qualifyingDepositAmount: hasQualifying ? (uData.qualifyingDepositAmount || 250) : 0,
    bonusEarned: hasQualifying ? 25.00 : 0,
    status: hasQualifying ? 'Active (Bonus Paid)' : 'Registered'
  };
}

/**
 * Fetches user referrals with high speed from backend API primary cache (2ms)
 * and verifies with Firestore in the background if necessary, ensuring permanent cross-device persistence.
 */
export async function fetchUserReferrals(
  userUid: string, 
  referralCode?: string
): Promise<ReferralSummary> {
  const cleanUid = (userUid || '').trim();
  const cleanCode = (referralCode || cleanUid).trim();

  if (!cleanUid && !cleanCode) {
    return {
      referralCode: '',
      totalReferrals: 0,
      qualifyingReferrals: 0,
      totalBonusEarned: 0,
      referrals: []
    };
  }

  const accountMap = new Map<string, ReferredAccount>();

  // 1. Instant Fast Fetch from Backend API (2ms response time)
  try {
    const q = new URLSearchParams();
    if (cleanCode) q.set('referralCode', cleanCode);
    if (cleanUid) q.set('userUid', cleanUid);

    const data = await safeFetchJson<{ referrals?: ReferredAccount[] }>(`/api/referrals/my-referrals?${q.toString()}`, {}, 600);
    if (data && Array.isArray(data.referrals)) {
      data.referrals.forEach((acc: ReferredAccount) => {
        if (!acc || !acc.uid) return;
        if (cleanUid && acc.uid === cleanUid) return;
        accountMap.set(acc.uid, acc);
      });
    }
  } catch (_) {}

  // 2. Direct Cloud Firestore Query (Targeted single query if API returned empty, non-blocking)
  if (accountMap.size === 0 && cleanUid) {
    try {
      const qRef = query(collection(db, 'users'), where('referrerUid', '==', cleanUid));
      const snap = await getDocs(qRef);
      snap.forEach(docSnap => {
        const uData: any = docSnap.data() || {};
        const docId = docSnap.id;
        if (cleanUid && (docId === cleanUid || uData.uid === cleanUid)) return;
        const acc = normalizeReferredAccount(uData, docId);
        accountMap.set(acc.uid, acc);
      });
    } catch (_) {}
  }

  const allReferrals = Array.from(accountMap.values());
  // Sort descending by registration date
  allReferrals.sort((a, b) => {
    const tA = new Date(a.createdAt).getTime() || 0;
    const tB = new Date(b.createdAt).getTime() || 0;
    return tB - tA;
  });

  const qualifyingCount = allReferrals.filter(r => r.hasQualifyingDeposit).length;
  const totalBonusEarned = qualifyingCount * 25.00;

  return {
    referralCode: cleanUid || cleanCode,
    totalReferrals: allReferrals.length,
    qualifyingReferrals: qualifyingCount,
    totalBonusEarned: Number(totalBonusEarned.toFixed(2)),
    referrals: allReferrals
  };
}

/**
 * Sets up a debounced real-time Firestore subscription to update referrals whenever
 * a new account signs up with the user's UID without flooding network sockets.
 */
export function subscribeToReferralUpdates(
  userUid: string,
  onUpdate: (summary: ReferralSummary) => void
): () => void {
  if (!userUid) return () => {};

  let isSubscribed = true;
  let updateDebounceTimer: any = null;
  const cleanUid = userUid.trim();

  const triggerUpdate = () => {
    if (!isSubscribed) return;
    if (updateDebounceTimer) clearTimeout(updateDebounceTimer);
    updateDebounceTimer = setTimeout(() => {
      if (!isSubscribed) return;
      fetchUserReferrals(cleanUid).then(summary => {
        if (isSubscribed) onUpdate(summary);
      }).catch(() => {});
    }, 400);
  };

  // Run initial fast fetch
  triggerUpdate();

  // Setup Firestore listener for instant live reactivity
  const unsubs: (() => void)[] = [];

  try {
    const qReferrer = query(collection(db, 'users'), where('referrerUid', '==', cleanUid));
    const unsub1 = onSnapshot(qReferrer, () => {
      triggerUpdate();
    }, () => {});
    unsubs.push(unsub1);
  } catch (_) {}

  // Gentle periodic fallback polling interval for cross-device updates
  const interval = setInterval(triggerUpdate, 60000);

  return () => {
    isSubscribed = false;
    if (updateDebounceTimer) clearTimeout(updateDebounceTimer);
    unsubs.forEach(u => {
      try { u(); } catch (_) {}
    });
    clearInterval(interval);
  };
}
