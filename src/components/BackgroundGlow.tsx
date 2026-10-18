import React from 'react';

export const BackgroundGlow: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#0B0F19]">
      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#F5B301 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Left Gold Light Blob */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#F5B301]/10 rounded-full blur-[120px]" />

      {/* Center Cyan/Blue Glow Blob */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[150px]" />

      {/* Bottom Right Gold Glow Blob */}
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#F5B301]/10 rounded-full blur-[120px]" />

      {/* Subtle Financial Chart Lines Background */}
      <svg className="absolute inset-0 w-full h-full opacity-10 stroke-[#F5B301]" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,300 Q200,100 400,250 T800,150 T1200,350 T1600,100 T2000,280" fill="none" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M0,500 Q300,350 600,450 T1200,200 T1800,400" fill="none" strokeWidth="1" />
      </svg>
    </div>
  );
};
