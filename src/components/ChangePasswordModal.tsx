import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, X, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import { auth } from '../lib/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userEmail
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate inputs
    if (!oldPassword.trim()) {
      setError('Please enter your current (old) password.');
      return;
    }

    if (!newPassword.trim()) {
      setError('Please enter your new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (!confirmPassword.trim()) {
      setError('Please confirm your new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and Confirm password do not match.');
      return;
    }

    if (oldPassword === newPassword) {
      setError('New password must be different from your old password.');
      return;
    }

    const currentUser = auth.currentUser;
    const emailToUse = currentUser?.email || userEmail;

    if (!currentUser || !emailToUse) {
      setError('Active user session not found. Please log in again.');
      return;
    }

    setLoading(true);

    try {
      // 1. Re-authenticate user with old password
      const credential = EmailAuthProvider.credential(emailToUse, oldPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Update to new password via Firebase Authentication
      await updatePassword(currentUser, newPassword);

      setSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Auto close after showing success message
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      const errCode = err?.code || '';
      if (
        errCode !== 'auth/wrong-password' &&
        errCode !== 'auth/invalid-credential' &&
        errCode !== 'auth/invalid-login-credentials'
      ) {
        console.warn('Password change notice:', errCode);
      }
      let errorMsg = 'Failed to update password. Please verify your old password and try again.';

      if (
        errCode === 'auth/wrong-password' ||
        errCode === 'auth/invalid-credential' ||
        errCode === 'auth/invalid-login-credentials'
      ) {
        errorMsg = 'Incorrect old password. Please enter your current password accurately.';
      } else if (errCode === 'auth/weak-password') {
        errorMsg = 'New password is too weak. Please use at least 6 characters.';
      } else if (errCode === 'auth/requires-recent-login') {
        errorMsg = 'Security timeout. Please re-login to update your password.';
      } else if (errCode === 'auth/too-many-requests') {
        errorMsg = 'Too many failed attempts. Please wait a moment and try again.';
      } else if (errCode === 'auth/network-request-failed') {
        errorMsg = 'Network connection issue. Please check your internet connection.';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        key="change-password-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          key="change-password-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#0D1222] border border-[#F5B301]/30 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-4 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#F5B301]/10 border border-[#F5B301]/30 flex items-center justify-center text-[#F5B301] shadow-inner">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Change Password
                </h3>
                <p className="text-[11px] text-gray-400">
                  Update your Forex Trade Pro login password
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl bg-gray-900 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Success Message Banner */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-500/10"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold">{success}</span>
            </motion.div>
          )}

          {/* Error Message Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 shadow-lg shadow-rose-500/10"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </motion.div>
          )}

          {/* Password Update Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* 1. Old Password */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Old Password <span className="text-[#F5B301]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={loading || !!success}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-950/90 border border-gray-800 focus:border-[#F5B301] rounded-xl text-xs text-white placeholder-gray-500 outline-none transition-all focus:ring-1 focus:ring-[#F5B301]/50 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showOldPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 2. New Password */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                New Password <span className="text-[#F5B301]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={loading || !!success}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-950/90 border border-gray-800 focus:border-[#F5B301] rounded-xl text-xs text-white placeholder-gray-500 outline-none transition-all focus:ring-1 focus:ring-[#F5B301]/50 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 pl-1">
                Must be at least 6 characters in length.
              </p>
            </div>

            {/* 3. Confirm New Password */}
            <div>
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
                Confirm New Password <span className="text-[#F5B301]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  disabled={loading || !!success}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-950/90 border border-gray-800 focus:border-[#F5B301] rounded-xl text-xs text-white placeholder-gray-500 outline-none transition-all focus:ring-1 focus:ring-[#F5B301]/50 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-gray-900 hover:bg-gray-800 border border-white/10 text-gray-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !!success}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#F5B301] to-amber-500 hover:brightness-110 text-gray-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#F5B301]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-gray-950" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-gray-950" />
                    <span>Confirm / Update</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
