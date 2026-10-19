import React, { useState, useEffect, Suspense, lazy } from 'react';
import { onAuthStateChanged, auth, signOut, User } from './lib/firebase';
import { BackgroundGlow } from './components/BackgroundGlow';
import { EmailVerificationGate } from './components/EmailVerificationGate';
import { ShieldCheck, ShieldAlert, Loader2, AlertTriangle, Lock, ArrowLeft } from 'lucide-react';

// Eagerly import visitor views so portal, welcome page and login card render instantly in 0ms without network delays
import { PortalLandingPage } from './components/PortalLandingPage';
import { LandingPageView } from './components/LandingPageView';
import { GlassLoginCard } from './components/GlassLoginCard';
const lazyWithRetry = (importFn: () => Promise<any>, exportName?: string) =>
  lazy(async () => {
    let attempts = 0;
    while (attempts < 3) {
      try {
        const m = await importFn();
        const component = exportName ? m[exportName] || m.default : (m.default || Object.values(m)[0]);
        if (!component) throw new Error('Export not found');
        return { default: component };
      } catch (err) {
        attempts++;
        if (attempts >= 3) {
          console.error(`Failed to load module after ${attempts} attempts:`, err);
          throw err;
        }
        await new Promise(r => setTimeout(r, 600 * attempts));
      }
    }
    throw new Error('Module import retry limit exceeded');
  });

import { ForexDashboard } from './components/ForexDashboard';
const AdminLoginCard = lazyWithRetry(() => import('./components/AdminPanel/AdminLoginCard'), 'AdminLoginCard');
const AdminDashboard = lazyWithRetry(() => import('./components/AdminPanel/AdminDashboard'), 'AdminDashboard');

// Pre-trigger ForexDashboard chunk download immediately at millisecond 0 if authenticated session exists
if (typeof window !== 'undefined') {
  try {
    const hasCachedUser = Object.keys(localStorage).some(k => k.startsWith('firebase:authUser:'));
    if (hasCachedUser || auth.currentUser) {
      import('./components/ForexDashboard').catch(() => {});
    }
  } catch (_) {}
}

function safeSetLocalStorage(key: string, value: string) {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (err: any) {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        // Clear bulky candle caches to free up localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('candle_cache_') || k.startsWith('market_candles_') || k.startsWith('forex_pro_closed_trades_'))) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem(key, value);
      }
    } catch (_) {}
  }
}

function safeRemoveLocalStorage(key: string) {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (_) {}
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [accessDeniedMsg, setAccessDeniedMsg] = useState<string | null>(null);

  // Visitor Flow: 'portal' (new 3D Exness/HFM landing page) | 'welcome' (detailed welcome page) | 'auth' (login / signup card)
  const [visitorView, setVisitorView] = useState<'portal' | 'welcome' | 'auth'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const refParam = params.get('ref') || params.get('referral') || params.get('refCode') || params.get('code');
      if (refParam) {
        try {
          sessionStorage.setItem('forex_active_ref', refParam.trim());
          localStorage.setItem('forex_active_ref', refParam.trim());
        } catch (_) {}
        return 'auth'; // Open registration directly when arriving from a referral link
      }
      if (
        pathname === '/login' || 
        pathname === '/signin' || 
        pathname === '/register' || 
        pathname === '/signup' || 
        pathname === '/registrar' ||
        search.includes('view=auth') || 
        search.includes('view=login') || 
        search.includes('view=signin') ||
        search.includes('view=register') ||
        search.includes('view=signup')
      ) {
        return 'auth';
      }
      if (
        pathname === '/about' || 
        pathname === '/leaderboard' || 
        pathname === '/leaderbord' || 
        pathname === '/markets' ||
        search.includes('view=welcome') || 
        search.includes('view=trading') || 
        search.includes('view=explore') ||
        search.includes('view=about') ||
        search.includes('view=leaderboard') ||
        search.includes('view=leaderbord') ||
        search.includes('view=markets')
      ) {
        return 'welcome';
      }
    }
    return 'portal';
  });

  const [authInitialMode, setAuthInitialMode] = useState<'signin' | 'signup'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      if (
        search.includes('ref=') || 
        search.includes('referral=') || 
        search.includes('view=register') ||
        search.includes('view=signup') ||
        pathname === '/register' || 
        pathname === '/signup' || 
        pathname === '/registrar'
      ) {
        return 'signup';
      }
      if (pathname === '/login' || pathname === '/signin' || search.includes('view=login') || search.includes('view=signin')) {
        return 'signin';
      }
    }
    return 'signin';
  });

  // App Routing Mode: 'user' or 'admin'
  const [appMode, setAppMode] = useState<'user' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      const pathname = window.location.pathname;
      if (pathname === '/admin' || search.includes('app=admin') || search.includes('admin=true')) {
        return 'admin';
      }
    }
    return 'user';
  });

  // Admin Session State with role-based validation
  const [adminSession, setAdminSession] = useState<{ email: string; role: string; token: string } | null>(() => {
    try {
      const stored = localStorage.getItem('forex_admin_session');
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (parsed && (parsed.role === 'superadmin' || parsed.role === 'admin' || parsed.role === 'super_admin') && parsed.token) {
        return parsed;
      }
      return null;
    } catch (_) {
      return null;
    }
  });

  // Only preload ForexDashboard when user is authenticated, keeping visitor login/registration 100% instant
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    import('./components/ForexDashboard').catch(() => {});
  }, [user]);

  // Ensure initial splash screen is cleanly dismissed and cannot block user interactions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof (window as any).__DISMISS_SPLASH__ === 'function') {
      try { (window as any).__DISMISS_SPLASH__(); } catch (_) {}
    }
    const splash = document.getElementById('app-splash-preloader');
    if (splash) {
      splash.style.pointerEvents = 'none';
      splash.style.opacity = '0';
      setTimeout(() => {
        try {
          if (splash.parentNode) splash.parentNode.removeChild(splash);
          else if (typeof splash.remove === 'function') splash.remove();
        } catch (_) {}
      }, 350);
    }
  }, []);

  // Dynamic SEO Page Title & Description based on Active Route
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pathname = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();

    let pageTitle = 'FXBY24 | Next-Generation Financial Markets & Trading Technology';
    let metaDesc = 'FXBY24 is a premier digital trading platform offering advanced market intelligence, multi-asset analytics, and high-performance charting technology for modern global traders.';

    if (pathname === '/login' || pathname === '/signin' || (visitorView === 'auth' && authInitialMode === 'signin')) {
      pageTitle = 'FXBY24 Login | Access Live Trading Account';
      metaDesc = 'Log in to your FXBY24 trading account. Secure instant access to live Forex, Crypto, and Commodity markets with institutional liquidity and raw spreads.';
    } else if (pathname === '/register' || pathname === '/signup' || pathname === '/registrar' || (visitorView === 'auth' && authInitialMode === 'signup')) {
      pageTitle = 'FXBY24 Register | Create Live & Demo Trading Account';
      metaDesc = 'Register for a new FXBY24 account in seconds. Access 250+ instruments, $10,000 risk-free demo balance, instant crypto deposits, and raw 0.0 pip spreads.';
    } else if (pathname === '/about' || search.includes('view=about')) {
      pageTitle = 'About FXBY24 | Next-Gen Financial Markets & Trading Technology';
      metaDesc = 'Learn about FXBY24 institutional liquidity, proprietary order routing, 24/7 global support, and bank-grade cryptographic security.';
    } else if (pathname === '/leaderboard' || pathname === '/leaderbord' || search.includes('view=leaderboard') || search.includes('view=leaderbord')) {
      pageTitle = 'FXBY24 Leaderboard | Live Top Traders & Daily Rankings';
      metaDesc = 'Explore the official FXBY24 global leaderboard featuring today’s top 50 performing traders, verified profits, win rates, and daily reward distributions.';
    } else if (pathname === '/markets' || search.includes('view=markets')) {
      pageTitle = 'FXBY24 Markets | Live Real-Time Multi-Asset Charts & Liquidity';
      metaDesc = 'Live real-time market quotes and interactive charts for EUR/USD, GBP/USD, Bitcoin, Ethereum, and Gold on FXBY24.';
    }

    document.title = pageTitle;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) {
      descMeta.setAttribute('content', metaDesc);
    }
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', pageTitle);
    }
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', metaDesc);
    }
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) {
      twitterTitle.setAttribute('content', pageTitle);
    }
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) {
      twitterDesc.setAttribute('content', metaDesc);
    }
  }, [visitorView, authInitialMode]);

  // Global Market Engine & Background Candle Sync (Deferred so Welcome/Landing page renders instantly without network contention)
  useEffect(() => {
    // Only initialize market engine when user is logged in
    if (!user) return;

    const delay = user ? 500 : 3500;
    const timer = setTimeout(() => {
      import('./lib/customMarketEngine')
        .then(({ customMarketEngine }) => {
          try {
            customMarketEngine.init();
          } catch (e) {
            console.warn('Market engine deferred init notice:', e);
          }
        })
        .catch(() => {});

      import('./lib/candleHistoryService')
        .then(({ startGlobalMarketCandleSync }) => {
          try {
            startGlobalMarketCandleSync();
          } catch (e) {
            console.warn('Candle sync deferred init notice:', e);
          }
        })
        .catch(() => {});
    }, delay);
    return () => clearTimeout(timer);
  }, [user, visitorView]);

  useEffect(() => {
    // If currentUser is already cached in Firebase memory, set it immediately
    if (auth.currentUser) {
      setUser(auth.currentUser);
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthError(null);
        if (currentUser && currentUser.email) {
          // Guarantee that this user is recorded in server persistent storage while strictly preserving balances
          import('./lib/userSyncHelper')
            .then(({ syncUserRegistrationEverywhere }) => {
              let currentLocalBal: any = null;
              try {
                const bStr = localStorage.getItem(`forex_pro_user_balances_${currentUser.uid}`) || localStorage.getItem('forex_pro_user_balances');
                if (bStr) currentLocalBal = JSON.parse(bStr);
              } catch (_) {}

              syncUserRegistrationEverywhere({
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || currentUser.email.split('@')[0],
                emailVerified: currentUser.emailVerified,
                liveBalance: typeof currentLocalBal?.live === 'number' ? currentLocalBal.live : undefined,
                bonusBalance: typeof currentLocalBal?.bonus === 'number' ? currentLocalBal.bonus : undefined,
                demoBalance: typeof currentLocalBal?.demo === 'number' ? currentLocalBal.demo : undefined,
              }).catch(() => {});
            })
            .catch(() => {});
        }
      },
      (error: any) => {
        console.warn('Authentication State Notice:', error);
        setAuthError('Authentication service temporary connection notice. Please refresh if needed.');
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync User Role from Firestore
  useEffect(() => {
    if (!user) {
      setUserRole(null);
      return;
    }

    const emailClean = (user.email || '').toLowerCase().trim();
    const isPrimaryAdmin = emailClean === 'naymulh1000@gmail.com' || emailClean === 'admin@fxby24.com' || emailClean === 'admin@forextradepro.com';

    let unsub = () => {};

    import('./lib/firebase').then(({ db, isQuotaExceeded, isQuotaError }) => {
      if (isQuotaExceeded()) {
        setUserRole(isPrimaryAdmin ? 'super_admin' : 'user');
        return;
      }

      import('firebase/firestore').then(({ doc, onSnapshot }) => {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          unsub = onSnapshot(userDocRef, (snap) => {
            let fetchedRole = 'user';
            if (snap.exists()) {
              const data = snap.data();
              if (data?.role) {
                fetchedRole = data.role;
              }
            }

            if (isPrimaryAdmin) {
              fetchedRole = 'super_admin';
            }

            setUserRole(fetchedRole);

            // Security check: If current logged-in user is NOT an admin, purge any saved admin session
            const isAdminAccount = isPrimaryAdmin || fetchedRole === 'super_admin' || fetchedRole === 'admin' || fetchedRole === 'superadmin';
            if (!isAdminAccount) {
              setAdminSession(null);
              safeRemoveLocalStorage('forex_admin_session');
            }
          }, (err) => {
            if (!isQuotaError(err)) {
              console.warn('Role fetch warning:', err);
            }
            if (isPrimaryAdmin) {
              setUserRole('super_admin');
            } else {
              setUserRole('user');
              setAdminSession(null);
              safeRemoveLocalStorage('forex_admin_session');
            }
          });
        } catch (_) {}
      }).catch(() => {});
    }).catch(() => {});

    return () => unsub();
  }, [user?.uid, user?.email]);

  // Is Super Admin evaluation (strict check: designated email OR verified role in Firestore)
  const isSuperAdmin = Boolean(
    (user?.email && (
      user.email.toLowerCase().trim() === 'naymulh1000@gmail.com' ||
      user.email.toLowerCase().trim() === 'admin@fxby24.com' ||
      user.email.toLowerCase().trim() === 'admin@forextradepro.com' ||
      userRole === 'super_admin' ||
      userRole === 'admin' ||
      userRole === 'superadmin'
    )) ||
    (!user && adminSession && (
      adminSession.email.toLowerCase().trim() === 'naymulh1000@gmail.com' ||
      adminSession.email.toLowerCase().trim() === 'admin@fxby24.com' ||
      adminSession.email.toLowerCase().trim() === 'admin@forextradepro.com' ||
      adminSession.role === 'superadmin' ||
      adminSession.role === 'admin' ||
      adminSession.role === 'super_admin'
    ))
  );

  // Auto-sync admin session when an admin user is logged in
  useEffect(() => {
    if (user?.email) {
      const emailClean = user.email.toLowerCase().trim();
      const isAdminEmail = emailClean === 'naymulh1000@gmail.com' || 
                           emailClean === 'admin@fxby24.com' ||
                           emailClean === 'admin@forextradepro.com' || 
                           userRole === 'super_admin' || 
                           userRole === 'admin' || 
                           userRole === 'superadmin';
      
      if (isAdminEmail && !adminSession) {
        const autoSession = {
          email: user.email,
          role: 'superadmin',
          token: 'ADM-FIREBASE-' + user.uid
        };
        setAdminSession(autoSession);
        safeSetLocalStorage('forex_admin_session', JSON.stringify(autoSession));
      } else if (!isAdminEmail && adminSession) {
        setAdminSession(null);
        safeRemoveLocalStorage('forex_admin_session');
      }
    }
  }, [user?.uid, user?.email, userRole, adminSession?.token]);

  const handleSwitchToAdmin = () => {
    setAccessDeniedMsg(null);
    setAppMode('admin');
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '?app=admin');
    }
  };

  const handleSwitchToUser = () => {
    setAppMode('user');
    setAccessDeniedMsg(null);
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', '?app=user');
    }
  };

  const handleAdminLoginSuccess = (adminData: { email: string; role: string; token: string }) => {
    setAdminSession(adminData);
    safeSetLocalStorage('forex_admin_session', JSON.stringify(adminData));
  };

  const handleLogoutAdmin = () => {
    setAdminSession(null);
    safeRemoveLocalStorage('forex_admin_session');
    handleSwitchToUser();
  };

  // Check if user email is verified, or if user is anonymous / Google login
  const isUserVerified = Boolean(
    user && (
      user.emailVerified || 
      user.isAnonymous || 
      (user.providerData && user.providerData.some(p => p.providerId === 'google.com'))
    )
  );

  // RENDER STANDALONE ADMIN PANEL MODE (SECURED BY ROLE-BASED ACCESS CONTROL)
  if (appMode === 'admin') {
    // If a normal user attempts direct URL access to /admin or ?app=admin, show Access Denied 403
    if (user && !isSuperAdmin) {
      return (
        <div className="min-h-screen bg-[#06080E] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <BackgroundGlow />
          <div className="relative z-10 max-w-md w-full p-8 rounded-3xl bg-[#0E1424]/90 border border-rose-500/40 backdrop-blur-2xl shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Lock className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-mono font-black uppercase tracking-widest border border-rose-500/30">
                Access Denied (403)
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight">Access Denied (403)</h1>
              <p className="text-xs text-gray-400 leading-relaxed">
                Access Denied (403): You do not have permission to access the Admin Panel. This area is strictly private and restricted to Super Administrators.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSwitchToUser}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#F5B301] to-[#e0a200] text-black font-extrabold text-xs shadow-lg shadow-[#F5B301]/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Trading Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#06080E] text-white flex flex-col selection:bg-[#F5B301] selection:text-black">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center p-4 bg-[#06080E]">
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-900/80 border border-gray-800">
              <Loader2 className="w-8 h-8 animate-spin text-[#F5B301]" />
              <span className="text-xs text-gray-300 font-semibold">Loading Secured Admin Console...</span>
            </div>
          </div>
        }>
          {adminSession ? (
            <AdminDashboard
              adminEmail={adminSession.email}
              onLogoutAdmin={handleLogoutAdmin}
              onOpenUserSite={handleSwitchToUser}
            />
          ) : (
            <div className="flex-1 flex flex-col justify-between py-8">
              <BackgroundGlow />
              <div className="relative z-20 w-full px-4 text-center">
                <button
                  type="button"
                  onClick={handleSwitchToUser}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900/80 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-[#F5B301]" />
                  <span>← Back to User Trading Website</span>
                </button>
              </div>

              <main className="relative z-10 my-auto">
                <AdminLoginCard
                  onAdminLoginSuccess={handleAdminLoginSuccess}
                  onSwitchToUserApp={handleSwitchToUser}
                />
              </main>

              <footer className="relative z-20 w-full px-4 text-center text-xs text-gray-500">
                <p>© 2026 Forex Trade Pro • Standalone Admin Console</p>
              </footer>
            </div>
          )}
        </Suspense>
      </div>
    );
  }

  // RENDER USER WEBSITE MODE
  // 1. If user is not logged in and visitorView is 'portal', show the ultra-clean Exness/HFM 3D Landing Page
  if (!user && visitorView === 'portal') {
    return (
      <PortalLandingPage
        onGetStarted={() => setVisitorView('welcome')}
        onOpenAuth={(mode) => {
          setAuthInitialMode(mode);
          setVisitorView('auth');
        }}
      />
    );
  }

  // 2. If user is not logged in and visitorView is 'welcome', show the detailed Welcome Page (current LandingPageView)
  if (!user && visitorView === 'welcome') {
    return (
      <LandingPageView
        onOpenLogin={() => {
          setAuthInitialMode('signin');
          setVisitorView('auth');
        }}
        onOpenRegister={() => {
          setAuthInitialMode('signup');
          setVisitorView('auth');
        }}
        onOpenDemo={() => {
          setAuthInitialMode('signup');
          setVisitorView('auth');
        }}
        onBackToPortal={() => setVisitorView('portal')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between selection:bg-[#F5B301] selection:text-black">
      {/* Dynamic Animated Ambient Background */}
      <BackgroundGlow />

      {/* Main Container */}
      <main className={`relative z-10 flex-1 w-full ${user ? '' : 'flex items-center justify-center p-4 sm:p-6 my-auto'}`}>
        {user ? (
          <ForexDashboard 
            user={user} 
            isSuperAdmin={isSuperAdmin}
            onSwitchToAdmin={handleSwitchToAdmin}
            onLogout={() => {
              signOut(auth).catch((err) => console.warn('Sign out notice:', err));
              try { sessionStorage.removeItem('forex_dashboard_synced'); } catch (_) {}
              setUser(null);
              setVisitorView('portal');
            }} 
          />
        ) : (
          <GlassLoginCard 
            initialMode={authInitialMode}
            onBackToLanding={() => setVisitorView('portal')}
            onSuccess={() => {}} 
          />
        )}
      </main>
    </div>
  );
}


