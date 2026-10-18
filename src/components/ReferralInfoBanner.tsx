import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Gift, 
  TrendingUp, 
  ArrowDownToLine, 
  ShieldCheck, 
  Sparkles,
  DollarSign,
  Share2,
  CheckCircle2
} from 'lucide-react';

interface ReferralInfoBannerProps {
  onOpenRegister?: () => void;
}

interface NetworkNode {
  id: number;
  x: number;
  y: number;
  r: number;
  label: string;
  name: string;
  delay: number;
  connectedTo: number[];
  accentColor: string;
}

export const ReferralInfoBanner: React.FC<ReferralInfoBannerProps> = ({ onOpenRegister }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll simulation on small screens if user doesn't interact, smoothly rocking or panning
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    let direction = 1;
    let animId: number;
    let isHovered = false;

    const onMouseEnter = () => { isHovered = true; };
    const onMouseLeave = () => { isHovered = false; };
    const onTouchStart = () => { isHovered = true; };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('touchstart', onTouchStart);

    const step = () => {
      if (!isHovered && el.scrollWidth > el.clientWidth) {
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
          direction = -1;
        } else if (el.scrollLeft <= 2) {
          direction = 1;
        }
        el.scrollLeft += direction * 0.4;
      }
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('touchstart', onTouchStart);
    };
  }, []);

  // 18 meticulously positioned interconnected user nodes mimicking the reference network structure
  const nodes: NetworkNode[] = [
    // Inner Ring Nodes (Closest to center ME at 250, 200)
    { id: 1, x: 170, y: 150, r: 18, label: '$25', name: 'User A', delay: 0.1, connectedTo: [0, 2, 7], accentColor: '#10b981' },
    { id: 2, x: 250, y: 110, r: 19, label: '$25', name: 'User B', delay: 0.2, connectedTo: [0, 1, 3], accentColor: '#f59e0b' },
    { id: 3, x: 330, y: 145, r: 18, label: '$25', name: 'User C', delay: 0.15, connectedTo: [0, 2, 4], accentColor: '#10b981' },
    { id: 4, x: 355, y: 215, r: 19, label: '$25', name: 'User D', delay: 0.3, connectedTo: [0, 3, 5], accentColor: '#38bdf8' },
    { id: 5, x: 320, y: 280, r: 18, label: '$25', name: 'User E', delay: 0.25, connectedTo: [0, 4, 6], accentColor: '#f59e0b' },
    { id: 6, x: 245, y: 300, r: 20, label: '$25', name: 'User F', delay: 0.35, connectedTo: [0, 5, 7], accentColor: '#10b981' },
    { id: 7, x: 160, y: 260, r: 18, label: '$25', name: 'User G', delay: 0.2, connectedTo: [0, 6, 1], accentColor: '#38bdf8' },
    { id: 8, x: 135, y: 195, r: 19, label: '$25', name: 'User H', delay: 0.4, connectedTo: [0, 1, 7], accentColor: '#f59e0b' },

    // Outer Ring & Peripheral Nodes (Branching out)
    { id: 9, x: 90, y: 110, r: 16, label: '$25', name: 'User I', delay: 0.5, connectedTo: [1, 8], accentColor: '#10b981' },
    { id: 10, x: 165, y: 55, r: 16, label: '$25', name: 'User J', delay: 0.45, connectedTo: [2, 1], accentColor: '#38bdf8' },
    { id: 11, x: 325, y: 55, r: 17, label: '$25', name: 'User K', delay: 0.6, connectedTo: [2, 3], accentColor: '#f59e0b' },
    { id: 12, x: 410, y: 105, r: 16, label: '$25', name: 'User L', delay: 0.55, connectedTo: [3, 4], accentColor: '#10b981' },
    { id: 13, x: 435, y: 190, r: 17, label: '$25', name: 'User M', delay: 0.65, connectedTo: [4, 14], accentColor: '#38bdf8' },
    { id: 14, x: 410, y: 285, r: 16, label: '$25', name: 'User N', delay: 0.7, connectedTo: [5, 13], accentColor: '#f59e0b' },
    { id: 15, x: 335, y: 350, r: 16, label: '$25', name: 'User O', delay: 0.6, connectedTo: [6, 5], accentColor: '#10b981' },
    { id: 16, x: 195, y: 360, r: 17, label: '$25', name: 'User P', delay: 0.75, connectedTo: [6, 7], accentColor: '#38bdf8' },
    { id: 17, x: 80, y: 295, r: 16, label: '$25', name: 'User Q', delay: 0.8, connectedTo: [7, 8], accentColor: '#f59e0b' },
    { id: 18, x: 60, y: 205, r: 15, label: '$25', name: 'User R', delay: 0.85, connectedTo: [8, 9], accentColor: '#10b981' },
  ];

  const features = [
    {
      title: 'P2P (Person to Person) Network',
      icon: Users,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30'
    },
    {
      title: '$25 Instant Referral Bonus',
      icon: DollarSign,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    },
    {
      title: 'Trade with Bonus Balance',
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    },
    {
      title: 'Withdraw Profits per Platform Rules',
      icon: ArrowDownToLine,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto my-8 sm:my-10 px-2 sm:px-0">
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#111c33] to-[#0a0f1d] border border-amber-500/30 shadow-2xl shadow-amber-500/5 p-5 sm:p-7 md:p-8 lg:p-10 overflow-hidden backdrop-blur-xl">
        
        {/* Background Ambient Glows & Grid Mesh */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
          
          {/* ─────────────────────────────────────────────────────────────
              LEFT SIDE: FIXED & HIGHLY READABLE PROMOTIONAL DETAILS
          ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5 text-left">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/5 border border-amber-400/30 text-amber-300 text-[11px] sm:text-xs font-black tracking-wider uppercase shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Unlimited P2P Community Rewards</span>
            </div>

            {/* Main Title */}
            <div className="space-y-1.5">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                P2P <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">(Person to Person)</span> Referral Bonus
              </h3>
              <div className="h-1 w-20 bg-gradient-to-r from-amber-500 via-yellow-400 to-transparent rounded-full" />
            </div>

            {/* English Description */}
            <p className="text-slate-300 text-sm sm:text-base font-normal leading-relaxed">
              Invite friends using your unique referral link. Once they activate the bonus and complete a qualifying deposit, you will receive an instant <span className="text-amber-400 font-bold underline decoration-amber-400/50 decoration-2 underline-offset-2">$25 Referral Bonus</span> directly in your Bonus Wallet.
            </p>

            {/* Feature List (4 key features) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {features.map((feat, idx) => {
                const IconComponent = feat.icon;
                return (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-amber-400/40 transition-all duration-300"
                  >
                    <div className={`p-1.5 rounded-lg border shrink-0 ${feat.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-[13px] font-semibold text-slate-200 leading-tight">
                      {feat.title}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Action / CTA Note */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onOpenRegister}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Get Your Referral Link</span>
              </button>
              <span className="text-[11px] text-slate-400 hidden sm:inline-block">
                Instant $25 Credit on Qualification
              </span>
            </div>

          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT SIDE: CUSTOM VECTOR NETWORK ILLUSTRATION (REFERENCE IMAGE STYLE)
          ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-6 w-full flex flex-col items-center">
            
            {/* Scrollable container on small screens with subtle scroll bar indicator */}
            <div 
              ref={scrollContainerRef}
              className="w-full overflow-x-auto no-scrollbar scroll-smooth relative rounded-2xl bg-[#070c18]/80 border border-slate-800/80 p-2 sm:p-4 flex items-center justify-center min-h-[340px] sm:min-h-[380px]"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              
              {/* SVG Canvas for High-Definition Network Connections */}
              <div className="relative w-[480px] h-[400px] shrink-0 select-none">
                
                <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 500 420">
                  <defs>
                    {/* Glowing Gradients */}
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#dc2626" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#991b1b" stopOpacity="0" />
                    </radialGradient>

                    <radialGradient id="globeGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
                      <stop offset="70%" stopColor="#0ea5e9" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
                    </radialGradient>

                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
                    </linearGradient>

                    <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* World Globe Wireframe Grid (Matching Reference Photo) */}
                  <circle cx="250" cy="200" r="110" fill="url(#globeGlow)" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />
                  <ellipse cx="250" cy="200" rx="110" ry="50" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.25" />
                  <ellipse cx="250" cy="200" rx="55" ry="110" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.25" />
                  <line x1="140" y1="200" x2="360" y2="200" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.2" />
                  <line x1="250" y1="90" x2="250" y2="310" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.2" />

                  {/* Pulsing Concentric Outer Ring */}
                  <circle cx="250" cy="200" r="160" fill="none" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.15" strokeDasharray="4 6" />

                  {/* Connecting Bezier Lines between Nodes */}
                  {nodes.map(node => {
                    return node.connectedTo.map((targetId, i) => {
                      const target = targetId === 0 
                        ? { x: 250, y: 200 } 
                        : nodes.find(n => n.id === targetId);

                      if (!target) return null;

                      return (
                        <g key={`${node.id}-${targetId}-${i}`}>
                          <line
                            x1={node.x}
                            y1={node.y}
                            x2={target.x}
                            y2={target.y}
                            stroke="url(#lineGrad)"
                            strokeWidth="1.2"
                            strokeOpacity="0.45"
                          />
                          {/* Pulsing Signal Dot along line */}
                          <circle
                            cx={(node.x + target.x) / 2}
                            cy={(node.y + target.y) / 2}
                            r="1.5"
                            fill="#f59e0b"
                            opacity="0.7"
                          />
                        </g>
                      );
                    });
                  })}
                </svg>

                {/* ─────────────────────────────────────────────────────────────
                    CENTER HUB: "ME" NODE (RED SHIELD & GLOWING CORE)
                ───────────────────────────────────────────────────────────── */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-30"
                  style={{ left: 250, top: 200 }}
                >
                  {/* Glowing Radar Halo Waves */}
                  <div className="absolute w-28 h-28 rounded-full bg-red-500/20 animate-ping pointer-events-none opacity-40" />
                  <div className="absolute w-20 h-20 rounded-full bg-red-600/30 blur-md pointer-events-none" />

                  {/* Main Center Badge */}
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 via-red-500 to-rose-400 p-0.5 shadow-xl shadow-red-500/50 flex items-center justify-center border-2 border-white/90">
                    <div className="w-full h-full rounded-full bg-gradient-to-b from-red-700 to-red-950 flex flex-col items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-red-200" />
                      <span className="text-white font-black text-xs tracking-wider">
                        ME
                      </span>
                    </div>
                  </div>

                  {/* Label Pill */}
                  <span className="mt-1 px-2 py-0.5 rounded-md bg-red-950/90 border border-red-500/50 text-[10px] font-black text-red-300 uppercase tracking-wider shadow-sm">
                    Master Node
                  </span>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    SURROUNDING USER NODES (EACH DISPLAYING $25 REWARD)
                ───────────────────────────────────────────────────────────── */}
                {nodes.map(node => (
                  <motion.div
                    key={node.id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: node.delay, duration: 0.4 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-20"
                    style={{ left: node.x, top: node.y }}
                  >
                    {/* User Node Circle */}
                    <div 
                      className="relative rounded-full bg-gradient-to-b from-slate-700/80 to-slate-900/90 border border-slate-400/60 p-1 shadow-lg shadow-black/40 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform"
                      style={{ 
                        width: node.r * 2, 
                        height: node.r * 2,
                        boxShadow: `0 0 12px ${node.accentColor}33`
                      }}
                    >
                      {/* Avatar Silhouette Icon */}
                      <div className="w-full h-full rounded-full bg-slate-800/90 flex items-center justify-center overflow-hidden">
                        <Users className="w-3.5 h-3.5 text-slate-200" />
                      </div>

                      {/* Small Green Active Beacon */}
                      <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950 shadow-xs" />
                    </div>

                    {/* $25 Reward Badge Tag */}
                    <div className="mt-1 px-1.5 py-0.2 rounded-md bg-gradient-to-r from-emerald-500/90 to-teal-600/90 border border-emerald-300/60 text-white font-black text-[9px] sm:text-[10px] shadow-md tracking-tight flex items-center gap-0.5 whitespace-nowrap group-hover:bg-emerald-400 transition-colors">
                      <span>{node.label}</span>
                    </div>
                  </motion.div>
                ))}

              </div>

            </div>

            {/* Mobile Scroll Instruction / Indicator */}
            <div className="mt-2 flex items-center justify-between w-full px-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>18 Active Referrals Connected</span>
              </span>
              <span className="sm:hidden text-amber-400/80 italic font-mono text-[10px]">
                ↔ Swipe to view full network
              </span>
              <span className="hidden sm:inline font-mono text-emerald-400 font-bold">
                Total Earned: $450 Bonus
              </span>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
