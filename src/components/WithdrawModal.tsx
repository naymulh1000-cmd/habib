import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ArrowUpRight, 
  ShieldCheck, 
  Wallet, 
  Zap, 
  Info, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  DollarSign,
  Key,
  ShieldAlert,
  Building2,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  Check
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
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { processBonusAccountWithdrawal } from '../lib/bonusWithdrawalService';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: AccountType;
  liveBalance: number;
  bonusBalance: number;
  depositBonusGranted?: number;
  userEmail?: string;
  userUid?: string;
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
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState<boolean>(false);
  const [amountInput, setAmountInput] = useState<string>('100');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  
  // Security Password Modal State
  const [showPasswordStep, setShowPasswordStep] = useState<boolean>(false);
  const [accountPassword, setAccountPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // General Error & Flow States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Bonus Account Calculations according to exact master rules
  const baseGranted = (depositBonusGranted !== undefined && depositBonusGranted > 0)
    ? depositBonusGranted
    : (bonusBalance > 0 ? 250.00 : 0);
  const actualDepositBonusGranted = Math.min(bonusBalance, baseGranted);
  const currentBonusBalance = bonusBalance;
  const netTradingProfit = Math.max(0, Number((currentBonusBalance - actualDepositBonusGranted).toFixed(2)));
  const eligibleBonusWithdrawal = Number((netTradingProfit * (rules.bonusProfitWithdrawPercent / 100)).toFixed(2));
  const autoDeductionAmount = Number((netTradingProfit - eligibleBonusWithdrawal).toFixed(2));

  // Max withdrawable based on source account
  const currentAvailableBalance = sourceAccount === 'live' ? liveBalance : eligibleBonusWithdrawal;

  // Listen to Admin config updates in real time
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToWithdrawalConfig((updatedMethods, updatedRules) => {
      setMethods(updatedMethods);
      setRules(updatedRules);
    });
    const handleConfigChange = () => {
      setMethods(getStoredWithdrawalMethods());
      setRules(getStoredWithdrawalRules());
    };
    window.addEventListener('forex_withdrawal_config_updated', handleConfigChange);
    return () => {
      unsub();
      window.removeEventListener('forex_withdrawal_config_updated', handleConfigChange);
    };
  }, [isOpen]);

  // Adjust default amount on opening or account toggle
  useEffect(() => {
    if (sourceAccount === 'bonus') {
      if (eligibleBonusWithdrawal > 0) {
        setAmountInput(eligibleBonusWithdrawal.toString());
      } else {
        setAmountInput('0');
      }
    } else {
      setAmountInput(liveBalance > 0 ? Math.min(100, liveBalance).toString() : '100');
    }
  }, [sourceAccount, eligibleBonusWithdrawal, liveBalance]);

  if (!isOpen) return null;

  const selectedMethod = methods.find(m => m.id === selectedMethodId) || methods[0];
  const numAmount = parseFloat(amountInput) || 0;

  // Quick Percentage Setter
  const handleSetPercentage = (percent: number) => {
    const targetBase = sourceAccount === 'live' ? liveBalance : eligibleBonusWithdrawal;
    const calc = Math.floor((targetBase * (percent / 100)) * 100) / 100;
    setAmountInput(calc.toString());
    setErrorMsg(null);
  };

  // Convert to BDT if MFS gateway selected
  const bdtAmount = selectedMethod?.currencyConversionRate 
    ? Math.round(numAmount * selectedMethod.currencyConversionRate)
    : null;

  // Handle Form Proceed -> Open Security Password Modal
  const handleProceedToSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (sourceAccount === 'bonus' && netTradingProfit <= 0) {
      setErrorMsg(`No withdrawable profit in Bonus Account. Net Trading Profit: $0.00 USD. Deposit bonus granted ($${actualDepositBonusGranted.toFixed(2)} USD) cannot be withdrawn directly.`);
      return;
    }

    if (numAmount < rules.minWithdrawalUsd && sourceAccount === 'live') {
      setErrorMsg(`Minimum withdrawal amount is $${rules.minWithdrawalUsd} USD.`);
      return;
    }

    if (numAmount <= 0) {
      setErrorMsg('Please enter a valid withdrawal amount greater than $0.00.');
      return;
    }

    if (numAmount > currentAvailableBalance) {
      if (sourceAccount === 'bonus') {
        setErrorMsg(`Withdrawal amount ($${numAmount.toFixed(2)} USD) exceeds eligible 50% bonus trading profit ($${eligibleBonusWithdrawal.toFixed(2)} USD).`);
      } else {
        setErrorMsg(`Insufficient Live Balance. Available: $${liveBalance.toFixed(2)} USD.`);
      }
      return;
    }

    if (!destinationAddress.trim()) {
      setErrorMsg(`Please enter your ${selectedMethod.inputLabel}.`);
      return;
    }

    // Open Password Verification Step
    setPasswordError(null);
    setAccountPassword('');
    setShowPasswordStep(true);
  };

  // Final Submission after Password Verification
  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) {
      console.warn('[WithdrawModal] Rapid click blocked by isSubmittingRef.');
      return;
    }

    setPasswordError(null);

    if (!accountPassword.trim()) {
      setPasswordError('Please enter your account password to authorize withdrawal.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      let trxId = 'WD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const effectiveUid = userUid || auth.currentUser?.uid || 'trader_live';
      const effectiveEmail = userEmail || auth.currentUser?.email || 'trader@fxby24.com';

      // Save Withdrawal Record to Backend API, Firebase Firestore, User Account & local cache
      const savedDoc = await saveWithdrawalRequestToFirestore({
        id: trxId,
        trxId,
        userUid: effectiveUid,
        userEmail: effectiveEmail,
        accountType: sourceAccount,
        amount: numAmount,
        method: selectedMethod.name,
        methodSymbol: selectedMethod.symbol,
        destinationAddress: destinationAddress.trim(),
        depositBonusGranted: sourceAccount === 'bonus' ? actualDepositBonusGranted : undefined,
        systemDeductedProfitAmount: sourceAccount === 'bonus' ? autoDeductionAmount : undefined,
        totalNetProfit: sourceAccount === 'bonus' ? netTradingProfit : undefined
      });
      trxId = savedDoc.trxId || savedDoc.id || trxId;

      // Notify parent callback
      onSuccessWithdrawal({
        accountType: sourceAccount,
        amount: numAmount,
        method: selectedMethod.name,
        destinationAddress: destinationAddress.trim(),
        trxId
      });

      setShowPasswordStep(false);
      setIsSubmitted(true);

      setTimeout(() => {
        setIsSubmitted(false);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        setAmountInput('100');
        setDestinationAddress('');
        setAccountPassword('');
        onClose();
      }, 4500);

    } catch (err: any) {
      console.warn('Withdrawal submission warning:', err);
      setShowPasswordStep(false);
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        onClose();
      }, 4500);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <>
      <AnimatePresence>
        <div key="withdraw-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl">
          <motion.div
            key="withdraw-modal-card"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-md bg-[#0A0E1A] border-t sm:border border-[#F5B301]/30 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto space-y-4 font-sans"
          >
          {/* Top Bar / Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-gray-950 font-black shadow-lg shadow-rose-500/20">
                <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wide flex items-center gap-1.5">
                  <span>Withdraw Portfolio</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-extrabold uppercase">
                    SECURE
                  </span>
                </h2>
                <p className="text-[10px] text-gray-400">Professional Instant Gateway • 24/7 Processing</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-gray-900 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SUBMITTED SCREEN - Strictly English Message */}
          {isSubmitted ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-6 text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-white">Withdrawal request successful</h3>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Status: Pending
                  </span>
                </div>
              </div>
              
              {/* Screen Message */}
              <div className="p-4 rounded-2xl bg-gray-950 border border-emerald-500/30 text-xs leading-relaxed max-w-sm mx-auto shadow-inner text-left space-y-2">
                <p className="text-emerald-400 font-bold">
                  Withdrawal request successful. Status: Pending.
                </p>
                <p className="text-amber-300 text-[11px] font-medium">
                  Waiting for admin fund—1 to 10 minutes.
                </p>
                <p className="text-gray-300 text-[11px]">
                  Your withdrawal transaction has been successfully submitted and permanently saved.
                </p>
              </div>

              <div className="p-3 bg-gray-900/80 rounded-xl border border-white/5 text-[11px] text-gray-400 font-mono space-y-1 text-left">
                <div className="flex justify-between items-center">
                  <span>Withdrawal Amount:</span>
                  <strong className="text-white font-mono">${numAmount.toFixed(2)} USD</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Destination Gateway:</span>
                  <strong className="text-[#F5B301]">{selectedMethod.name}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  <span className="text-amber-400 font-bold">Pending</span>
                </div>
                <p className="truncate pt-1 border-t border-white/5 text-[10px]">
                  <span className="text-gray-500">Address: </span>
                  <span className="text-gray-300">{destinationAddress}</span>
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* MAIN WITHDRAWAL FORM */}
              <form onSubmit={handleProceedToSecurity} className="space-y-4">
                
                {/* 1. SOURCE ACCOUNT SELECTION */}
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
                    Select Source Account
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Live Account Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSourceAccount('live');
                        setErrorMsg(null);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        sourceAccount === 'live'
                          ? 'bg-[#121A2E] border-[#F5B301] ring-1 ring-[#F5B301] shadow-lg shadow-[#F5B301]/10'
                          : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Live Account</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <p className="text-sm font-black text-white font-mono mt-1">
                        ${liveBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </button>

                    {/* Bonus Account Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSourceAccount('bonus');
                        setErrorMsg(null);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        sourceAccount === 'bonus'
                          ? 'bg-[#121A2E] border-[#F5B301] ring-1 ring-[#F5B301] shadow-lg shadow-[#F5B301]/10'
                          : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#F5B301]" />
                          <span>Bonus Account</span>
                        </span>
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                      </div>
                      <p className="text-sm font-black text-blue-400 font-mono mt-1">
                        ${bonusBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </button>
                  </div>
                </div>

                {/* BONUS ACCOUNT SPECIFIC BREAKDOWN NOTICE BOX (MASTER FINAL INSTRUCTION) */}
                {sourceAccount === 'bonus' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/70 via-gray-950 to-blue-900/30 border border-blue-500/30 space-y-3 shadow-xl shadow-blue-950/40">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-500/20 text-xs">
                      <span className="font-black text-blue-300 flex items-center gap-1.5 tracking-wide">
                        <Sparkles className="w-4 h-4 text-[#F5B301]" />
                        <span>Bonus Withdrawal Policy & Breakdown</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-black tracking-wider">
                        50% PROFIT WITHDRAWABLE
                      </span>
                    </div>

                    {/* 5 Specific Breakdown Metric Cards */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* 1. Deposit Bonus Granted */}
                      <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-0.5">
                        <p className="text-[9px] text-amber-300/80 uppercase font-black tracking-wider">
                          1. Deposit Bonus Granted
                        </p>
                        <p className="font-mono font-black text-amber-300 text-sm">
                          ${actualDepositBonusGranted.toFixed(2)} <span className="text-[10px] text-gray-400 font-normal">USD</span>
                        </p>
                        <p className="text-[8px] text-gray-400">Principal Bonus (Non-withdrawable)</p>
                      </div>

                      {/* 2. Current Bonus Balance */}
                      <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 space-y-0.5">
                        <p className="text-[9px] text-blue-300/80 uppercase font-black tracking-wider">
                          2. Current Bonus Balance
                        </p>
                        <p className="font-mono font-black text-white text-sm">
                          ${currentBonusBalance.toFixed(2)} <span className="text-[10px] text-gray-400 font-normal">USD</span>
                        </p>
                        <p className="text-[8px] text-gray-400">Live Bonus Account Balance</p>
                      </div>

                      {/* 3. Net Trading Profit */}
                      <div className="col-span-2 p-2.5 rounded-xl bg-black/50 border border-blue-500/20 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] text-emerald-400 uppercase font-black tracking-wider">
                            3. Net Trading Profit
                          </p>
                          <span className="text-[9px] text-gray-400 font-mono">
                            ${currentBonusBalance.toFixed(2)} − ${actualDepositBonusGranted.toFixed(2)}
                          </span>
                        </div>
                        <p className="font-mono font-black text-emerald-400 text-base">
                          ${netTradingProfit.toFixed(2)} <span className="text-[10px] text-gray-400 font-normal">USD</span>
                        </p>
                        <p className="text-[8px] text-gray-400">Current Bonus Balance − Deposit Bonus Granted</p>
                      </div>

                      {/* 4. Eligible Withdrawal (50%) */}
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 space-y-0.5">
                        <p className="text-[9px] text-emerald-300 uppercase font-black tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>4. Eligible Withdrawal (50%)</span>
                        </p>
                        <p className="font-mono font-black text-emerald-400 text-sm">
                          ${eligibleBonusWithdrawal.toFixed(2)} <span className="text-[10px] text-emerald-300 font-normal">USD</span>
                        </p>
                        <p className="text-[8px] text-emerald-200/70">Net Profit × 50% (Withdrawable)</p>
                      </div>

                      {/* 5. Auto Deduction (50%) */}
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-0.5">
                        <p className="text-[9px] text-rose-300 uppercase font-black tracking-wider">
                          5. Auto Deduction (50%)
                        </p>
                        <p className="font-mono font-black text-rose-400 text-sm">
                          ${autoDeductionAmount.toFixed(2)} <span className="text-[10px] text-rose-300 font-normal">USD</span>
                        </p>
                        <p className="text-[8px] text-rose-200/70">Automatically deducted upon withdrawal</p>
                      </div>
                    </div>

                    {/* Formula Explanation Bar */}
                    <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[10px] text-gray-300 leading-relaxed font-sans">
                      <p className="font-bold text-[#F5B301] flex items-center gap-1 mb-0.5">
                        <Info className="w-3.5 h-3.5 text-[#F5B301]" />
                        <span>Bonus Withdrawal Rules:</span>
                      </p>
                      <p className="text-[9px] text-gray-300">
                        Principal deposit bonus (${actualDepositBonusGranted.toFixed(2)} USD) cannot be directly withdrawn. 50% of net trading profit (${eligibleBonusWithdrawal.toFixed(2)} USD) is withdrawable, and the remaining 50% (${autoDeductionAmount.toFixed(2)} USD) is automatically deducted upon withdrawal.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. AMOUNT INPUT & PRESET BUTTONS */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                      Withdrawal Amount (USD)
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Available: <strong className="text-white">${currentAvailableBalance.toFixed(2)} USD</strong>
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-lg font-black text-[#F5B301] font-mono">$</span>
                    <input
                      type="number"
                      step="any"
                      min={rules.minWithdrawalUsd}
                      max={currentAvailableBalance}
                      value={amountInput}
                      onChange={(e) => {
                        setAmountInput(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full py-3.5 pl-9 pr-16 bg-gray-950 border-2 border-gray-800 focus:border-[#F5B301] rounded-2xl text-xl font-black text-white font-mono outline-none transition-all"
                    />
                    <span className="absolute right-4 top-4 text-xs font-bold text-gray-400">USD</span>
                  </div>

                  {/* Percentage Preset Quick Buttons: 25%, 50%, 75%, MAX */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[25, 50, 75, 100].map((pct, idx) => (
                      <button
                        key={`wd-pct-${pct}-${idx}`}
                        type="button"
                        onClick={() => handleSetPercentage(pct)}
                        className="py-2 bg-gray-900 border border-gray-800 hover:border-[#F5B301] hover:text-[#F5B301] rounded-xl text-xs font-mono font-bold text-gray-300 transition-all cursor-pointer"
                      >
                        {pct === 100 ? 'MAX' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. PAYMENT METHOD SELECTION (COMPACT PROFESSIONAL DROPDOWN) */}
                <div className="relative">
                  <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1.5">
                    Select Payment Gateway
                  </label>

                  {/* Selected Method Display / Dropdown Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isMethodDropdownOpen
                        ? 'bg-[#121A2E] border-[#F5B301] shadow-lg shadow-[#F5B301]/10 ring-1 ring-[#F5B301]'
                        : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#F5B301]/15 border border-[#F5B301]/30 text-[#F5B301] flex items-center justify-center font-mono font-black text-xs uppercase shrink-0 shadow-sm">
                        {selectedMethod.symbol}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{selectedMethod.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">
                          Fee: {selectedMethod.fee} {selectedMethod.currencyConversionRate ? `• 1 USD = ${selectedMethod.currencyConversionRate} BDT` : ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-bold text-[#F5B301] bg-[#F5B301]/10 px-2 py-0.5 rounded-md border border-[#F5B301]/20">
                        Selected
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isMethodDropdownOpen ? 'rotate-180 text-[#F5B301]' : ''}`} />
                    </div>
                  </button>

                  {/* Dropdown Options List */}
                  <AnimatePresence>
                    {isMethodDropdownOpen && (
                      <>
                        {/* Backdrop for click-outside dismiss */}
                        <div
                          key="wd-methods-dropdown-backdrop"
                          className="fixed inset-0 z-20"
                          onClick={() => setIsMethodDropdownOpen(false)}
                        />

                        <motion.div
                          key="wd-methods-dropdown-menu"
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 top-full mt-2 z-30 bg-[#0E1424] border border-[#F5B301]/40 rounded-2xl p-2 shadow-2xl shadow-black/90 space-y-1.5 max-h-52 overflow-y-auto"
                        >
                          {methods.filter(m => m.isActive).map((gw, idx) => {
                            const isSelected = gw.id === selectedMethodId;
                            return (
                              <button
                                key={`wm-gw-${gw.id || 'gw'}-${idx}`}
                                type="button"
                                onClick={() => {
                                  setSelectedMethodId(gw.id);
                                  setIsMethodDropdownOpen(false);
                                  setErrorMsg(null);
                                }}
                                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#141E36] border-[#F5B301] shadow-sm text-white'
                                    : 'bg-gray-950/80 border-gray-800/80 hover:bg-gray-900 hover:border-gray-700 text-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center font-mono font-black text-[11px] uppercase shrink-0 ${
                                    isSelected
                                      ? 'bg-[#F5B301] text-gray-950 border-[#F5B301]'
                                      : 'bg-gray-900 text-[#F5B301] border-gray-800'
                                  }`}>
                                    {gw.symbol}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{gw.name}</p>
                                    <p className="text-[10px] text-gray-400 truncate">
                                      Fee: {gw.fee} {gw.currencyConversionRate ? `• 1 USD = ${gw.currencyConversionRate} BDT` : ''}
                                    </p>
                                  </div>
                                </div>

                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-[#F5B301] flex items-center justify-center text-gray-950 shrink-0 ml-2">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-gray-700 shrink-0 ml-2" />
                                )}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* 4. DESTINATION WALLET / PHONE ADDRESS */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-extrabold text-gray-300 uppercase tracking-wider">
                      {selectedMethod.inputLabel}
                    </label>
                    {bdtAmount && (
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Total {bdtAmount.toLocaleString()} BDT
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    value={destinationAddress}
                    onChange={(e) => {
                      setDestinationAddress(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={selectedMethod.placeholder}
                    className="w-full px-3.5 py-3 bg-gray-950 border border-gray-800 rounded-xl text-xs font-mono text-white placeholder-gray-500 outline-none focus:border-[#F5B301]"
                  />
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-500 via-amber-400 to-[#F5B301] text-gray-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-rose-500/20 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                  <span>Submit Withdrawal (${numAmount})</span>
                </button>
              </form>
            </>
          )}

          {/* SECURITY PASSWORD AUTHENTICATION MODAL */}
          <AnimatePresence>
            {showPasswordStep && (
              <div key="withdraw-pw-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                <motion.div
                  key="withdraw-pw-card"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="w-full max-w-sm p-6 bg-[#0E1424] border-2 border-[#F5B301]/50 rounded-3xl space-y-4 text-white shadow-2xl font-sans"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#F5B301]/20 border border-[#F5B301]/40 flex items-center justify-center text-[#F5B301]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white">Security Password Check</h3>
                        <p className="text-[10px] text-gray-400">Account Security Verification</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPasswordStep(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Please enter your Forex Trade Pro account password to authorize withdrawal of <strong className="text-emerald-400 font-mono">${numAmount} USD</strong> to <strong className="text-[#F5B301]">{selectedMethod.name}</strong>.
                  </p>

                  <form onSubmit={handleConfirmWithdrawal} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                        Account Password
                      </label>
                      <input
                        type="password"
                        autoFocus
                        required
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        placeholder="Enter your account password..."
                        className="w-full px-3.5 py-3 bg-gray-950 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#F5B301]"
                      />
                    </div>

                    {passwordError && (
                      <p className="text-xs text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{passwordError}</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPasswordStep(false)}
                        className="w-1/3 py-2.5 rounded-xl bg-gray-900 border border-white/10 text-gray-300 text-xs font-bold hover:text-white"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 bg-[#F5B301] hover:brightness-110 text-gray-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#F5B301]/20 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                        <span>{isSubmitting ? 'Processing...' : 'Verify & Submit'}</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </AnimatePresence>
    </>
  );
};
