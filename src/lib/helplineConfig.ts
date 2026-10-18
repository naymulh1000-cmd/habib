import { useState, useEffect } from 'react';
import { db, isQuotaExceeded, isQuotaError } from './firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

export interface HelplineConfig {
  telegramUrl: string;
  telegramLabel?: string;
  gmailUrl: string;
  gmailLabel?: string;
  hotlinePhone: string;
  hotlineLabel?: string;
  whatsappUrl?: string;
  whatsappLabel?: string;
  customLinkUrl?: string;
  customLinkTitle?: string;
  supportNotice?: string;
  updatedAt: string;
}

export const DEFAULT_HELPLINE: HelplineConfig = {
  telegramUrl: 'https://t.me/ftpsupport24',
  telegramLabel: 'Telegram Support (@ftpsupport24)',
  gmailUrl: 'forextradepro24@gmail.com',
  gmailLabel: 'Email Support (forextradepro24@gmail.com)',
  hotlinePhone: '',
  hotlineLabel: '',
  whatsappUrl: '',
  whatsappLabel: '',
  customLinkUrl: '',
  customLinkTitle: '',
  supportNotice: 'Our 24/7 official support team is active. Reach out via Telegram or Gmail for fast assistance.',
  updatedAt: new Date().toISOString(),
};

const LOCAL_HELPLINE_KEY = 'forex_helpline_config';

/**
 * Format any raw string (URL, username, email, phone) into an immediately clickable URL
 */
export function formatHelplineUrl(
  raw: string,
  type: 'telegram' | 'email' | 'phone' | 'whatsapp' | 'generic' = 'generic'
): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    if (type === 'telegram') return DEFAULT_HELPLINE.telegramUrl;
    if (type === 'email') return `mailto:${DEFAULT_HELPLINE.gmailUrl}`;
    return '';
  }

  if (type === 'telegram') {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('t.me/')) return `https://${trimmed}`;
    const cleanUser = trimmed.replace(/^@/, '');
    return `https://t.me/${cleanUser}`;
  }

  if (type === 'email') {
    // If it's already a full web URL (e.g. https://mail.google.com/mail/?view=cm&fs=1&to=...)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('mailto:')) return trimmed;
    if (trimmed.includes('@')) return `mailto:${trimmed}`;
    return `https://${trimmed}`;
  }

  if (type === 'phone') {
    if (trimmed.startsWith('tel:')) return trimmed;
    const cleanDigits = trimmed.replace(/[^\d+]/g, '');
    return `tel:${cleanDigits}`;
  }

  if (type === 'whatsapp') {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const cleanDigits = trimmed.replace(/[^\d]/g, '');
    return `https://wa.me/${cleanDigits}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Trigger immediate browser navigation to the helpline target
 */
export function openHelplineTarget(
  rawUrl: string,
  type: 'telegram' | 'email' | 'phone' | 'whatsapp' | 'generic' = 'generic'
) {
  const targetUrl = formatHelplineUrl(rawUrl, type);
  if (!targetUrl) return;

  if (targetUrl.startsWith('mailto:') || targetUrl.startsWith('tel:')) {
    window.location.href = targetUrl;
  } else {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }
}

export function getStoredHelpline(): HelplineConfig {
  try {
    const raw = localStorage.getItem(LOCAL_HELPLINE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_HELPLINE,
        ...parsed,
      };
    }
  } catch (_) {}
  return DEFAULT_HELPLINE;
}

export function saveStoredHelpline(config: HelplineConfig) {
  try {
    localStorage.setItem(LOCAL_HELPLINE_KEY, JSON.stringify(config));
  } catch (_) {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('forex_helpline_updated', { detail: config }));
    window.dispatchEvent(new Event('storage'));
  }
}

let _helplineBroadcastChannel: BroadcastChannel | null = null;
function getHelplineBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    if (!_helplineBroadcastChannel) {
      try {
        _helplineBroadcastChannel = new BroadcastChannel('forex_helpline_channel');
      } catch (_) {
        _helplineBroadcastChannel = null;
      }
    }
    return _helplineBroadcastChannel;
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

/**
 * Save updated helpline config permanently across all devices
 * (Express server + Firestore + localStorage + cross-tab BroadcastChannel)
 */
export async function saveHelplineConfig(updates: Partial<HelplineConfig>): Promise<boolean> {
  const current = getStoredHelpline();
  const merged: HelplineConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // 1. Instant local persistence & tab sync
  saveStoredHelpline(merged);
  const ch = getHelplineBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage(merged);
    } catch (_) {}
  }

  // 2. Persist to Express backend server with timeout so it writes to permanent disk
  try {
    await withTimeout(
      fetch('/api/helpline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      }).then(r => r.ok ? r.json() : null),
      2500,
      null
    );
  } catch (err) {
    console.warn('Backend helpline save warning:', err);
  }

  // 3. Persist to Firestore for real-time live push to all online traders (non-blocking with timeout)
  if (!isQuotaExceeded()) {
    try {
      await withTimeout(
        setDoc(doc(db, 'settings', 'helpline'), merged, { merge: true }),
        1500,
        null
      );
    } catch (e) {
      if (!isQuotaError(e)) {
        console.warn('Failed to write helpline to Firestore:', e);
      }
    }
  }

  return true;
}

/**
 * Real-time subscription to Helpline configuration across all devices
 */
export function subscribeToHelpline(onUpdate: (config: HelplineConfig) => void): () => void {
  // Always emit initial local cached value first
  const initial = getStoredHelpline();
  onUpdate(initial);

  // Cross-tab broadcast listener
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object' && event.data.telegramUrl !== undefined) {
      saveStoredHelpline(event.data);
      onUpdate(event.data);
    }
  };

  const channel = getHelplineBroadcastChannel();
  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  // Window event listener for in-app updates
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<HelplineConfig>;
    if (custom.detail) {
      onUpdate(custom.detail);
    } else {
      onUpdate(getStoredHelpline());
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('forex_helpline_updated', handleCustomEvent);
  }

  // Periodic server polling (every 4s) to guarantee phone <-> desktop sync
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/helpline');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && data.telegramUrl !== undefined) {
          const current = getStoredHelpline();
          const localTime = new Date(current.updatedAt || 0).getTime();
          const serverTime = new Date(data.updatedAt || 0).getTime();

          if (serverTime >= localTime) {
            if (
              data.telegramUrl !== current.telegramUrl ||
              data.gmailUrl !== current.gmailUrl ||
              data.hotlinePhone !== current.hotlinePhone ||
              data.whatsappUrl !== current.whatsappUrl ||
              data.customLinkUrl !== current.customLinkUrl ||
              data.supportNotice !== current.supportNotice
            ) {
              saveStoredHelpline(data);
              onUpdate(data);
            }
          } else if (localTime > serverTime + 2000) {
            // Local is newer, push to server to keep it synced permanently
            fetch('/api/helpline', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(current)
            }).catch(() => {});
          }
        }
      }
    } catch (_) {}
  }, 4000);

  // Real-time Firestore snapshot listener if available
  let unsubFirestore: (() => void) | null = null;
  if (!isQuotaExceeded()) {
    try {
      unsubFirestore = onSnapshot(
        doc(db, 'settings', 'helpline'),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as HelplineConfig;
            if (data && data.telegramUrl !== undefined) {
              saveStoredHelpline(data);
              onUpdate(data);
            }
          }
        },
        (error) => {
          if (!isQuotaError(error)) {
            console.warn('Helpline firestore snapshot error:', error);
          }
        }
      );
    } catch (_) {}
  }

  return () => {
    const ch = getHelplineBroadcastChannel();
    if (ch) {
      ch.removeEventListener('message', handleBroadcast);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('forex_helpline_updated', handleCustomEvent);
    }
    clearInterval(pollTimer);
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

/**
 * React Hook to access reactive helpline configuration
 */
export function useHelplineConfig(): HelplineConfig {
  const [config, setConfig] = useState<HelplineConfig>(getStoredHelpline);

  useEffect(() => {
    const unsub = subscribeToHelpline(setConfig);
    return unsub;
  }, []);

  return config;
}
