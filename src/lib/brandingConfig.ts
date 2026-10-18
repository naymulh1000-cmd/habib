import { useState, useEffect } from 'react';

export interface BrandingConfig {
  logoUrl: string;
  brandName: string;
  brandSubtitle: string;
  updatedAt: string;
}

export const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: '/logo.png',
  brandName: 'Forex Trade',
  brandSubtitle: 'PRO',
  updatedAt: new Date().toISOString(),
};

const LOCAL_BRANDING_KEY = 'forex_branding_config';
const LEGACY_LOGO_KEY = 'forex_master_logo_url';

export function getStoredBranding(): BrandingConfig {
  try {
    const raw = localStorage.getItem(LOCAL_BRANDING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        logoUrl: parsed.logoUrl || localStorage.getItem(LEGACY_LOGO_KEY) || DEFAULT_BRANDING.logoUrl,
        brandName: parsed.brandName || DEFAULT_BRANDING.brandName,
        brandSubtitle: parsed.brandSubtitle || DEFAULT_BRANDING.brandSubtitle,
        updatedAt: parsed.updatedAt || DEFAULT_BRANDING.updatedAt,
      };
    }
    const legacyLogo = localStorage.getItem(LEGACY_LOGO_KEY);
    if (legacyLogo) {
      return {
        ...DEFAULT_BRANDING,
        logoUrl: legacyLogo,
      };
    }
  } catch (_) {}
  return DEFAULT_BRANDING;
}

export function updateBrowserFavicon(logoUrl?: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const targetUrl = logoUrl || '/logo.png';
  try {
    const iconSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
    ];
    document.querySelectorAll(iconSelectors.join(', ')).forEach((el) => {
      const link = el as HTMLLinkElement;
      link.href = targetUrl;
    });
  } catch (_) {}
}

export function saveStoredBranding(config: BrandingConfig) {
  try {
    localStorage.setItem(LOCAL_BRANDING_KEY, JSON.stringify(config));
    if (config.logoUrl) {
      localStorage.setItem(LEGACY_LOGO_KEY, config.logoUrl);
    } else {
      localStorage.removeItem(LEGACY_LOGO_KEY);
    }
  } catch (_) {}
  if (typeof window !== 'undefined') {
    updateBrowserFavicon(config.logoUrl);
    window.dispatchEvent(new CustomEvent('forex_branding_updated', { detail: config }));
    window.dispatchEvent(new Event('storage'));
  }
}

let _brandingBroadcastChannel: BroadcastChannel | null = null;
function getBrandingBroadcastChannel(): BroadcastChannel | null {
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    if (!_brandingBroadcastChannel) {
      try {
        _brandingBroadcastChannel = new BroadcastChannel('forex_branding_channel');
      } catch (_) {
        _brandingBroadcastChannel = null;
      }
    }
    return _brandingBroadcastChannel;
  }
  return null;
}

/**
 * Save updated branding config permanently across all devices
 * (Firestore + Express server + local storage + broadcast)
 */
export async function saveBrandingConfig(updates: Partial<BrandingConfig>): Promise<boolean> {
  const current = getStoredBranding();
  const merged: BrandingConfig = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // 1. Instant local persistence & tab sync
  saveStoredBranding(merged);
  const ch = getBrandingBroadcastChannel();
  if (ch) {
    try {
      ch.postMessage(merged);
    } catch (_) {}
  }

  // 2. Persist to Express backend server for cross-device consistency
  try {
    fetch('/api/branding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    }).catch(() => {});
  } catch (_) {}

  // 3. Persist to Firestore for real-time live push to all online phones & desktops
  try {
    const { db, isQuotaExceeded, isQuotaError } = await import('./firebase');
    if (!isQuotaExceeded()) {
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'branding'), merged, { merge: true });
    }
  } catch (e: any) {
    console.warn('Failed to write branding to Firestore:', e);
  }

  return true;
}

/**
 * Real-time subscription to Branding configuration across all devices
 */
export function subscribeToBranding(onUpdate: (config: BrandingConfig) => void): () => void {
  // Always emit initial local cached value first
  const initial = getStoredBranding();
  onUpdate(initial);

  // Cross-tab broadcast listener
  const handleBroadcast = (event: MessageEvent) => {
    if (event.data && typeof event.data === 'object' && event.data.logoUrl !== undefined) {
      saveStoredBranding(event.data);
      updateBrowserFavicon(event.data.logoUrl);
      onUpdate(event.data);
    }
  };

  const channel = getBrandingBroadcastChannel();
  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  // Window event listener for in-app updates
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<BrandingConfig>;
    if (custom.detail) {
      updateBrowserFavicon(custom.detail.logoUrl);
      onUpdate(custom.detail);
    } else {
      const stored = getStoredBranding();
      updateBrowserFavicon(stored.logoUrl);
      onUpdate(stored);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('forex_branding_updated', handleCustomEvent);
  }

  // Periodic server polling (every 3.5s) to guarantee phone <-> desktop sync
  const pollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/branding');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object' && data.logoUrl !== undefined) {
          const current = getStoredBranding();
          if (data.logoUrl !== current.logoUrl || data.brandName !== current.brandName || data.updatedAt !== current.updatedAt) {
            saveStoredBranding(data);
            updateBrowserFavicon(data.logoUrl);
            onUpdate(data);
          }
        }
      }
    } catch (_) {}
  }, 3500);

  // Tab focus / visibility change handler: immediately refresh from server & Firestore
  const handleFocus = async () => {
    try {
      const res = await fetch('/api/branding');
      if (res.ok) {
        const data = await res.json();
        if (data?.logoUrl !== undefined) {
          saveStoredBranding(data);
          updateBrowserFavicon(data.logoUrl);
          onUpdate(data);
        }
      }
    } catch (_) {}
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    });
  }

  // Deferred Firestore onSnapshot real-time listener (runs after Welcome Page is loaded)
  let unsubFirestore = () => {};
  let firestoreTimer: any = null;
  firestoreTimer = setTimeout(async () => {
    try {
      const { db, isQuotaExceeded, isQuotaError } = await import('./firebase');
      if (isQuotaExceeded()) return;
      const { doc, onSnapshot } = await import('firebase/firestore');
      unsubFirestore = onSnapshot(
        doc(db, 'settings', 'branding'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<BrandingConfig>;
            const updated: BrandingConfig = {
              logoUrl: data.logoUrl || DEFAULT_BRANDING.logoUrl,
              brandName: data.brandName || DEFAULT_BRANDING.brandName,
              brandSubtitle: data.brandSubtitle || DEFAULT_BRANDING.brandSubtitle,
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
            saveStoredBranding(updated);
            updateBrowserFavicon(updated.logoUrl);
            onUpdate(updated);
          }
        },
        (err) => {
          if (!isQuotaError(err)) {
            console.warn('Firestore branding snapshot notice:', err);
          }
        }
      );
    } catch (_) {}
  }, 4500);

  return () => {
    if (firestoreTimer) clearTimeout(firestoreTimer);
    clearInterval(pollTimer);
    const ch = getBrandingBroadcastChannel();
    if (ch) {
      ch.removeEventListener('message', handleBroadcast);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('forex_branding_updated', handleCustomEvent);
      window.removeEventListener('focus', handleFocus);
    }
    unsubFirestore();
  };
}

/**
 * React Hook for real-time Branding consumption in any component
 */
export function useBranding() {
  const [branding, setBranding] = useState<BrandingConfig>(getStoredBranding);

  useEffect(() => {
    const unsub = subscribeToBranding((latest) => {
      setBranding(latest);
    });
    return () => unsub();
  }, []);

  return branding;
}
