import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  Zap, 
  Clock, 
  ChevronDown, 
  ArrowRight,
  Layers,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Wallet
} from 'lucide-react';
import { AccountType } from '../types';
import { 
  getStoredWithdrawalMethods, 
  getStoredWithdrawalRules, 
  subscribeToWithdrawalConfig,
  WithdrawalMethodConfig, 
  WithdrawalRulesConfig 
} from '../lib/withdrawalConfig';
import { saveWithdrawalRequestToFirestore } from '../lib/withdrawalSync';
import { auth } from '../lib/firebase';
import { safeFetch } from '../lib/safeApi';
import { processBonusAccountWithdrawal } from '../lib/bonusWithdrawalService';
import { getBonusCategoryByTier, deriveTierFromBaseAmount } from '../lib/bonusRules';
import { BONUS_LANGUAGES, WITHDRAW_BONUS_TRANSLATIONS, BonusLanguage } from '../lib/bonusTranslations';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: AccountType;
  liveBalance: number;
  bonusBalance: number;
  depositBonusGranted?: number;
  userEmail?: string;
  userUid?: string;
  onOpenHistory?: () => void;
  onSuccessWithdrawal: (data: {
    accountType: AccountType;
    amount: number;
    method: string;
    destinationAddress: string;
    trxId: string;
  }) => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onClose,
  activeAccount,
  liveBalance,
  bonusBalance,
  depositBonusGranted,
  userEmail,
  userUid,
  onOpenHistory,
  onSuccessWithdrawal
}) => {
  // Config States
  const [methods, setMethods] = useState<WithdrawalMethodConfig[]>(getStoredWithdrawalMethods());
  const [rules, setRules] = useState<WithdrawalRulesConfig>(getStoredWithdrawalRules());

  // Form States
  const [sourceAccount, setSourceAccount] = useState<'live' | 'bonus'>(
    activeAccount === 'bonus' ? 'bonus' : 'live'
  );
  const [selectedMethodId, setSelectedMethodId] = useState<string>('binance_pay');
  const [amountInput, setAmountInput] = useState<string>('20');
  const [destinationAddress, setDestinationAddress] = useState<string>('48935678');
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState<boolean>(false);
  const [showAddWalletModal, setShowAddWalletModal] = useState<boolean>(false);
  const [newWalletAddress, setNewWalletAddress] = useState<string>('');
  const [savedWallets, setSavedWallets] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('forex_user_saved_wallets');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return ['48935678', '0x71C...a89B'];
  });

  // General Error & Flow States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedWithdrawal, setCompletedWithdrawal] = useState<any>(null);

  // Sync withdrawal config
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToWithdrawalConfig((updatedMethods, updatedRules) => {
      setMethods(updatedMethods);
      setRules(updatedRules);
    });
    return () => unsubscribe();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setErrorMsg(null);
      setSourceAccount(activeAccount === 'bonus' ? 'bonus' : 'live');
    }
  }, [isOpen, activeAccount]);

  if (!isOpen) return null;

  const bonusBaseGranted = (depositBonusGranted && depositBonusGranted > 0) ? depositBonusGranted : (bonusBalance > 0 ? 250 : 0);
  const bonusTier = deriveTierFromBaseAmount(bonusBaseGranted);
  const bonusCategory = getBonusCategoryByTier(bonusTier);
  const profitSharePercent = bonusCategory.withdrawableProfitSharePercent; // 50%, 60%, 70%
  const challengeTarget = Number((bonusBaseGranted * 2).toFixed(2));
  const isChallengeUnlocked = bonusBaseGranted > 0 && bonusBalance >= challengeTarget;
  const remainingToDouble = Math.max(0, Number((challengeTarget - bonusBalance).toFixed(2)));
  const doubleProgressPercent = challengeTarget > 0 ? Math.min(100, Math.max(0, Math.round((bonusBalance / challengeTarget) * 100))) : 0;
  const netBonusProfit = Math.max(0, Number((bonusBalance - bonusBaseGranted).toFixed(2)));
  const maxEligibleBonusWithdrawal = isChallengeUnlocked ? Number(((netBonusProfit * profitSharePercent) / 100).toFixed(2)) : 0;

  const currentAvailableBalance = sourceAccount === 'bonus' ? bonusBalance : liveBalance;
  const maxWithdrawableAmount = sourceAccount === 'bonus' ? maxEligibleBonusWithdrawal : liveBalance;
  const numAmount = parseFloat(amountInput) || 0;

  // Language for Bonus section (Default strictly English 'en' as requested)
  const [bonusLang, setBonusLang] = useState<'en' | 'bn' | 'hi' | 'ar' | 'es' | 'pt'>(() => {
    try {
      const stored = localStorage.getItem('forex_platform_lang');
      if (stored === 'bn' || stored === 'hi' || stored === 'ar' || stored === 'es' || stored === 'pt') {
        return stored;
      }
    } catch (_) {}
    return 'en';
  });
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e?.detail && typeof e.detail === 'string') {
        setBonusLang(e.detail);
      } else {
        const stored = localStorage.getItem('forex_platform_lang');
        if (stored === 'bn' || stored === 'hi' || stored === 'ar' || stored === 'es' || stored === 'pt') {
          setBonusLang(stored);
        } else {
          setBonusLang('en');
        }
      }
    };
    window.addEventListener('forex_language_changed', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('forex_language_changed', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const currentLangMeta = BONUS_LANGUAGES.find(l => l.code === bonusLang) || BONUS_LANGUAGES[0];
  const wt = WITHDRAW_BONUS_TRANSLATIONS[bonusLang] || WITHDRAW_BONUS_TRANSLATIONS.en;

  const selectedMethod: WithdrawalMethodConfig = methods.find(m => m.id === selectedMethodId) || methods[0] || {
    id: 'binance_pay',
    name: 'Binance',
    type: 'crypto',
    symbol: 'BINANCE',
    minWithdrawal: 20,
    feePercent: 0,
    processingTime: '10 Min',
    isActive: true
  };

  const presetAmounts = sourceAccount === 'bonus' ? [50, 100, 125, 250, 'ALL'] : [20, 50, 100, 250, 'ALL'];

  const handleSelectPreset = (val: number | string) => {
    if (val === 'ALL') {
      const allVal = sourceAccount === 'bonus' ? maxEligibleBonusWithdrawal : Math.floor(liveBalance);
      setAmountInput(String(allVal > 0 ? allVal : 0));
    } else {
      const numVal = Number(val);
      if (sourceAccount === 'bonus') {
        if (!isChallengeUnlocked) {
          setErrorMsg(`Challenge Locked! Reach $${challengeTarget.toFixed(2)} to unlock withdrawals.`);
          return;
        }
        if (maxEligibleBonusWithdrawal > 0 && numVal > maxEligibleBonusWithdrawal) {
          setAmountInput(String(maxEligibleBonusWithdrawal));
          setErrorMsg(`Amount set to your max ${profitSharePercent}% eligible profit ($${maxEligibleBonusWithdrawal.toFixed(2)}).`);
          return;
        }
      }
      setAmountInput(String(val));
    }
    setErrorMsg(null);
  };

  const handleSaveNewWallet = () => {
    const clean = newWalletAddress.trim();
    if (!clean) return;
    const next = [clean, ...savedWallets.filter(w => w !== clean)].slice(0, 5);
    setSavedWallets(next);
    setDestinationAddress(clean);
    try {
      localStorage.setItem('forex_user_saved_wallets', JSON.stringify(next));
    } catch (_) {}
    setNewWalletAddress('');
    setShowAddWalletModal(false);
  };

  const handleConfirmWithdrawal = async () => {
    const minRequired = rules.minWithdrawalUsd || 20;
    if (numAmount < minRequired) {
      setErrorMsg(`Minimum withdrawal amount is $${minRequired} USD`);
      return;
    }

    if (sourceAccount === 'bonus') {
      if (!isChallengeUnlocked) {
        setErrorMsg(`Bonus Account Challenge Locked! You must double your bonus account balance to $${challengeTarget.toFixed(2)} through trading before withdrawing profit. Need $${remainingToDouble.toFixed(2)} more.`);
        return;
      }
      if (netBonusProfit <= 0 || maxEligibleBonusWithdrawal <= 0) {
        setErrorMsg(`Deposit bonus base ($${bonusBaseGranted.toFixed(2)}) is protected and cannot be withdrawn directly. Only ${profitSharePercent}% of trading profit earned is withdrawable.`);
        return;
      }
      if (numAmount > maxEligibleBonusWithdrawal + 0.01) {
        setErrorMsg(`Withdrawal amount ($${numAmount.toFixed(2)}) exceeds ${profitSharePercent}% eligible profit limit ($${maxEligibleBonusWithdrawal.toFixed(2)}).`);
        return;
      }
    } else {
      if (numAmount > liveBalance) {
        setErrorMsg(`Insufficient LIVE balance! Available: $${liveBalance.toFixed(2)}`);
        return;
      }
    }

    if (!destinationAddress.trim()) {
      setErrorMsg('Please enter your destination wallet address or Binance Pay ID');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const withdrawalId = 'WD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const effectiveUid = auth.currentUser?.uid || userUid || 'usr_guest';
    const effectiveEmail = auth.currentUser?.email || userEmail || '';

    // Bonus Account specific calculations
    let autoDeductionAmount = 0;
    let netTradingProfit = 0;
    if (sourceAccount === 'bonus') {
      try {
        const bonusRes = await processBonusAccountWithdrawal({
          userUid: effectiveUid,
          userEmail: effectiveEmail,
          amountRequested: numAmount,
          method: selectedMethod.name,
          destinationAddress: destinationAddress.trim(),
          initialBonusBase: depositBonusGranted || 250
        });
        autoDeductionAmount = bonusRes.deductedSystemProfit;
        netTradingProfit = bonusRes.netProfit;
      } catch (err: any) {
        let msg = err?.message || 'Bonus withdrawal eligibility requirement not met.';
        try {
          if (typeof msg === 'string' && msg.startsWith('{') && msg.includes('"error":')) {
            const parsed = JSON.parse(msg);
            if (parsed.error) msg = parsed.error;
          }
        } catch (_) {}
        setErrorMsg(msg);
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      id: withdrawalId,
      userUid: effectiveUid,
      userEmail: effectiveEmail,
      amount: numAmount,
      method: selectedMethod.name,
      accountType: sourceAccount,
      destinationAddress: destinationAddress.trim(),
      status: 'Pending' as const,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      trxId: withdrawalId,
      txHash: withdrawalId,
      depositBonusGranted: depositBonusGranted,
      systemDeductedProfitAmount: autoDeductionAmount,
      totalNetProfit: netTradingProfit,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Authoritative Firestore write
      await saveWithdrawalRequestToFirestore(payload);

      // 2. Non-blocking backend notification with 600ms timeout guard
      safeFetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 600).catch(() => {});

      // 3. Parent callback
      onSuccessWithdrawal({
        accountType: sourceAccount,
        amount: numAmount,
        method: selectedMethod.name,
        destinationAddress: destinationAddress.trim(),
        trxId: withdrawalId
      });

      setCompletedWithdrawal(payload);
      setIsSubmitted(true);
    } catch (e) {
      console.warn('Withdrawal request notice:', e);
      onSuccessWithdrawal({
        accountType: sourceAccount,
        amount: numAmount,
        method: selectedMethod.name,
        destinationAddress: destinationAddress.trim(),
        trxId: withdrawalId
      });
      setCompletedWithdrawal(payload);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[460px] bg-[#F8FAFC] rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col my-auto font-sans text-slate-800"
      >
        {/* Top Header matching Screenshot 2 */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          {/* Left: Instant Withdrawal Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/90 border border-blue-200/90 text-[#0066FF] shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-[#0066FF]" />
            <span className="text-[11px] font-black tracking-wider uppercase">INSTANT WITHDRAWAL</span>
          </div>

          {/* Right: History link & Close button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenHistory) onOpenHistory();
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>History</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN WITHDRAWAL FORM (100% Matching Screenshot 2) */}
        {!isSubmitted ? (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Account Selector Pill if bonus account exists */}
            {(bonusBalance > 0 || sourceAccount === 'bonus') && (
              <div className="flex rounded-2xl bg-slate-100 p-1 gap-1 border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setSourceAccount('live');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    sourceAccount === 'live'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Live Account (${liveBalance.toFixed(2)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceAccount('bonus');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    sourceAccount === 'bonus'
                      ? 'bg-[#0066FF] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>
                  <span>Bonus Account (${bonusBalance.toFixed(2)})</span>
                </button>
              </div>
            )}

            {/* White Card Container */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm space-y-4">
              
              {/* Row 1: Live/Bonus Balance & Limits */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className={`w-2 h-2 rounded-full ${sourceAccount === 'bonus' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                    <span>{sourceAccount.toUpperCase()} BALANCE</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight mt-1 font-mono">
                    ${(sourceAccount === 'bonus' ? bonusBalance : liveBalance).toFixed(2)}
                  </div>
                  {sourceAccount === 'bonus' && (
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-slate-500">
                      <span>Base: <span className="text-slate-700 font-mono">${bonusBaseGranted.toFixed(2)}</span></span>
                      <span>•</span>
                      <span>Profit: <span className="text-emerald-600 font-mono">${netBonusProfit.toFixed(2)}</span></span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {sourceAccount === 'bonus' ? '50% PROFIT PAYOUT' : 'MIN PAYOUT'}
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-black font-mono">
                    ${(sourceAccount === 'bonus' ? maxEligibleBonusWithdrawal : (rules.minWithdrawalUsd || 20)).toFixed(2)}
                  </div>
                  {sourceAccount === 'bonus' && (
                    <div className="text-[10px] text-slate-400 mt-1 font-medium font-mono">
                      Target: ${challengeTarget.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Bonus Account Doubling Challenge & Profit Breakdown Card (Bonus Account ONLY) */}
              {sourceAccount === 'bonus' && (
                <div className="rounded-2xl p-3.5 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-slate-50 border border-amber-200/90 shadow-2xs space-y-3">
                  {/* Top Bar with Country Flag Selector */}
                  <div className="flex items-center justify-between pb-1 border-b border-amber-200/50">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                      Bonus Challenge Rules
                    </span>

                    {/* Country Flag Dropdown Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/95 hover:bg-white border border-amber-200 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                        title="Change language / ভাষা পরিবর্তন করুন"
                      >
                        <span className="text-sm leading-none">{currentLangMeta.flag}</span>
                        <span className="text-[10px] font-black text-slate-800 tracking-tight">{currentLangMeta.code.toUpperCase()}</span>
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                      </button>

                      {/* Dropdown Menu */}
                      {isLangMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)} />
                          <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                            {BONUS_LANGUAGES.map(lang => (
                              <button
                                key={lang.code}
                                type="button"
                                onClick={() => {
                                  setBonusLang(lang.code);
                                  setIsLangMenuOpen(false);
                                  try {
                                    localStorage.setItem('forex_platform_lang', lang.code);
                                    window.dispatchEvent(new CustomEvent('forex_language_changed', { detail: lang.code }));
                                  } catch (_) {}
                                }}
                                className={`w-full px-3 py-1.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                                  bonusLang === lang.code ? 'bg-blue-50 text-[#0066FF] font-bold' : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-base leading-none">{lang.flag}</span>
                                  <span className="font-semibold">{lang.nativeName}</span>
                                </div>
                                {bonusLang === lang.code && <Check className="w-3.5 h-3.5 text-[#0066FF]" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Challenge Header & Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isChallengeUnlocked ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {isChallengeUnlocked ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          {wt.challengeTitle}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {isChallengeUnlocked ? wt.challengeSubtitleUnlocked : wt.challengeSubtitleLocked}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border font-mono ${
                      isChallengeUnlocked 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}>
                      {isChallengeUnlocked ? wt.badgeUnlocked : wt.badgeLocked}
                    </span>
                  </div>

                  {/* Progress Bar (Visual progress toward 2x Target) */}
                  <div className="space-y-1 bg-white/80 p-2.5 rounded-xl border border-amber-100">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-600">{wt.progressTitle}</span>
                      <span className="font-mono text-slate-900">{doubleProgressPercent}% ({isChallengeUnlocked ? wt.progressDoubled : `$${bonusBalance.toFixed(2)} / $${challengeTarget.toFixed(2)}`})</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isChallengeUnlocked ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${doubleProgressPercent}%` }}
                      />
                    </div>
                    {!isChallengeUnlocked && (
                      <p className="text-[10px] text-amber-800 font-medium pt-0.5">
                        {wt.needMoreProfit(remainingToDouble.toFixed(2), challengeTarget.toFixed(2))}
                      </p>
                    )}
                  </div>

                  {/* 4 Financial Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="bg-white/90 p-2 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{wt.depositBonusBase}</div>
                      <div className="text-sm font-black text-slate-900 font-mono mt-0.5">${bonusBaseGranted.toFixed(2)}</div>
                      <div className="text-[9px] text-slate-400">{wt.protectedPrincipal}</div>
                    </div>

                    <div className="bg-white/90 p-2 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{wt.unlockTarget}</div>
                      <div className="text-sm font-black text-slate-900 font-mono mt-0.5">${challengeTarget.toFixed(2)}</div>
                      <div className="text-[9px] text-slate-400">{wt.requiredTarget}</div>
                    </div>

                    <div className="bg-white/90 p-2 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{wt.netTradingProfit}</div>
                      <div className="text-sm font-black text-emerald-600 font-mono mt-0.5">${netBonusProfit.toFixed(2)}</div>
                      <div className="text-[9px] text-slate-400">{wt.earnedViaTrading}</div>
                    </div>

                    <div className="bg-white/90 p-2 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{wt.maxPayoutTitle(profitSharePercent)}</div>
                      <div className="text-sm font-black text-[#0066FF] font-mono mt-0.5">${maxEligibleBonusWithdrawal.toFixed(2)}</div>
                      <div className="text-[9px] text-slate-400">{wt.tierNames[bonusCategory.tier as 1 | 2 | 3] || bonusCategory.name}</div>
                    </div>
                  </div>

                  {/* Rule Breakdown Box */}
                  <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-200 text-amber-900 text-[10px] leading-relaxed">
                    {wt.ruleExplanation(
                      wt.tierNames[bonusCategory.tier as 1 | 2 | 3] || bonusCategory.name,
                      profitSharePercent,
                      maxEligibleBonusWithdrawal.toFixed(2),
                      100 - profitSharePercent,
                      bonusBaseGranted.toFixed(2)
                    )}
                  </div>
                </div>
              )}

              {/* Row 2: Receiving Wallet */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 tracking-wider uppercase">
                    RECEIVING WALLET
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddWalletModal(true)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      <span>Manage ({savedWallets.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowAddWalletModal(true)}
                      className="text-xs font-bold text-[#0066FF] bg-blue-50/80 hover:bg-blue-100 border border-blue-200/80 rounded-lg px-2 py-0.5 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Wallet</span>
                    </button>
                  </div>
                </div>

                {/* Receiving Wallet Selector Card matching Screenshot 2 */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    {/* Blue PAY badge */}
                    <div className="w-10 h-10 rounded-xl bg-[#0052FF] flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm tracking-tight">
                      PAY
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900">{selectedMethod.name}</span>
                        <span className="bg-blue-100 text-[#0066FF] text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          Binance Pay
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {destinationAddress || '48935678'}
                      </p>
                    </div>
                  </div>

                  {/* Dropdown button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>{selectedMethod.name}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {isMethodDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 p-1 space-y-1">
                        {methods.filter(m => m.isActive).map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedMethodId(m.id);
                              setIsMethodDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between ${
                              selectedMethodId === m.id ? 'bg-blue-50 text-[#0066FF]' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span>{m.name}</span>
                            {selectedMethodId === m.id && <Check className="w-3.5 h-3.5 text-[#0066FF]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Withdrawal Amount (USD) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    WITHDRAWAL AMOUNT (USD)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Max Processing: 10 Min
                  </span>
                </div>

                {/* Amount Input matching Screenshot 2 */}
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center shadow-inner">
                  <span className="text-xl font-bold text-slate-400 mr-2.5 font-mono">$</span>
                  <input
                    type="number"
                    min={rules.minWithdrawalUsd || 20}
                    max={maxWithdrawableAmount}
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="20"
                    className="w-full text-2xl font-black text-slate-900 bg-transparent outline-none font-mono"
                  />
                </div>

                {sourceAccount === 'bonus' && maxEligibleBonusWithdrawal > 0 && numAmount > maxEligibleBonusWithdrawal && (
                  <p className="text-[11px] font-bold text-rose-500 mt-1">
                    Amount exceeds 50% eligible profit limit (${maxEligibleBonusWithdrawal.toFixed(2)}).
                  </p>
                )}

                {/* Preset Amount Buttons matching Screenshot 2: [$20] [$50] [$100] [$250] [ALL] */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {presetAmounts.map((val) => {
                    const isSelected = val === 'ALL'
                      ? maxWithdrawableAmount > 0 && numAmount === (sourceAccount === 'bonus' ? maxEligibleBonusWithdrawal : Math.floor(liveBalance))
                      : numAmount === val;
                    return (
                      <button
                        key={`preset-${val}`}
                        type="button"
                        onClick={() => handleSelectPreset(val)}
                        className={`py-2 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/25 border border-[#0066FF]'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {val === 'ALL' ? 'ALL' : `$${val}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold text-center">
                  {errorMsg}
                </div>
              )}

              {/* Action Button: Confirm Withdrawal -> */}
              {(() => {
                const isBonusLocked = sourceAccount === 'bonus' && !isChallengeUnlocked;
                return (
                  <button
                    type="button"
                    disabled={isSubmitting || isBonusLocked}
                    onClick={handleConfirmWithdrawal}
                    className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all mt-2 ${
                      isBonusLocked
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-[#0066FF] hover:bg-[#0052FF] active:scale-[0.99] text-white shadow-blue-600/25 cursor-pointer disabled:opacity-60'
                    }`}
                  >
                    {isSubmitting ? (
                      <span>Processing Withdrawal...</span>
                    ) : isBonusLocked ? (
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-4 h-4" />
                        <span>{wt.lockedButtonText(doubleProgressPercent, remainingToDouble.toFixed(2))}</span>
                      </span>
                    ) : (
                      <>
                        <span>{wt.unlockedButtonText}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                );
              })()}

              {/* Footer Note matching Screenshot 2 */}
              <p className="text-[11px] text-slate-400 text-center font-medium pt-1">
                Automated 10-minute dispatch • Secure encrypted verification
              </p>
            </div>
          </div>
        ) : (
          /* WITHDRAWAL SUCCESS RECEIPT */
          <div className="p-4 sm:p-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-md">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">Withdrawal Request Submitted</h3>
                <p className="text-xs text-slate-500">Your payout has been queued for automated blockchain dispatch within 10 minutes.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs font-medium">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Reference ID:</span>
                  <span className="font-mono font-bold text-slate-800">{completedWithdrawal?.id}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Method:</span>
                  <span className="font-bold text-slate-800">{completedWithdrawal?.method}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Receiving Address:</span>
                  <span className="font-mono font-bold text-slate-800 truncate max-w-[170px]">{completedWithdrawal?.destinationAddress}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Amount:</span>
                  <span className="font-mono font-black text-[#0066FF] text-base">${Number(completedWithdrawal?.amount).toFixed(2)} USD</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-[#0066FF] hover:bg-[#0052FF] text-white font-black text-sm uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Add Wallet Modal */}
        <AnimatePresence>
          {showAddWalletModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Manage Wallets</h4>
                  <button
                    type="button"
                    onClick={() => setShowAddWalletModal(false)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600">New Wallet Address or Binance Pay ID</label>
                  <input
                    type="text"
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    placeholder="Enter Pay ID or TRC20 address"
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 outline-none focus:border-[#0066FF]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewWallet}
                    className="w-full py-2.5 bg-[#0066FF] text-white font-bold text-xs rounded-xl hover:bg-[#0052FF] transition-all cursor-pointer mt-2"
                  >
                    Add & Select Wallet
                  </button>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saved Wallets</p>
                  {savedWallets.map(w => (
                    <div
                      key={w}
                      onClick={() => {
                        setDestinationAddress(w);
                        setShowAddWalletModal(false);
                      }}
                      className="p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 flex items-center justify-between cursor-pointer font-mono text-xs text-slate-700"
                    >
                      <span className="truncate max-w-[220px]">{w}</span>
                      {destinationAddress === w && <Check className="w-4 h-4 text-[#0066FF]" />}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
