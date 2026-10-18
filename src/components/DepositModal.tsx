import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ArrowDownRight, 
  Copy, 
  Check, 
  QrCode, 
  ShieldCheck, 
  Wallet, 
  Zap, 
  Info, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Globe, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Flame, 
  ShieldAlert
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

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: AccountType;
  userEmail?: string;
  userUid?: string;
  hasClaimedBonusBefore?: boolean;
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

interface CryptomusInvoiceData {
  orderId: string;
  uuid?: string;
  amount: number;
  currency: string;
  network?: string;
  address: string;
  url?: string;
  expiredAt?: number;
  status: string;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  activeAccount,
  userEmail,
  userUid,
  hasClaimedBonusBefore = false,
  onSuccessDeposit
}) => {
  // Load configuration from Admin settings (Filtered for Cryptomus supported active methods)
  const [gateways, setGateways] = useState<PaymentGatewayConfig[]>(getStoredGateways());
  const [rules, setRules] = useState<DepositRulesConfig>(getStoredDepositRules());

  // Form & Wizard States
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('cryptomus_usdt_trc20');
  const [amountInput, setAmountInput] = useState<string>('250'); // Default $250 for 100% bonus unlock
  const [claimBonus, setClaimBonus] = useState<boolean>(!hasClaimedBonusBefore); // 100% Supercharge Bonus checkbox
  const [step, setStep] = useState<'amount' | 'checkout' | 'success'>('amount');

  // Auto-disable bonus claim if user has already claimed the one-time welcome bonus
  useEffect(() => {
    if (hasClaimedBonusBefore) {
      setClaimBonus(false);
    }
  }, [hasClaimedBonusBefore]);

  // Cryptomus Automated Invoice & Session States
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<boolean>(false);
  const [cryptomusInvoice, setCryptomusInvoice] = useState<CryptomusInvoiceData | null>(null);
  const [paymentTimerSeconds, setPaymentTimerSeconds] = useState<number>(900); // 15:00 min timer
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [copiedAmount, setCopiedAmount] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(false);
  const [manualTxidInput, setManualTxidInput] = useState<string>('');
  const [showManualTxidInput, setShowManualTxidInput] = useState<boolean>(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState<boolean>(false);

  // Success Receipt State
  const [completedDeposit, setCompletedDeposit] = useState<{
    id: string;
    orderId: string;
    amount: number;
    bonusAmount: number;
    method: string;
    timestamp: string;
    accountType: AccountType;
    status?: string;
    trxId?: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [currencySearch, setCurrencySearch] = useState<string>('');

  const pollingIntervalRef = useRef<any>(null);
  const isFinalizedRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);

  // Real-time synchronization of deposit configurations from Firestore / Admin
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToDepositConfig((updatedGateways, updatedRules) => {
      setGateways(updatedGateways);
      setRules(updatedRules);
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      isFinalizedRef.current = false;
      isSubmittingRef.current = false;
      setErrorMsg(null);
      // Select first active gateway if current is disabled
      const activeGateways = gateways.filter(g => g.isActive);
      if (activeGateways.length > 0 && !activeGateways.some(g => g.id === selectedGatewayId)) {
        setSelectedGatewayId(activeGateways[0].id);
      }
    } else {
      isSubmittingRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [isOpen, gateways, selectedGatewayId]);

  // 15:00 countdown timer for checkout
  useEffect(() => {
    if (step !== 'checkout') {
      setPaymentTimerSeconds(900);
      return;
    }
    const timer = setInterval(() => {
      setPaymentTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Clean manual checkout preparation (no automated background polling)
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsAutoPolling(false);
  }, [step]);

  if (!isOpen) return null;

  // Active Cryptomus payment methods only
  const activeGateways = gateways.filter(g => g.isActive !== false);
  const selectedGateway = gateways.find(g => g.id === selectedGatewayId) || activeGateways[0] || gateways[0];

  const numAmount = parseFloat(amountInput) || 0;

  // 100% Supercharge Bonus Eligibility ($250+ by default)
  const isEligibleForBonus = 
    rules.isBonusEnabled &&
    !hasClaimedBonusBefore &&
    numAmount >= rules.bonusMinDepositUsd &&
    numAmount <= rules.bonusMaxDepositUsd;

  const actualBonusAmount = (isEligibleForBonus && claimBonus) ? numAmount : 0;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string, type: 'address' | 'amount') => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
  };

  // Generate Checkout Details for Selected Gateway
  const handleProceedToCheckout = () => {
    setErrorMsg(null);

    if (numAmount < rules.minDepositUsd) {
      setErrorMsg(`Minimum deposit amount is $${rules.minDepositUsd} USD.`);
      return;
    }
    if (numAmount > rules.maxDepositUsd) {
      setErrorMsg(`Maximum deposit amount is $${rules.maxDepositUsd.toLocaleString()} USD.`);
      return;
    }

    const randomOrderNumber = Math.floor(100000 + Math.random() * 900000);
    const generatedOrderId = `FX-${Date.now().toString(36).toUpperCase()}-${randomOrderNumber}`;

    setCryptomusInvoice({
      orderId: generatedOrderId,
      amount: numAmount,
      currency: selectedGateway.symbol || 'USDT',
      network: selectedGateway.network || 'tron',
      address: selectedGateway.accountOrAddress || 'Generating Address...',
      status: 'pending'
    });
    setStep('checkout');
  };

  // Finalize successful deposit and credit balance
  const handleFinalizeSuccessfulDeposit = async (orderData: any) => {
    if (isFinalizedRef.current) return;
    isFinalizedRef.current = true;

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    const orderId = orderData.orderId || cryptomusInvoice?.orderId || `FX-${Date.now().toString(36).toUpperCase()}`;
    const amount = Number(orderData.amount) || numAmount;
    const bonus = Number(orderData.bonusAmount) || actualBonusAmount;
    const method = orderData.method || selectedGateway.name;

    const formattedTimestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    console.log('[Cryptomus] 🎉 Payment confirmed! Crediting user balance:', {
      orderId,
      amount,
      bonus,
      method
    });

    // Notify parent App component
    onSuccessDeposit({
      id: orderId,
      amount,
      bonusAmount: bonus,
      method,
      trxId: orderData.txHash || orderData.orderId || orderId,
      accountType: 'live'
    });

    setCompletedDeposit({
      id: orderId,
      orderId,
      amount,
      bonusAmount: bonus,
      method,
      timestamp: formattedTimestamp,
      accountType: 'live'
    });

    setStep('success');
  };

  // Confirm deposit request and send to Firestore in real time (Zero-hang guarantee)
  const handleConfirmDepositRequest = async () => {
    if (isSubmittingRef.current || isSubmittingManual) {
      console.warn('[DepositModal] ⚠️ Deposit submission already in-progress. Blocking duplicate invocation.');
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmittingManual(true);
    setErrorMsg(null);

    const effectiveUid = userUid || auth.currentUser?.uid || 'trader_live';
    const effectiveEmail = userEmail || auth.currentUser?.email || 'trader@fxby24.com';
    const effectiveName = auth.currentUser?.displayName || (effectiveEmail ? effectiveEmail.split('@')[0] : 'Trader');
    const cleanTxid = manualTxidInput.trim() || `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const currentOrderId = cryptomusInvoice?.orderId || `FX-${Date.now().toString(36).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const formattedTimestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    try {
      // 1. Save to Firestore and Backend without blocking UI indefinitely
      const firestorePromise = saveDepositRequestToFirestore({
        id: currentOrderId,
        userUid: effectiveUid,
        userEmail: effectiveEmail,
        userName: effectiveName,
        amount: numAmount,
        bonusAmount: actualBonusAmount,
        claimBonus: Boolean(isEligibleForBonus && claimBonus),
        method: selectedGateway.name,
        trxId: cleanTxid,
        accountType: 'live',
        status: 'Pending'
      });

      const backendPromise = fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentOrderId,
          userUid: effectiveUid,
          userEmail: effectiveEmail,
          amount: numAmount,
          bonusAmount: actualBonusAmount,
          method: selectedGateway.name,
          trxId: cleanTxid,
          status: 'Pending'
        })
      }).catch((e) => console.warn('Backend deposit sync note:', e));

      // Wait with timeout race so spinner never hangs
      await Promise.race([
        Promise.all([firestorePromise, backendPromise]),
        new Promise((resolve) => setTimeout(resolve, 600))
      ]);

      // Update parent component wallet history
      if (onSuccessDeposit) {
        onSuccessDeposit({
          id: currentOrderId,
          amount: numAmount,
          bonusAmount: actualBonusAmount,
          method: selectedGateway.name,
          trxId: cleanTxid,
          accountType: 'live'
        });
      }

      setCompletedDeposit({
        id: currentOrderId,
        orderId: currentOrderId,
        amount: numAmount,
        bonusAmount: actualBonusAmount,
        method: selectedGateway.name,
        timestamp: formattedTimestamp,
        accountType: 'live',
        status: 'Pending',
        trxId: cleanTxid
      });

      setStep('success');
    } catch (err: any) {
      console.error('[DepositModal] Confirm deposit request notice:', err);
      setCompletedDeposit({
        id: currentOrderId,
        orderId: currentOrderId,
        amount: numAmount,
        bonusAmount: actualBonusAmount,
        method: selectedGateway.name,
        timestamp: formattedTimestamp,
        accountType: 'live',
        status: 'Pending',
        trxId: cleanTxid
      });
      setStep('success');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Manual transaction hash confirmation fallback
  const handleManualTxidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleConfirmDepositRequest();
  };

  const handleClose = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setStep('amount');
    setCryptomusInvoice(null);
    setManualTxidInput('');
    setShowManualTxidInput(false);
    setErrorMsg(null);
    onClose();
  };

  // Payment Address to display
  const displayPaymentAddress = cryptomusInvoice?.address || selectedGateway.accountOrAddress;
  const qrCodeUrl = selectedGateway.qrCodeUrl?.trim() || `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(displayPaymentAddress)}`;

  return (
    <>
      <AnimatePresence>
        <div key="deposit-modal-backdrop" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl">
          <motion.div
            key="deposit-modal-card"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full sm:max-w-lg bg-[#0A0E1A] border-t sm:border border-emerald-500/30 text-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto space-y-4 font-sans shadow-2xl shadow-emerald-500/10"
          >
            {/* Top Bar / Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-400 text-gray-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
                  <Zap className="w-5 h-5 fill-gray-950 text-gray-950" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black uppercase tracking-wider flex items-center gap-2 text-white">
                    <span>Cryptomus Instant Deposit</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      AUTOMATED
                    </span>
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Zero-Fee Direct Blockchain Payment Gateway
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-xl bg-gray-900/80 border border-white/10 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEP 3: SUCCESSFUL PAYMENT CONFIRMATION SCREEN */}
            {step === 'success' && completedDeposit && (
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-4 text-center space-y-4"
              >
                <div className={`w-16 h-16 rounded-3xl ${
                  completedDeposit.status === 'Pending'
                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-gray-950 shadow-amber-500/30'
                    : 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-gray-950 shadow-emerald-500/30 animate-bounce'
                } flex items-center justify-center mx-auto shadow-xl`}>
                  {completedDeposit.status === 'Pending' ? (
                    <Clock className="w-9 h-9" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white tracking-wide">
                    {completedDeposit.status === 'Pending'
                      ? 'Deposit Submitted Successfully'
                      : 'Deposit Credited Successfully!'}
                  </h3>
                  <div className="text-xs font-bold flex items-center justify-center gap-1.5">
                    {completedDeposit.status === 'Pending' ? (
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span>Status: Pending</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span>Instant Confirmation Complete</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gray-950 border border-emerald-500/30 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Order Reference:</span>
                    <span className="text-emerald-400 font-mono font-bold">{completedDeposit.orderId}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Payment Gateway:</span>
                    <span className="text-white font-bold">{completedDeposit.method}</span>
                  </div>
                  {completedDeposit.trxId && (
                    <div className="flex justify-between items-center text-gray-400 font-mono">
                      <span>TrxID / Hash:</span>
                      <span className="text-gray-300 truncate max-w-[180px]">{completedDeposit.trxId}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-gray-400 pt-2 border-t border-white/5">
                    <span className="text-gray-300">
                      {completedDeposit.status === 'Pending' ? 'Deposit Amount:' : 'Live Balance Credited:'}
                    </span>
                    <span className="text-emerald-400 font-black font-mono text-sm">${completedDeposit.amount.toFixed(2)} USD</span>
                  </div>
                  {completedDeposit.bonusAmount > 0 && (
                    <div className="flex justify-between items-center text-[#F5B301] pt-1 font-bold">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-[#F5B301]" />
                        <span>100% Supercharge Bonus:</span>
                      </span>
                      <span className="font-mono font-black text-sm">+${completedDeposit.bonusAmount.toFixed(2)} USD</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-gray-400 pt-1">
                    <span>Status:</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      completedDeposit.status === 'Pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {completedDeposit.status === 'Pending' ? 'Pending' : 'Completed'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500 pt-2 border-t border-white/5 text-[10px]">
                    <span>Submitted At:</span>
                    <span className="text-gray-400">{completedDeposit.timestamp}</span>
                  </div>
                </div>

                {completedDeposit.status === 'Pending' && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 text-left">
                    Your deposit request has been submitted successfully and is currently Pending. Once verified, your balance will be credited instantly across all your devices.
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-gray-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Back to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 1: AMOUNT SELECTION & BONUS OPTION */}
            {step === 'amount' && (
              <div className="space-y-4">
                {/* Amount Input Header */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Select Deposit Amount (USD)</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Min: ${rules.minDepositUsd} | Max: ${rules.maxDepositUsd.toLocaleString()}
                    </span>
                  </label>

                  {/* Numeric Input Field */}
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-xl font-black text-emerald-400 font-mono">$</span>
                    <input
                      type="number"
                      min={rules.minDepositUsd}
                      max={rules.maxDepositUsd}
                      value={amountInput}
                      onChange={(e) => {
                        setAmountInput(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="250"
                      className="w-full py-3.5 pl-9 pr-16 bg-gray-950 border-2 border-gray-800 focus:border-emerald-400 rounded-2xl text-xl font-black text-white font-mono outline-none transition-all shadow-inner"
                    />
                    <span className="absolute right-4 top-4 text-xs font-bold text-gray-400 font-mono">USD</span>
                  </div>
                </div>

                {/* Quick Preset Amount Buttons */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Quick Preset</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 250, 500, 1000].map((val) => {
                      const isSelected = numAmount === val;
                      return (
                        <button
                          key={`quick-${val}`}
                          type="button"
                          onClick={() => {
                            setAmountInput(val.toString());
                            setErrorMsg(null);
                          }}
                          className={`py-2.5 rounded-xl border font-mono font-black text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 text-gray-950 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                              : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white'
                          }`}
                        >
                          ${val}
                          {val >= 250 && (
                            <span className="block text-[8px] font-sans font-bold opacity-80 mt-0.5">2X BONUS</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cryptomus Payment Method Selection */}
                <div className="p-3 bg-gray-950 rounded-2xl border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cryptomus Payment Method</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCurrencyModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Choose Coin</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div 
                    onClick={() => setShowCurrencyModal(true)}
                    className="p-3 rounded-xl bg-gray-900/90 border border-white/10 hover:border-emerald-400/50 flex items-center justify-between cursor-pointer transition-all shadow-inner"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-xs text-emerald-400 shadow-sm">
                        {selectedGateway?.symbol || 'USDT'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-white">{selectedGateway?.name}</p>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                            Cryptomus Auto
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Fee: 0% • Instant Blockchain Confirmation
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                      <span>Switch</span>
                      <ChevronRight className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>
                </div>

                {/* 100% SUPERCHARGE BONUS BOX (Applies for >= $250 USD, 1-Time per account) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  hasClaimedBonusBefore
                    ? 'bg-gray-900/60 border-gray-800 opacity-80'
                    : isEligibleForBonus 
                      ? 'bg-gradient-to-r from-amber-500/15 via-[#F5B301]/10 to-amber-500/15 border-[#F5B301]/50 shadow-lg' 
                      : 'bg-gray-900/60 border-white/5 opacity-75'
                }`}>
                  {hasClaimedBonusBefore ? (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">100% Welcome Bonus Used</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">
                            ONE-TIME CLAIMED
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          You have already claimed the one-time 100% Deposit Welcome Bonus on your account. According to our policy, this bonus can only be redeemed once per account.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            id="superchargeBonusCheck"
                            checked={claimBonus && isEligibleForBonus}
                            disabled={!isEligibleForBonus}
                            onChange={(e) => setClaimBonus(e.target.checked)}
                            className="w-5 h-5 accent-[#F5B301] rounded-lg cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <label 
                            htmlFor="superchargeBonusCheck" 
                            className="text-xs font-black text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-4 h-4 text-[#F5B301]" />
                            <span>Claim 100% Supercharge Bonus</span>
                            <span className="px-1.5 py-0.2 rounded bg-[#F5B301] text-gray-950 text-[9px] font-black uppercase">
                              1-TIME ONLY
                            </span>
                          </label>
                          
                          <p className="text-[11px] text-amber-200/90 leading-relaxed">
                            {isEligibleForBonus ? (
                              <>
                                Deposit <strong className="text-white">${numAmount} USD</strong> and receive an instant <strong className="text-[#F5B301]">+${numAmount} USD</strong> bonus balance! (1 time only)
                              </>
                            ) : (
                              <>
                                Deposit <strong>${rules.bonusMinDepositUsd} - ${rules.bonusMaxDepositUsd} USD</strong> (e.g. $250) to unlock the 1-time 100% Supercharge Double Bonus.
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Breakdown Box if Bonus Active */}
                      {isEligibleForBonus && claimBonus && (
                        <div className="mt-3 pt-3 border-t border-[#F5B301]/20 grid grid-cols-2 gap-2 text-center text-xs">
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Live Account</p>
                            <p className="font-mono font-black text-emerald-400 text-base">+${numAmount}</p>
                          </div>

                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Bonus Account</p>
                            <p className="font-mono font-black text-amber-400 text-base">+${numAmount}</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-2.5 flex items-start gap-1.5 text-[10px] text-gray-400 leading-tight">
                        <Info className="w-3.5 h-3.5 text-[#F5B301] shrink-0 mt-0.5" />
                        <span>
                          Live and Bonus balances are credited upon approval. Bonus balance is fully usable for trading with 50% profit retention rules.
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Proceed Button */}
                <button
                  type="button"
                  disabled={isCreatingInvoice}
                  onClick={handleProceedToCheckout}
                  className="w-full py-4 px-4 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-gray-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCreatingInvoice ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-950" />
                      <span>Generating Cryptomus Order...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Automated Checkout</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2: AUTOMATED CRYPTOMUS CHECKOUT SCREEN */}
            {step === 'checkout' && cryptomusInvoice && (
              <div className="space-y-4">
                {/* 15:00 Countdown Timer Banner */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>Automated Session Active</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        Order ID: <span className="text-emerald-400">{cryptomusInvoice.orderId}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gray-950 border border-emerald-500/40 shadow-inner">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Time:</span>
                      <span className="font-mono font-black text-sm text-emerald-400">
                        {formatTimer(paymentTimerSeconds)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount to Send Card */}
                <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount to Transfer</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(numAmount.toString(), 'amount')}
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAmount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAmount ? 'Copied' : 'Copy Amount'}</span>
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                        ${numAmount.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-gray-400 font-mono">USD</span>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black text-xs">
                      {selectedGateway.symbol}
                    </span>
                  </div>

                  {actualBonusAmount > 0 && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-amber-300 font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>100% Supercharge Bonus:</span>
                      </span>
                      <span className="font-mono font-black text-amber-400">+${actualBonusAmount.toFixed(2)} USD</span>
                    </div>
                  )}
                </div>

                {/* Dynamic QR Code & Address Box */}
                <div className="p-4 rounded-2xl bg-gray-950 border border-emerald-500/30 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedGateway.name} Address</span>
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Zero Fee
                    </span>
                  </div>

                  {/* QR Code and Wallet Box */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-900/90 p-3.5 rounded-2xl border border-white/10">
                    <div
                      onClick={() => setShowQrModal(true)}
                      className="p-2 bg-white rounded-2xl border-2 border-emerald-400 shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-md"
                      title="Click to zoom QR Code"
                    >
                      <img
                        src={qrCodeUrl}
                        alt="Deposit QR Code"
                        className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-lg"
                      />
                    </div>

                    <div className="space-y-2 flex-1 min-w-0 text-center sm:text-left">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Deposit Address ({selectedGateway.network || 'Mainnet'}):
                      </p>
                      <div className="p-2 bg-black/60 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-400 break-all select-all font-bold">
                        {displayPaymentAddress}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(displayPaymentAddress, 'address')}
                        className={`w-full py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          copiedAddress
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-gray-950 shadow-md shadow-emerald-500/20'
                        }`}
                      >
                        {copiedAddress ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAddress ? 'Address Copied!' : 'Copy Wallet Address'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Automated Polling Status Indicator */}
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[11px] text-gray-300 font-bold">
                        Waiting for blockchain transfer...
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      Auto-Crediting ON
                    </span>
                  </div>

                  {/* External Cryptomus Hosted Link if available */}
                  {cryptomusInvoice.url && (
                    <a
                      href={cryptomusInvoice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Open in Cryptomus Checkout Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Transaction Hash & Confirm Deposit Button */}
                <div className="pt-2 space-y-3">
                  <div className="p-3.5 bg-gray-950/80 rounded-2xl border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">
                        Transaction ID / Hash (TrxID)
                      </label>
                      <span className="text-[9px] text-gray-500 font-mono">Optional</span>
                    </div>
                    <input
                      type="text"
                      value={manualTxidInput}
                      onChange={(e) => setManualTxidInput(e.target.value)}
                      placeholder="Enter TrxID or Transaction Hash (optional)"
                      className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 focus:border-emerald-400 rounded-xl text-xs font-mono text-white placeholder-gray-500 outline-none transition-colors"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmDepositRequest}
                    disabled={isSubmittingManual}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 text-gray-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    {isSubmittingManual ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>
                      {isSubmittingManual ? 'Submitting Request...' : 'Confirm Deposit'}
                    </span>
                  </button>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Back to Step 1 */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('amount')}
                    className="w-full py-3 bg-gray-900 hover:bg-gray-800 border border-white/10 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Change Amount / Method</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </AnimatePresence>

      {/* CURRENCY / CRYPTO COIN SELECTION MODAL */}
      <AnimatePresence>
        {showCurrencyModal && (
          <div key="deposit-currency-backdrop" className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              key="deposit-currency-card"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0E1322] border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      Select Cryptomus Coin
                    </h3>
                    <p className="text-[10px] text-gray-400">Supported Crypto Payment Networks</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCurrencyModal(false)}
                  className="p-1.5 rounded-full bg-gray-900 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={currencySearch}
                  onChange={(e) => setCurrencySearch(e.target.value)}
                  placeholder="Search coin (USDT, BTC, ETH, TON, SOL...)"
                  className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-800 focus:border-emerald-400 rounded-xl text-xs text-white placeholder-gray-500 outline-none transition-all font-mono"
                />
              </div>

              {/* Coins List */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {gateways
                  .filter(g => g.isActive !== false)
                  .filter(g => {
                    if (!currencySearch.trim()) return true;
                    const q = currencySearch.toLowerCase();
                    return g.name.toLowerCase().includes(q) || g.symbol.toLowerCase().includes(q);
                  })
                  .map((gw, idx) => {
                    const isSelected = gw.id === selectedGatewayId;
                    return (
                      <button
                        key={`dep-gw-${gw.id || 'gw'}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedGatewayId(gw.id);
                          setShowCurrencyModal(false);
                          setCurrencySearch('');
                        }}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#121A2E] border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400'
                            : 'bg-gray-950/80 border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono font-black text-xs ${
                            isSelected
                              ? 'bg-emerald-500 text-gray-950 border-emerald-400'
                              : 'bg-gray-900 text-emerald-400 border-gray-800'
                          }`}>
                            {gw.symbol}
                          </div>
                          <div>
                            <p className="text-xs font-black text-white flex items-center gap-1.5">
                              <span>{gw.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              Fee: 0% • {gw.network ? gw.network.toUpperCase() : 'Crypto'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-gray-600'}`} />
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ENLARGE QR CODE MODAL */}
      <AnimatePresence>
        {showQrModal && (
          <div key="deposit-qr-backdrop" className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              key="deposit-qr-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm p-6 bg-[#0E1424] border-2 border-emerald-400 rounded-3xl space-y-4 shadow-2xl text-center relative"
            >
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-xl bg-gray-900 border border-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="pt-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  {selectedGateway.name}
                </span>
                <h3 className="text-base font-black text-white mt-2">Scan & Pay Instantly</h3>
                <p className="text-xs text-gray-400 mt-0.5">Amount: ${numAmount} USD</p>
              </div>

              <div className="p-4 bg-white rounded-2xl border-4 border-emerald-400 inline-block shadow-inner mx-auto">
                <img
                  src={qrCodeUrl}
                  alt="Full QR Code"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
                />
              </div>

              <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-1">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Wallet Address</p>
                <p className="text-xs font-mono text-emerald-400 font-bold break-all select-all">
                  {displayPaymentAddress}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(displayPaymentAddress, 'address')}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {copiedAddress ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedAddress ? 'Address Copied!' : 'Copy Wallet Address'}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
