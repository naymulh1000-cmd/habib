import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  disableNetwork,
  setLogLevel
} from 'firebase/firestore';
import defaultFirebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore SDK log messages (e.g. quota warnings)
try {
  setLogLevel('silent');
} catch (_) {}

// Helper to check stored custom config from localStorage
function getStoredCustomConfig() {
  try {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('custom_firebase_config') : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.apiKey && parsed.apiKey.length >= 25 && parsed.apiKey.startsWith('AIza')) {
        return parsed;
      }
    }
  } catch (_) {}
  return null;
}

const storedConfig = getStoredCustomConfig();

// Active Firebase Configuration
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) 
  ? (import.meta as any).env 
  : (typeof process !== 'undefined' && process.env) 
  ? process.env 
  : {};

const customApiKey = env.VITE_FIREBASE_API_KEY?.trim();
const isCustomApiKeyValid = Boolean(
  customApiKey && 
  customApiKey.length >= 25 && 
  customApiKey.startsWith('AIza') &&
  !customApiKey.includes('MY_') &&
  !customApiKey.includes('YOUR_') &&
  !customApiKey.includes('CHANGE_ME')
);

export const activeFirebaseConfig = storedConfig
  ? storedConfig
  : isCustomApiKeyValid
  ? {
      apiKey: customApiKey!,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || defaultFirebaseConfig.authDomain,
      projectId: env.VITE_FIREBASE_PROJECT_ID?.trim() || defaultFirebaseConfig.projectId,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || defaultFirebaseConfig.storageBucket,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || defaultFirebaseConfig.messagingSenderId,
      appId: env.VITE_FIREBASE_APP_ID?.trim() || defaultFirebaseConfig.appId,
      firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID?.trim() || defaultFirebaseConfig.firestoreDatabaseId || undefined,
    }
  : defaultFirebaseConfig;

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(activeFirebaseConfig);

// Initialize Firebase Services
export const auth = getAuth(app);
const dbDatabaseId = activeFirebaseConfig.firestoreDatabaseId;

function initFirestoreInstance() {
  try {
    const opts = { experimentalAutoDetectLongPolling: true, useFetchStreams: false };
    if (dbDatabaseId && dbDatabaseId !== '(default)') {
      return initializeFirestore(app, opts, dbDatabaseId);
    }
    return initializeFirestore(app, opts);
  } catch (_) {
    try {
      return (dbDatabaseId && dbDatabaseId !== '(default)') ? getFirestore(app, dbDatabaseId) : getFirestore(app);
    } catch {
      return getFirestore(app);
    }
  }
}

export const db = initFirestoreInstance();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// In-memory temporary throttle for Firestore quota without disabling network permanently
let firestoreQuotaExceeded = false;
let quotaResetTimeout: any = null;

// Clear legacy persistent quota flag if present in localStorage
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('firestore_quota_exceeded');
  }
} catch (_) {}

export function isQuotaExceeded(): boolean {
  return firestoreQuotaExceeded;
}

export function markQuotaExceeded(err?: any) {
  if (!firestoreQuotaExceeded) {
    firestoreQuotaExceeded = true;
    console.warn('[Firestore] Notice: Rate limit reached. Seamlessly utilizing dual-layer sync.');
    if (quotaResetTimeout) clearTimeout(quotaResetTimeout);
    quotaResetTimeout = setTimeout(() => {
      firestoreQuotaExceeded = false;
    }, 30000); // 30s gentle backoff
  }
}

export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const str = String(err?.message || err?.code || err);
  if (
    err?.code === 'resource-exhausted' || 
    str.includes('resource-exhausted') || 
    str.includes('Quota exceeded') ||
    str.includes('quota') ||
    str.includes('backoff delay')
  ) {
    markQuotaExceeded(err);
    return true;
  }
  return false;
}

if (typeof window !== 'undefined') {
  // Console log interceptor to suppress Firebase SDK internal quota errors from cluttering console
  const origError = console.error;
  const origWarn = console.warn;

  console.error = function(...args: any[]) {
    const msg = args.map(a => String(a?.message || a?.code || a)).join(' ');
    if (msg.includes('resource-exhausted') || msg.includes('Quota exceeded') || msg.includes('backoff delay')) {
      markQuotaExceeded(msg);
      return;
    }
    origError.apply(console, args);
  };

  console.warn = function(...args: any[]) {
    const msg = args.map(a => String(a?.message || a?.code || a)).join(' ');
    if (msg.includes('resource-exhausted') || msg.includes('Quota exceeded') || msg.includes('backoff delay')) {
      markQuotaExceeded(msg);
      return;
    }
    origWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isQuotaError(event.reason)) {
      markQuotaExceeded(event.reason);
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isQuotaError(event.error) || isQuotaError(event.message)) {
      markQuotaExceeded(event.error || event.message);
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isQuotaError(error)) {
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  updateProfile,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
};

export type { User };
