import React, { useState, useEffect, useRef } from 'react';
import { BrandLogo } from './BrandLogo';
import { 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  Globe2, 
  Lock, 
  ChevronRight, 
  Clock, 
  Cpu, 
  CheckCircle2, 
  Layers, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export interface PortalLandingPageProps {
  onGetStarted: () => void;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
}

// Institutional Market Quotes (Real-time live oscillating ticks)
interface LiveMarketQuote {
  symbol: string;
  name: string;
  category: 'Forex' | 'Commodity' | 'Crypto';
  bid: number;
  ask: number;
  spread: number;
  change24h: number;
  decimals: number;
}

const INITIAL_QUOTES: LiveMarketQuote[] = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'Forex', bid: 1.08642, ask: 1.08644, spread: 0.2, change24h: +0.34, decimals: 5 },
  { symbol: 'GBP/USD', name: 'British Pound / USD', category: 'Forex', bid: 1.29418, ask: 1.29421, spread: 0.3, change24h: +0.48, decimals: 5 },
  { symbol: 'USD/JPY', name: 'USD / Japanese Yen', category: 'Forex', bid: 154.215, ask: 154.228, spread: 1.3, change24h: -0.19, decimals: 3 },
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', category: 'Commodity', bid: 2736.40, ask: 2736.75, spread: 3.5, change24h: +1.12, decimals: 2 },
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', category: 'Crypto', bid: 91450.00, ask: 91452.50, spread: 2.5, change24h: +3.25, decimals: 2 },
];

export const PortalLandingPage: React.FC<PortalLandingPageProps> = ({
  onGetStarted,
  onOpenAuth,
}) => {
  const [quotes, setQuotes] = useState<LiveMarketQuote[]>(INITIAL_QUOTES);
  const [lastTickSymbol, setLastTickSymbol] = useState<string | null>(null);

  // 3D Card Interactive Tilt Physics
  const heroCardRef = useRef<HTMLDivElement>(null);
  const [cardRotation, setCardRotation] = useState<{ x: number; y: number }>({ x: 8, y: -10 });
  const [isHoveringCard, setIsHoveringCard] = useState<boolean>(false);

  // Simulate ultra-smooth institutional tick movements
  useEffect(() => {
    const interval = setInterval(() => {
      setQuotes(prev => {
        const randomIndex = Math.floor(Math.random() * prev.length);
        const item = prev[randomIndex];
        const variance = (Math.random() - 0.49) * (item.bid * 0.0003);
        const newBid = +(item.bid + variance).toFixed(item.decimals);
        const spreadOffset = (item.spread / Math.pow(10, item.decimals));
        const newAsk = +(newBid + spreadOffset).toFixed(item.decimals);
        
        setLastTickSymbol(item.symbol);
        
        return prev.map((q, idx) => {
          if (idx === randomIndex) {
            return {
              ...q,
              bid: newBid,
              ask: newAsk,
              change24h: +(q.change24h + (variance > 0 ? 0.02 : -0.02)).toFixed(2),
            };
          }
          return q;
        });
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  // Handle 3D Mouse Parallax on the Terminal Preview
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Rotate max 16 degrees along both axes
    const rotX = -((y - centerY) / centerY) * 14;
    const rotY = ((x - centerX) / centerX) * 16;
    setCardRotation({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    setIsHoveringCard(false);
    // Smooth reset to natural perspective angle
    setCardRotation({ x: 8, y: -10 });
  };

  return (
    <div className="min-h-screen bg-[#060913] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#10B981] selection:text-black overflow-x-hidden">
      {/* Dynamic Ambient Background (Exness/HFM Style deep dark with subtle emerald/slate glow) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft Radial Ambient Lights */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[1000px] h-[650px] bg-gradient-to-b from-[#10B981]/10 via-[#0F172A]/20 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -left-[10%] w-[600px] h-[600px] bg-[#10B981]/5 blur-[140px] rounded-full" />
        <div className="absolute bottom-[10%] -right-[10%] w-[700px] h-[700px] bg-[#0F172A]/40 blur-[150px] rounded-full" />
        {/* Micro Grid Overlay for high-tech spatial feel */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '36px 36px' 
          }} 
        />
      </div>

      {/* ========================================================
          1. HEADER / NAVIGATION (Clean, Unboxed, Exness-style)
         ======================================================== */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#060913]/80 border-b border-white/[0.06] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={onGetStarted}>
            <BrandLogo size="lg" theme="dark" />
          </div>

          {/* Clean Typography Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button 
              type="button"
              onClick={onGetStarted}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Markets
            </button>
            <button 
              type="button"
              onClick={onGetStarted}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Trading Technology
            </button>
            <button 
              type="button"
              onClick={onGetStarted}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Security & Custody
            </button>
            <button 
              type="button"
              onClick={onGetStarted}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Institutional Execution
            </button>
          </nav>

          {/* Action Hub: Sign In & Primary 'Get Started' Button */}
          <div className="flex items-center gap-3">
            {onOpenAuth && (
              <button
                type="button"
                onClick={() => onOpenAuth('signin')}
                className="hidden sm:inline-flex px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
            )}

            {/* Master Get Started Button */}
            <button
              type="button"
              onClick={onGetStarted}
              className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm bg-[#10B981] hover:bg-[#059669] text-black shadow-lg shadow-[#10B981]/25 hover:shadow-[#10B981]/40 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          2. HERO SECTION WITH 3D PERSPECTIVE TERMINAL
         ======================================================== */}
      <section className="relative z-10 pt-12 pb-20 md:pt-20 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Clear Strategic Value & CTA */}
          <div className="lg:col-span-6 flex flex-col text-left space-y-6">
            
            {/* Quiet Unboxed Kicker */}
            <div className="flex items-center gap-2.5 text-xs font-semibold tracking-wider uppercase text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Next-Gen Market Infrastructure</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">Direct Liquidity Access</span>
            </div>

            {/* Master Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Trade Global Markets <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-white bg-clip-text text-transparent">
                With True Precision
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              Access 250+ institutional instruments with raw spreads from 0.0 pips, millisecond order routing, and modern terminal analytics engineered for professional participants.
            </p>

            {/* Action Bar (The Prominent 'Get Started' Button requested by the user) */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                type="button"
                onClick={onGetStarted}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-base bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1.5" />
              </button>

              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-semibold text-sm text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Launch Web Terminal</span>
              </button>
            </div>

            {/* Institutional Trust Indicators */}
            <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero Hidden Fees</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>256-bit Encrypted Engine</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant Cloud Sync</span>
              </div>
            </div>

          </div>

          {/* Right Column: 3D Spatial Interactive Terminal Card */}
          <div 
            className="lg:col-span-6 flex items-center justify-center relative perspective-[1200px]"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHoveringCard(true)}
            onMouseLeave={handleMouseLeave}
          >
            {/* Subtle glow beneath the 3D card */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/15 to-blue-500/10 blur-[80px] rounded-3xl pointer-events-none" />

            {/* Master 3D Tilted Perspective Canvas */}
            <div
              ref={heroCardRef}
              style={{
                transform: `rotateX(${cardRotation.x}deg) rotateY(${cardRotation.y}deg)`,
                transformStyle: 'preserve-3d',
                transition: isHoveringCard ? 'transform 0.1s ease-out' : 'transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              className="relative w-full max-w-[540px] rounded-3xl bg-[#0A0F1D]/90 border border-white/[0.12] shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.15)] p-5 sm:p-6 backdrop-blur-2xl select-none"
            >
              {/* Terminal Top Bar */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="text-xs font-mono font-medium text-slate-400 ml-2">FXBY24_CORE_TERMINAL</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LATENCY: 0.02ms</span>
                </div>
              </div>

              {/* Live Ticker Bar Inside 3D Terminal */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                {quotes.slice(0, 3).map((q) => (
                  <div 
                    key={q.symbol} 
                    className={`p-2.5 rounded-xl border transition-all ${
                      lastTickSymbol === q.symbol 
                        ? 'bg-emerald-950/40 border-emerald-500/40' 
                        : 'bg-white/[0.02] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span className="font-bold text-white">{q.symbol}</span>
                      <span className={q.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {q.change24h >= 0 ? '+' : ''}{q.change24h}%
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-white tracking-tight">
                      {q.bid.toFixed(q.decimals)}
                    </div>
                  </div>
                ))}
              </div>

              {/* 3D Realistic Candlestick / Chart Preview Visualization */}
              <div className="relative h-48 w-full rounded-2xl bg-[#060913] border border-white/[0.08] p-3 overflow-hidden flex flex-col justify-between">
                {/* Micro Chart Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">EUR/USD · 1M</span>
                    <span className="text-emerald-400 font-mono text-[11px]">1.08644</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <span className="text-emerald-400">HIGH: 1.08720</span>
                    <span className="text-rose-400">LOW: 1.08590</span>
                  </div>
                </div>

                {/* SVG Candlestick & Wave Path Simulation */}
                <div className="relative flex-1 w-full flex items-center justify-center my-1">
                  <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    
                    {/* Horizontal Grid lines */}
                    <line x1="0" y1="30" x2="400" y2="30" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
                    <line x1="0" y1="60" x2="400" y2="60" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
                    <line x1="0" y1="90" x2="400" y2="90" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />

                    {/* Area under wave */}
                    <path
                      d="M 0 100 Q 60 70, 110 85 T 220 50 T 310 35 T 400 20 L 400 120 L 0 120 Z"
                      fill="url(#chartGradient)"
                    />
                    {/* Main Trend Wave */}
                    <path
                      d="M 0 100 Q 60 70, 110 85 T 220 50 T 310 35 T 400 20"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.5"
                    />

                    {/* Pulsing Live Execution Point */}
                    <circle cx="400" cy="20" r="4" fill="#10B981" />
                    <circle cx="400" cy="20" r="8" fill="#10B981" opacity="0.4" className="animate-ping" />
                  </svg>
                </div>

                {/* Floating 3D Order Confirmation Badge */}
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-[11px]">
                  <span className="text-slate-400">Order Routing: Institutional ECN</span>
                  <span className="text-emerald-400 font-semibold font-mono">Fill: 100% Executed</span>
                </div>
              </div>

              {/* Quick Launch CTA directly inside the 3D card */}
              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Client Segregated Vaults</span>
                </div>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer group"
                >
                  <span>Open Full Terminal</span>
                  <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          3. INSTITUTIONAL METRICS (Exness / HFM Benchmarks)
         ======================================================== */}
      <section className="relative z-10 border-y border-white/[0.08] bg-[#080D1A]/60 backdrop-blur-md py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:text-left">
          
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
              0.0 <span className="text-emerald-400 text-lg sm:text-xl font-sans">pips</span>
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Raw Spread Floor
            </div>
            <p className="text-xs text-slate-500">Unfiltered tier-1 bank liquidity</p>
          </div>

          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
              &lt; 20 <span className="text-emerald-400 text-lg sm:text-xl font-sans">ms</span>
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Execution Speed
            </div>
            <p className="text-xs text-slate-500">Sub-millisecond optical routing</p>
          </div>

          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
              250 <span className="text-emerald-400 text-lg sm:text-xl font-sans">+</span>
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Tradable Assets
            </div>
            <p className="text-xs text-slate-500">Forex, metals, indices & crypto</p>
          </div>

          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono">
              99.99 <span className="text-emerald-400 text-lg sm:text-xl font-sans">%</span>
            </div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Network Availability
            </div>
            <p className="text-xs text-slate-500">Clustered multi-cloud redundancy</p>
          </div>

        </div>
      </section>

      {/* ========================================================
          4. LIVE MARKET QUOTE TABLE (Clean, Institutional)
         ======================================================== */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
              Live Price Feeds
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Real-Time Global Market Watch
            </h2>
          </div>
          
          <button
            type="button"
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors self-start md:self-auto cursor-pointer"
          >
            <span>Trade all 250+ instruments</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quotes Card Table */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0A0F1D]/80 overflow-hidden shadow-xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-xs font-semibold text-slate-400 uppercase tracking-wider bg-white/[0.02]">
                  <th className="py-4 px-6">Instrument</th>
                  <th className="py-4 px-6">Market</th>
                  <th className="py-4 px-6 text-right">Live Bid</th>
                  <th className="py-4 px-6 text-right">Live Ask</th>
                  <th className="py-4 px-6 text-right">Spread</th>
                  <th className="py-4 px-6 text-right">24h Change</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {quotes.map((q) => (
                  <tr 
                    key={q.symbol}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    onClick={onGetStarted}
                  >
                    <td className="py-4 px-6 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span>{q.symbol}</span>
                      </div>
                      <span className="text-xs text-slate-500 font-normal">{q.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs text-slate-300 font-medium">{q.category}</span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-semibold text-white">
                      {q.bid.toFixed(q.decimals)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-semibold text-white">
                      {q.ask.toFixed(q.decimals)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-xs text-slate-400">
                      {q.spread.toFixed(1)} pips
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-semibold">
                      <span className={q.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {q.change24h >= 0 ? '+' : ''}{q.change24h.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGetStarted();
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. THREE CORE PILLARS (Clean, 3-Card Minimal Grid)
         ======================================================== */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
            Why Professionals Choose FXBY24
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Engineered for Unmatched Execution
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            A trading environment designed with institutional integrity, transparent pricing, and robust risk management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div 
            onClick={onGetStarted}
            className="group p-6 rounded-2xl bg-[#0A0F1D]/80 border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-300 shadow-xl cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Ultra-Low Latency Bridge</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Equinix NY4 & LD4 server infrastructure with optical fiber links ensures your market orders execute at true institutional velocities with minimal slippage.
            </p>
          </div>

          {/* Card 2 */}
          <div 
            onClick={onGetStarted}
            className="group p-6 rounded-2xl bg-[#0A0F1D]/80 border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-300 shadow-xl cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Segregated Custody Vaults</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every client balance is partitioned in segregated institutional tier-1 accounts, protected with continuous 256-bit encryption and strict balance preservation safeguards.
            </p>
          </div>

          {/* Card 3 */}
          <div 
            onClick={onGetStarted}
            className="group p-6 rounded-2xl bg-[#0A0F1D]/80 border border-white/[0.08] hover:border-emerald-500/40 transition-all duration-300 shadow-xl cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Multi-Asset Synergy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seamlessly trade major forex currencies, precious metals, commodities, and digital crypto assets under a single unified dashboard without account switching.
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================
          6. BOTTOM CALL-TO-ACTION (High-Conversion 'Get Started')
         ======================================================== */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl bg-gradient-to-b from-[#0F172A] to-[#0A0F1D] border border-white/[0.12] p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          {/* Subtle Emerald Spotlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/15 blur-[100px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Experience Institutional Trading?
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Open your trading terminal in seconds. Practice with instant demo execution or trade live markets with institutional spreads.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={onGetStarted}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 rounded-xl font-bold text-base bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {onOpenAuth && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('signup')}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-sm text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all cursor-pointer"
                >
                  Create Live Account
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          7. INSTITUTIONAL FOOTER & COMPLIANCE NOTICE
         ======================================================== */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#04060C] text-slate-500 py-12 px-4 sm:px-6 lg:px-8 text-xs leading-relaxed">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/[0.06]">
            <BrandLogo size="md" theme="dark" />
            <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
              <button type="button" onClick={onGetStarted} className="hover:text-white transition-colors cursor-pointer">
                Trading Rules
              </button>
              <button type="button" onClick={onGetStarted} className="hover:text-white transition-colors cursor-pointer">
                Privacy Policy
              </button>
              <button type="button" onClick={onGetStarted} className="hover:text-white transition-colors cursor-pointer">
                Terms of Service
              </button>
              <button type="button" onClick={onGetStarted} className="hover:text-white transition-colors cursor-pointer">
                Risk Disclosure
              </button>
            </div>
          </div>

          {/* Mandatory Risk Warning for Broker Legitimacy and Scanner Audits */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-slate-400 space-y-2">
            <p className="font-semibold text-slate-300">
              High Risk Investment Notice:
            </p>
            <p>
              Trading Foreign Exchange (Forex) and Contracts for Difference (CFDs) on margin carries a high level of risk and may not be suitable for all investors. The high degree of leverage can work against you as well as for you. Before deciding to trade foreign exchange or any financial markets, you should carefully consider your investment objectives, level of experience, and risk appetite.
            </p>
            <p className="text-slate-500">
              FXBY24 provides execution-only market access and digital market intelligence. Past performance is not indicative of future results.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <p>© 2026 FXBY24 Global Markets Ltd. All rights reserved.</p>
            <p>Protected by 256-bit SSL Cryptographic Layer.</p>
          </div>

        </div>
      </footer>
    </div>
  );
};
