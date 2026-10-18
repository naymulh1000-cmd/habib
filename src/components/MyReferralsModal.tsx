import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Users, 
  UserCheck, 
  Gift, 
  RefreshCw, 
  Copy, 
  Check, 
  ShieldCheck, 
  Wallet, 
  Search, 
  Share2,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { ReferredAccount, ReferralSummary } from '../types';
import { fetchUserReferrals, subscribeToReferralUpdates } from '../lib/referralSync';

interface MyReferralsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid?: string;
  referralCode: string;
  referralLink: string;
  onOpenShareModal?: () => void;
}

export const MyReferralsModal: React.FC<MyReferralsModalProps> = ({
  isOpen,
  onClose,
  userUid,
  referralCode,
  referralLink,
  onOpenShareModal
}) => {
  const [referrals, setReferrals] = useState<ReferredAccount[]>([]);
  const [totalReferrals, setTotalReferrals] = useState<number>(0);
  const [qualifyingReferrals, setQualifyingReferrals] = useState<number>(0);
  const [totalBonusEarned, setTotalBonusEarned] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchReferrals = async () => {
    const targetUid = userUid || referralCode;
    if (!targetUid) return;
    setLoading(true);
    try {
      const summary = await fetchUserReferrals(targetUid, referralCode);
      setReferrals(summary.referrals);
      setTotalReferrals(summary.totalReferrals);
      setQualifyingReferrals(summary.qualifyingReferrals);
      setTotalBonusEarned(summary.totalBonusEarned);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Could not fetch referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const targetUid = userUid || referralCode;
    if (!targetUid) return;

    fetchReferrals();

    const unsub = subscribeToReferralUpdates(targetUid, (summary) => {
      setReferrals(summary.referrals);
      setTotalReferrals(summary.totalReferrals);
      setQualifyingReferrals(summary.qualifyingReferrals);
      setTotalBonusEarned(summary.totalBonusEarned);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    });

    return () => unsub();
  }, [isOpen, referralCode, userUid]);

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (_) {
      const input = document.createElement('input');
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      try {
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      } catch (_) {}
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const filteredReferrals = useMemo(() => {
    if (!searchQuery.trim()) return referrals;
    const q = searchQuery.toLowerCase().trim();
    return referrals.filter(r => 
      (r.fullName && r.fullName.toLowerCase().includes(q)) ||
      (r.uid && r.uid.toLowerCase().includes(q))
    );
  }, [referrals, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div 
        id="my-referrals-modal-container"
        className="relative w-full max-w-2xl bg-[#0B0F19] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#F5B301]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 px-5 py-4 sm:px-6 sm:py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5B301] to-amber-600 flex items-center justify-center shadow-lg shadow-[#F5B301]/20">
              <Users className="w-5 h-5 text-gray-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  My Total Referrals
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#F5B301]/20 border border-[#F5B301]/40 text-[#F5B301] text-[10px] font-black">
                  {totalReferrals} Accounts
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-medium">
                Referral Accounts Overview • Live Balance & Bonus Tracking
              </p>
            </div>
          </div>

          <button
            id="close-my-referrals-modal-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="relative z-10 p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Top 3 Stat Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Referrals</span>
                <Users className="w-3.5 h-3.5 text-[#F5B301]" />
              </div>
              <div className="text-lg sm:text-2xl font-black text-white font-mono">
                {totalReferrals}
              </div>
              <span className="text-[10px] text-gray-400">Total joined accounts</span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Qualifying ($250+)</span>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg sm:text-2xl font-black text-emerald-400 font-mono">
                {qualifyingReferrals}
              </div>
              <span className="text-[10px] text-gray-400">First deposit $250+</span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-[#F5B301]/10 to-amber-500/5 border border-[#F5B301]/30 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#F5B301] mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Bonus Income</span>
                <Gift className="w-3.5 h-3.5 text-[#F5B301]" />
              </div>
              <div className="text-lg sm:text-2xl font-black text-[#F5B301] font-mono">
                ${totalBonusEarned.toFixed(2)}
              </div>
              <span className="text-[10px] text-amber-200/80">In your Bonus Wallet</span>
            </div>
          </div>

          {/* Referral Policy & Auto-Credit Rule Box */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-[#F5B301] shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-[#F5B301]">
                $25 Referral Reward System (Referral Policy)
              </p>
              <p className="text-gray-300 text-[11px] leading-relaxed">
                When a user registers through your referral link and completes their <strong>first deposit of $250 or more</strong>, an automatic reward of <strong>$25.00 is added directly to your Bonus Wallet</strong> and recorded in your transaction history.
              </p>
            </div>
          </div>

          {/* Search Bar & Refresh Button */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="search-my-referrals-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Name or UID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F5B301]/50"
              />
            </div>

            <button
              id="refresh-my-referrals-btn"
              onClick={fetchReferrals}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Refresh balances"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#F5B301] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Privacy Protection Notice */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-[10px] text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Strict Privacy Mode: Only Account Name, UID, and Live/Bonus/Demo balances are shown. Personal documents & contact details are securely protected.
            </span>
          </div>

          {/* Referred Accounts List */}
          <div className="space-y-2.5 pt-1">
            {filteredReferrals.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-500">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-300">
                    {searchQuery ? 'No matching referral accounts' : 'No accounts referred yet'}
                  </p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    {searchQuery 
                      ? 'Try searching with another name or UID.'
                      : 'Share your personal referral link to invite traders. When they sign up and make their first $250+ deposit, you get $25 in your Bonus Wallet!'}
                  </p>
                </div>
                {!searchQuery && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      id="empty-copy-ref-link-btn"
                      type="button"
                      onClick={handleCopyLink}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#F5B301]" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                    {onOpenShareModal && (
                      <button
                        id="empty-share-ref-link-btn"
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenShareModal();
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5B301] to-amber-500 text-gray-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Share2 className="w-3.5 h-3.5 text-gray-950" />
                        <span>Share on Social</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredReferrals.map((account, idx) => {
                  const isQualifying = account.hasQualifyingDeposit;
                  return (
                    <div
                      key={`ref-acc-${account.uid || idx}`}
                      className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0E1424] border border-white/5 hover:border-white/15 transition-all space-y-3"
                    >
                      {/* Top row: Name, UID & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/10 flex items-center justify-center text-white font-black text-xs shrink-0">
                            {(account.fullName || 'T').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                                {account.fullName || 'Trader'}
                              </h4>
                              <span className="font-mono text-[10px] font-bold text-[#F5B301] bg-[#F5B301]/10 border border-[#F5B301]/30 px-1.5 py-0.5 rounded">
                                UID: {account.uid}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono pt-0.5">
                              <Clock className="w-3 h-3 text-gray-600" />
                              <span>
                                Joined: {account.createdAt ? new Date(account.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {isQualifying ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>$25 Bonus Paid</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-gray-400 flex items-center gap-1">
                              <span>Awaiting $250+ Deposit</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Balances Grid: Live, Bonus, Demo balances ONLY */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {/* Live Balance */}
                        <div className="p-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 flex flex-col">
                          <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">
                            Live Balance
                          </span>
                          <span className="text-xs sm:text-sm font-black font-mono text-emerald-300 pt-0.5">
                            ${account.liveBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Bonus Balance */}
                        <div className="p-2 rounded-lg bg-[#F5B301]/[0.06] border border-[#F5B301]/20 flex flex-col">
                          <span className="text-[9px] font-black uppercase text-[#F5B301] tracking-wider">
                            Bonus Balance
                          </span>
                          <span className="text-xs sm:text-sm font-black font-mono text-amber-300 pt-0.5">
                            ${account.bonusBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Demo Balance */}
                        <div className="p-2 rounded-lg bg-sky-500/[0.06] border border-sky-500/20 flex flex-col">
                          <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider">
                            Demo Balance
                          </span>
                          <span className="text-xs sm:text-sm font-black font-mono text-sky-300 pt-0.5">
                            ${account.demoBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="relative z-10 px-5 py-3.5 sm:px-6 sm:py-4 border-t border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Info className="w-3.5 h-3.5 text-[#F5B301]" />
            <span>
              Your Referral ID: <strong className="text-[#F5B301] font-mono">{referralCode}</strong>
            </span>
            {lastRefreshed && (
              <span className="text-gray-500 text-[10px] hidden sm:inline">
                • Updated at {lastRefreshed}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              id="footer-copy-referral-link-btn"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#F5B301]" />}
              <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
            </button>

            <button
              id="footer-close-my-referrals-btn"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
