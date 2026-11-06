import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShieldCheck, TrendingUp, History, Headphones, BarChart2, Wallet, User } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

export type TransitionActionType = 
  | 'deposit' 
  | 'withdraw' 
  | 'trade' 
  | 'binary' 
  | 'markets' 
  | 'wallet' 
  | 'history' 
  | 'profile' 
  | 'help'
  | 'auth'
  | 'welcome'
  | 'portal'
  | string 
  | null;

interface InstantActionTransitionProps {
  isOpen: boolean;
  type: TransitionActionType;
  title?: string;
  subtitle?: string;
  duration?: number;
  onComplete: () => void;
}

export const InstantActionTransition: React.FC<InstantActionTransitionProps> = ({
  isOpen,
  type,
  title,
  subtitle,
  duration = 450, // 450ms fast, crisp, responsive action transition
  onComplete
}) => {
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);

  // Keep latest onComplete reference without re-triggering the timer
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      return;
    }

    setProgress(0);
    const startTime = Date.now();
    let isFinished = false;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration && !isFinished) {
        isFinished = true;
        clearInterval(interval);
        if (typeof onCompleteRef.current === 'function') {
          onCompleteRef.current();
        }
      }
    }, 25);

    // Hard safety timeout: Guaranteed completion even under CPU load or background throttle
    const safetyTimer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        clearInterval(interval);
        if (typeof onCompleteRef.current === 'function') {
          onCompleteRef.current();
        }
      }
    }, duration + 30);

    return () => {
      clearInterval(interval);
      clearTimeout(safetyTimer);
    };
  }, [isOpen, duration]);

  // Derived Title and Subtitle based on action type
  const getActionDetails = () => {
    if (title && subtitle) return { title, subtitle, icon: Zap, badgeColor: 'text-[#F5B301] border-[#F5B301]/40 bg-[#F5B301]/10' };

    switch (type) {
      case 'deposit':
        return {
          title: 'INSTANT DEPOSIT',
          subtitle: 'Connecting to institutional crypto & banking payment gateway...',
          icon: Zap,
          badgeColor: 'text-[#F5B301] border-[#F5B301]/40 bg-[#F5B301]/10'
        };
      case 'withdraw':
        return {
          title: 'SECURE WITHDRAWAL',
          subtitle: 'Opening encrypted funds withdrawal portal...',
          icon: ShieldCheck,
          badgeColor: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
        };
      case 'trade':
      case 'binary':
        return {
          title: type === 'binary' ? 'BINARY OPTIONS TERMINAL' : 'LIVE FOREX TRADING TERMINAL',
          subtitle: 'Streaming real-time international exchange order books...',
          icon: TrendingUp,
          badgeColor: 'text-[#F5B301] border-[#F5B301]/40 bg-[#F5B301]/10'
        };
      case 'markets':
        return {
          title: 'GLOBAL MARKETS',
          subtitle: 'Synchronizing multi-asset prices & liquidity charts...',
          icon: BarChart2,
          badgeColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'
        };
      case 'wallet':
        return {
          title: 'MY WALLET & ASSETS',
          subtitle: 'Loading balances, transaction audit logs & verification status...',
          icon: Wallet,
          badgeColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10'
        };
      case 'history':
        return {
          title: 'TRADING HISTORY',
          subtitle: 'Retrieving completed orders & verified P/L records...',
          icon: History,
          badgeColor: 'text-sky-400 border-sky-500/40 bg-sky-500/10'
        };
      case 'help':
        return {
          title: '24/7 PRIORITY SUPPORT',
          subtitle: 'Connecting to live support agents & official Telegram help line...',
          icon: Headphones,
          badgeColor: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10'
        };
      case 'profile':
        return {
          title: 'PROFILE SETTINGS',
          subtitle: 'Opening security credentials & KYC verification portal...',
          icon: User,
          badgeColor: 'text-purple-400 border-purple-500/40 bg-purple-500/10'
        };
      case 'auth':
      case 'welcome':
      case 'portal':
        return {
          title: 'FXBY24 TRADING PLATFORM',
          subtitle: 'Loading secure institutional trading environment...',
          icon: Zap,
          badgeColor: 'text-[#F5B301] border-[#F5B301]/40 bg-[#F5B301]/10'
        };
      default:
        return {
          title: 'FXBY24 SECURE PORTAL',
          subtitle: 'Loading request...',
          icon: Zap,
          badgeColor: 'text-[#F5B301] border-[#F5B301]/40 bg-[#F5B301]/10'
        };
    }
  };

  const action = getActionDetails();
  const IconComponent = action.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="instant-action-transition-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' as const }}
          transition={{ duration: 0.12 }}
          className="fixed inset-0 z-[99999] bg-[#070A14]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 select-none"
        >
          {/* Background Ambient Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-50">
            <div className="w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[90px] animate-pulse" />
            <div className="w-[380px] h-[380px] rounded-full bg-[#F5B301]/10 blur-[80px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-sm w-full">
            
            {/* Centered Minimalist Glowing Logo with Round Rotating Concentric Rings */}
            <div className="relative w-36 h-36 mb-6 flex items-center justify-center">
              
              {/* Ring 1 - High-speed primary gold/cyan rotating ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                className="absolute w-32 h-32 rounded-full border-2 border-transparent border-t-[#F5B301] border-r-[#15eaff] border-b-[#F5B301]/30 pointer-events-none"
              />

              {/* Ring 2 - Counter-rotating subtle outer ring */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                className="absolute w-36 h-36 rounded-full border border-dashed border-blue-400/30 pointer-events-none"
              />

              {/* Ring 3 - Inner accent ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2.0, ease: "linear" }}
                className="absolute w-28 h-28 rounded-full border-2 border-transparent border-t-cyan-400/80 border-b-[#F5B301]/80 pointer-events-none"
              />

              {/* Center Box with Brand Logo */}
              <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#0A0F1D] border border-[#F5B301]/40 flex items-center justify-center p-3 shadow-2xl shadow-[#F5B301]/25">
                <img 
                  src="/logo.png" 
                  alt="FXBY24 Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(245,179,1,0.6)]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icon-192.png';
                  }}
                />
              </div>
            </div>

            {/* Action Title Badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              className="mb-4 flex flex-col items-center gap-1.5"
            >
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black tracking-wider uppercase ${action.badgeColor}`}>
                <IconComponent className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{action.title}</span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium tracking-wide max-w-xs leading-relaxed">
                {action.subtitle}
              </p>
            </motion.div>

            {/* Smooth Micro Progress Bar with Active Percentage */}
            <div className="w-56 h-1.5 bg-white/10 rounded-full overflow-hidden shadow-inner mt-2">
              <motion.div
                className="h-full bg-gradient-to-r from-[#F5B301] via-[#15eaff] to-[#F5B301] rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
                transition={{ ease: "linear" }}
              />
            </div>
            <span className="font-mono text-xs text-[#F5B301] font-black mt-2 tracking-wider">
              {progress}%
            </span>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
