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
  onSnapshot, 
  updateDoc, 
  query,
  where,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { TransactionRecord, AccountType } from '../types';
import { addStoredNotification } from './kycSync';
import { cleanFirestoreData } from './depositSync';
import { safeFormatDateTime } from './dateUtils';

export const WITHDRAWAL_REQUESTS_KEY = 'forex_withdrawal_requests_v2';

export function getStoredLocalWithdrawals(): TransactionRecord[] {
  try {
    const raw = localStorage.getItem(WITHDRAWAL_REQUESTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse local withdrawal requests:', e);
  }
  return [];
}

export function saveStoredLocalWithdrawals(withdrawals: TransactionRecord[]): void {
  try {
    localStorage.setItem(WITHDRAWAL_REQUESTS_KEY, JSON.stringify(withdrawals));
  } catch (e) {
    console.warn('Failed to save local withdrawal requests:', e);
  }
}

// In-flight mutex lock to prevent duplicate withdrawal submissions on rapid double clicks
const inFlightWithdrawalPromises = new Map<string, Promise<TransactionRecord>>();

/**
 * Save a new withdrawal request to Firestore & local storage, and deduct live balance immediately
 */
export async function saveWithdrawalRequestToFirestore(request: {
  id?: string;
  trxId?: string;
  userUid?: string;
  userEmail?: string;
  amount: number;
  method: string;
  methodSymbol?: string;
  destinationAddress: string;
  accountType: AccountType;
  depositBonusGranted?: number;
  systemDeductedProfitAmount?: number;
  totalNetProfit?: number;
}): Promise<TransactionRecord> {
  const reqId = request.id || request.trxId || ('WD-' + Math.random().toString(36).substring(2, 9).toUpperCase());
  const cleanAddr = (request.destinationAddress || '').trim().toLowerCase();
  const lockKey = `${request.userUid || 'anon'}_${request.amount}_${cleanAddr}`;

  if (lockKey && inFlightWithdrawalPromises.has(lockKey)) {
    console.warn(`[withdrawalSync] Rapid duplicate withdrawal click intercepted for '${lockKey}'.`);
    return inFlightWithdrawalPromises.get(lockKey)!;
  }

  const withdrawalPromise = (async (): Promise<TransactionRecord> => {
    const nowIso = new Date().toISOString();

    const wdDoc: TransactionRecord = {
      id: reqId,
      userUid: request.userUid || 'anonymous',
      userEmail: request.userEmail || 'trader@forexpro.com',
      accountType: request.accountType || 'live',
      type: 'Withdrawal',
      method: request.method,
      amount: request.amount,
      status: 'Pending',
      timestamp: nowIso.replace('T', ' ').substring(0, 16),
      txHash: request.trxId || reqId,
      trxId: request.trxId || reqId,
      destinationAddress: request.destinationAddress || '',
      depositBonusGranted: request.depositBonusGranted,
      systemDeductedProfitAmount: request.systemDeductedProfitAmount,
      totalNetProfit: request.totalNetProfit,
      createdAt: nowIso
    };

    // 1. Post to persistent Backend API (Permanent server storage in withdrawals.json)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const apiRes = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reqId,
          trxId: reqId,
          userUid: request.userUid,
          userEmail: request.userEmail,
          amount: request.amount,
          method: request.method,
          methodSymbol: request.methodSymbol || request.method,
          destinationAddress: request.destinationAddress,
          accountType: request.accountType,
          depositBonusGranted: request.depositBonusGranted,
          systemDeductedProfitAmount: request.systemDeductedProfitAmount,
          totalNetProfit: request.totalNetProfit
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (apiRes.ok) {
        console.log('[withdrawalSync] ✅ Backend API acknowledged withdrawal:', reqId);
      }
    } catch (apiErr) {
      console.warn('[withdrawalSync] Backend API withdrawal POST note:', apiErr);
    }

    // 2. Local storage cache
    const local = getStoredLocalWithdrawals();
    const updatedLocal = [wdDoc, ...local.filter(w => w.id !== reqId && w.txHash !== reqId)];
    saveStoredLocalWithdrawals(updatedLocal);

    // 3. Instant BroadcastChannel notification for zero-latency across tabs & Admin Panel
    try {
      if (typeof window !== 'undefined') {
        const bc = new BroadcastChannel('forex_admin_channel');
        bc.postMessage({ type: 'NEW_WITHDRAWAL', withdrawal: wdDoc });
        bc.close();
        window.dispatchEvent(new CustomEvent('forex_withdrawal_submitted', { detail: wdDoc }));
      }
    } catch (_) {}

    // 4. Sync to Firestore root withdrawals collection (Permanent Cloud Storage)
    const firestorePayload = cleanFirestoreData({
      id: reqId,
      trxId: reqId,
      userUid: request.userUid || 'anonymous',
      userEmail: request.userEmail || 'trader@forexpro.com',
      accountType: request.accountType || 'live',
      type: 'Withdrawal',
      amount: request.amount,
      method: request.method,
      methodSymbol: request.methodSymbol || request.method,
      destinationAddress: request.destinationAddress || '',
      status: 'Pending',
      depositBonusGranted: request.depositBonusGranted,
      systemDeductedProfitAmount: request.systemDeductedProfitAmount,
      totalNetProfit: request.totalNetProfit,
      timestamp: nowIso.replace('T', ' ').substring(0, 16),
      createdAt: nowIso,
      deductedAtSubmit: true,
      updatedAt: serverTimestamp()
    });

    try {
      const wdRef = doc(db, 'withdrawals', reqId);
      await Promise.race([
        setDoc(wdRef, firestorePayload, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3500))
      ]);
    } catch (error) {
      console.warn('Firestore root withdrawal request save note:', error);
    }

    // 5. Permanently save withdrawal inside User Account subcollections & update balances
    if (request.userUid && request.userUid !== 'anonymous') {
      try {
        const userRef = doc(db, 'users', request.userUid);
        const userSnap = await getDoc(userRef);
        const uData = userSnap.exists() ? userSnap.data() : {};
        const currentLive = uData.liveBalance ?? uData.balances?.live ?? 0;
        const currentBonus = uData.bonusBalance ?? uData.balances?.bonus ?? 0;
        const currentDemo = uData.demoBalance ?? uData.balances?.demo ?? 10000;

        let newLive = currentLive;
        let newBonus = currentBonus;

        if (request.accountType === 'live') {
          newLive = Math.max(0, currentLive - request.amount);
        } else if (request.accountType === 'bonus') {
          const baseGranted = (request.depositBonusGranted !== undefined && request.depositBonusGranted > 0)
            ? request.depositBonusGranted
            : Number(uData.depositBonusGranted ?? (currentBonus > 0 ? 250.00 : 0));
          const actualGranted = Math.min(currentBonus, baseGranted);
          newBonus = actualGranted;
        }

        // Update User account balance permanently in Firestore
        await setDoc(userRef, {
          liveBalance: newLive,
          bonusBalance: newBonus,
          depositBonusGranted: request.accountType === 'bonus' ? newBonus : (uData.depositBonusGranted ?? 250),
          balances: {
            live: newLive,
            bonus: newBonus,
            demo: currentDemo
          },
          lastWithdrawalAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Save permanent copy inside user's own 'withdrawals' subcollection
        try {
          const userSubWdRef = doc(db, 'users', request.userUid, 'withdrawals', reqId);
          await setDoc(userSubWdRef, firestorePayload, { merge: true });
        } catch (_) {}

        // Save permanent copy inside user's own 'transactions' subcollection
        try {
          const userSubTxRef = doc(db, 'users', request.userUid, 'transactions', reqId);
          await setDoc(userSubTxRef, firestorePayload, { merge: true });
        } catch (_) {}

      } catch (e) {
        console.warn('User permanent account update note on withdrawal submit:', e);
      }
    }

    return wdDoc;
  })();

  if (lockKey) {
    inFlightWithdrawalPromises.set(lockKey, withdrawalPromise);
  }

  try {
    return await withdrawalPromise;
  } finally {
    if (lockKey) {
      inFlightWithdrawalPromises.delete(lockKey);
    }
  }
}

/**
 * Subscribe to all withdrawal requests in real time for Admin Panel
 */
export function subscribeAllWithdrawalsFromFirestore(
  onUpdate: (withdrawals: TransactionRecord[]) => void
): () => void {
  let isCleanedUp = false;
  let inMemoryWithdrawals: TransactionRecord[] = getStoredLocalWithdrawals();

  const mergeWithdrawals = (newItems: TransactionRecord[]) => {
    const map = new Map<string, TransactionRecord>();
    for (const item of inMemoryWithdrawals) {
      if (item.id) map.set(item.id, item);
    }
    for (const item of newItems) {
      if (!item.id) continue;
      const existing = map.get(item.id);
      if (!existing) {
        map.set(item.id, item);
      } else {
        const isRejected = item.status === 'Rejected' || existing.status === 'Rejected';
        const isApproved = item.status === 'Approved' || existing.status === 'Approved' || item.status === 'Success' || existing.status === 'Success';
        map.set(item.id, {
          ...existing,
          ...item,
          status: isRejected ? 'Rejected' : isApproved ? 'Approved' : (item.status || existing.status || 'Pending'),
          rejectionReason: item.rejectionReason || existing.rejectionReason,
          rejectedAt: item.rejectedAt || existing.rejectedAt
        });
      }
    }
    const merged = Array.from(map.values()).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    inMemoryWithdrawals = merged;
    saveStoredLocalWithdrawals(merged);
    onUpdate(merged);
  };

  // 1. Initial fetch & poll Backend API
  const fetchFromApi = async () => {
    if (isCleanedUp) return;
    try {
      const res = await fetch('/api/withdrawals');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.withdrawals) && data.withdrawals.length > 0) {
          mergeWithdrawals(data.withdrawals);
        }
      }
    } catch (_) {}
  };

  fetchFromApi();
  const pollInterval = setInterval(fetchFromApi, 4000);

  // 2. Local BroadcastChannel & Window event listeners
  let bc: BroadcastChannel | null = null;
  const handleWindowWithdrawalStatus = (e: any) => {
    if (e.detail?.withdrawalId) {
      const targetId = e.detail.withdrawalId;
      inMemoryWithdrawals = inMemoryWithdrawals.map(w => 
        (w.id === targetId || (w.trxId && w.trxId === targetId) || (w.txHash && w.txHash === targetId)) ? {
          ...w,
          status: e.detail.status || 'Rejected',
          rejectionReason: e.detail.rejectionReason || w.rejectionReason,
          rejectedAt: e.detail.rejectedAt || w.rejectedAt,
          approvedAt: e.detail.approvedAt || w.approvedAt
        } : w
      );
      saveStoredLocalWithdrawals(inMemoryWithdrawals);
      onUpdate(inMemoryWithdrawals);
    }
  };

  try {
    if (typeof window !== 'undefined') {
      window.addEventListener('forex_withdrawal_status_changed', handleWindowWithdrawalStatus);
      bc = new BroadcastChannel('forex_admin_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_WITHDRAWAL' && event.data.withdrawal) {
          mergeWithdrawals([event.data.withdrawal]);
        } else if (event.data?.type === 'WITHDRAWAL_STATUS_CHANGED' && event.data.withdrawalId) {
          const targetId = event.data.withdrawalId;
          inMemoryWithdrawals = inMemoryWithdrawals.map(w => 
            (w.id === targetId || (w.trxId && w.trxId === targetId) || (w.txHash && w.txHash === targetId)) ? {
              ...w,
              status: event.data.status || 'Rejected',
              rejectionReason: event.data.rejectionReason || w.rejectionReason,
              rejectedAt: event.data.rejectedAt || w.rejectedAt,
              approvedAt: event.data.approvedAt || w.approvedAt
            } : w
          );
          saveStoredLocalWithdrawals(inMemoryWithdrawals);
          onUpdate(inMemoryWithdrawals);
        }
      };
    }
  } catch (_) {}

  // 3. Firestore onSnapshot
  let unsubscribeFirestore = () => {};
  try {
    const colRef = collection(db, 'withdrawals');
    unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
      if (isCleanedUp) return;
      const loaded: TransactionRecord[] = [];
      snapshot.forEach((snapDoc) => {
        const d = snapDoc.data();
        loaded.push({
          id: snapDoc.id,
          userUid: d.userUid,
          userEmail: d.userEmail,
          accountType: d.accountType || 'live',
          type: 'Withdrawal',
          method: d.method || 'Auto Gateway',
          amount: Number(d.amount) || 0,
          status: d.status || 'Pending',
          timestamp: d.timestamp || safeFormatDateTime(d.createdAt, 'Recently'),
          txHash: d.trxId || snapDoc.id,
          trxId: d.trxId || snapDoc.id,
          destinationAddress: d.destinationAddress || '',
          depositBonusGranted: d.depositBonusGranted,
          systemDeductedProfitAmount: d.systemDeductedProfitAmount,
          totalNetProfit: d.totalNetProfit,
          rejectionReason: d.rejectionReason || undefined,
          createdAt: d.createdAt
        });
      });

      if (loaded.length > 0) {
        mergeWithdrawals(loaded);
      }
    }, (err) => {
      if (!isQuotaError(err)) {
        console.warn('Firestore withdrawals listener note:', err);
      }
    });
  } catch (err) {
    console.warn('Firestore listener init note:', err);
  }

  return () => {
    isCleanedUp = true;
    clearInterval(pollInterval);
    if (bc) {
      try { bc.close(); } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('forex_withdrawal_status_changed', handleWindowWithdrawalStatus);
    }
    unsubscribeFirestore();
  };
}

/**
 * Helper to merge and deduplicate user withdrawal records
 */
function mergeUserWithdrawalsList(current: TransactionRecord[], incoming: TransactionRecord[]): TransactionRecord[] {
  const map = new Map<string, TransactionRecord>();
  const trxMap = new Map<string, string>();

  const all = [...incoming, ...current];
  for (const item of all) {
    if (!item) continue;
    const cleanId = (item.id || item.trxId || item.txHash || '').trim();
    if (!cleanId) continue;

    const trxKey = (item.trxId || item.txHash || '').trim().toLowerCase();
    if (trxKey && trxMap.has(trxKey)) {
      const existingId = trxMap.get(trxKey)!;
      const existing = map.get(existingId);
      if (existing) {
        map.set(existingId, {
          ...existing,
          ...item,
          id: existing.id || item.id,
          status: (item.status && item.status !== 'Pending') ? item.status : existing.status,
          rejectionReason: item.rejectionReason || existing.rejectionReason
        });
        continue;
      }
    }

    if (trxKey) {
      trxMap.set(trxKey, cleanId);
    }

    const existing = map.get(cleanId);
    if (!existing) {
      map.set(cleanId, item);
    } else {
      map.set(cleanId, {
        ...existing,
        ...item,
        status: (item.status && item.status !== 'Pending') ? item.status : existing.status,
        rejectionReason: item.rejectionReason || existing.rejectionReason
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * Subscribe to current user's withdrawal requests in real time.
 * Connects persistent backend API + Firestore onSnapshot + BroadcastChannel + Local storage
 */
export function subscribeUserWithdrawalsFromFirestore(
  userUid: string,
  userEmail: string | undefined,
  onUpdate: (withdrawals: TransactionRecord[]) => void
): () => void {
  if (!userUid && !userEmail) {
    onUpdate([]);
    return () => {};
  }

  const cleanUid = userUid ? userUid.trim() : '';
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';

  const isUserMatch = (w: { userUid?: string; userEmail?: string }) => {
    const matchUid = Boolean(cleanUid && w.userUid && w.userUid === cleanUid);
    const matchEmail = Boolean(cleanEmail && w.userEmail && w.userEmail.trim().toLowerCase() === cleanEmail);
    return matchUid || matchEmail;
  };

  // 1. Initial immediate emit from local storage (0ms delay)
  const initialLocal = getStoredLocalWithdrawals().filter(isUserMatch);
  let currentList: TransactionRecord[] = initialLocal;
  if (initialLocal.length > 0) {
    onUpdate(currentList);
  }

  const emitUpdate = (newItems: TransactionRecord[]) => {
    currentList = mergeUserWithdrawalsList(currentList, newItems);
    onUpdate(currentList);

    try {
      const allLocal = getStoredLocalWithdrawals();
      const otherWithdrawals = allLocal.filter(w => !isUserMatch(w));
      saveStoredLocalWithdrawals([...currentList, ...otherWithdrawals]);
    } catch (_) {}
  };

  // 2. Fetch from persistent backend API immediately and poll every 3.5s
  const fetchBackendWithdrawals = async () => {
    try {
      const url = `/api/withdrawals?userUid=${encodeURIComponent(cleanUid)}&userEmail=${encodeURIComponent(cleanEmail)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.withdrawals && Array.isArray(data.withdrawals)) {
          const userWds: TransactionRecord[] = data.withdrawals
            .filter(isUserMatch)
            .map((w: any) => ({
              id: w.id,
              userUid: w.userUid,
              userEmail: w.userEmail,
              accountType: w.accountType || 'live',
              type: 'Withdrawal',
              method: w.method || 'Auto Gateway',
              amount: Number(w.amount) || 0,
              status: w.status || 'Pending',
              timestamp: w.timestamp || safeFormatDateTime(w.createdAt, 'Recently'),
              txHash: w.trxId || w.id,
              trxId: w.trxId || w.id,
              destinationAddress: w.destinationAddress || '',
              depositBonusGranted: w.depositBonusGranted,
              systemDeductedProfitAmount: w.systemDeductedProfitAmount,
              totalNetProfit: w.totalNetProfit,
              rejectionReason: w.rejectionReason || undefined,
              createdAt: w.createdAt
            }));
          emitUpdate(userWds);
        }
      }
    } catch (err) {
      console.warn('[withdrawalSync] User withdrawals backend fetch note:', err);
    }
  };

  fetchBackendWithdrawals();
  const pollInterval = setInterval(fetchBackendWithdrawals, 15000);

  // 3. BroadcastChannel listener for real-time status updates
  let bc: BroadcastChannel | null = null;
  try {
    if (typeof window !== 'undefined') {
      bc = new BroadcastChannel('forex_admin_channel');
      bc.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;

        if (msg.type === 'NEW_WITHDRAWAL' && msg.withdrawal && isUserMatch(msg.withdrawal)) {
          emitUpdate([msg.withdrawal]);
        } else if (msg.type === 'WITHDRAWAL_STATUS_CHANGED' && msg.withdrawalId) {
          currentList = currentList.map(w => {
            if (w.id === msg.withdrawalId) {
              return {
                ...w,
                status: msg.status,
                rejectionReason: msg.rejectionReason || w.rejectionReason
              };
            }
            return w;
          });
          onUpdate(currentList);
        }
      };
    }
  } catch (_) {}

  // 4. Firestore onSnapshot (querying both userUid and userEmail)
  const unsubs: Array<() => void> = [];
  if (!isQuotaExceeded()) {
    try {
      const handleSnapshot = (snapshot: any) => {
        const loaded: TransactionRecord[] = [];
        snapshot.forEach((snapDoc: any) => {
          const d = snapDoc.data();
          if (isUserMatch(d)) {
            loaded.push({
              id: snapDoc.id,
              userUid: d.userUid,
              userEmail: d.userEmail,
              accountType: d.accountType || 'live',
              type: 'Withdrawal',
              method: d.method || 'Auto Gateway',
              amount: Number(d.amount) || 0,
              status: d.status || 'Pending',
              timestamp: d.timestamp || safeFormatDateTime(d.createdAt, 'Recently'),
              txHash: d.trxId || snapDoc.id,
              trxId: d.trxId || snapDoc.id,
              destinationAddress: d.destinationAddress || '',
              depositBonusGranted: d.depositBonusGranted,
              systemDeductedProfitAmount: d.systemDeductedProfitAmount,
              totalNetProfit: d.totalNetProfit,
              rejectionReason: d.rejectionReason || undefined,
              createdAt: d.createdAt
            });
          }
        });

        if (loaded.length > 0) {
          emitUpdate(loaded);
        }
      };

      if (cleanUid) {
        const qUid = query(collection(db, 'withdrawals'), where('userUid', '==', cleanUid), limit(50));
        unsubs.push(onSnapshot(qUid, handleSnapshot, () => {}));
      }
      if (cleanEmail) {
        const qEmail = query(collection(db, 'withdrawals'), where('userEmail', '==', cleanEmail), limit(50));
        unsubs.push(onSnapshot(qEmail, handleSnapshot, () => {}));
      }
    } catch (fsErr) {
      console.warn('[withdrawalSync] Firestore listener setup note:', fsErr);
    }
  }

  return () => {
    clearInterval(pollInterval);
    if (bc) {
      bc.close();
    }
    unsubs.forEach(u => {
      try { u(); } catch (_) {}
    });
  };
}

/**
 * Admin action: Approve withdrawal request in Firestore
 */
export async function approveWithdrawalInFirestore(
  withdrawal: TransactionRecord
): Promise<void> {
  const wdId = withdrawal.id;
  const userUid = withdrawal.userUid;
  const amount = withdrawal.amount;
  const nowIso = new Date().toISOString();

  // 1. Update local storage
  const local = getStoredLocalWithdrawals();
  const updatedLocal = local.map(w => w.id === wdId ? { 
    ...w, 
    status: 'Approved' as const, 
    rejectionReason: undefined 
  } : w);
  saveStoredLocalWithdrawals(updatedLocal);

  // 2. Call backend API for persistence
  try {
    fetch(`/api/withdrawals/${encodeURIComponent(wdId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {});
  } catch (_) {}

  // 2b. Broadcast status change across tabs
  try {
    if (typeof window !== 'undefined') {
      const bc = new BroadcastChannel('forex_admin_channel');
      bc.postMessage({ 
        type: 'WITHDRAWAL_STATUS_CHANGED', 
        withdrawalId: wdId, 
        status: 'Approved',
        userUid,
        userEmail: withdrawal.userEmail
      });
      bc.close();
      window.dispatchEvent(new CustomEvent('forex_withdrawal_status_changed', { 
        detail: { withdrawalId: wdId, status: 'Approved' } 
      }));
    }
  } catch (_) {}

  // 3. Update Firestore root and user withdrawal docs
  try {
    const wdRef = doc(db, 'withdrawals', wdId);
    await updateDoc(wdRef, {
      status: 'Approved',
      approvedAt: nowIso,
      updatedAt: serverTimestamp()
    });
    if (userUid && userUid !== 'anonymous') {
      try {
        const userWdRef = doc(db, 'users', userUid, 'withdrawals', wdId);
        await updateDoc(userWdRef, {
          status: 'Approved',
          approvedAt: nowIso,
          updatedAt: serverTimestamp()
        });
      } catch (_) {}
      try {
        const userTxRef = doc(db, 'users', userUid, 'transactions', wdId);
        await updateDoc(userTxRef, {
          status: 'Approved',
          approvedAt: nowIso,
          updatedAt: serverTimestamp()
        });
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Firestore withdrawal approve note:', err);
  }

  // 3. Send in-app notification to user
  if (userUid && userUid !== 'anonymous') {
    addStoredNotification({
      userUid,
      title: 'Withdrawal Approved 💸',
      message: `Your withdrawal of $${amount.toFixed(2)} via ${withdrawal.method} has been approved and successfully processed.`,
      type: 'withdrawal_approved'
    });
  }
}

/**
 * Admin action: Reject withdrawal request in Firestore and refund user balance
 */
export async function rejectWithdrawalInFirestore(
  withdrawalId: string,
  reason: string,
  withdrawalRecord?: TransactionRecord
): Promise<void> {
  const nowIso = new Date().toISOString();
  const finalReason = reason || 'Verification or destination address error';

  // 1. Update local storage
  const local = getStoredLocalWithdrawals();
  const targetRecord = withdrawalRecord || local.find(w => 
    w.id === withdrawalId || (w.trxId && w.trxId === withdrawalId) || (w.txHash && w.txHash === withdrawalId)
  );
  const wasAlreadyRejected = targetRecord?.status === 'Rejected';

  const updatedLocal = local.map(w => 
    (w.id === withdrawalId || (w.trxId && w.trxId === withdrawalId) || (w.txHash && w.txHash === withdrawalId)) ? { 
      ...w, 
      status: 'Rejected' as const, 
      rejectionReason: finalReason,
      rejectedAt: nowIso
    } : w
  );
  saveStoredLocalWithdrawals(updatedLocal);

  // 2. Call backend API for persistence
  try {
    await fetch(`/api/withdrawals/${encodeURIComponent(withdrawalId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: finalReason, withdrawal: targetRecord })
    });
  } catch (_) {}

  // 2b. Broadcast rejection status across tabs
  try {
    if (typeof window !== 'undefined') {
      const bc = new BroadcastChannel('forex_admin_channel');
      bc.postMessage({ 
        type: 'WITHDRAWAL_STATUS_CHANGED', 
        withdrawalId, 
        status: 'Rejected',
        rejectionReason: finalReason,
        rejectedAt: nowIso,
        userUid: targetRecord?.userUid,
        userEmail: targetRecord?.userEmail
      });
      bc.close();
      window.dispatchEvent(new CustomEvent('forex_withdrawal_status_changed', { 
        detail: { withdrawalId, status: 'Rejected', rejectionReason: finalReason, rejectedAt: nowIso } 
      }));
    }
  } catch (_) {}

  // 3. Update Firestore root and user withdrawal docs with resilient setDoc merge
  try {
    const wdRef = doc(db, 'withdrawals', withdrawalId);
    await setDoc(wdRef, {
      status: 'Rejected',
      rejectionReason: finalReason,
      rejectedAt: nowIso,
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (targetRecord?.userUid && targetRecord.userUid !== 'anonymous') {
      try {
        const userWdRef = doc(db, 'users', targetRecord.userUid, 'withdrawals', withdrawalId);
        await setDoc(userWdRef, {
          status: 'Rejected',
          rejectionReason: finalReason,
          rejectedAt: nowIso,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (_) {}
      try {
        const userTxRef = doc(db, 'users', targetRecord.userUid, 'transactions', withdrawalId);
        await setDoc(userTxRef, {
          status: 'Rejected',
          rejectionReason: finalReason,
          rejectedAt: nowIso,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Firestore withdrawal reject note:', err);
  }

  // 3. If balance was deducted during withdrawal submission and hasn't been refunded yet, refund back to user
  if (!wasAlreadyRejected && targetRecord && targetRecord.userUid && targetRecord.userUid !== 'anonymous') {
    try {
      const userRef = doc(db, 'users', targetRecord.userUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        const acc = targetRecord.accountType || 'live';
        const currentLive = uData.liveBalance ?? uData.balances?.live ?? 0;
        const currentBonus = uData.bonusBalance ?? uData.balances?.bonus ?? 0;
        const currentDemo = uData.demoBalance ?? uData.balances?.demo ?? 10000;

        let newLive = currentLive;
        let newBonus = currentBonus;

        if (acc === 'live') {
          newLive = currentLive + targetRecord.amount;
        } else if (acc === 'bonus') {
          const refundBonus = targetRecord.amount + (targetRecord.systemDeductedProfitAmount || 0);
          newBonus = currentBonus + refundBonus;
        }

        await setDoc(userRef, {
          liveBalance: newLive,
          bonusBalance: newBonus,
          balances: {
            live: newLive,
            bonus: newBonus,
            demo: currentDemo
          },
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (err) {
      console.warn('User balance refund on withdrawal reject note:', err);
    }

    // 4. Send in-app notification to user about rejection & refund
    addStoredNotification({
      userUid: targetRecord.userUid,
      title: 'Withdrawal Rejected & Refunded 🔄',
      message: `Your withdrawal request of $${targetRecord.amount.toFixed(2)} was rejected. Reason: ${finalReason}. The amount of $${targetRecord.amount.toFixed(2)} has been refunded to your wallet.`,
      type: 'withdrawal_rejected'
    });
  }
}
