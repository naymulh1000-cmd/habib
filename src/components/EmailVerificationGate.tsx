import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, CheckCircle2, RefreshCw, LogOut, ShieldAlert, AlertCircle, Loader2, Send } from 'lucide-react';
import { User as FirebaseUser, sendEmailVerification, signOut, auth } from '../lib/firebase';
import { BackgroundGlow } from './BackgroundGlow';
import { BrandLogo } from './BrandLogo';

interface EmailVerificationGateProps {
  user: FirebaseUser;
  onVerified: () => void;
  onLogout: () => void;
}

export const EmailVerificationGate: React.FC<EmailVerificationGateProps> = ({
  user,
  onVerified,
  onLogout
}) => {
  const [loadingResend, setLoadingResend] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleResendEmail = async () => {
    setMessage(null);
    setLoadingResend(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setMessage({
          type: 'success',
          text: `Verification email sent successfully to ${user.email}. Please check your inbox or spam folder.`
        });
      } else {
        setMessage({
          type: 'error',
          text: 'User session not found. Please sign in again.'
        });
      }
    } catch (err: any) {
      console.error('Error sending email verification:', err);
      if (err?.code === 'auth/too-many-requests') {
        setMessage({
          type: 'error',
          text: 'Too many requests sent. Please wait a few moments before requesting another email.'
        });
      } else {
        setMessage({
          type: 'error',
          text: err?.message || 'Failed to resend verification email. Please try again.'
        });
      }
    } finally {
      setLoadingResend(false);
    }
  };

  const handleCheckStatus = async () => {
    setMessage(null);
    setLoadingCheck(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setMessage({
            type: 'success',
            text: 'Your email has been successfully verified! Unlocking trading terminal...'
          });
          setTimeout(() => {
            onVerified();
          }, 800);
        } else {
          setMessage({
            type: 'info',
            text: 'Email not verified yet. Please click the link sent to your email address and click "Check verification status" again.'
          });
        }
      }
    } catch (err: any) {
      console.error('Error reloading user status:', err);
      setMessage({
        type: 'error',
        text: 'Failed to verify status. Please try again.'
      });
    } finally {
      setLoadingCheck(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] w-full flex items-center justify-center p-4 z-10">
      <BackgroundGlow />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg bg-[#101522]/95 backdrop-blur-2xl border border-[#F5B301]/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 flex flex-col items-center text-center overflow-hidden"
      >
        {/* Glow Accent Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#F5B301] via-[#15eaff] to-[#F5B301]" />

        {/* Header Icon & Brand Badge */}
        <div className="mb-4">
          <BrandLogo size="lg" layout="vertical" subtext="SECURITY VERIFICATION GATE" />
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5B301]/20 to-[#15eaff]/20 border border-[#F5B301]/50 flex items-center justify-center mb-4 shadow-lg shadow-[#F5B301]/10">
          <Mail className="w-8 h-8 text-[#F5B301] animate-pulse" />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-1">
          Verify Your Forex Trade Pro Account
        </h2>
        <p className="text-xs text-gray-400 mb-2">Sender: <span className="text-gray-200 font-semibold">Forex Trade Pro</span> &bull; Subject: <span className="text-gray-200 font-semibold">Verify Your Forex Trade Pro Account</span></p>

        {/* Primary Required Banner Message */}
        <div className="w-full my-2.5 p-3.5 rounded-2xl bg-[#F5B301]/10 border border-[#F5B301]/30 text-[#F5B301] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md">
          <ShieldAlert className="w-4 h-4 shrink-0 text-[#F5B301]" />
          <span>A verification email has been sent. Please verify before login.</span>
        </div>

        {/* Detailed Explanation */}
        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4 max-w-md">
          We have sent a verification link to <strong className="text-white font-mono">{user.email}</strong>. Please check your email inbox (and spam folder) and click the link to activate your trading account.
        </p>

        {/* Feedback Alert Banner */}
        <AnimatePresence mode="wait">
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`w-full mb-4 p-3.5 rounded-xl border text-xs text-left flex items-start gap-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : message.type === 'error'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : message.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
              )}
              <span className="leading-snug">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="w-full space-y-3 my-2">
          {/* Button 1: Resend verification email */}
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={loadingResend || loadingCheck}
            className="w-full py-3 px-5 bg-gradient-to-r from-[#F5B301] to-[#ffd700] hover:from-[#ffe033] hover:to-[#F5B301] text-gray-950 font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#F5B301]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingResend ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gray-950" />
                <span>Sending Email...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-gray-950" />
                <span>Resend verification email</span>
              </>
            )}
          </button>

          {/* Button 2: Check verification status */}
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={loadingResend || loadingCheck}
            className="w-full py-3 px-5 bg-gray-900/90 hover:bg-gray-800 border border-cyan-500/40 text-cyan-300 hover:text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {loadingCheck ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Checking Status...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>Check verification status</span>
              </>
            )}
          </button>
        </div>

        {/* Access Restricted Notice */}
        <div className="w-full mt-4 pt-4 border-t border-white/10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Dashboard, Deposit, Withdraw & Trading access are locked until verified.</span>
          </div>

          {/* Logout / Switch Account Option */}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors cursor-pointer pt-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Use Another Account</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
