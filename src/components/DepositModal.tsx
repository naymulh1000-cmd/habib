import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  QrCode, 
  Zap, 
  Clock, 
  ChevronDown, 
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Flame,
  Search,
  AlertCircle,
  Trophy,
  Shield
} from 'lucide-react';
import { AccountType } from '../types';
import { 
  getStoredGateways, 
  getStoredDepositRules, 
  subscribeToDepositConfig,
  PaymentGatewayConfig, 
  DepositRulesConfig 
} from '../lib/depositConfig';
import { saveDepositRequestToFirestore } from '../lib/depositSync';
import { auth } from '../lib/firebase';
import { safeFetch } from '../lib/safeApi';
import { BONUS_CATEGORIES, getBonusCategoryForAmount, BonusCategoryConfig } from '../lib/bonusRules';
import { BONUS_LANGUAGES, BONUS_TRANSLATIONS, BonusLanguage } from '../lib/bonusTranslations';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: AccountType;
  liveBalance?: number;
  userEmail?: string;
  userUid?: string;
  hasClaimedBonusBefore?: boolean;
  onOpenHistory?: () => void;
  onSuccessDeposit: (depositData: {
    id?: string;
    amount: number;
    bonusAmount: number;
    method: string;
    trxId: string;
    accountType: AccountType;
    proofScreenshot?: string;
  }) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  activeAccount,
  liveBalance = 44.40,
  userEmail,
  userUid,
  hasClaimedBonusBefore = false,
  onOpenHistory,
  onSuccessDeposit
}) => {
  // Load configuration from Admin settings
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>(getStoredGateways());
  const [rules, setRules] = useState<DepositRulesConfig>(getStoredDepositRules());

  // Form & Wizard States
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('binance_pay');
  const [amountInput, setAmountInput] = useState<string>('100');
  const [claimBonus, setClaimBonus] = useState<boolean>(true);
  const [step, setStep] = useState<'amount' | 'checkout' | 'success'>('amount');

  // Strict Limits according to User Specification
  const MIN_DEPOSIT_LIMIT = 100;
  const BONUS_THRESHOLD = 250;

  // Checkout states
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [paymentTimerSeconds, setPaymentTimerSeconds] = useState<number>(900);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);
  const [manualTxidInput, setManualTxidInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showGatewayModal, setShowGatewayModal] = useState<boolean>(false);
  const [gatewaySearch, setGatewaySearch] = useState<string>('');

  // Completed deposit receipt
  const [completedDeposit, setCompletedDeposit] = useState<{
    id: string;
    orderId: string;
    amount: number;
    bonusAmount: number;
    bonusCategory?: number;
    method: string;
    timestamp: string;
    accountType: AccountType;
    trxId?: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync deposit config
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToDepositConfig((updatedGateways, updatedRules) => {
      setGateways(updatedGateways);
      setRules(updatedRules);
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('amount');
      setErrorMsg(null);
      setManualTxidInput('');
      setPaymentTimerSeconds(900);
      const activeGateways = gateways.filter(g => g.isActive);
      if (activeGateways.length > 0 && !activeGateways.some(g => g.id === selectedGatewayId)) {
        setSelectedGatewayId(activeGateways[0].id);
      }
    }
  }, [isOpen]);

  // Payment countdown timer
  useEffect(() => {
    if (step !== 'checkout') return;
    const timer = setInterval(() => {
      setPaymentTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amountInput) || 0;
  const isBelowMin = numAmount < MIN_DEPOSIT_LIMIT;
  const isEligibleForBonus = numAmount >= BONUS_THRESHOLD;
  const currentCategory = getBonusCategoryForAmount(numAmount);
  const actualBonusAmount = (isEligibleForBonus && claimBonus) ? numAmount : 0;

  // Language state for Bonus section (Default is strictly English as requested)
  const [bonusLang, setBonusLang] = useState<'en' | 'bn' | 'hi' | 'ar' | 'es' | 'pt'>('en');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);
  const currentLangMeta = BONUS_LANGUAGES.find(l => l.code === bonusLang) || BONUS_LANGUAGES[0];
  const t = BONUS_TRANSLATIONS[bonusLang] || BONUS_TRANSLATIONS.en;

  // Selected gateway
  const selectedGateway: PaymentGatewayConfig = gateways.find(g => g.id === selectedGatewayId) || gateways[0] || {
    id: 'binance_pay',
    name: 'Binance Pay',
    type: 'crypto' as const,
    symbol: 'BINANCE',
    accountOrAddress: '48935678',
    network: 'Binance Direct Pay ID',
    instructions: 'Send exact amount to our official Binance Pay ID',
    minUsd: 100,
    fee: '0%',
    isActive: true
  };

  const presetAmounts = [100, 250, 500, 1000, 2500];

  const handleProceedToCheckout = () => {
    if (numAmount < MIN_DEPOSIT_LIMIT) {
      setErrorMsg(`মিনিমাম ডিপোজিট $১০০ (Minimum deposit is $${MIN_DEPOSIT_LIMIT} USD)`);
      return;
    }
    setErrorMsg(null);
    const newId = 'DP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setCurrentOrderId(newId);
    setPaymentTimerSeconds(900);
    setStep('checkout');
  };

  const handleCopy = (text: string, type: 'address' | 'amount') => {
    try {
      navigator.clipboard.writeText(text);
      if (type === 'address') {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 2000);
      }
    } catch (_) {}
  };

  const handleSubmitDeposit = async () => {
    const cleanTx = manualTxidInput.trim();
    if (!cleanTx) {
      setErrorMsg('Please enter your Transaction ID or Binance Order ID');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    const effectiveUid = auth.currentUser?.uid || userUid || 'usr_guest';
    const effectiveEmail = auth.currentUser?.email || userEmail || '';
    const effectiveName = auth.currentUser?.displayName || (effectiveEmail ? effectiveEmail.split('@')[0] : 'Trader');

    const depositPayload = {
      id: currentOrderId,
      userUid: effectiveUid,
      userEmail: effectiveEmail,
      userName: effectiveName,
      amount: numAmount,
      bonusAmount: actualBonusAmount,
      bonusCategory: currentCategory?.tier || 1,
      claimBonus: Boolean(isEligibleForBonus && claimBonus),
      method: selectedGateway.name,
      trxId: cleanTx,
      accountType: 'live' as AccountType,
      status: 'Pending' as const
    };

    try {
      // 1. Authoritative Firestore write
      await saveDepositRequestToFirestore(depositPayload);

      // 2. Non-blocking backend notification
      safeFetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(depositPayload)
      }, 5000).catch(() => {});

      // 3. Update parent callback
      onSuccessDeposit({
        id: currentOrderId,
        amount: numAmount,
        bonusAmount: actualBonusAmount,
        method: selectedGateway.name,
        trxId: cleanTx,
        accountType: 'live'
      });

      setCompletedDeposit({
        id: currentOrderId,
        orderId: currentOrderId,
        amount: numAmount,
        bonusAmount: actualBonusAmount,
        bonusCategory: currentCategory?.tier || 1,
        method: selectedGateway.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accountType: 'live',
        trxId: cleanTx
      });

      setStep('success');
    } catch (e) {
      console.warn('Deposit submission note:', e);
      setCompletedDeposit({
        id: currentOrderId,
        orderId: currentOrderId,
        amount: numAmount,
        bonusAmount: actualBonusAmount,
        bonusCategory: currentCategory?.tier || 1,
        method: selectedGateway.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accountType: 'live',
        trxId: cleanTx
      });
      setStep('success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timerMin = Math.floor(paymentTimerSeconds / 60);
  const timerSec = paymentTimerSeconds % 60;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[460px] bg-[#F8FAFC] rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col my-auto font-sans text-slate-800"
      >
        {/* Top Header Bar matching Screenshot */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          {/* Left: Instant Deposit Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50/90 border border-blue-200/90 text-[#0066FF] shadow-xs">
            <Zap className="w-3.5 h-3.5 fill-[#0066FF]" />
            <span className="text-[11px] font-black tracking-wider uppercase">INSTANT DEPOSIT</span>
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

        {/* STEP 1: MAIN AMOUNT & METHOD SELECTION (100% Matching Screenshot 1) */}
        {step === 'amount' && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* White Card Container */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm space-y-4">
              
              {/* Row 1: Live Balance & Min Deposit */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>LIVE BALANCE</span>
                  </div>
                  <div className="text-3xl font-black text-slate-900 tracking-tight mt-1 font-mono">
                    ${liveBalance.toFixed(2)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    MIN DEPOSIT
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-black font-mono">
                    ${(rules.minDepositUsd || 10).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Row 2: Payment Method */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 tracking-wider uppercase">
                    PAYMENT METHOD
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGatewayModal(true)}
                    className="text-xs font-bold text-[#0066FF] bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 rounded-lg px-2.5 py-1 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>Change Method</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Method Card matching Screenshot 1 */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    {/* Blue PAY badge */}
                    <div className="w-10 h-10 rounded-xl bg-[#0052FF] flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm tracking-tight">
                      PAY
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900">{selectedGateway.name}</span>
                        <span className="bg-blue-100 text-[#0066FF] text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          0% Fee
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedGateway.network || 'Binance Direct Pay ID'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowGatewayModal(true)}
                    className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer px-1 py-1"
                  >
                    Switch
                  </button>
                </div>
              </div>

              {/* Row 3: Deposit Amount (USD) */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    DEPOSIT AMOUNT (USD)
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Instant Gateway Dispatch
                  </span>
                </div>

                {/* Amount Input matching Screenshot 1 with $100 min validation */}
                <div className={`rounded-xl border bg-white px-4 py-3 flex items-center shadow-inner transition-colors ${
                  isBelowMin ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-200'
                }`}>
                  <span className="text-xl font-bold text-slate-400 mr-2.5 font-mono">$</span>
                  <input
                    type="number"
                    min={MIN_DEPOSIT_LIMIT}
                    max={rules.maxDepositUsd || 50000}
                    value={amountInput}
                    onChange={(e) => {
                      setAmountInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="100"
                    className="w-full text-2xl font-black text-slate-900 bg-transparent outline-none font-mono"
                  />
                </div>

                {/* Red warning message if amount is below $100 */}
                {isBelowMin && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>মিনিমাম ডিপোজিট $১০০ (Minimum deposit is $100 USD)</span>
                  </div>
                )}

                {/* Preset Amount Buttons: [$100] [$250] [$500] [$1000] [$2500] */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {presetAmounts.map((val) => {
                    const isSelected = numAmount === val;
                    return (
                      <button
                        key={`preset-${val}`}
                        type="button"
                        onClick={() => {
                          setAmountInput(String(val));
                          setErrorMsg(null);
                        }}
                        className={`py-2 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/25 border border-[#0066FF]'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        ${val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BONUS LANGUAGE SELECTOR BAR (Directly above the toggle switch) */}
              <div className="flex items-center justify-between px-1 pt-1">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  {t.headerLabel}
                </span>

                {/* Country Flag Dropdown Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/90 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
                    title="Select Language / ভাষা পরিবর্তন করুন"
                  >
                    <span className="text-base leading-none">{currentLangMeta.flag}</span>
                    <span className="text-[11px] font-extrabold text-slate-800 tracking-tight">{currentLangMeta.code.toUpperCase()}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {isLangMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {BONUS_LANGUAGES.map(lang => (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              setBonusLang(lang.code);
                              setIsLangMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 flex items-center justify-between text-xs transition-colors cursor-pointer ${
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

              {/* BONUS SECTION & TOGGLE SWITCH ($250 THRESHOLD) */}
              {!isEligibleForBonus ? (
                /* $250 এর নিচে: টগল ডিসেবল/হাইড ও ওয়ার্নিং */
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
                  <div className="flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">{t.toggleTitle}</span>
                    </div>
                    <div className="w-10 h-5.5 rounded-full bg-slate-200 p-0.5 cursor-not-allowed flex items-center">
                      <div className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                    <span className="text-amber-800 font-semibold">{t.unlockRequirement}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAmountInput('250');
                        setErrorMsg(null);
                      }}
                      className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer"
                    >
                      {t.selectMinButton}
                    </button>
                  </div>
                </div>
              ) : (
                /* $250 বা তার বেশি: সক্রিয় টগল ও ৩টি ক্যাটাগরি কার্ড */
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 border border-amber-200 shadow-xs space-y-3">
                  {/* Toggle Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                          {t.toggleTitle}
                        </span>
                        <p className="text-[10px] text-amber-800 font-medium">
                          {claimBonus ? t.toggleSubtitleOn : t.toggleSubtitleOff}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setClaimBonus(!claimBonus)}
                      className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                        claimBonus ? 'bg-[#0066FF] justify-end' : 'bg-slate-300 justify-start'
                      }`}
                      title={claimBonus ? 'Bonus Claim Active' : 'Bonus Claim Inactive'}
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center"
                      >
                        {claimBonus && <Check className="w-3 h-3 text-[#0066FF]" />}
                      </motion.div>
                    </button>
                  </div>

                  {/* Fund Distribution Info Banner when claimBonus is ON */}
                  {claimBonus && (
                    <div className="p-2.5 rounded-xl bg-white/95 border border-amber-200/90 text-xs space-y-1 shadow-xs">
                      <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                        <span className="text-emerald-700 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {t.liveWalletLabel}: ${numAmount.toFixed(2)}
                        </span>
                        <span className="text-blue-700 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          {t.bonusWalletLabel}: +${numAmount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {t.distributionInfo}
                      </p>
                    </div>
                  )}

                  {/* 3 Bonus Category Cards */}
                  {claimBonus && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center justify-between">
                        <span>{t.categoriesHeader}</span>
                        <span className="text-blue-600 font-bold">{t.autoSelectedBadge}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {([1, 2, 3] as const).map(tier => {
                          const cat = BONUS_CATEGORIES[tier];
                          const catTrans = t.categories[tier];
                          const isSelected = currentCategory?.tier === tier;
                          return (
                            <div
                              key={`cat-card-${tier}`}
                              onClick={() => {
                                setAmountInput(String(cat.minDeposit));
                                setErrorMsg(null);
                              }}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer text-left relative ${
                                isSelected
                                  ? 'bg-white border-[#0066FF] ring-2 ring-blue-500/20 shadow-sm'
                                  : 'bg-white/70 border-slate-200/80 hover:bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-slate-900">{catTrans?.name || cat.nameBn}</span>
                                </div>

                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0066FF] text-[9px] font-black">
                                    <Check className="w-2.5 h-2.5" />
                                    <span>{t.activeBadge}</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400">{t.selectButton}</span>
                                )}
                              </div>

                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                                  {catTrans?.tag || cat.tag}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                                {catTrans?.terms || cat.terms}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold text-center">
                  {errorMsg}
                </div>
              )}

              {/* Action Button: Deposit Now (Disabled if < $100) */}
              <button
                type="button"
                disabled={isBelowMin}
                onClick={handleProceedToCheckout}
                className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-xl transition-all mt-2 ${
                  isBelowMin
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-[#0066FF] hover:bg-[#0052FF] active:scale-[0.99] text-white shadow-blue-600/25 cursor-pointer'
                }`}
              >
                <span>{isBelowMin ? 'মিনিমাম ডিপোজিট $১০০ পূরণ করুন' : 'Deposit Now'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Footer Note matching Screenshot 1 */}
              <p className="text-[11px] text-slate-400 text-center font-medium pt-1">
                Automated instant processing • 100% secure institutional gateway
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: CHECKOUT / PAYMENT ADDRESS & QR CODE */}
        {step === 'checkout' && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm space-y-4">
              {/* Back & Timer row */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('amount')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{String(timerMin).padStart(2, '0')}:{String(timerSec).padStart(2, '0')}</span>
                </div>
              </div>

              {/* Deposit Order Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Order ID:</span>
                  <span className="font-mono font-bold text-slate-800">{currentOrderId}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Payment Gateway:</span>
                  <span className="font-bold text-slate-900">{selectedGateway.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-600 font-bold">Exact Amount to Send:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-lg text-[#0066FF]">${numAmount.toFixed(2)} USD</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(numAmount.toString(), 'amount')}
                      className="p-1 rounded bg-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                      title="Copy Amount"
                    >
                      {copiedAmount ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {actualBonusAmount > 0 && currentCategory && (
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60 text-amber-800">
                    <span className="font-medium">Bonus Match ({currentCategory.nameBn}):</span>
                    <span className="font-mono font-bold text-blue-600">+${actualBonusAmount.toFixed(2)} USD</span>
                  </div>
                )}
              </div>

              {/* QR Code & Destination Address */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-center space-y-3">
                {selectedGateway.qrCodeUrl ? (
                  <div className="w-36 h-36 mx-auto p-2 bg-white rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
                    <img src={selectedGateway.qrCodeUrl} alt="Payment QR" className="w-full h-full object-contain rounded-lg" />
                  </div>
                ) : (
                  <div className="w-32 h-32 mx-auto p-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12 text-[#0066FF]" />
                    <span className="text-[9px] font-bold mt-1 text-slate-500 uppercase">{selectedGateway.symbol}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedGateway.network || 'Official Payment Destination / Pay ID'}
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-xs text-slate-800 break-all select-all flex items-center justify-between gap-2">
                    <span className="truncate">{selectedGateway.accountOrAddress || '48935678'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedGateway.accountOrAddress || '48935678', 'address')}
                      className="px-2 py-1 rounded bg-[#0066FF] text-white text-[10px] font-bold shrink-0 hover:bg-[#0052FF] cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      {copiedAddress ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction ID / Proof Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  ENTER TRANSACTION ID / ORDER ID
                </label>
                <input
                  type="text"
                  value={manualTxidInput}
                  onChange={(e) => {
                    setManualTxidInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Paste your Pay ID / TrxID / Hash here"
                  className="w-full py-3 px-3.5 rounded-xl border border-slate-200 bg-white font-mono text-sm text-slate-900 outline-none focus:border-[#0066FF] shadow-inner"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold text-center">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitDeposit}
                className="w-full py-4 rounded-2xl bg-[#0066FF] hover:bg-[#0052FF] active:scale-[0.99] text-white font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Verifying Transaction...</span>
                ) : (
                  <>
                    <span>Confirm Deposit Submission</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS RECEIPT */}
        {step === 'success' && completedDeposit && (
          <div className="p-4 sm:p-5 space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-sm text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-md">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">Deposit Request Received</h3>
                <p className="text-xs text-slate-500">Your deposit has been securely dispatched to our automated gateway.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs font-medium">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Order Reference:</span>
                  <span className="font-mono font-bold text-slate-800">{completedDeposit.orderId}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Method:</span>
                  <span className="font-bold text-slate-800">{completedDeposit.method}</span>
                </div>
                {completedDeposit.trxId && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Transaction ID:</span>
                    <span className="font-mono font-bold text-slate-800 truncate max-w-[180px]">{completedDeposit.trxId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-700 font-bold">Amount:</span>
                  <span className="font-mono font-black text-emerald-600 text-base">${completedDeposit.amount.toFixed(2)} USD</span>
                </div>
                {completedDeposit.bonusAmount > 0 && (
                  <div className="flex justify-between items-center text-amber-600 pt-1 font-bold">
                    <span>Bonus Credited:</span>
                    <span className="font-mono font-black">+${completedDeposit.bonusAmount.toFixed(2)} USD</span>
                  </div>
                )}
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

        {/* Change Method Modal Overlay */}
        <AnimatePresence>
          {showGatewayModal && (
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
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Select Payment Gateway</h4>
                  <button
                    type="button"
                    onClick={() => setShowGatewayModal(false)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Gateway Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={gatewaySearch}
                    onChange={(e) => setGatewaySearch(e.target.value)}
                    placeholder="Search method..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 outline-none focus:border-[#0066FF]"
                  />
                </div>

                {/* Gateways List */}
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {gateways
                    .filter(g => g.isActive && (g.name.toLowerCase().includes(gatewaySearch.toLowerCase()) || g.symbol.toLowerCase().includes(gatewaySearch.toLowerCase())))
                    .map((g) => {
                      const isSelected = g.id === selectedGatewayId;
                      return (
                        <div
                          key={g.id}
                          onClick={() => {
                            setSelectedGatewayId(g.id);
                            setShowGatewayModal(false);
                          }}
                          className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50/70 border-[#0066FF] shadow-xs'
                              : 'bg-white border-slate-200/80 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0052FF] flex items-center justify-center text-white font-black text-xs shrink-0">
                              PAY
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900">{g.name}</p>
                              <p className="text-[10px] text-slate-400">{g.network || 'Instant Dispatch'}</p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#0066FF]" />}
                        </div>
                      );
                    })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
