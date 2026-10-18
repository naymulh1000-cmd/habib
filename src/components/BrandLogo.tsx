import React, { useState, useEffect } from 'react';
import { useBranding } from '../lib/brandingConfig';

export interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  textClass?: string;
  subtext?: string;
  layout?: 'horizontal' | 'vertical';
  className?: string;
  theme?: 'dark' | 'light' | 'auto';
  customLogoUrl?: string;
}

const sizeMap = {
  xs: { box: 'w-6 h-6', icon: 'w-4 h-4', title: 'text-xs', sub: 'text-[7px]', gap: 'gap-1.5' },
  sm: { box: 'w-7 h-7', icon: 'w-4.5 h-4.5', title: 'text-xs sm:text-sm', sub: 'text-[8px]', gap: 'gap-2' },
  md: { box: 'w-8 h-8', icon: 'w-5 h-5', title: 'text-sm sm:text-base', sub: 'text-[9px]', gap: 'gap-2.5' },
  lg: { box: 'w-10 h-10', icon: 'w-6 h-6', title: 'text-base sm:text-lg', sub: 'text-[10px]', gap: 'gap-2.5' },
  xl: { box: 'w-12 h-12', icon: 'w-7 h-7', title: 'text-lg sm:text-xl', sub: 'text-[11px]', gap: 'gap-3' },
  '2xl': { box: 'w-14 h-14', icon: 'w-8 h-8', title: 'text-xl sm:text-2xl', sub: 'text-xs', gap: 'gap-3.5' },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  textClass = '',
  subtext,
  layout = 'horizontal',
  className = '',
  theme = 'dark',
  customLogoUrl,
}) => {
  const currentSize = sizeMap[size] || sizeMap.md;
  const isLight = theme === 'light';
  const [imgError, setImgError] = React.useState(false);
  const branding = useBranding();

  // Multi-device synchronized master logo URL
  const activeLogoUrl = customLogoUrl || branding.logoUrl || '/logo.png';
  const brandName = branding.brandName || 'Forex Trade';
  const brandSubtitle = branding.brandSubtitle || 'PRO';

  React.useEffect(() => {
    setImgError(false);
  }, [activeLogoUrl]);

  return (
    <div
      className={`inline-flex items-center ${
        layout === 'vertical' ? 'flex-col text-center' : 'flex-row'
      } ${currentSize.gap} ${className} select-none group`}
    >
      {/* Master 3D Blue Square with White Rising Arrow Emblem */}
      <div
        className={`${currentSize.box} relative shrink-0 rounded-2xl ${
          isLight 
            ? 'shadow-lg shadow-blue-600/20 border border-blue-200/80 bg-white'
            : 'shadow-xl shadow-blue-500/25 border border-white/20 bg-slate-900'
        } transition-all duration-300 flex items-center justify-center overflow-hidden`}
      >
        <div className="relative w-full h-full rounded-2xl flex items-center justify-center overflow-hidden">
          {!imgError && activeLogoUrl ? (
            <img 
              src={activeLogoUrl} 
              alt="Forex Trade Pro Master Logo" 
              className="w-full h-full object-cover rounded-2xl" 
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            /* Custom 3D Blue Emblem Vector Matching User Image */
            <div className="w-full h-full bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] rounded-xl flex items-center justify-center p-1 relative shadow-inner">
              <svg
                className={`${currentSize.icon} text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]`}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 17L10 11L14 15L20 7"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 7H20V13"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Brand Text & Subtitle */}
      {showText && (
        <div className={`flex flex-col ${layout === 'vertical' ? 'items-center' : 'items-start'}`}>
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`${currentSize.title} font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'} ${textClass}`}>
              {brandName}
            </span>
            <span className="bg-gradient-to-r from-[#F5B301] via-amber-300 to-[#E0A000] text-black font-black px-1.5 py-0.5 rounded-md text-[0.65em] tracking-wider uppercase shadow-sm shadow-amber-500/20 shrink-0">
              {brandSubtitle}
            </span>
          </div>

          {subtext ? (
            <p className={`${currentSize.sub} ${isLight ? 'text-amber-600 font-bold' : 'text-amber-400/80 font-semibold'} font-mono tracking-widest uppercase mt-0.5`}>
              {subtext}
            </p>
          ) : (
            <p className={`${currentSize.sub} ${isLight ? 'text-amber-600 font-bold' : 'text-amber-400/80 font-semibold'} font-mono tracking-widest uppercase mt-0.5`}>
              TRADING PLATFORM
            </p>
          )}
        </div>
      )}
    </div>
  );
};


