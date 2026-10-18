import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from './BrandLogo';
import { ReferralInfoBanner } from './ReferralInfoBanner';

const LeaderboardModal = lazy(() => import('./LeaderboardModal').then(m => ({ default: m.LeaderboardModal })));
const AboutCompanyModal = lazy(() => import('./AboutCompanyModal').then(m => ({ default: m.AboutCompanyModal })));
import { 
  LandingLanguageCode, 
  LANDING_SUPPORTED_LANGUAGES, 
  LANDING_TRANSLATIONS 
} from '../lib/landingTranslations';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  Gift, 
  Users, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Globe, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Smartphone, 
  Laptop, 
  Sparkles, 
  DollarSign, 
  Percent, 
  Headphones, 
  MessageCircle, 
  Send, 
  BarChart3, 
  Flame, 
  Award, 
  PlayCircle,
  LogIn,
  UserPlus,
  ArrowUpRight,
  Shield,
  Check,
  Menu,
  X,
  Trophy,
  Server,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  Wallet,
  Coins,
  BadgeCheck,
  RefreshCw,
  Info,
  Layers,
  Cpu,
  Share2,
  CheckCheck,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export interface LandingPageViewProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenDemo?: () => void;
  onBackToPortal?: () => void;
}

// Live Ticker Pairs Data
interface MarketTicker {
  symbol: string;
  name: string;
  type: 'forex' | 'crypto' | 'commodity';
  price: number;
  change: number;
  payout: number;
  spread: number;
}

const initialTickers: MarketTicker[] = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex', price: 1.0864, change: +0.28, payout: 92, spread: 0.1 },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', type: 'forex', price: 1.2942, change: +0.42, payout: 90, spread: 0.2 },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', type: 'forex', price: 154.22, change: -0.15, payout: 88, spread: 0.2 },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', type: 'crypto', price: 91420.50, change: +2.18, payout: 94, spread: 1.2 },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', type: 'crypto', price: 3418.80, change: +1.64, payout: 91, spread: 0.8 },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', type: 'commodity', price: 2735.60, change: +0.85, payout: 93, spread: 0.4 },
  { symbol: 'AUD/USD', name: 'Australian Dollar / USD', type: 'forex', price: 0.6580, change: -0.12, payout: 89, spread: 0.2 },
];

export interface VerifiedWithdrawalRecord {
  id: string;
  method: 'Binance Pay' | 'USDT (TRC20)';
  amount: string;
  time: string;
  status: string;
  uid: string;
}

export const generateLiveWithdrawalsList = (): VerifiedWithdrawalRecord[] => {
  // Exclusively Binance Pay and USDT (TRC20)
  const allowedMethods: ('Binance Pay' | 'USDT (TRC20)')[][] = [
    ['Binance Pay', 'USDT (TRC20)'],
    ['USDT (TRC20)', 'Binance Pay'],
  ];
  const methodPair = allowedMethods[Math.floor(Math.random() * allowedMethods.length)];

  const sampleAmounts = [
    220, 340, 480, 590, 720, 860, 990, 1150, 1340, 1580,
    1750, 1920, 2250, 2480, 2850, 3200
  ];
  const shuffledAmounts = [...sampleAmounts].sort(() => 0.5 - Math.random());

  const timeSlots = [
    'Just now',
    '1 min ago',
    '1 min ago',
    '2 mins ago',
    '2 mins ago',
    '3 mins ago',
    '3 mins ago',
    '4 mins ago',
    '4 mins ago',
    '5 mins ago',
  ];

  return timeSlots.map((time, idx) => {
    const method = idx % 2 === 0 ? methodPair[0] : methodPair[1];
    const baseAmt = shuffledAmounts[idx % shuffledAmounts.length];
    const cents = Math.random() > 0.4 ? '.00' : `.${Math.floor(1 + Math.random() * 9)}0`;
    const formattedAmount = `$${baseAmt.toLocaleString('en-US')}${cents}`;
    const uidDigits = Math.floor(1000 + Math.random() * 9000);
    const txDigits = Math.floor(71000 + Math.random() * 28000);

    return {
      id: `TX-${txDigits}`,
      method,
      amount: formattedAmount,
      time,
      status: 'Completed',
      uid: `UID-${uidDigits}**`,
    };
  });
};

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenDemo,
  onBackToPortal,
}) => {
  const [tickers, setTickers] = useState<MarketTicker[]>(initialTickers);
  const [activeTab, setActiveTab] = useState<'all' | 'forex' | 'crypto' | 'commodity'>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  
  // Selected Country / Language for Landing Page (Default: 'en' for UK)
  const [selectedLang, setSelectedLang] = useState<LandingLanguageCode>('en');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState<boolean>(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCountry = LANDING_SUPPORTED_LANGUAGES.find(c => c.code === selectedLang) || LANDING_SUPPORTED_LANGUAGES[0];
  const t = LANDING_TRANSLATIONS[selectedLang] || LANDING_TRANSLATIONS.en;
  
  // Referral reward interactive calculator
  const [referralCount, setReferralCount] = useState<number>(5);
  const [qualifyingDeposit] = useState<number>(250);

  // Bonus Matching Calculator
  const [depositAmount, setDepositAmount] = useState<number>(250);

  // Today Leaderboard Modal State (Accessible by any visitor without an account)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const s = window.location.search.toLowerCase();
      return p.includes('leaderboard') || p.includes('leaderbord') || s.includes('view=leaderboard') || s.includes('view=leaderbord');
    }
    return false;
  });
  const [isAboutCompanyOpen, setIsAboutCompanyOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const s = window.location.search.toLowerCase();
      return p.includes('about') || s.includes('view=about');
    }
    return false;
  });

  // Verified Live Recent Withdrawals (Exclusively Binance Pay & USDT TRC20, exactly 10 items)
  const [liveWithdrawals, setLiveWithdrawals] = useState<VerifiedWithdrawalRecord[]>(() => generateLiveWithdrawalsList());

  // Auto-updates every 5 minutes (300,000 ms) with a fresh list and new dollar amounts
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveWithdrawals(generateLiveWithdrawalsList());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Live Simulated Price Updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTickers(prev =>
        prev.map(item => {
          const delta = (Math.random() - 0.49) * 0.0006 * item.price;
          const newPrice = Number((item.price + delta).toFixed(item.type === 'crypto' || item.type === 'commodity' ? 2 : 4));
          const newChange = Number((item.change + (Math.random() - 0.5) * 0.04).toFixed(2));
          return { ...item, price: newPrice, change: newChange };
        })
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const filteredTickers = activeTab === 'all' ? tickers : tickers.filter(t => t.type === activeTab);

  // Deposit Methods Data (Crypto Gateways)
  const depositGateways = [
    {
      name: 'USDT (TRC20)',
      category: 'Tron Blockchain Network',
      min: 'Min: $100 | Bonus Min: $250',
      speed: 'Instant (1-3 Mins)',
      fee: '0% Platform Fee',
      popular: true,
      badge: 'Fastest Settlement',
      color: 'from-emerald-500 to-teal-600'
    },
    {
      name: 'Bitcoin (BTC)',
      category: 'Bitcoin Blockchain Network',
      min: 'Min: $100 | Bonus Min: $250',
      speed: '1-2 Confirmations',
      fee: '0% Platform Fee',
      popular: true,
      badge: 'Leading Crypto',
      color: 'from-amber-500 to-orange-600'
    },
    {
      name: 'Ethereum (ETH)',
      category: 'Ethereum (ERC20 Network)',
      min: 'Min: $100 | Bonus Min: $250',
      speed: 'Instant (2-5 Mins)',
      fee: '0% Platform Fee',
      popular: false,
      badge: 'High Security Network',
      color: 'from-blue-500 to-indigo-600'
    },
    {
      name: 'Binance Pay / BEP20',
      category: 'BNB Smart Chain (BEP20)',
      min: 'Min: $100 | Bonus Min: $250',
      speed: 'Instant (0-1 Min)',
      fee: '0% Platform Fee',
      popular: true,
      badge: 'Zero Network Fee',
      color: 'from-yellow-400 to-amber-600'
    },
  ];

  // FAQ Items
  const faqList = [
    {
      q: 'How does the 100% First Deposit Bonus work?',
      a: 'When you register a new account and complete your first qualifying deposit of USD $250 or more, Forex Trade Pro automatically credits a 100% cash matching bonus to your Bonus Wallet. For instance, if you deposit $250, you receive an extra $250 in your Bonus Wallet, giving you a total of $500 in trading capital.'
    },
    {
      q: 'What is the minimum deposit required to qualify for the 100% Bonus?',
      a: 'The minimum qualifying first deposit for the 100% bonus program is exactly USD $250. Regular deposits start from a minimum of $100, while the 100% deposit bonus activates exclusively on initial deposits of $250 or more.'
    },
    {
      q: 'What is the difference between Live Account and Bonus Account withdrawals?',
      a: 'Live Account funds (your deposited capital and standard profits) are 100% fully withdrawable at any time with 0% platform fees. Bonus Account funds are provided strictly for active trading. As per platform policy, 50% of the net trading profits generated using your bonus balance can be converted and withdrawn to your real wallet.'
    },
    {
      q: 'How does the $25 UID Referral Reward program operate?',
      a: 'Every member has a unique 6-digit Referral UID. When you share your UID and a new user registers using it, once they make their first qualifying deposit of $250 or more, you automatically receive a $25 reward credited directly to your Bonus Wallet. You can refer unlimited friends and accumulate $25 for each qualified member.'
    },
    {
      q: 'How fast are deposit and withdrawal transactions processed?',
      a: 'Deposits via USDT (TRC20), Bitcoin, Ethereum, and Binance Pay are credited within 1 to 5 minutes. Live Account withdrawals are processed by our automated risk-routing system within 5 to 15 minutes with zero platform deduction.'
    },
    {
      q: 'Can I trade both Forex and Binary Options on the same account?',
      a: 'Yes! Forex Trade Pro features a unified terminal allowing you to seamlessly toggle between Forex Margin Trading (ECN spreads from 0.0 pips with up to 1:2000 leverage) and Binary Options Trading (Fixed-time contracts with up to 94% payout) from a single dashboard.'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-amber-400 selection:text-slate-950"
    >
      
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVIGATION HEADER (MATCHING REFERENCE DESIGN)
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            {/* Brand Logo & Name - Strictly aligned, unbreakable line */}
            <div 
              className="flex items-center gap-2 sm:gap-3.5 shrink-0 select-none cursor-pointer"
              onClick={() => { if (onBackToPortal) onBackToPortal(); }}
              role="button"
              tabIndex={0}
            >
              <BrandLogo 
                size="md" 
                theme="light" 
                showText={false}
              />
              <div className="flex flex-col justify-center whitespace-nowrap">
                <span className="text-lg sm:text-2xl font-black tracking-tight text-slate-950 flex items-center leading-none whitespace-nowrap">
                  <span className="text-amber-600 italic font-serif text-xl sm:text-3xl mr-0.5 select-none drop-shadow-2xs">F</span>
                  <span className="tracking-tight text-slate-950 font-black whitespace-nowrap">orex Trade Pro</span>
                </span>
                <span className="text-[8.5px] sm:text-[10px] font-bold text-amber-700 tracking-widest uppercase mt-0.5 select-none whitespace-nowrap">
                  Master Trading Platform
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-5 xl:gap-6 text-xs font-bold uppercase tracking-wider text-slate-700">
              <a href="#hero" className="hover:text-amber-600 transition-colors">{t.navHome}</a>
              <a href="#about" className="hover:text-amber-600 transition-colors">{t.navAbout}</a>
              <a href="#markets" className="hover:text-amber-600 transition-colors">{t.navMarkets}</a>
              <a href="#deposit-bonus" className="hover:text-amber-600 transition-colors">{t.navDepositBonus}</a>
              <a href="#withdrawals" className="hover:text-amber-600 transition-colors">{t.navWithdrawals}</a>
              <a href="#referral" className="hover:text-amber-600 transition-colors">{t.navReferral}</a>
              <a href="#faq" className="hover:text-amber-600 transition-colors">{t.navFaq}</a>
            </nav>

            {/* Top Right Auth Action Buttons + Underneath Country Language Switcher */}
            <div className="flex flex-col items-end justify-center shrink-0 py-1">
              {/* Row 1: Action Buttons (Log In, Register, Mobile Three-line Menu) */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Original Classic LOG IN Button */}
                <button
                  id="header-login-btn"
                  type="button"
                  onClick={onOpenLogin}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-50 text-slate-900 font-extrabold text-[11px] sm:text-xs uppercase tracking-wider shadow-2xs hover:border-amber-400 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  LOG IN
                </button>

                {/* Original Classic REGISTER Button */}
                <button
                  id="header-register-btn"
                  type="button"
                  onClick={onOpenRegister}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-amber-400 bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 hover:from-amber-100 hover:to-amber-200 text-slate-950 font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-2xs hover:border-amber-500 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  REGISTER
                </button>

                {/* Mobile menu toggle three-line button (clearly visible right beside REGISTER) */}
                <button
                  id="header-mobile-menu-toggle-btn"
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-slate-900 text-amber-400 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 shadow-2xs cursor-pointer shrink-0 flex items-center justify-center transition-all active:scale-95"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-amber-400" />}
                </button>
              </div>

              {/* Row 2: Underneath Country Flag & Language Switcher (Compact & Short for clean fit) */}
              <div ref={langDropdownRef} className="relative mt-1 self-end">
                <button
                  id="header-country-language-btn"
                  type="button"
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-slate-100 hover:bg-amber-50 border border-slate-200 hover:border-amber-400 text-slate-800 text-[10px] sm:text-[11px] font-bold tracking-tight shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  title="Select Country & Language"
                >
                  <span className="text-sm leading-none select-none">{currentCountry.flag}</span>
                  <span className="font-extrabold text-slate-900">{currentCountry.shortLabel}</span>
                  <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform duration-200 ${isLangDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Country Selection Dropdown Menu */}
                {isLangDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-60 sm:w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>Select Country / Region</span>
                      <Globe className="w-3 h-3 text-amber-600" />
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 py-1">
                      {LANDING_SUPPORTED_LANGUAGES.map((item) => {
                        const isSelected = selectedLang === item.code;
                        return (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => {
                              setSelectedLang(item.code);
                              setIsLangDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer text-xs ${
                              isSelected 
                                ? 'bg-amber-50/90 text-amber-950 font-black' 
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-lg leading-none select-none">{item.flag}</span>
                              <div className="flex flex-col">
                                <span className={`leading-tight ${isSelected ? 'font-black text-slate-950' : 'font-semibold'}`}>
                                  {item.countryName}
                                </span>
                                <span className="text-[10px] text-slate-400 leading-tight">
                                  {item.nativeLangName}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 shadow-xl">
            {/* Mobile Auth Action Row - Big, easy to tap buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                id="mobile-drawer-login-btn"
                type="button"
                onClick={() => { setMobileMenuOpen(false); onOpenLogin(); }}
                className="py-3 px-3 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-950 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <LogIn className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                <span>{t.loginBtn}</span>
              </button>
              <button
                id="mobile-drawer-register-btn"
                type="button"
                onClick={() => { setMobileMenuOpen(false); onOpenRegister(); }}
                className="py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer border border-amber-500/80"
              >
                <UserPlus className="w-4.5 h-4.5 text-slate-950 shrink-0" />
                <span>{t.registerBtn}</span>
              </button>
            </div>

            {/* Mobile Country Flag Selector Section */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-600" />
                <span>Change Country / Language</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {LANDING_SUPPORTED_LANGUAGES.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setSelectedLang(item.code);
                    }}
                    className={`px-2.5 py-2 rounded-lg border text-left flex items-center gap-2 text-xs transition-all cursor-pointer ${
                      selectedLang === item.code
                        ? 'border-amber-400 bg-amber-100/70 text-amber-950 font-black shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold'
                    }`}
                  >
                    <span className="text-base">{item.flag}</span>
                    <span className="truncate">{item.countryName}</span>
                  </button>
                ))}
              </div>
            </div>

            <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <a 
                href="#hero" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-amber-600"
              >
                {t.navHome}
              </a>
              <a 
                href="#about" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-amber-600"
              >
                {t.navAbout}
              </a>
              <a 
                href="#deposit-bonus" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-amber-600"
              >
                {t.navDepositBonus}
              </a>
              <a 
                href="#withdrawals" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-amber-600"
              >
                {t.navWithdrawals}
              </a>
              <a 
                href="#referral" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-amber-600"
              >
                {t.navReferral}
              </a>
              <a 
                href="#faq" 
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-amber-600"
              >
                {t.navFaq}
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsAboutCompanyOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-900 font-black flex items-center justify-between border border-slate-200 shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  <span>{t.navAboutCompany}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 text-[10px] font-black">UK REG</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLeaderboardOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-3 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-950 font-black flex items-center justify-between border border-amber-300 shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <span>{t.navLeaderboard}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">TOP 50</span>
              </button>
            </nav>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenDemo ? onOpenDemo() : onOpenRegister(); }}
                className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-bold text-xs uppercase tracking-wider"
              >
                {t.heroCtaDemo}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION & PRIMARY REFERENCE CARDS (EXACT REFERENCE DESIGN)
      ───────────────────────────────────────────────────────────── */}
      <section 
        id="hero" 
        className="relative pt-10 pb-20 md:pt-14 md:pb-24 bg-gradient-to-b from-white via-[#FCFBF8] to-white overflow-hidden border-b border-slate-100"
      >
        {/* Subtle Candlestick Chart Watermark (matching reference ambiance) */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none flex items-center justify-between px-10">
          <div className="w-72 h-72 border-r border-dashed border-slate-400" />
          <div className="w-96 h-96 border-l border-dashed border-slate-400" />
        </div>

        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Main Hero Typography: 3D FOREX & BINARY with Distinct TRADING PLATFORM */}
          <div className="text-center max-w-4xl mx-auto space-y-3 mb-6 sm:mb-8">
            
            {/* Primary Headline */}
            <h1 className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 leading-none">
              
              {/* Premium 3D Depth FOREX & BINARY */}
              <span 
                className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-slate-950 select-none"
                style={{
                  textShadow: '0 1px 0 #cbd5e1, 0 2px 0 #94a3b8, 0 3px 0 #64748b, 0 4px 6px rgba(15, 23, 42, 0.16), 0 1px 2px rgba(15, 23, 42, 0.22)'
                }}
              >
                FOREX &amp; BINARY
              </span>

              {/* Differentiated Serif Gold Metallic TRADING PLATFORM */}
              <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-black tracking-widest uppercase bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-xs select-none">
                TRADING PLATFORM
              </span>
            </h1>

            {/* Subtitle & Clear Tagline */}
            <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight pt-1">
              {t.heroHeadline}
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 font-medium pt-0.5">
              {t.heroSubtitle}
            </p>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              PRIMARY 2-COLUMN REFERENCE CARDS (EXACT REPLICATION OF IMAGE)
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto items-stretch">
            
            {/* CARD 1: 100% DEPOSIT BONUS */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl bg-gradient-to-b from-[#FFFDF7] via-white to-[#FDF9EE] border border-amber-200/80 p-6 sm:p-8 shadow-xl shadow-amber-500/10 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center gap-3.5 mb-6">
                  {/* Icon Graphic */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md shadow-amber-500/20 shrink-0">
                    <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                      <div className="flex items-center text-amber-600 font-black text-xl">
                        <span>%</span>
                        <Coins className="w-4 h-4 -ml-1 text-amber-500" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                      {t.card1Title}
                    </h3>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-700 uppercase tracking-wider -mt-1">
                      {t.card1Subtitle}
                    </p>
                  </div>
                </div>

                {/* Example Highlight Box (Exact Layout with Upward Arrow & Cash) */}
                <div className="rounded-2xl bg-[#FFF9E6] border border-amber-300/80 p-4 sm:p-5 mb-5 shadow-xs">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                        {t.card1ExampleLabel}
                      </p>
                      <h4 className="text-lg sm:text-xl font-black text-slate-950 uppercase tracking-tight leading-tight">
                        {t.card1ExampleHead}
                      </h4>
                    </div>

                    {/* Upward Arrow with Dollar Sign Graphic */}
                    <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex flex-col items-center justify-center shrink-0 p-1.5 shadow-xs">
                      <div className="w-5 h-5 flex items-center justify-center text-slate-950">
                        <ArrowUpRight className="w-6 h-6 text-amber-700 font-black -rotate-45" />
                      </div>
                      <div className="mt-0.5 px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] flex items-center gap-0.5">
                        <DollarSign className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Description */}
                <div className="space-y-2 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  <p>
                    {t.card1Desc1}
                  </p>
                  <p className="text-slate-600 text-xs">
                    {t.card1Desc2}
                  </p>
                </div>
              </div>

              {/* Bonus Tier Quick Badges */}
              <div className="mt-6 pt-4 border-t border-amber-200/50 grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                <div className="p-2 rounded-xl bg-white border border-amber-200">
                  <span className="text-slate-500 block text-[9px]">DEPOSIT $250</span>
                  <span className="text-amber-700 font-black">+$250 BONUS</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-200">
                  <span className="text-slate-500 block text-[9px]">DEPOSIT $500</span>
                  <span className="text-amber-700 font-black">+$500 BONUS</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-200">
                  <span className="text-slate-500 block text-[9px]">DEPOSIT $1,000</span>
                  <span className="text-amber-700 font-black">+$1,000 BONUS</span>
                </div>
              </div>
            </motion.div>

            {/* CARD 2: WITHDRAWAL INFO */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-3xl bg-gradient-to-b from-[#FFFDF7] via-white to-[#FDF9EE] border border-amber-200/80 p-6 sm:p-8 shadow-xl shadow-amber-500/10 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-center gap-3.5 mb-6">
                  {/* Icon Graphic */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-md shadow-amber-500/20 shrink-0">
                    <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {t.card2Title}
                    </h3>
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider -mt-0.5">
                      {t.card2Subtitle}
                    </p>
                  </div>
                </div>

                {/* Rules Section (Live Account vs Bonus Account) */}
                <div className="space-y-3 mb-5 text-xs sm:text-sm">
                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <p className="font-bold text-slate-900">
                      <span className="text-emerald-600 font-extrabold uppercase mr-1.5">{t.card2LiveTitle}:</span>
                      {t.card2LiveDesc}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <p className="font-bold text-slate-900">
                      <span className="text-amber-600 font-extrabold uppercase mr-1.5">{t.card2BonusTitle}:</span>
                      {t.card2BonusDesc}
                    </p>
                  </div>
                </div>

                {/* Important Policy Note Box (Exact Match) */}
                <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4 text-slate-800 text-[11px] sm:text-xs font-medium leading-relaxed">
                  <p className="font-bold text-slate-950 mb-1 flex items-center gap-1.5 text-xs">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>WITHDRAWAL POLICY NOTE:</span>
                  </p>
                  <p>
                    {t.card2PolicyNote}
                  </p>
                </div>
              </div>

              {/* Status Guarantee */}
              <div className="mt-6 pt-4 border-t border-amber-200/50 flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> {t.card2Fee}
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="w-4 h-4 text-amber-600" /> {t.card2Settlement}
                </span>
              </div>
            </motion.div>

          </div>

          {/* Call to Action Buttons under Hero Cards */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-3xl mx-auto">
            <button
              id="hero-cta-register"
              type="button"
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5"
            >
              <UserPlus className="w-4.5 h-4.5" />
              <span>{t.claimBonusBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="hero-cta-demo"
              type="button"
              onClick={() => onOpenDemo ? onOpenDemo() : onOpenRegister()}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5"
            >
              <PlayCircle className="w-4.5 h-4.5 text-amber-400" />
              <span>{t.tryDemoBtn}</span>
            </button>

            <button
              id="hero-cta-leaderboard"
              type="button"
              onClick={() => setIsLeaderboardOpen(true)}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-400/30 text-slate-900 border border-amber-500/40 font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5"
            >
              <Trophy className="w-4.5 h-4.5 text-amber-600" />
              <span>{t.todayLeaderboardBtn}</span>
            </button>
          </div>

          {/* Trust Highlights Grid */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Regulated Standard</p>
                <p className="text-[11px] text-slate-500">Tier-1 Segregated Vaults</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">0.0 Pip Spreads</p>
                <p className="text-[11px] text-slate-500">Ultra-Fast Meta Engine</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-700 shrink-0">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">94% Binary Returns</p>
                <p className="text-[11px] text-slate-500">Fixed High Payouts</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-700 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">$25 UID Reward</p>
                <p className="text-[11px] text-slate-500">Instant Referral Bonus</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. ABOUT FOREX & BINARY TRADING (PURE ENGLISH, CRISP WHITE & GOLD)
      ───────────────────────────────────────────────────────────── */}
      <section id="about" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Dual Asset Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
              Understanding Forex & Binary Trading
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Forex Trade Pro unites two premier financial disciplines into a single high-speed execution ecosystem. Experience institutional liquidity alongside rapid fixed-time contracts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            
            {/* Short-Term Scalping & Pip Trading Pillar */}
            <div className="rounded-3xl border border-slate-200/80 bg-[#FCFBF8] p-8 hover:border-amber-400/60 transition-all duration-300 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700">
                    <Activity className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-900 text-white font-bold text-xs uppercase tracking-wider">
                    Short-Term Scalping Mode
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-3">
                  Short-Term Scalping & Pip Trading (A to Z)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Master high-speed scalp trading by capturing fast micro-price movements across short timeframes (5 seconds to 1 minute). Scalpers exploit rapid liquidity shifts, entering and exiting positions within seconds to consistently lock in 1 to 5 pips per execution.
                </p>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">A to Z: Micro-Timeframe Analysis (5s – M1)</h4>
                      <p className="text-xs text-slate-500">Read live tick order flow, exponential moving averages (EMA 9/21), and dynamic support/resistance to pinpoint high-probability scalp entries.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Raw 0.0 Pip Spreads for Rapid Profitability</h4>
                      <p className="text-xs text-slate-500">Zero markup on major currency pairs (EUR/USD, GBP/USD, USD/JPY) ensures your micro scalp trades overcome the spread and enter green profit instantly.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Sub-15ms Ultra-Fast Execution & Zero Requotes</h4>
                      <p className="text-xs text-slate-500">Direct institutional routing ensures split-second fills at the exact requested price without slippage during high-volatility economic events.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Disciplined Risk-to-Reward & Tight Stop Losses</h4>
                      <p className="text-xs text-slate-500">Protect capital with automated micro-stop orders (2-3 pips), quick breakeven triggers, and systematic 1:1 to 1:2 risk-to-reward ratios per trade.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Hold Time: Seconds to Minutes</span>
                <span>Target: 1 – 5 Micro Pips</span>
              </div>
            </div>

            {/* Binary Options Pillar */}
            <div className="rounded-3xl border border-slate-200/80 bg-[#FCFBF8] p-8 hover:border-amber-400/60 transition-all duration-300 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider">
                    Binary Options Mode
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-3">
                  Fixed-Time High Payout Contracts
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Predict price direction within designated time windows ranging from 5 seconds to 5 minutes. Enjoy fixed payout rates up to 94% on OTC and live market instruments.
                </p>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Up to 94% Fixed Returns</h4>
                      <p className="text-xs text-slate-500">Know your exact potential profit before executing any single contract.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">24/7 OTC Weekend Availability</h4>
                      <p className="text-xs text-slate-500">Trade uninterrupted across weekend sessions with verified OTC feed algorithms.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">One-Click Rapid Execution</h4>
                      <p className="text-xs text-slate-500">Instant strike-point entry with zero slippage during high volatility.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Contract Expiry: 5s – 5m</span>
                <span>Payout Range: 80% – 94%</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. GLOBAL NETWORK & INFRASTRUCTURE
      ───────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#FAF9F5] border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" />
              <span>Worldwide Execution Grid</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
              Designed to Serve Traders Worldwide
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Operating redundant server clusters strategically situated across major financial nodes for minimal latency and maximum uptime reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-700 mb-4">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Singapore & Tokyo Hubs</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Optimized routing for Asian and South Asian market participants, guaranteeing sub-15ms response times.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                <Activity className="w-4 h-4" />
                <span>Average Latency: 12ms</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">London & Frankfurt Nodes</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Direct optic cross-connects to European interbank liquidity providers for institutional pricing precision.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                <Activity className="w-4 h-4" />
                <span>Average Latency: 14ms</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-700 mb-4">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">New York Financial Equinix</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                High-capacity matching engine handling 100,000+ orders per second with complete failover redundancy.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                <Activity className="w-4 h-4" />
                <span>Average Latency: 9ms</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. DEPOSIT INFORMATION & 100% BONUS POLICY HUB
      ───────────────────────────────────────────────────────────── */}
      <section id="deposit-bonus" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Instant Funding Ecosystem</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
              Deposit Information & 100% Bonus Policy
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Fund your account instantly with zero fees. New members making an initial qualifying deposit of $250 or more receive an automatic 100% cash matching bonus.
            </p>
          </div>

          {/* Deposit Highlights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
            
            {/* Left: 100% Bonus Policy Breakdown Card */}
            <div className="lg:col-span-6 rounded-3xl bg-[#FFFDF7] border border-amber-200 p-8 shadow-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">First Deposit 100% Matching Rules</h3>
                  <p className="text-xs text-amber-800 font-bold uppercase tracking-wide">Official Platform Standards</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-700">
                <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs">
                  <div className="flex items-center justify-between font-black text-slate-900 mb-1">
                    <span>QUALIFYING MINIMUM DEPOSIT:</span>
                    <span className="text-amber-600 text-base">USD $250.00</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    To activate the 100% matching bonus, your first deposit must be at least $250. Regular deposits can start at $10.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                  <p className="font-bold text-slate-900">Exact Qualifying Match Examples:</p>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    <li className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span>Deposit <strong>$250</strong></span>
                      <span className="text-amber-700 font-black">→ Receive <strong>$250 Bonus</strong> ($500 Trading Power)</span>
                    </li>
                    <li className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span>Deposit <strong>$500</strong></span>
                      <span className="text-amber-700 font-black">→ Receive <strong>$500 Bonus</strong> ($1,000 Trading Power)</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Deposit <strong>$1,000</strong></span>
                      <span className="text-amber-700 font-black">→ Receive <strong>$1,000 Bonus</strong> ($2,000 Trading Power)</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs text-slate-800">
                  <strong className="text-slate-900 block mb-1">Dual-Wallet Allocation Architecture:</strong>
                  Your deposited capital is instantly credited to your <strong>Live Wallet</strong> (100% withdrawable). Your matched bonus is automatically credited to your <strong>Bonus Wallet</strong> (dedicated for trading).
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Bonus Calculator */}
            <div className="lg:col-span-6 rounded-3xl bg-slate-900 text-white p-8 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-white">Deposit & Bonus Calculator</h3>
                  <p className="text-xs text-amber-400 font-medium">Calculate your total trading capital</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-400/30">
                  100% Match
                </span>
              </div>

              {/* Slider / Amount Selection */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Selected First Deposit Amount:</span>
                  <span className="text-2xl font-black text-amber-400">${depositAmount}</span>
                </div>

                <input 
                  type="range"
                  min="250"
                  max="5000"
                  step="50"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Min: $250 (Qualifying)</span>
                  <span>$1,000</span>
                  <span>$2,500</span>
                  <span>Max: $5,000</span>
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block">Live Wallet (Deposit)</span>
                  <span className="text-xl font-black text-white">${depositAmount}.00</span>
                  <span className="text-[10px] text-emerald-400 block mt-1 font-semibold">100% Withdrawable</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <span className="text-[11px] text-amber-300 uppercase font-bold block">Bonus Wallet (Match)</span>
                  <span className="text-xl font-black text-amber-400">+${depositAmount}.00</span>
                  <span className="text-[10px] text-amber-300 block mt-1 font-semibold">Trading Balance</span>
                </div>
              </div>

              {/* Total Output */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block">Total Initial Trading Power:</span>
                  <span className="text-2xl font-black">${depositAmount * 2}.00 USD</span>
                </div>
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Claim Now
                </button>
              </div>
            </div>

          </div>

          {/* Payment Gateways Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {depositGateways.map((gw, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-3xl border border-slate-200/80 bg-[#FCFBF8] hover:border-amber-300 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-full bg-slate-200/60 text-slate-800 text-[10px] font-bold uppercase">
                      {gw.badge}
                    </span>
                    <span className="text-xs font-bold text-emerald-600">{gw.fee}</span>
                  </div>

                  <h4 className="text-lg font-black text-slate-900 mb-1">{gw.name}</h4>
                  <p className="text-xs text-slate-500 mb-4">{gw.category}</p>

                  <div className="space-y-1.5 text-xs text-slate-700 pt-3 border-t border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Speed:</span>
                      <span className="font-bold text-slate-900">{gw.speed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Min Deposit:</span>
                      <span className="font-bold text-slate-900">{gw.min}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="mt-6 w-full py-2.5 rounded-xl bg-white border border-slate-300 hover:border-amber-400 hover:bg-amber-50 text-slate-900 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Deposit With {gw.name.split(' ')[0]}
                </button>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. WITHDRAWAL INFORMATION & POLICY SECTION
      ───────────────────────────────────────────────────────────── */}
      <section id="withdrawals" className="py-20 bg-[#FAF9F5] border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Guaranteed Payout Process</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
              Withdrawal Information & Execution Guidelines
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              We provide transparent, rapid withdrawal handling. Access your capital and profits through encrypted payment rails within 5 to 15 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-14">
            
            {/* Live Account vs Bonus Account Policy Cards */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Live Account Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border border-emerald-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-700">
                    <CheckCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase">Live Account Withdrawal Policy</h3>
                    <p className="text-xs text-emerald-700 font-bold">100% Unrestricted Payout</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  All funds deposited into your Live Wallet, as well as 100% of profits earned through trades executed using your deposited balance, are fully withdrawable whenever you request. There are no turnover lockdowns or artificial withdrawal barriers.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Processing Time: 5 – 15 Minutes</span>
                  <span className="text-emerald-600">Platform Fee: 0%</span>
                </div>
              </div>

              {/* Bonus Account Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-white border border-amber-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase">Bonus Account Profit Policy</h3>
                    <p className="text-xs text-amber-800 font-bold">50% Trading Profit Withdrawal Rule</p>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Bonus capital is provided exclusively to boost your trading volume and cannot be directly cashed out without trading. However, when you make profitable trades using bonus funds, <strong>50% of the generated profits</strong> can be converted and withdrawn to your real account.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Base Bonus Principal: Trading Only</span>
                  <span className="text-amber-700">Profit Withdrawal: 50%</span>
                </div>
              </div>

            </div>

            {/* Live Processed Withdrawals Table / Ticker */}
            <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase">Recent Verified Payouts</h4>
                  <p className="text-[11px] text-slate-500">Live ledger feed</p>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  System Live
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {liveWithdrawals.map((w, idx) => (
                  <div key={idx} className="py-2.5 sm:py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{w.amount}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{w.uid}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{w.method}</span>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] block">
                        {w.status}
                      </span>
                      <span className="text-[10px] text-slate-400">{w.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-500 font-medium">
                  This payout list updates automatically every <strong className="text-slate-900 font-bold">5 to 6 minutes</strong>
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. BONUS WALLET INFO & $25 UID REFERRAL REWARD FLOW
      ───────────────────────────────────────────────────────────── */}
      <section id="referral" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* P2P Referral Info Banner with Network Illustration */}
          <div className="mb-14">
            <ReferralInfoBanner onOpenRegister={onOpenRegister} />
          </div>

          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Share2 className="w-3.5 h-3.5" />
              <span>Affiliate & Member Rewards</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
              Bonus Wallet Info & $25 UID Referral Flow
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Every member receives an exclusive 6-digit Referral UID. Share your UID and automatically receive a $25 cash reward in your Bonus Wallet when your invited trader makes their first qualifying deposit.
            </p>
          </div>

          {/* Visual 4-Step Referral Process Flow */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-[#FCFBF8] border border-slate-200/80 hover:border-amber-300 transition-all relative">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm mb-4 shadow-sm">
                1
              </div>
              <h3 className="text-base font-black text-slate-900 mb-2">Share Your Link / UID</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Find your unique 6-digit Referral UID (e.g. UID-849201) and personal referral link (<strong>fxby24.com/?ref=YOUR_UID</strong>) in your account profile and share it with friends, traders, or social networks.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-[#FCFBF8] border border-slate-200/80 hover:border-amber-300 transition-all relative">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center text-sm mb-4 shadow-sm">
                2
              </div>
              <h3 className="text-base font-black text-slate-900 mb-2">Friend Registers</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your friend registers their new account on Forex Trade Pro and enters your 6-digit UID in the designated referral field.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-[#FCFBF8] border border-slate-200/80 hover:border-amber-300 transition-all relative">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center text-sm mb-4 shadow-sm">
                3
              </div>
              <h3 className="text-base font-black text-slate-900 mb-2">Qualifying $250+ Deposit</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your friend completes their first qualifying deposit of USD $250 or more (also receiving their 100% welcome match bonus).
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-[#FFFDF7] border-2 border-amber-300 hover:border-amber-400 transition-all relative shadow-md">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm mb-4 shadow-sm">
                4
              </div>
              <h3 className="text-base font-black text-slate-950 mb-2">Instant $25 Bonus Credit</h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                Our system instantly credits <strong className="text-amber-700 font-bold">$25.00</strong> to your Bonus Wallet automatically. You can accumulate rewards with zero ceiling limit.
              </p>
            </div>

          </div>

          {/* Interactive Referral Reward Simulator */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white p-8 sm:p-10 shadow-2xl border border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-400/30">
                    Live Reward Calculator
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mt-3">
                    Calculate Your $25 Referral Earnings
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Adjust the slider to simulate how many friends or community members you introduce.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 font-medium">Invited Friends (Qualifying $250+ Deposit):</span>
                    <span className="text-2xl font-black text-amber-400">{referralCount} Traders</span>
                  </div>

                  <input 
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={referralCount}
                    onChange={(e) => setReferralCount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  />

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>1 Trader ($25)</span>
                    <span>10 Traders ($250)</span>
                    <span>25 Traders ($625)</span>
                    <span>50 Traders ($1,250)</span>
                  </div>
                </div>

                {/* Policy reminder */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-amber-400">Bonus Wallet Policy:</strong> Referral rewards are credited to your Bonus Wallet for active market trading. All generated trading profits are 50% withdrawable according to standard bonus policy rules.
                </div>
              </div>

              {/* Result Badge */}
              <div className="lg:col-span-5 rounded-2xl bg-slate-900 border border-amber-500/30 p-6 text-center space-y-4">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
                  Your Estimated Bonus Credit:
                </span>
                <div className="text-4xl sm:text-5xl font-black text-amber-400">
                  ${referralCount * 25}.00
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Credited across {referralCount} verified $250+ deposit activations.
                </p>
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                >
                  Get Your Referral UID Now
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. LIVE REAL-TIME MARKET TICKER & INSTRUMENTS
      ───────────────────────────────────────────────────────────── */}
      <section id="markets" className="py-20 bg-[#FAF9F5] border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
              Live Real-Time Market Feed
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Access 70+ high-liquidity financial instruments with real-time STP quotes and competitive fixed return options.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {(['all', 'forex', 'crypto', 'commodity'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Instruments Table */}
          <div className="rounded-3xl bg-white border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Instrument</th>
                    <th className="py-4 px-6">Live Price</th>
                    <th className="py-4 px-6">24h Change</th>
                    <th className="py-4 px-6">Binary Payout</th>
                    <th className="py-4 px-6">Spread (Pips)</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredTickers.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 font-black text-xs shrink-0">
                            {t.symbol.split('/')[0]}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 block">{t.symbol}</span>
                            <span className="text-[11px] text-slate-400 font-normal">{t.name}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-slate-950">
                        {t.type === 'crypto' || t.type === 'commodity' ? `$${t.price.toLocaleString()}` : t.price.toFixed(4)}
                      </td>

                      <td className="py-4 px-6 font-bold">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                          t.change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {t.change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {t.change >= 0 ? `+${t.change}%` : `${t.change}%`}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          {t.payout}% Return
                        </span>
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-600">
                        {t.spread} pips
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={onOpenRegister}
                          className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                          Trade Now
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. FREQUENTLY ASKED QUESTIONS (FAQ)
      ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Got Questions?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Clear answers regarding our 100% deposit bonus, withdrawal terms, $25 UID referral rewards, and security.
            </p>
          </div>

          <div className="space-y-4">
            {faqList.map((faq, idx) => (
              <div 
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-[#FCFBF8] overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base cursor-pointer hover:text-amber-700"
                >
                  <span>{faq.q}</span>
                  {openFaqIndex === idx ? (
                    <ChevronUp className="w-5 h-5 text-amber-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                </button>

                {openFaqIndex === idx && (
                  <div className="px-6 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. FOOTER SECTION (ELEGANT, COMPLIANT, FULL PROFESSIONAL ENGLISH)
      ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <BrandLogo size="md" theme="dark" showText={false} />
                <span className="text-2xl font-black text-white tracking-tight">
                  <span className="text-amber-400 italic font-serif text-3xl mr-0.5">F</span>
                  <span>orex Trade Pro</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Forex Trade Pro is an international multi-asset financial platform delivering cutting-edge execution across Forex spread trading and high-return Binary Options.
              </p>
              <div className="flex items-center gap-3 text-xs text-amber-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Encrypted 256-bit SSL Data Security</span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">Trading Modes</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#about" className="hover:text-amber-400 transition-colors">Forex Margin Trading</a></li>
                <li><a href="#about" className="hover:text-amber-400 transition-colors">Binary OTC Options</a></li>
                <li><a href="#markets" className="hover:text-amber-400 transition-colors">Currency Pairs</a></li>
                <li><a href="#markets" className="hover:text-amber-400 transition-colors">Commodities & Gold</a></li>
                <li><a href="#markets" className="hover:text-amber-400 transition-colors">Crypto Assets</a></li>
              </ul>
            </div>

            {/* Banking & Policy */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">Banking & Rules</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#deposit-bonus" className="hover:text-amber-400 transition-colors">100% Deposit Bonus ($250+)</a></li>
                <li><a href="#withdrawals" className="hover:text-amber-400 transition-colors">Live Account Withdrawal</a></li>
                <li><a href="#withdrawals" className="hover:text-amber-400 transition-colors">Bonus Profit Policy (50%)</a></li>
                <li><a href="#referral" className="hover:text-amber-400 transition-colors">$25 UID Referral Reward</a></li>
                <li><a href="#deposit-bonus" className="hover:text-amber-400 transition-colors">Payment Gateways</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-4">Support & Help</h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li><a href="#faq" className="hover:text-amber-400 transition-colors">Frequently Asked Questions</a></li>
                <li><span className="text-slate-500">24/7 Live Chat Terminal</span></li>
                <li><span className="text-slate-500">Dedicated Account Manager</span></li>
                <li><span className="text-slate-500">Risk Disclosure Statement</span></li>
              </ul>
            </div>

          </div>

          {/* Risk Disclaimer */}
          <div className="pt-8 text-slate-500 text-[11px] leading-relaxed space-y-3">
            <p>
              <strong>High Risk Investment Warning:</strong> Trading Foreign Exchange (Forex) and Contracts for Difference (CFDs) / Binary Options on margin carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade Forex or Binary Options, you should carefully consider your investment objectives, level of experience, and risk appetite.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-gray-500 text-[11px] pt-4 border-t border-slate-900">
              <p>© 2026 Forex Trade Pro. All rights reserved.</p>
              <div className="flex items-center gap-4">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
                <span>AML & KYC Compliance</span>
              </div>
            </div>
          </div>

        </div>
      </footer>

      {/* FLOATING QUICK-ACCESS BUTTONS (ABOUT COMPANY & LEADERBOARD) */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
        <button
          id="floating-about-company-btn"
          type="button"
          onClick={() => setIsAboutCompanyOpen(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-2xl bg-slate-900/95 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-slate-950/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-400/40 ring-2 ring-white/20 backdrop-blur-md"
          title="About Company Profile & Legal Licenses"
        >
          <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="hidden sm:inline">About Company</span>
          <span className="sm:hidden">About</span>
        </button>

        <button
          id="floating-leaderboard-btn"
          type="button"
          onClick={() => setIsLeaderboardOpen(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300 ring-2 ring-white/60"
        >
          <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
          <span className="hidden sm:inline">Top 50 Leaderboard</span>
          <span className="sm:hidden">Leaderboard</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-amber-400 text-[9px] font-mono">LIVE</span>
        </button>
      </div>

      {/* ABOUT COMPANY MODAL (MULTI-LANGUAGE & LICENSES) */}
      {isAboutCompanyOpen && (
        <Suspense fallback={null}>
          <AboutCompanyModal
            isOpen={isAboutCompanyOpen}
            onClose={() => setIsAboutCompanyOpen(false)}
          />
        </Suspense>
      )}

      {/* REAL-TIME DAILY LEADERBOARD MODAL (PUBLICLY ACCESSIBLE BY ALL USERS WITHOUT LOGGING IN) */}
      {isLeaderboardOpen && (
        <Suspense fallback={null}>
          <LeaderboardModal
            isOpen={isLeaderboardOpen}
            onClose={() => setIsLeaderboardOpen(false)}
            activeAccount="live"
            closedTrades={[]}
            activeTrades={[]}
            isPublicView={true}
          />
        </Suspense>
      )}

    </motion.div>
  );
};
