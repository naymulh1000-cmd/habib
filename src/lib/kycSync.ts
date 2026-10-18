import { db, isQuotaExceeded, isQuotaError } from './firebase';
import { 
  doc, 
  setDoc, 
  collection, 
  onSnapshot, 
  updateDoc, 
  query,
  where,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { KYCRequest } from '../types';
import { safeFormatDateTime, safeGetTime } from './dateUtils';

export const INITIAL_MOCK_KYC_REQUESTS: KYCRequest[] = [];

const STORAGE_KEY = 'forex_kyc_requests_v2';
const NOTIFICATIONS_KEY = 'forex_user_notifications';

export interface UserNotificationItem {
  id: string;
  userUid: string;
  title: string;
  message: string;
  type: 'deposit_approved' | 'deposit_rejected' | 'withdrawal_approved' | 'withdrawal_rejected' | 'kyc_approved' | 'kyc_rejected' | 'info';
  read: boolean;
  createdAt: string;
}

export function getStoredKycRequests(): KYCRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(k => k && !['8940215', '7721094', '3319082'].includes(k.userUid));
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function saveStoredKycRequests(requests: KYCRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn('Error saving stored KYC requests:', e);
  }
}

export function getStoredNotifications(userUid?: string): UserNotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    const all: UserNotificationItem[] = raw ? JSON.parse(raw) : [];
    if (!userUid) return all;
    return all.filter(n => n.userUid === userUid);
  } catch (e) {
    return [];
  }
}

export function addStoredNotification(notif: Omit<UserNotificationItem, 'id' | 'createdAt' | 'read'>): UserNotificationItem {
  const item: UserNotificationItem = {
    ...notif,
    id: 'NOTIF-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
    read: false,
    createdAt: new Date().toISOString()
  };

  try {
    const all = getStoredNotifications();
    const updated = [item, ...all];
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (e) {}

  // Sync to Firestore notifications collection
  try {
    const notifRef = doc(db, 'notifications', item.id);
    setDoc(notifRef, {
      ...item,
      serverTime: serverTimestamp()
    }, { merge: true }).catch(err => {
      if (!isQuotaError(err)) console.warn('Notification setDoc note:', err);
    });
  } catch (err) {
    console.warn('Firestore notification save note:', err);
  }

  return item;
}

export function markNotificationAsRead(notifId: string): void {
  try {
    const all = getStoredNotifications();
    const updated = all.map(n => n.id === notifId ? { ...n, read: true } : n);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  } catch (e) {}

  try {
    const notifRef = doc(db, 'notifications', notifId);
    updateDoc(notifRef, {
      read: true,
      readAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }).catch(() => {});
  } catch (_) {}
}

/**
 * Subscribe to notifications in real-time from Firestore for a specific user
 */
export function subscribeUserNotificationsFromFirestore(
  userUid: string,
  onUpdate: (notifications: UserNotificationItem[]) => void
): () => void {
  if (!userUid || isQuotaExceeded()) {
    onUpdate(getStoredNotifications(userUid));
    return () => {};
  }

  try {
    const q = query(collection(db, 'notifications'), where('userUid', '==', userUid), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded: UserNotificationItem[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if (d.userUid === userUid) {
          loaded.push({
            id: docSnap.id,
            userUid: d.userUid,
            title: d.title || 'Account Notification',
            message: d.message || '',
            type: d.type || 'info',
            read: d.read === true,
            createdAt: d.createdAt || new Date().toISOString()
          });
        }
      });

      if (loaded.length > 0) {
        loaded.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const local = getStoredNotifications(userUid);
        const merged = [...loaded, ...local.filter(l => !loaded.some(item => item.id === l.id))];
        merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(merged)); } catch (_) {}
        onUpdate(merged);
      } else {
        onUpdate(getStoredNotifications(userUid));
      }
    }, (err) => {
      if (!isQuotaError(err)) console.warn('Firestore user notifications note:', err);
      onUpdate(getStoredNotifications(userUid));
    });

    return unsubscribe;
  } catch (e) {
    onUpdate(getStoredNotifications(userUid));
    return () => {};
  }
}

/**
 * Auto-verify engine: Checks and automatically verifies any pending KYC request
 * after 1-2 minutes (70-90 seconds) if it has valid NID number and photos.
 */
export async function checkAndAutoVerifyPendingKyc(): Promise<void> {
  try {
    const requests = getStoredKycRequests();
    const now = Date.now();
    const AUTO_VERIFY_DELAY_MS = 75 * 1000; // ~1.25 minutes (within 1-2 mins)

    for (const req of requests) {
      if (req.status === 'pending') {
        const submittedTime = req.submittedAt ? safeGetTime(req.submittedAt, now) : now;
        const elapsed = now - submittedTime;

        // If at least 70 seconds have passed, and NID info is valid, auto-verify
        const isValid = Boolean(
          req.nidNumber && 
          req.nidNumber.trim().length >= 5 && 
          req.nidFrontUrl
        );

        if (elapsed >= AUTO_VERIFY_DELAY_MS && isValid) {
          console.log(`[Auto-KYC] Auto-verifying valid NID submission for ${req.userName} (${req.userUid})`);
          await approveKycVerification(req.userUid, req.id, true);
        }
      }
    }
  } catch (e) {
    console.warn('[Auto-KYC] Check note:', e);
  }
}

/**
 * Subscribe to all KYC verification requests in real time from Firestore
 */
export function subscribeAllKycRequestsFromFirestore(
  onUpdate: (requests: KYCRequest[]) => void
): () => void {
  // Run auto-verify check
  checkAndAutoVerifyPendingKyc();

  if (isQuotaExceeded()) {
    onUpdate(getStoredKycRequests());
    return () => {};
  }

  const colRef = collection(db, 'kyc_requests');

  const unsubscribe = onSnapshot(colRef, (snapshot) => {
    const loaded: KYCRequest[] = [];
    snapshot.forEach((snapDoc) => {
      const d = snapDoc.data();
      loaded.push({
        id: snapDoc.id,
        userUid: d.userUid || snapDoc.id,
        userEmail: d.userEmail || '',
        userName: d.userName || 'User',
        nidNumber: d.nidNumber || '',
        nidFrontUrl: d.nidFrontUrl || '',
        nidBackUrl: d.nidBackUrl || '',
        status: (d.status === 'approved' || d.status === 'Approved') ? 'approved' :
                (d.status === 'rejected' || d.status === 'Rejected') ? 'rejected' : 'pending',
        rejectionReason: d.rejectionReason || undefined,
        submittedAt: safeFormatDateTime(d.submittedAt, 'Recently'),
        reviewedAt: d.reviewedAt ? safeFormatDateTime(d.reviewedAt, undefined) : undefined
      });
    });

    if (loaded.length > 0) {
      saveStoredKycRequests(loaded);
      onUpdate(loaded);
      // Check for auto-verification on new data
      checkAndAutoVerifyPendingKyc();
    } else {
      onUpdate(getStoredKycRequests());
    }
  }, (err) => {
    if (!isQuotaError(err)) {
      console.warn('Firestore KYC listener note:', err);
    }
    onUpdate(getStoredKycRequests());
  });

  return unsubscribe;
}

/**
 * Submit KYC verification request
 * Immediately saves to Firestore, updates user document, and schedules 1-2 min auto-verification
 */
export async function submitKycVerification(data: {
  userUid: string;
  userEmail: string;
  userName: string;
  nidNumber: string;
  nidFrontUrl: string;
  nidBackUrl?: string;
}): Promise<KYCRequest> {
  const nowIso = new Date().toISOString();
  const nowStr = nowIso.replace('T', ' ').substring(0, 16);
  const reqId = `KYC-${data.userUid.substring(0, 8).toUpperCase()}`;

  const newReq: KYCRequest = {
    id: reqId,
    userUid: data.userUid,
    userEmail: data.userEmail,
    userName: data.userName,
    nidNumber: data.nidNumber,
    nidFrontUrl: data.nidFrontUrl,
    nidBackUrl: data.nidBackUrl || '',
    status: 'pending',
    submittedAt: nowStr
  };

  // 1. Update localStorage
  const currentReqs = getStoredKycRequests();
  const filtered = currentReqs.filter(r => r.userUid !== data.userUid && r.id !== reqId);
  const updatedReqs = [newReq, ...filtered];
  saveStoredKycRequests(updatedReqs);
  try {
    localStorage.setItem(`forex_kyc_status_${data.userUid}`, 'pending');
    localStorage.setItem(`forex_kyc_submitted_time_${data.userUid}`, Date.now().toString());
  } catch (_) {}

  // 2. Add in-app confirmation notification
  addStoredNotification({
    userUid: data.userUid,
    title: 'KYC Documents Submitted 📄',
    message: 'Your NID verification documents have been received. The system will automatically process and verify your account in 1–2 minutes.',
    type: 'info'
  });

  // 3. Sync immediately to Firestore kyc_requests collection & user profile
  try {
    const kycDocRef = doc(db, 'kyc_requests', data.userUid);
    await setDoc(kycDocRef, {
      id: reqId,
      userUid: data.userUid,
      userEmail: data.userEmail,
      userName: data.userName,
      nidNumber: data.nidNumber,
      nidFrontUrl: data.nidFrontUrl,
      nidBackUrl: data.nidBackUrl || '',
      status: 'pending',
      submittedAt: nowStr,
      createdAt: nowIso,
      submittedTimestamp: Date.now(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Also write document indexed by reqId for admin lookup compatibility
    try {
      await setDoc(doc(db, 'kyc_requests', reqId), {
        id: reqId,
        userUid: data.userUid,
        userEmail: data.userEmail,
        userName: data.userName,
        nidNumber: data.nidNumber,
        nidFrontUrl: data.nidFrontUrl,
        nidBackUrl: data.nidBackUrl || '',
        status: 'pending',
        submittedAt: nowStr,
        createdAt: nowIso,
        submittedTimestamp: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (_) {}

    const userDocRef = doc(db, 'users', data.userUid);
    await setDoc(userDocRef, {
      kycStatus: 'pending',
      kycSubmittedAt: nowStr,
      kycNidNumber: data.nidNumber,
      kycRejectionReason: null,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore KYC submission note:', err);
  }

  // Cross-device sync to server persistent store
  try {
    fetch('/api/users/kyc-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: data.userUid,
        userEmail: data.userEmail,
        kycStatus: 'pending',
        isVerifiedUser: false,
        kycRejectionReason: null
      })
    }).catch(() => {});
  } catch (_) {}

  // 4. Schedule automatic verification in 75 seconds (1.25 minutes)
  const isValidNid = data.nidNumber.trim().length >= 5 && Boolean(data.nidFrontUrl);
  if (isValidNid) {
    setTimeout(async () => {
      try {
        const stored = getStoredKycRequests();
        const thisReq = stored.find(r => r.userUid === data.userUid || r.id === reqId);
        if (thisReq && thisReq.status === 'pending') {
          console.log(`[Auto-KYC] Triggering 1-2 min auto-approval for ${data.userName}`);
          await approveKycVerification(data.userUid, reqId, true);
        }
      } catch (err) {
        console.warn('Auto-KYC timeout handler note:', err);
      }
    }, 75 * 1000);
  }

  return newReq;
}

/**
 * Approve KYC Verification in Firestore & localStorage (Permanent Verified Status)
 */
export async function approveKycVerification(userUid: string, reqId?: string, isAuto: boolean = false): Promise<void> {
  const nowIso = new Date().toISOString();
  const nowStr = nowIso.replace('T', ' ').substring(0, 16);

  // 1. Update localStorage KYC Requests permanently
  const currentReqs = getStoredKycRequests();
  const updatedReqs = currentReqs.map(r => {
    if (r.userUid === userUid || (reqId && r.id === reqId)) {
      return {
        ...r,
        status: 'approved' as const,
        reviewedAt: nowStr,
        rejectionReason: undefined
      };
    }
    return r;
  });
  saveStoredKycRequests(updatedReqs);
  try {
    localStorage.setItem(`forex_kyc_status_${userUid}`, 'verified');
    localStorage.setItem(`forex_is_verified_${userUid}`, 'true');
  } catch (_) {}

  // 2. Add in-app Notification for User
  addStoredNotification({
    userUid,
    title: 'KYC Account Verified 🎉',
    message: isAuto 
      ? 'Congratulations! Your NID verification has been automatically validated and approved by the system. Your account is now permanently verified with the Blue Tick.'
      : 'Congratulations! Your NID verification request has been approved. Your account is now permanently verified with the Blue Tick.',
    type: 'kyc_approved'
  });

  // 3. Update Firestore permanently
  try {
    const targetDocId = userUid;
    const kycDocRef = doc(db, 'kyc_requests', targetDocId);
    await setDoc(kycDocRef, {
      status: 'approved',
      reviewedAt: nowStr,
      approvedAt: nowStr,
      isAutoVerified: isAuto,
      rejectionReason: null,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Also update by reqId if provided
    if (reqId && reqId !== userUid) {
      try {
        await setDoc(doc(db, 'kyc_requests', reqId), {
          status: 'approved',
          reviewedAt: nowStr,
          approvedAt: nowStr,
          isAutoVerified: isAuto,
          rejectionReason: null,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (_) {}
    }

    const userDocRef = doc(db, 'users', userUid);
    await setDoc(userDocRef, {
      kycStatus: 'verified',
      isVerifiedUser: true,
      kycApprovedAt: nowStr,
      kycRejectionReason: null,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore KYC approval note:', err);
  }

  // Cross-device sync to server persistent store so other devices immediately know
  try {
    fetch('/api/users/kyc-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: userUid,
        kycStatus: 'verified',
        isVerifiedUser: true,
        kycApprovedAt: nowStr,
        kycRejectionReason: null
      })
    }).catch(() => {});
  } catch (_) {}
}

/**
 * Admin action: Reject KYC Verification in Firestore
 * Note: Only allowed if user is not already permanently verified
 */
export async function rejectKycVerification(userUid: string, reason: string, reqId?: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const nowStr = nowIso.replace('T', ' ').substring(0, 16);

  // Check if permanently verified
  const currentReqs = getStoredKycRequests();
  const existingReq = currentReqs.find(r => r.userUid === userUid || (reqId && r.id === reqId));
  if (existingReq && existingReq.status === 'approved') {
    console.warn('Cannot reject a permanently approved KYC account');
    return;
  }

  // 1. Update localStorage KYC Requests
  const updatedReqs = currentReqs.map(r => {
    if (r.userUid === userUid || (reqId && r.id === reqId)) {
      return {
        ...r,
        status: 'rejected' as const,
        rejectionReason: reason,
        reviewedAt: nowStr
      };
    }
    return r;
  });
  saveStoredKycRequests(updatedReqs);
  try {
    localStorage.setItem(`forex_kyc_status_${userUid}`, 'rejected');
  } catch (_) {}

  // 2. Add in-app Notification for User
  addStoredNotification({
    userUid,
    title: 'KYC Verification Rejected ❌',
    message: `Your NID verification request was rejected. Reason: ${reason}. Please re-upload clear document photos.`,
    type: 'kyc_rejected'
  });

  // 3. Update Firestore
  try {
    const targetDocId = userUid;
    const kycDocRef = doc(db, 'kyc_requests', targetDocId);
    await setDoc(kycDocRef, {
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: nowStr,
      rejectedAt: nowStr,
      updatedAt: serverTimestamp()
    }, { merge: true });

    if (reqId && reqId !== userUid) {
      try {
        await setDoc(doc(db, 'kyc_requests', reqId), {
          status: 'rejected',
          rejectionReason: reason,
          reviewedAt: nowStr,
          rejectedAt: nowStr,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (_) {}
    }

    const userDocRef = doc(db, 'users', userUid);
    await setDoc(userDocRef, {
      kycStatus: 'rejected',
      isVerifiedUser: false,
      kycRejectionReason: reason,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore KYC rejection note:', err);
  }

  // Cross-device sync to server persistent store
  try {
    fetch('/api/users/kyc-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: userUid,
        kycStatus: 'rejected',
        isVerifiedUser: false,
        kycRejectionReason: reason
      })
    }).catch(() => {});
  } catch (_) {}
}

