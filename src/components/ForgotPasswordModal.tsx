import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, X, CheckCircle, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { sendPasswordResetEmail, auth } from '../lib/firebase';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = ''
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setMessage({
        type: 'success',
        text: 'Password reset link sent! Check your inbox to set a new password.'
      });
    } catch (err: any) {
      const errCode = err?.code || '';
      if (errCode !== 'auth/user-not-found' && errCode !== 'auth/invalid-credential') {
        console.warn('Password reset notice:', errCode);
      }
      let errorMsg = 'Failed to send reset link. Please verify your email.';
      if (errCode === 'auth/user-not-found' || errCode === 'auth/invalid-credential' || errCode === 'auth/invalid-login-credentials') {
        errorMsg = 'No account found with this email address. Please register a new account.';
      } else if (errCode === 'auth/invalid-email') {
        errorMsg = 'Invalid email address format.';
      } else if (errCode === 'auth/too-many-requests') {
        errorMsg = 'Too many attempts. Please try again in a few minutes.';
      }
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div key="forgot-pw-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          key="forgot-pw-card"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md p-6 bg-[#0E1424] border border-[#F5B301]/30 rounded-2xl shadow-2xl shadow-[#F5B301]/10 text-white"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#F5B301]/10 border border-[#F5B301]/30 rounded-xl text-[#F5B301]">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Reset Password</h3>
              <p className="text-xs text-gray-400">Forex Trade Pro Account Security</p>
            </div>
          </div>

          <p className="text-sm text-gray-300 mb-5">
            Enter the email address registered with your Forex Trade Pro account and we will send you a password reset link.
          </p>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 mb-4 rounded-xl text-xs flex items-start gap-2 border ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900/80 border border-gray-700/80 focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] rounded-xl text-sm text-white placeholder-gray-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#F5B301] to-[#d99d00] hover:from-[#f6bb1a] hover:to-[#e0a400] text-gray-950 font-semibold rounded-xl text-sm shadow-md shadow-[#F5B301]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Link</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
