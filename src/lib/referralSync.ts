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
 * Fetches user referrals from Firestore cloud database as primary source,
 * merged with backend API cache, ensuring permanent cross-device persistence.
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

  // 1. Direct Cloud Firestore Query (Permanent multi-device source)
  try {
    const candidateQueries = [];

    if (cleanUid) {
      // Query 1: by referrerUid
      candidateQueries.push(query(collection(db, 'users'), where('referrerUid', '==', cleanUid)));
      // Query 2: by referralCode matching UID
      candidateQueries.push(query(collection(db, 'users'), where('referralCode', '==', cleanUid)));
      // Query 3: by referredBy matching UID
      candidateQueries.push(query(collection(db, 'users'), where('referredBy', '==', cleanUid)));
    }

    if (cleanCode && cleanCode !== cleanUid) {
      candidateQueries.push(query(collection(db, 'users'), where('referralCode', '==', cleanCode)));
      candidateQueries.push(query(collection(db, 'users'), where('referrerUid', '==', cleanCode)));
    }

    const snaps = await Promise.allSettled(candidateQueries.map(q => getDocs(q)));

    for (const res of snaps) {
      if (res.status === 'fulfilled') {
        res.value.forEach(docSnap => {
          const uData: any = docSnap.data() || {};
          const docId = docSnap.id;

          // Exclude self
          if (cleanUid && (docId === cleanUid || uData.uid === cleanUid)) return;

          const acc = normalizeReferredAccount(uData, docId);
          accountMap.set(acc.uid, acc);

          // Background sync to server if needed
          try {
            fetch('/api/users/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...uData,
                uid: docId,
                referrerUid: cleanUid,
                referralCode: cleanCode
              })
            }).catch(() => {});
          } catch (_) {}
        });
      }
    }
  } catch (firestoreErr) {
    console.warn('[referralSync] Firestore query notice:', firestoreErr);
  }

  // 2. Fetch from Express Backend API
  try {
    const q = new URLSearchParams();
    if (cleanCode) q.set('referralCode', cleanCode);
    if (cleanUid) q.set('userUid', cleanUid);

    const apiRes = await fetch(`/api/referrals/my-referrals?${q.toString()}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && Array.isArray(data.referrals)) {
        data.referrals.forEach((acc: ReferredAccount) => {
          if (!acc || !acc.uid) return;
          // Exclude self
          if (cleanUid && acc.uid === cleanUid) return;

          const existing = accountMap.get(acc.uid);
          if (!existing) {
            accountMap.set(acc.uid, acc);
          } else {
            // Merge qualifying status and balances if API has newer state
            accountMap.set(acc.uid, {
              ...existing,
              ...acc,
              hasQualifyingDeposit: existing.hasQualifyingDeposit || acc.hasQualifyingDeposit,
              bonusEarned: (existing.hasQualifyingDeposit || acc.hasQualifyingDeposit) ? 25.00 : 0,
              status: (existing.hasQualifyingDeposit || acc.hasQualifyingDeposit) ? 'Active (Bonus Paid)' : existing.status
            });
          }
        });
      }
    }
  } catch (apiErr) {
    console.warn('[referralSync] API query notice:', apiErr);
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
 * Sets up a real-time Firestore subscription to update referrals whenever
 * a new account signs up with the user's UID.
 */
export function subscribeToReferralUpdates(
  userUid: string,
  onUpdate: (summary: ReferralSummary) => void
): () => void {
  if (!userUid) return () => {};

  let isSubscribed = true;
  const cleanUid = userUid.trim();

  // Run initial fetch
  fetchUserReferrals(cleanUid).then(summary => {
    if (isSubscribed) {
      onUpdate(summary);
    }
  }).catch(() => {});

  // Setup Firestore listener for instant live reactivity
  const unsubs: (() => void)[] = [];

  try {
    const qReferrer = query(collection(db, 'users'), where('referrerUid', '==', cleanUid));
    const unsub1 = onSnapshot(qReferrer, () => {
      fetchUserReferrals(cleanUid).then(summary => {
        if (isSubscribed) onUpdate(summary);
      }).catch(() => {});
    }, (err) => {
      console.warn('[referralSync] Realtime subscription notice:', err);
    });
    unsubs.push(unsub1);

    const qCode = query(collection(db, 'users'), where('referralCode', '==', cleanUid));
    const unsub2 = onSnapshot(qCode, () => {
      fetchUserReferrals(cleanUid).then(summary => {
        if (isSubscribed) onUpdate(summary);
      }).catch(() => {});
    }, () => {});
    unsubs.push(unsub2);
  } catch (_) {}

  // Periodic polling interval for cross-device updates
  const interval = setInterval(() => {
    if (isSubscribed) {
      fetchUserReferrals(cleanUid).then(summary => {
        if (isSubscribed) onUpdate(summary);
      }).catch(() => {});
    }
  }, 8000);

  return () => {
    isSubscribed = false;
    unsubs.forEach(u => {
      try { u(); } catch (_) {}
    });
    clearInterval(interval);
  };
}
