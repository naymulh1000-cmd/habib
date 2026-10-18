import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  X, 
  Clock, 
  Crown, 
  TrendingUp, 
  Award, 
  Zap, 
  Globe, 
  RotateCcw, 
  ShieldCheck, 
  Users, 
  Sparkles,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { 
  LeaderboardEntry, 
  LeaderboardConfig, 
  getDailyCycleWindow, 
  formatResetCountdown, 
  getStoredLeaderboardConfig, 
  subscribeToLeaderboardConfig,
  calculateUserTodayProfit, 
  buildRankedLeaderboard,
  getStoredGlobalLeaderboard,
  subscribeToGlobalLeaderboard,
  syncUserToGlobalLeaderboard,
  normalizeTraderName,
  formatLeaderboardProfit,
  formatLeaderboardGain,
  LEADERBOARD_MAX_PUBLIC_PROFIT,
  resolveUserProfileName,
  cleanTraderDisplayName,
  areLeaderboardListsEqual,
} from '../lib/leaderboardService';
import { COUNTRIES } from '../data/countries';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userUid?: string;
  displayName?: string;
  countryCode?: string;
  countryFlag?: string;
  avatarUrl?: string;
  photoURL?: string;
  activeAccount: 'live' | 'bonus' | 'demo';
  closedTrades: any[];
  activeTrades: any[];
  onSwitchAccount?: (acc: 'live' | 'bonus') => void;
  isPublicView?: boolean;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userUid,
  displayName,
  countryCode = 'BD',
  countryFlag = '🇧🇩',
  avatarUrl,
  photoURL,
  activeAccount,
  closedTrades,
  activeTrades,
  onSwitchAccount,
  isPublicView = false,
}) => {
  // Selected Leaderboard View: 'live' or 'bonus' (defaults to matching active account if live/bonus, else live)
  const [leaderboardTab, setLeaderboardTab] = useState<'live' | 'bonus'>(() => {
    return activeAccount === 'bonus' ? 'bonus' : 'live';
  });

  // Sync tab when user changes active account
  useEffect(() => {
    if (activeAccount === 'bonus') {
      setLeaderboardTab('bonus');
    } else {
      setLeaderboardTab('live');
    }
  }, [activeAccount]);

  const [leaderboardConfig, setLeaderboardConfig] = useState<LeaderboardConfig>(getStoredLeaderboardConfig());
  const [countdownString, setCountdownString] = useState<string>('');
  const [cycleStartTime, setCycleStartTime] = useState<number>(() => getDailyCycleWindow(8).startTime);

  // Sync leaderboard config in real-time
  useEffect(() => {
    const unsub = subscribeToLeaderboardConfig((cfg) => {
      setLeaderboardConfig(cfg);
    });
    return () => unsub();
  }, []);

  // Update countdown every second and detect 2:00 PM cycle rollover immediately
  useEffect(() => {
    let lastStartTime = getDailyCycleWindow(leaderboardConfig.resetHourUtc || 8).startTime;

    const updateCountdown = () => {
      const info = getDailyCycleWindow(leaderboardConfig.resetHourUtc || 8);
      setCountdownString(formatResetCountdown(info.remainingMs));

      // Instant 2:00 PM daily cycle reset detector:
      if (info.startTime !== lastStartTime) {
        lastStartTime = info.startTime;
        setCycleStartTime(info.startTime);
        // Instantly reload zeroed leaderboard
        const freshZero = getStoredGlobalLeaderboard(leaderboardTab);
        setGlobalTop50(freshZero);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [leaderboardConfig.resetHourUtc, leaderboardTab]);

  // Synchronized Global Top 50 from Firestore
  const [globalTop50, setGlobalTop50] = useState<(LeaderboardEntry & { rank: number })[]>(() => {
    return getStoredGlobalLeaderboard(leaderboardTab);
  });

  // Real-time synchronization: every user sees identical Top 50 across all devices
  useEffect(() => {
    const unsub = subscribeToGlobalLeaderboard(leaderboardTab, (data) => {
      const list = (Array.isArray(data.top50) && data.top50.length > 0) ? data.top50 : data.top20;
      if (Array.isArray(list) && list.length > 0) {
        setGlobalTop50((prev) => {
          if (areLeaderboardListsEqual(prev, list)) return prev;
          return list;
        });
      }
    });
    return () => unsub();
  }, [leaderboardTab]);

  // Calculate user's performance today (within 8:00 AM cycle) using exact shared engine
  const userStats = useMemo(() => {
    return calculateUserTodayProfit(
      closedTrades,
      activeTrades,
      leaderboardTab,
      cycleStartTime,
      leaderboardConfig.resetHourUtc || 8
    );
  }, [closedTrades, activeTrades, leaderboardTab, cycleStartTime, leaderboardConfig.resetHourUtc]);

  // Guaranteed profile name resolution: strictly uses saved profile name, never Gmail ID
  const effectiveDisplayName = useMemo(() => {
    return resolveUserProfileName(
      {
        uid: userUid,
        email: userEmail,
        displayName,
      },
      userUid
    );
  }, [userUid, userEmail, displayName]);

  // User stats primitives for stable sync triggering without infinite loops
  const syncProfit = userStats.netTodayProfit;
  const syncTrades = userStats.totalTradesToday;
  const syncWinRate = userStats.winRate;

  // Automatically sync user to global leaderboard whenever modal is viewed or trades update
  useEffect(() => {
    if (!isPublicView && userUid && isOpen && (syncProfit > 0 || syncTrades > 0)) {
      syncUserToGlobalLeaderboard(
        {
          uid: userUid,
          email: userEmail,
          displayName: effectiveDisplayName,
          countryCode,
          countryFlag,
          avatar: avatarUrl || photoURL,
        },
        userStats,
        leaderboardTab
      ).catch(() => {});
    }
  }, [isOpen, isPublicView, userUid, userEmail, effectiveDisplayName, countryCode, countryFlag, avatarUrl, photoURL, syncProfit, syncTrades, syncWinRate, leaderboardTab]);

  // Build ranked leaderboard list (Top 50 + User Position)
  const rankingData = useMemo(() => {
    return buildRankedLeaderboard(
      leaderboardTab,
      {
        uid: userUid,
        email: userEmail,
        displayName: effectiveDisplayName,
        countryCode: countryCode,
        countryFlag: countryFlag,
        avatar: avatarUrl || photoURL,
      },
      userStats,
      leaderboardConfig,
      isPublicView,
      globalTop50
    );
  }, [leaderboardTab, userUid, userEmail, effectiveDisplayName, countryCode, countryFlag, avatarUrl, photoURL, userStats, leaderboardConfig, isPublicView, globalTop50]);

  // Defensive deduplication ensuring 100% unique names and strictly preserving the canonical Top 50 order
  // Must be called before conditional returns to preserve React Hook order
  const uniqueTop50 = useMemo(() => {
    const list: (LeaderboardEntry & { rank: number; isCurrentUser?: boolean })[] = [];
    const seen = new Set<string>();
    const sourceList = rankingData.top50 || rankingData.top20 || [];
    
    for (const item of sourceList) {
      const isCur = Boolean(userUid && (item.userId === userUid || item.id === `user_${userUid}`)) || Boolean(item.isCurrentUser);
      const finalName = isCur
        ? (effectiveDisplayName || cleanTraderDisplayName(item.username, item.userId))
        : cleanTraderDisplayName(item.username, item.userId);
      const entryObj: LeaderboardEntry & { rank: number; isCurrentUser?: boolean } = {
        ...item,
        todayProfit: typeof item.todayProfit === 'number' ? item.todayProfit : 0,
        username: finalName,
        isCurrentUser: isCur,
      };
      const norm = normalizeTraderName(finalName);
      if (!seen.has(norm)) {
        seen.add(norm);
        list.push(entryObj);
      }
    }

    // Preserve sequential ranks 1 to N from the pre-ranked source
    return list.slice(0, 50).map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }, [rankingData.top50, rankingData.top20, userUid, effectiveDisplayName]);

  if (!isOpen) return null;

  const { top50, userRank: initialUserRank, userEntry: initialUserEntry, gapToTop50: initialGapTo50, rank50Profit = 0, totalParticipants } = rankingData;

  // Real-time resolved user rank within the strictly sorted top 50
  const userTop50Index = uniqueTop50.findIndex(e => e.isCurrentUser || (userUid && (e.userId === userUid || e.id === `user_${userUid}`)));
  const isUserInTop50 = userTop50Index >= 0;
  const resolvedUserRank = isUserInTop50 ? userTop50Index + 1 : initialUserRank;
  const userRank = resolvedUserRank;

  const top1 = uniqueTop50[0] || top50[0];
  const top2 = uniqueTop50[1] || top50[1];
  const top3 = uniqueTop50[2] || top50[2];
  const target50Profit = rank50Profit > 0 ? rank50Profit : (uniqueTop50.length >= 50 ? (uniqueTop50[49].todayProfit || 0) : 0);
  const displayGapTo50 = isUserInTop50 ? 0 : (initialGapTo50 > 0 ? initialGapTo50 : Math.max(0, target50Profit - Math.max(0, userStats.netTodayProfit)));
  const userEntry = isUserInTop50 ? uniqueTop50[userTop50Index] : initialUserEntry;
  // Always show "My Position" card for logged-in users inside their account
  const showMyPositionCard = !isPublicView && Boolean(userUid);

  return (
    <AnimatePresence>
      <div 
        key="leaderboard-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl overflow-y-auto"
      >
        <motion.div
          key="leaderboard-modal-container"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-4xl bg-[#080C16] border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto"
        >
          {/* TOP HEADER BAR (Compact Half-size) */}
          <div className="p-2 sm:p-2.5 border-b border-white/10 bg-gradient-to-r from-[#0C1222] via-[#090D18] to-[#12192C] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-sm shadow-amber-500/20 shrink-0">
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-sans flex items-center gap-1.5 flex-wrap">
                    <span>Daily Leaderboard</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Top 50
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hidden xs:inline-flex items-center gap-0.5">
                      Min $500
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 hidden md:inline-flex items-center gap-0.5">
                      $20k+ Capped
                    </span>
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-gray-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                    <span>Daily Cycle: 08:00 AM – 08:00 AM</span>
                  </span>
                  <span className="hidden sm:inline text-white/30">•</span>
                  <span className="text-amber-400 font-bold hidden sm:inline">
                    Reset in: {countdownString}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Controls: Countdown Badge (mobile) + Close Button */}
            <div className="flex items-center gap-1.5">
              <div className="sm:hidden px-1.5 py-0.5 rounded-md bg-gray-950 border border-white/10 text-[8px] font-mono text-amber-400 font-bold flex items-center gap-1">
                <Clock className="w-2 h-2" />
                <span>{countdownString}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 sm:p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Close Leaderboard"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* SCROLLABLE MAIN BODY */}
          <div className="p-3 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5 custom-scrollbar">
            
            {/* 1. SEPARATE LEADERBOARD TOGGLE TABS: LIVE VS BONUS (Compact) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#050811] rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setLeaderboardTab('live')}
                className={`py-1.5 sm:py-2 px-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  leaderboardTab === 'live'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 font-bold'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${leaderboardTab === 'live' ? 'bg-gray-950' : 'bg-emerald-400'}`} />
                <span>Live Account</span>
                <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                  leaderboardTab === 'live' ? 'bg-black/20 text-gray-900 font-black' : 'bg-white/10 text-gray-300'
                }`}>
                  Real Funds
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLeaderboardTab('bonus')}
                className={`py-1.5 sm:py-2 px-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  leaderboardTab === 'bonus'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/20 font-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 font-bold'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${leaderboardTab === 'bonus' ? 'bg-white' : 'bg-blue-400'}`} />
                <span>Bonus Account</span>
                <span className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                  leaderboardTab === 'bonus' ? 'bg-white/20 text-white font-black' : 'bg-white/10 text-gray-300'
                }`}>
                  Bonus Trading
                </span>
              </button>
            </div>

            {/* 2. 'MY POSITION' CARD (Only shown for logged-in user inside their account) */}
            {showMyPositionCard && (
              <div className={`p-2 sm:p-2.5 rounded-xl border transition-all relative overflow-hidden ${
                isUserInTop50
                  ? 'bg-gradient-to-br from-amber-500/15 via-[#0E1528] to-emerald-500/10 border-amber-500/40 shadow-sm'
                  : 'bg-gradient-to-br from-[#0E1424] to-[#0A0E1A] border-white/15 shadow-sm'
              }`}>
                <div className="flex items-center justify-between gap-2.5">
                  
                  {/* Left: User Info */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={userEntry.avatar}
                        alt={userEntry.username}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border border-amber-400/80 shadow-xs"
                      />
                      <span className="absolute -bottom-1 -right-1 text-xs leading-none drop-shadow">
                        {userEntry.countryFlag}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-white truncate max-w-[120px] sm:max-w-none">
                          {effectiveDisplayName || userEntry.username}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-white/10 text-amber-300 border border-white/10">
                          My Position
                        </span>
                        {isUserInTop50 && (
                          <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 font-black">
                            Rank #{userRank}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                          leaderboardTab === 'live' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {leaderboardTab.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-gray-300 mt-0.5 font-mono">
                        <span>
                          Win Rate: <strong className="text-emerald-400">{userStats.winRate}%</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Trades: <strong className="text-white">{userStats.totalTradesToday}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Today's Profit */}
                  <div className="text-right shrink-0">
                    <span className="text-[9px] text-gray-400 uppercase font-mono font-bold block leading-tight">
                      Today's Profit
                    </span>
                    <span className={`text-xs sm:text-sm font-black font-mono leading-tight ${
                      userStats.netTodayProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {userStats.netTodayProfit >= 0 ? '+' : ''}${userStats.netTodayProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {userStats.netTodayProfit >= LEADERBOARD_MAX_PUBLIC_PROFIT && (
                      <span className="text-[8px] font-mono text-amber-300 bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/20 block mt-0.5 text-right" title="Quotex privacy: public sees +$20,000+">
                        Public sees $20,000+
                      </span>
                    )}
                  </div>
                </div>

                {/* Dynamic Profit Gap to Rank 50 Target */}
                <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] sm:text-[10px]">
                  {isUserInTop50 ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>In Top 50 Elite Leaderboard (Rank #{userRank})</span>
                    </span>
                  ) : (
                    <span className="text-amber-300 font-bold flex items-center gap-1 font-mono">
                      <Flame className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>
                        Need <strong className="text-emerald-400 font-black">+${displayGapTo50.toFixed(2)}</strong> more profit to reach Rank #50 (Target: ${target50Profit.toFixed(2)})
                      </span>
                    </span>
                  )}
                  <span className="text-[8px] text-gray-400 font-mono hidden sm:inline flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Rank #50 Target: ${target50Profit.toFixed(2)} • $20k+ Privacy</span>
                  </span>
                </div>
              </div>
            )}

            {/* 3. FULL TOP 50 LIST */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Top 50 Traders Ranking</span>
                </span>
                <span className="text-[10px] text-gray-500">
                  {totalParticipants.toLocaleString()} Global Traders
                </span>
              </div>

              <div className="space-y-1.5">
                {uniqueTop50.map((entry) => {
                  const isCur = Boolean(entry.isCurrentUser);
                  const isTop3 = entry.rank <= 3;
                  const isTopTierCap = entry.todayProfit >= LEADERBOARD_MAX_PUBLIC_PROFIT;

                  return (
                    <div
                      key={entry.userId ? `user-${entry.userId}` : (entry.id || `trader-${entry.username}`)}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 sm:gap-4 ${
                        isCur
                          ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                          : isTop3
                          ? 'bg-[#0E1424] border-white/15 hover:border-white/25'
                          : 'bg-[#080C16] border-white/5 hover:border-white/15'
                      }`}
                    >
                      {/* Left: Rank + Avatar + Name + Flag */}
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                          entry.rank === 1
                            ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/40'
                            : entry.rank === 2
                            ? 'bg-slate-300 text-slate-950'
                            : entry.rank === 3
                            ? 'bg-amber-600 text-white'
                            : 'bg-white/5 text-gray-300 border border-white/10'
                        }`}>
                          {entry.rank}
                        </div>

                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={entry.avatar}
                            alt={entry.username}
                            referrerPolicy="no-referrer"
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-white/20"
                          />
                          <span className="absolute -bottom-1 -right-1 text-xs leading-none drop-shadow">
                            {entry.countryFlag}
                          </span>
                        </div>

                        {/* Name & Country Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs sm:text-sm font-black truncate max-w-[130px] sm:max-w-[200px] ${
                              isCur ? 'text-amber-400' : 'text-white'
                            }`}>
                              {isCur ? (effectiveDisplayName || entry.username) : entry.username}
                            </span>
                            {isCur && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase bg-amber-400 text-slate-950">
                                You
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[9px] sm:text-[10px] text-gray-400 font-mono">
                            <span>{entry.countryName}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-bold">{entry.winRate}% Win</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline text-gray-500">{entry.totalTrades} Trades</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Profit & Percentage (Quotex $20k+ privacy protection) */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs sm:text-base font-black font-mono text-emerald-400 block tracking-tight">
                            {formatLeaderboardProfit(entry.todayProfit, isCur)}
                          </span>
                          {isTopTierCap && !isCur && (
                            <span 
                              className="px-1 py-0.2 rounded text-[8px] font-mono font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              title="Traders over $20,000 are displayed as +$20,000+ for privacy"
                            >
                              MAX
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-gray-400 block">
                          {formatLeaderboardGain(entry.profitPercentage, entry.todayProfit, isCur)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-[#060912] flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400 font-mono shrink-0">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-Time Verified PnL Calculation Engine</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-all ml-auto"
            >
              {isPublicView ? 'Close' : 'Back to Trading'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
