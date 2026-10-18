import React, { useState } from 'react';
import { getStoredBranding } from '../lib/brandingConfig';

interface AppSplashLoaderProps {
  progress?: number;
  message?: string;
  isFadingOut?: boolean;
}

export const AppSplashLoader: React.FC<AppSplashLoaderProps> = ({ isFadingOut = false }) => {
  const [logoUrl] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).__CACHED_CUSTOM_LOGO__) {
        return (window as any).__CACHED_CUSTOM_LOGO__;
      }
      return getStoredBranding().logoUrl || '/logo.png';
    } catch (_) {
      return '/logo.png';
    }
  });

  return (
    <div 
      id="react-splash-preloader"
      className={`fixed inset-0 z-[99999] bg-[#070A14] text-white flex flex-col items-center justify-center p-4 select-none overflow-hidden transition-all duration-250 ease-out ${
        isFadingOut ? 'opacity-0 scale-102 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-40">
        <div className="w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-3xl animate-pulse" />
        <div className="w-[350px] h-[350px] rounded-full bg-amber-500/5 blur-2xl" />
      </div>

      {/* Main Centered Minimalist Glowing Blue Logo with Round Rotating Rings */}
      <div className="relative flex items-center justify-center">
        
        {/* Outer Continuous Rotating Glow Ring (Layer 1) */}
        <div className="absolute w-36 h-36 sm:w-40 sm:h-40 rounded-full border-2 border-transparent border-t-blue-500 border-r-cyan-400 border-b-blue-600/30 animate-spin [animation-duration:1.6s] pointer-events-none" />

        {/* Outer Counter-Rotating Accent Ring (Layer 2) */}
        <div className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full border border-dashed border-blue-400/20 animate-spin [animation-duration:6s] [animation-direction:reverse] pointer-events-none" />

        {/* Inner Fast Accent Spinner (Layer 3) */}
        <div className="absolute w-32 h-32 sm:w-36 sm:h-36 rounded-full border-2 border-transparent border-t-amber-400/80 border-b-cyan-400/80 animate-spin [animation-duration:2.4s] pointer-events-none" />

        {/* Ambient Backglow */}
        <div className="absolute w-28 h-28 rounded-full bg-blue-500/25 blur-xl pointer-events-none" />

        {/* Central Logo Container (Dark / Blue Gradient - No White Background) */}
        <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#0A0F1D] border border-blue-500/30 flex items-center justify-center p-4 shadow-2xl shadow-blue-500/30">
          <img
            src={logoUrl}
            alt="Forex Trade"
            className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(59,130,246,0.6)]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/icon-192.png';
            }}
          />
        </div>
      </div>
    </div>
  );
};

