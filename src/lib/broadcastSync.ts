import { useState, useEffect } from 'react';
import { db, isQuotaExceeded, isQuotaError } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export interface BroadcastSignal {
  id: string;
  title: string;
  text: string;
  time: string;
  type: 'buy' | 'sell' | 'announcement';
  author?: string;
  createdAt?: string;
}

const LOCAL_BROADCASTS_KEY = 'forex_trader_broadcast_signals';

export const INITIAL_BROADCAST_SIGNALS: BroadcastSignal[] = [
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
];

export function getStoredBroadcasts(): BroadcastSignal[] {
  try {
    const raw = localStorage.getItem(LOCAL_BROADCASTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return INITIAL_BROADCAST_SIGNALS;
}

export function saveStoredBroadcasts(signals: BroadcastSignal[]) {
  try {
    localStorage.setItem(LOCAL_BROADCASTS_KEY, JSON.stringify(signals));
  } catch (_) {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('forex_broadcasts_updated', { detail: signals }));
  }
}

let _broadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    if (!_broadcastChannel) {
      try {
        _broadcastChannel = new BroadcastChannel('forex_broadcasts_channel');
      } catch (_) {
        _broadcastChannel = null;
      }
    }
    return _broadcastChannel;
  }
  return null;
}

/**
 * Send a new Broadcast Signal or Announcement from any device (phone/desktop).
 * Writes to Firestore, Express Server, and local cache.
 */
export async function sendBroadcastSignal(
  signal: Omit<BroadcastSignal, 'id' | 'createdAt'>
): Promise<BroadcastSignal> {
  const id = 'sig-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
  const nowIso = new Date().toISOString();

  const newSignal: BroadcastSignal = {
    ...signal,
    id,
    createdAt: nowIso
  };

  // 1. Local update
  const current = getStoredBroadcasts();
  const updated = [newSignal, ...current.filter(s => s.id !== id)].slice(0, 50);
  saveStoredBroadcasts(updated);

  const bc = getBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage(updated);
    } catch (_) {}
  }

  // 2. Persist to Express backend
  try {
    fetch('/api/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSignal)
    }).catch(() => {});
  } catch (_) {}

  // 3. Persist to Firestore collection `broadcasts`
  if (!isQuotaExceeded()) {
    try {
      await setDoc(doc(db, 'broadcasts', id), newSignal);
    } catch (e) {
      if (!isQuotaError(e)) {
        console.warn('Failed to save broadcast to Firestore:', e);
      }
    }
  }

  return newSignal;
}

/**
 * Delete a Broadcast Signal
 */
export async function deleteBroadcastSignal(id: string): Promise<boolean> {
  const current = getStoredBroadcasts();
  const updated = current.filter(s => s.id !== id);
  saveStoredBroadcasts(updated);

  const bc = getBroadcastChannel();
  if (bc) {
    try {
      bc.postMessage(updated);
    } catch (_) {}
  }

  try {
    fetch(`/api/broadcasts/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  } catch (_) {}

  if (!isQuotaExceeded()) {
    try {
      await deleteDoc(doc(db, 'broadcasts', id));
    } catch (_) {}
  }

  return true;
}

/**
 * Real-time subscription to Broadcast Signals across all devices
 */
export function subscribeToBroadcasts(onUpdate: (signals: BroadcastSignal[]) => void): () => void {
  onUpdate(getStoredBroadcasts());

  const handleBroadcast = (event: MessageEvent) => {
    if (Array.isArray(event.data)) {
      saveStoredBroadcasts(event.data);
      onUpdate(event.data);
    }
  };

  const bc = getBroadcastChannel();
  if (bc) {
    bc.addEventListener('message', handleBroadcast);
  }

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<BroadcastSignal[]>;
    if (Array.isArray(custom.detail)) {
      onUpdate(custom.detail);
    } else {
      onUpdate(getStoredBroadcasts());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('forex_broadcasts_updated', handleCustomEvent);
  }

  // Polling to Express server every 4 seconds
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/broadcasts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.broadcasts) && data.broadcasts.length > 0) {
          saveStoredBroadcasts(data.broadcasts);
          onUpdate(data.broadcasts);
        }
      }
    } catch (_) {}
  }, 4000);

  // Focus refresh
  const handleFocus = async () => {
    try {
      const res = await fetch('/api/broadcasts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.broadcasts) && data.broadcasts.length > 0) {
          saveStoredBroadcasts(data.broadcasts);
          onUpdate(data.broadcasts);
        }
      }
    } catch (_) {}
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });
  }

  // Firestore real-time onSnapshot listener
  let unsubFirestore = () => {};
  if (!isQuotaExceeded()) {
    try {
      const q = query(collection(db, 'broadcasts'), limit(50));
      unsubFirestore = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const list: BroadcastSignal[] = [];
            snap.forEach(docSnap => {
              const d = docSnap.data() as BroadcastSignal;
              list.push({
                id: docSnap.id,
                title: d.title || 'Signal',
                text: d.text || '',
                time: d.time || 'Just now',
                type: d.type || 'announcement',
                author: d.author || 'Admin',
                createdAt: d.createdAt || new Date().toISOString()
              });
            });
            list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            saveStoredBroadcasts(list);
            onUpdate(list);
          }
        },
        (err) => {
          if (!isQuotaError(err)) {
            console.warn('Firestore broadcasts snapshot notice:', err);
          }
        }
      );
    } catch (_) {}
  }

  return () => {
    clearInterval(pollTimer);
    const channel = getBroadcastChannel();
    if (channel) {
      channel.removeEventListener('message', handleBroadcast);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('forex_broadcasts_updated', handleCustomEvent);
      window.removeEventListener('focus', handleFocus);
    }
    unsubFirestore();
  };
}

export function useBroadcasts() {
  const [signals, setSignals] = useState<BroadcastSignal[]>(getStoredBroadcasts);

  useEffect(() => {
    const unsub = subscribeToBroadcasts(setSignals);
    return () => unsub();
  }, []);

  return signals;
}
