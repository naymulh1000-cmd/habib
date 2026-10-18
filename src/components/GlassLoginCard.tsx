import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getDisplayUserId } from '../lib/firestoreSync';
import { syncUserRegistrationEverywhere } from '../lib/userSyncHelper';
import { BrandLogo } from './BrandLogo';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  User, 
  TrendingUp,
  Globe,
  Phone,
  Tag,
  CheckSquare,
  Square,
  ChevronDown,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signInWithPopup, 
  signInAnonymously,
  googleProvider, 
  auth,
  signOut,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { CountrySelectorModal } from './CountrySelectorModal';
import { ToastContainer, ToastMessage } from './Toast';
import { COUNTRIES, Country } from '../data/countries';

interface GlassLoginCardProps {
  onSuccess?: () => void;
  initialMode?: 'signin' | 'signup';
  onBackToLanding?: () => void;
}

export const GlassLoginCard: React.FC<GlassLoginCardProps> = ({ 
  onSuccess,
  initialMode = 'signin',
  onBackToLanding
}) => {
  // Mode state: 'signin' or 'signup'
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  
  // Hover & Expand state matching video's "HOVER EXPANDING LOGIN"
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isPinned, setIsPinned] = useState(true);

  // Sync if initialMode changes
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
      setIsExpanded(true);
      setIsPinned(true);
    }
  }, [initialMode]);
  
  // Common form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up form states
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [selectedDialCode, setSelectedDialCode] = useState<Country>(COUNTRIES[0]); // Default Bangladesh +880
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [referralCode, setReferralCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get('ref') || params.get('referral') || params.get('refCode') || params.get('code');
        if (fromUrl && fromUrl.trim() !== '') {
          const clean = fromUrl.trim();
          try {
            sessionStorage.setItem('forex_active_ref', clean);
            localStorage.setItem('forex_active_ref', clean);
          } catch (_) {}
          return clean;
        }
        const saved = sessionStorage.getItem('forex_active_ref') || localStorage.getItem('forex_active_ref');
        if (saved && saved.trim() !== '') return saved.trim();
      } catch (_) {}
    }
    return '';
  });
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Auto-detect referral code from URL if query changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get('ref') || params.get('referral') || params.get('refCode') || params.get('code');
        if (fromUrl && fromUrl.trim() !== '') {
          const clean = fromUrl.trim();
          setReferralCode(clean);
          sessionStorage.setItem('forex_active_ref', clean);
          localStorage.setItem('forex_active_ref', clean);
        }
      } catch (_) {}
    }
  }, []);

  // Modal selector controls
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showDialCodeModal, setShowDialCodeModal] = useState(false);

  // Toast System state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Only expand on click (not on hover)
  const activeExpanded = isExpanded || isPinned;

  // Add Toast helper
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load remembered email if saved
  useEffect(() => {
    const savedEmail = localStorage.getItem('forex_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Handle Form Submission (Sign In or Sign Up)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    // Validation for Sign In
    if (mode === 'signin') {
      if (!cleanEmail || !cleanPassword) {
        setError('Please enter your email and password.');
        return;
      }
    }

    // Validation for Sign Up
    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!cleanEmail) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!phoneDigits.trim()) {
        setError('Please enter your phone number.');
        return;
      }
      if (!selectedCountry) {
        setError('Please select your country.');
        return;
      }
      if (cleanPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (cleanPassword !== confirmPassword) {
        setError('Passwords do not match. Please check again.');
        return;
      }
      if (!agreeTerms) {
        setError('You must agree to the Terms & Conditions to register.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        // Sign In logic
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const user = userCredential.user;

        if (!user.emailVerified) {
          const msg = 'A verification email has been sent. Please verify before login.';
          setSuccessMsg(msg);
          addToast({
            type: 'warning',
            title: 'Verification Required',
            message: msg
          });
        } else {
          const msg = 'Authentication successful! Redirecting to trading terminal...';
          setSuccessMsg(msg);
          addToast({
            type: 'success',
            title: 'Login Successful',
            message: 'Welcome back to Forex Trade Pro Terminal.'
          });
        }

        // Save email if Remember Me checked
        if (rememberMe) {
          localStorage.setItem('forex_remembered_email', cleanEmail);
        } else {
          localStorage.removeItem('forex_remembered_email');
        }

        setTimeout(() => {
          onSuccess?.();
        }, 500);

      } else {
        // Sign Up logic
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const user = userCredential.user;

        // Set Display Name in Firebase Auth
        if (fullName.trim()) {
          try {
            await updateProfile(user, { displayName: fullName.trim() });
          } catch (pErr) {
            console.warn('Update profile notice:', pErr);
          }
        }

        // Send Email Verification using sendEmailVerification(user)
        try {
          await sendEmailVerification(user);
        } catch (verErr) {
          console.warn('Send email verification notice:', verErr);
        }

        // Save User Document in Firestore collection 'users'
        const fullPhoneNumber = `${selectedDialCode.dialCode} ${phoneDigits.trim()}`;

        try {
          const { db } = await import('../lib/firebase');
          const isSuperAdminEmail = cleanEmail === 'naymulh1000@gmail.com' || cleanEmail === 'admin@fxby24.com' || cleanEmail === 'admin@forextradepro.com';
          const userRole = isSuperAdminEmail ? 'super_admin' : 'user';

          const effectiveRefCode = (referralCode.trim() || 
            (typeof window !== 'undefined' ? (sessionStorage.getItem('forex_active_ref') || localStorage.getItem('forex_active_ref') || '') : '')
          ).trim();

          const userPayload = {
            uid: user.uid,
            displayUserId: getDisplayUserId(user.uid),
            fullName: fullName.trim(),
            displayName: fullName.trim(),
            email: cleanEmail,
            role: userRole,
            phoneNumber: fullPhoneNumber,
            country: selectedCountry.name,
            referralCode: effectiveRefCode || null,
            referrerUid: effectiveRefCode || null,
            referredBy: effectiveRefCode || null,
            emailVerified: false,
            accountStatus: 'active',
            kycStatus: 'unverified',
            liveBalance: 0.00,
            bonusBalance: 0.00,
            demoBalance: 10000.00,
            createdAt: new Date().toISOString(),
          };

          // Synchronize across all layers: Local cache, Express Server JSON, Firestore doc, BroadcastChannel
          await syncUserRegistrationEverywhere(userPayload);
        } catch (dbErr) {
          console.error('User sync registration error:', dbErr);
        }

        const succText = 'A verification email has been sent. Please verify before login.';
        setSuccessMsg(succText);
        
        addToast({
          type: 'info',
          title: 'Verification Email Sent',
          message: succText
        });

        // Clear Sign Up fields
        setFullName('');
        setConfirmPassword('');
        setPhoneDigits('');
        setReferralCode('');
        setAgreeTerms(false);

        setTimeout(() => {
          onSuccess?.();
        }, 500);
      }
    } catch (err: any) {
      const errCode = err?.code || '';
      const errMsg = err?.message || '';
      const isExpectedUserAuthError = 
        errCode === 'auth/user-not-found' || 
        errCode === 'auth/wrong-password' || 
        errCode === 'auth/invalid-credential' ||
        errCode === 'auth/invalid-login-credentials' ||
        errCode === 'auth/invalid-email' ||
        errCode === 'auth/email-already-in-use' ||
        errCode === 'auth/weak-password';

      if (!isExpectedUserAuthError) {
        console.warn('Auth notification:', errCode, errMsg);
      }

      let friendlyError = 'Authentication failed. Please check your information.';
      if (errCode === 'auth/operation-not-allowed') {
        friendlyError = 'Email/password sign-in is disabled. Please enable Email/Password provider in Firebase Authentication settings.';
      } else if (errCode === 'auth/api-key-not-valid' || errCode === 'auth/invalid-api-key' || errMsg.includes('api-key-not-valid')) {
        friendlyError = 'Authentication service temporary connection issue. Please try again.';
        if (typeof window !== 'undefined' && localStorage.getItem('custom_firebase_config')) {
          localStorage.removeItem('custom_firebase_config');
        }
      } else if (errCode === 'auth/user-not-found' || errCode === 'auth/wrong-password' || errCode === 'auth/invalid-credential' || errCode === 'auth/invalid-login-credentials' || errMsg.includes('invalid-credential')) {
        if (mode === 'signin') {
          friendlyError = 'Invalid email or password. If you do not have an account yet, please click "Sign Up" below to register.';
        } else {
          friendlyError = 'Invalid credentials or password format. Password must be at least 6 characters.';
        }
      } else if (errCode === 'auth/email-already-in-use') {
        friendlyError = 'An account with this email already exists. Please switch to Sign In.';
      } else if (errCode === 'auth/weak-password') {
        friendlyError = 'Password is too weak. Please choose at least 6 characters.';
      } else if (errCode === 'auth/invalid-email') {
        friendlyError = 'Please enter a valid email address.';
      } else if (errCode === 'auth/too-many-requests') {
        friendlyError = 'Too many unsuccessful login attempts. Please reset your password or try again later.';
      } else if (errCode === 'auth/network-request-failed') {
        friendlyError = 'Network connection failed. Please check your internet connection.';
      }

      setError(friendlyError);
      addToast({
        type: 'error',
        title: mode === 'signup' ? 'Registration Failed' : 'Login Failed',
        message: friendlyError
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Auth
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Ensure user doc exists in Firestore 'users' collection
      try {
        const { db } = await import('../lib/firebase');
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          const gEmail = (user.email || '').toLowerCase().trim();
          const isSuperAdminG = gEmail === 'naymulh1000@gmail.com' || gEmail === 'admin@fxby24.com' || gEmail === 'admin@forextradepro.com';

          const effectiveRefCode = referralCode.trim() || 
            (typeof window !== 'undefined' ? (sessionStorage.getItem('forex_active_ref') || localStorage.getItem('forex_active_ref') || '') : '');

          const googleUserPayload = {
            uid: user.uid,
            displayUserId: getDisplayUserId(user.uid),
            fullName: user.displayName || 'Traders Name',
            displayName: user.displayName || 'Traders Name',
            email: user.email || '',
            role: isSuperAdminG ? 'super_admin' : 'user',
            phoneNumber: user.phoneNumber || '',
            country: selectedCountry?.name || 'Global',
            referralCode: effectiveRefCode.trim() || null,
            referrerUid: effectiveRefCode.trim() || null,
            referredBy: effectiveRefCode.trim() || null,
            emailVerified: true, // Google accounts are verified
            accountStatus: 'active',
            kycStatus: 'unverified',
            liveBalance: 0.00,
            bonusBalance: 0.00,
            demoBalance: 10000.00,
            createdAt: new Date().toISOString(),
          };

          await syncUserRegistrationEverywhere(googleUserPayload);
        }
      } catch (dbErr) {
        console.error('Firestore Google user creation error:', dbErr);
      }

      addToast({
        type: 'success',
        title: 'Google Sign In',
        message: 'Authenticated successfully with Google!'
      });

      setSuccessMsg('Signed in with Google! Directing to market terminal...');
      setTimeout(() => {
        onSuccess?.();
      }, 800);

    } catch (err: any) {
      console.error('Google Auth Error:', err);
      let googleError = 'Failed to sign in with Google.';
      if (err.code === 'auth/operation-not-allowed') {
        googleError = 'Google Sign-In is restricted for this account.';
      } else if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key' || err.message?.includes('api-key-not-valid')) {
        googleError = 'Google authentication service connection timeout. Please try again.';
        if (typeof window !== 'undefined' && localStorage.getItem('custom_firebase_config')) {
          localStorage.removeItem('custom_firebase_config');
        }
      } else if (err.code === 'auth/popup-closed-by-user') {
        googleError = 'Sign-in window closed before completing authentication.';
      } else if (err.code === 'auth/popup-blocked') {
        googleError = 'Popup blocked by browser. Please allow popups for Google sign-in.';
      }

      setError(googleError);
      addToast({
        type: 'error',
        title: 'Google Sign In Error',
        message: googleError
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Quick Demo Terminal Access Handler
  const handleDemoSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setDemoLoading(true);

    try {
      // Attempt Firebase Anonymous authentication
      await signInAnonymously(auth);
      addToast({
        type: 'success',
        title: 'Demo Session Activated',
        message: 'Welcome to Forex Trade Pro Demo Terminal with $10,000.00 virtual trading funds!'
      });
      setSuccessMsg('Demo Trader Session active! Redirecting to market workspace...');
      setTimeout(() => {
        onSuccess?.();
      }, 600);
    } catch (err: any) {
      console.warn('Firebase Anonymous sign-in notice:', err);
      if (err?.code === 'auth/operation-not-allowed') {
        const demoErr = 'Anonymous Sign-In is disabled in Firebase Console. Please click "Switch to Sign Up" to register an account.';
        setError(demoErr);
        addToast({
          type: 'warning',
          title: 'Sign Up Required',
          message: demoErr
        });
      } else {
        const demoErr = 'Could not initiate anonymous sign-in. Please click "Switch to Sign Up" to register your account.';
        setError(demoErr);
        addToast({
          type: 'error',
          title: 'Demo Access Issue',
          message: demoErr
        });
      }
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto my-auto p-4 z-10 flex flex-col items-center">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Top Forex Trade Pro Master Branding Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center flex flex-col items-center select-none w-full"
      >
        {/* Master Brand Logo */}
        <BrandLogo size="xl" layout="vertical" subtext="INSTITUTIONAL TRADING PLATFORM" />
      </motion.div>

      {/* Main Glassmorphic Container with Hover & Click Expanding Animation */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative rounded-3xl p-[3px] group mx-auto w-full flex justify-center transition-[max-width] duration-300 ${
          !activeExpanded ? 'max-w-[190px]' : mode === 'signup' ? 'max-w-[450px]' : 'max-w-[380px]'
        }`}
      >
        {/* 4-Segment Animated Conic Gradient Laser Border */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div 
            className={`absolute -inset-[150%] bg-[conic-gradient(from_0deg,transparent_0deg_36deg,#15eaff_36deg_48deg,transparent_48deg_126deg,#F5B301_126deg_138deg,transparent_138deg_216deg,#15eaff_216deg_228deg,transparent_228deg_306deg,#ff0a6c_306deg_318deg,transparent_318deg)] animate-spin-conic transition-opacity duration-500 ${
              isHovered || activeExpanded ? 'opacity-100 blur-sm' : 'opacity-70 blur-[2px]'
            }`}
            style={{ animationDuration: isHovered ? '4s' : '8s' }}
          />
        </div>

        {/* Collapsed Compact LOGIN Badge */}
        {!activeExpanded && (
          <motion.button
            key="collapsed-badge"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setIsPinned(true);
              setIsExpanded(true);
            }}
            className="relative w-full h-14 bg-[#0B0F19]/95 backdrop-blur-xl border border-white/10 rounded-[22px] px-5 flex items-center justify-center gap-2.5 shadow-2xl text-white font-bold tracking-wider hover:border-[#F5B301]/60 transition-all cursor-pointer group/btn"
          >
            <span className="w-2 h-2 rounded-full bg-[#ff0a6c] animate-pulse" />
            <span className="text-sm font-black text-white tracking-[0.2em] uppercase">
              LOGIN
            </span>
            <Lock className="w-4 h-4 text-[#15eaff]" />
          </motion.button>
        )}

        {/* Inner Glass Card Content when Expanded */}
        {activeExpanded && (
          <motion.div 
            key="expanded-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="relative w-full bg-[#101522]/95 backdrop-blur-2xl border border-white/10 rounded-[22px] p-5 sm:p-7 shadow-2xl shadow-black/90 flex flex-col items-center"
          >
            {/* Collapse Close Toggle top right */}
            <button
              type="button"
              onClick={() => {
                setIsPinned(false);
                setIsExpanded(false);
                setIsHovered(false);
              }}
              title="Collapse form"
              className="absolute top-3.5 right-3.5 text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors text-xs"
            >
              ✕
            </button>

            {/* Header: Pink Dot - LOGIN / SIGN UP - Blue Lock */}
            <div className="flex items-center justify-center gap-2.5 mb-5 text-white font-black tracking-[0.25em] text-base uppercase">
              <span className="w-2 h-2 rounded-full bg-[#ff0a6c]" />
              <span>{mode === 'signin' ? 'LOGIN' : 'SIGN UP'}</span>
              <Lock className="w-4.5 h-4.5 text-[#15eaff]" />
            </div>

            {/* Feedback Error / Success Messages */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="auth-error-banner"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="w-full mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex flex-col gap-2"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span className="text-[11px] leading-tight font-medium">{error}</span>
                  </div>
                  {mode === 'signin' && (
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-rose-500/20">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setShowForgotPassword(true);
                        }}
                        className="text-[10px] text-gray-300 hover:text-white underline transition-colors cursor-pointer"
                      >
                        Reset Password?
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMode('signup');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#F5B301] hover:bg-[#F5B301]/90 text-gray-950 text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <span>Create Account / Sign Up →</span>
                      </button>
                    </div>
                  )}
                  {mode === 'signup' && (error.includes('already exists') || error.includes('Sign In')) && (
                    <div className="flex items-center justify-end pt-1 border-t border-rose-500/20">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMode('signin');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#15eaff] hover:bg-[#15eaff]/90 text-gray-950 text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <span>Already have an account? Sign In →</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  key="auth-success-banner"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="w-full mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="text-[11px] leading-tight font-medium">{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login / Signup Form */}
            <form onSubmit={handleSubmit} className="w-full space-y-3">
              
              {/* Full Name (Sign Up only) */}
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="relative group/input">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-[#F5B301] transition-colors" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name *"
                      required
                      className="w-full pl-11 pr-4 py-2.5 bg-[#1A2030]/80 border border-gray-700/60 focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] rounded-full text-xs text-white placeholder-gray-400 outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {/* Email Address Field */}
              <div className="relative group/input">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-[#F5B301] transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address *"
                  required
                  className="w-full pl-11 pr-4 py-2.5 bg-[#1A2030]/80 border border-gray-700/60 focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] rounded-full text-xs text-white placeholder-gray-400 outline-none transition-all"
                />
              </div>

              {/* Phone Number Field with Country Code Flag Selector (Sign Up only) */}
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  {/* Phone with dial code selector */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDialCodeModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2.5 bg-[#1A2030]/80 border border-gray-700/60 hover:border-[#F5B301] rounded-full text-xs text-white shrink-0 transition-colors cursor-pointer"
                      title="Select Dial Code"
                    >
                      <span className="text-sm">{selectedDialCode.flag}</span>
                      <span className="font-mono text-[11px] text-[#F5B301] font-bold">{selectedDialCode.dialCode}</span>
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    </button>

                    <div className="relative flex-1 group/input">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within/input:text-[#F5B301] transition-colors" />
                      <input
                        type="tel"
                        value={phoneDigits}
                        onChange={(e) => setPhoneDigits(e.target.value)}
                        placeholder="Mobile Number *"
                        required
                        className="w-full pl-9 pr-3 py-2.5 bg-[#1A2030]/80 border border-gray-700/60 focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] rounded-full text-xs text-white placeholder-gray-400 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Country Selector with Searchable Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryModal(true)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1A2030]/80 border border-gray-700/60 hover:border-[#F5B301] rounded-full text-xs text-white transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Globe className="w-4 h-4 text-[#15eaff] shrink-0" />
                        <span className="text-sm">{selectedCountry.flag}</span>
                        <span className="truncate text-gray-200">{selectedCountry.name}</span>
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Password Field */}
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-[#F5B301] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password *"
                  required
                  className="w-full pl-11 pr-10 py-2.5 bg-[#1A2030]/80 border border-gray-700/60 focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] rounded-full text-xs text-white placeholder-gray-400 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Confirm Password Field (Sign Up only) */}
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className="relative group/input">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-[#F5B301] transition-colors" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password *"
                      required
                      className="w-full pl-11 pr-10 py-2.5 bg-[#1A2030]/80 border border-gray-700/60 focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] rounded-full text-xs text-white placeholder-gray-400 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Referral ID / Code (Auto-filled from link or manual entry) (Sign Up only) */}
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <div className="relative group/input">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-[#F5B301] transition-colors" />
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                      placeholder="Referral ID (Optional) - e.g. 834192"
                      className="w-full pl-11 pr-4 py-2.5 bg-[#1A2030]/80 border border-gray-700/60 focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] rounded-full text-xs text-white placeholder-gray-400 outline-none transition-all uppercase"
                    />
                  </div>
                  {referralCode.trim() !== '' && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F5B301]/10 border border-[#F5B301]/25 text-[10px] text-[#F5B301] font-medium">
                      <ShieldCheck className="w-3 h-3 text-[#F5B301] shrink-0" />
                      <span>Referral ID applied • $25 bonus unlocks on first $250+ deposit</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Terms & Conditions Checkbox (Sign Up only) */}
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-1 px-1"
                >
                  <label className="flex items-start gap-2.5 cursor-pointer group text-left">
                    <button
                      type="button"
                      onClick={() => setAgreeTerms(!agreeTerms)}
                      className="mt-0.5 text-gray-400 hover:text-[#F5B301] transition-colors shrink-0"
                    >
                      {agreeTerms ? (
                        <CheckSquare className="w-4 h-4 text-[#F5B301]" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <span className="text-[11px] text-gray-300 leading-snug">
                      I agree to the{' '}
                      <span className="text-[#F5B301] underline font-medium">Terms of Service</span>{' '}
                      and{' '}
                      <span className="text-[#F5B301] underline font-medium">Privacy Policy</span>.
                    </span>
                  </label>
                </motion.div>
              )}

              {/* Remember Me option (Sign In only) */}
              {mode === 'signin' && (
                <div className="flex items-center justify-between text-xs px-2 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      rememberMe 
                        ? 'bg-[#F5B301] border-[#F5B301] text-gray-950' 
                        : 'border-gray-600 bg-gray-900 group-hover:border-gray-400'
                    }`}>
                      {rememberMe && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-gray-400 text-[11px] group-hover:text-gray-200 transition-colors">
                      Remember me
                    </span>
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 px-6 mt-2 bg-gradient-to-r from-[#15eaff] via-[#00d4ec] to-[#00b2e3] hover:from-[#32efff] hover:to-[#00c2f7] text-gray-950 font-extrabold rounded-full text-xs tracking-wider uppercase shadow-lg shadow-[#15eaff]/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-gray-950" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{mode === 'signin' ? 'Sign in' : 'Create Account'}</span>
                )}
              </motion.button>
            </form>

            {/* Footer Navigation Links */}
            <div className="w-full mt-4 flex items-center justify-between text-xs font-semibold px-1">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer text-[11px]"
              >
                Forgot Password?
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-[#ff0a6c] hover:text-[#ff3887] font-bold transition-colors cursor-pointer text-xs"
              >
                {mode === 'signin' ? 'Create Account (Sign Up)' : 'Already have account? Sign in'}
              </button>
            </div>

            {/* Divider */}
            <div className="relative w-full my-3.5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800" />
              </div>
              <div className="relative px-2 bg-[#101522] text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                Or
              </div>
            </div>

            {/* Google Sign-In Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 bg-gray-900/80 hover:bg-gray-800 border border-gray-700/60 rounded-full text-xs font-medium text-gray-200 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5B301]" />
              ) : (
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Bottom Back Action Button */}
      {onBackToLanding && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex justify-center w-full"
        >
          <button
            id="login-card-bottom-back-btn"
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/15 text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-lg hover:border-[#F5B301]/40 group/back active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#F5B301] group-hover/back:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
        </motion.div>
      )}

      {/* Country Selector Modal */}
      <CountrySelectorModal
        isOpen={showCountryModal}
        onClose={() => setShowCountryModal(false)}
        selectedCountry={selectedCountry}
        onSelect={(country) => setSelectedCountry(country)}
        title="Select Your Country"
      />

      {/* Country Code Selector Modal */}
      <CountrySelectorModal
        isOpen={showDialCodeModal}
        onClose={() => setShowDialCodeModal(false)}
        selectedCountry={selectedDialCode}
        onSelect={(country) => setSelectedDialCode(country)}
        title="Select Phone Dial Code"
      />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialEmail={email}
      />
    </div>
  );
};
