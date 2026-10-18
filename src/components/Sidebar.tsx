import React from 'react';
import { BrandLogo } from './BrandLogo';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  History, 
  User, 
  PhoneCall, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Headphones,
  BarChart2,
  Zap
} from 'lucide-react';

export type NavTab = 'dashboard' | 'markets' | 'wallet' | 'trade' | 'binary' | 'transactions' | 'profile' | 'help';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenTradeModal: () => void;
  onOpenFeedbackModal?: () => void;
  onOpenHelpModal: () => void;
  onLogout: () => void;
  isSuperAdmin?: boolean;
  onSwitchToAdmin?: () => void;
  isEmailVerified?: boolean;
  kycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  userDisplayUid?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenTradeModal,
  onOpenHelpModal,
  onLogout,
  isSuperAdmin,
  onSwitchToAdmin,
  isEmailVerified = false,
  kycStatus = 'unverified',
  userDisplayUid = '8940215'
}) => {
  const isFullyVerified = Boolean(isEmailVerified && kycStatus === 'verified');
  const navItems = [
    { id: 'dashboard', label: 'Home Dashboard', icon: LayoutDashboard },
    { id: 'markets', label: 'Markets', icon: BarChart2 },
    { id: 'wallet', label: 'My Wallet', icon: Wallet },
    { id: 'trade', label: 'Forex Trade', icon: TrendingUp, isAction: true },
    { id: 'binary', label: 'Binary Options', icon: Zap, isAction: true },
    { id: 'transactions', label: 'History', icon: History },
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'help', label: 'Help Line', icon: Headphones, isHelpAction: true },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.isHelpAction) {
      onOpenHelpModal();
    } else {
      setActiveTab(item.id as NavTab);
    }
  };

  return (
    <aside className="hidden lg:flex w-64 bg-[#080B12] border-r border-white/10 p-5 flex-col justify-between shrink-0 select-none text-white min-h-screen">
      {/* Top Branding & Main Navigation */}
      <div className="space-y-6">
        {/* Brand Logo */}
        <div className="px-2 py-1">
          <BrandLogo size="md" subtext="MOBILE TRADING PLATFORM" />
        </div>

        {/* Main Navigation Menu */}
        <nav className="space-y-1.5 pt-2">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={`nav-${item.id}-${idx}`}
                onClick={() => handleNavClick(item)}
                className={`w-full px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#F5B301] text-gray-950 shadow-lg shadow-[#F5B301]/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-900/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gray-950' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-gray-950/70" />}
              </button>
            );
          })}

          {isSuperAdmin && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="w-full mt-3 px-4 py-3 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-between transition-all cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-4 h-4 text-[#F5B301]" />
                <span>Admin Portal</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </nav>
      </div>

      {/* Bottom Profile Info & Logout */}
      <div className="space-y-3 pt-5 border-t border-white/10">
        <div className="p-3 rounded-2xl bg-gray-900/80 border border-white/5 flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isFullyVerified ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              {isFullyVerified ? (
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                  Verified Account <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                </span>
              ) : (
                <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1">
                  Unverified <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 font-mono">
              UID: {userDisplayUid} • {isFullyVerified ? 'Tier 1 & 2 Verified' : isEmailVerified ? 'Email Verified' : kycStatus === 'verified' ? 'NID Verified' : '2-Tier Setup Needed'}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

