import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Upload, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  Sparkles,
  Camera,
  Lock,
  Clock
} from 'lucide-react';
import { submitKycVerification, getStoredKycRequests } from '../lib/kycSync';
import { compressImageFile } from '../lib/depositSync';
import { UserProfile } from '../types';

interface KYCModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: {
    uid: string;
    email: string;
    fullName?: string;
  };
  currentKycStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  onSuccessSubmitted: () => void;
}

export const KYCModal: React.FC<KYCModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  currentKycStatus = 'unverified',
  onSuccessSubmitted
}) => {
  const [fullName, setFullName] = useState<string>(
    userProfile.fullName || userProfile.email.split('@')[0].toUpperCase() || ''
  );
  const [nidNumber, setNidNumber] = useState<string>('');
  const [nidFront, setNidFront] = useState<string | null>(null);
  const [nidBack, setNidBack] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Preload existing request if available
  React.useEffect(() => {
    if (isOpen && userProfile.uid) {
      const stored = getStoredKycRequests();
      const existing = stored.find(r => r.userUid === userProfile.uid);
      if (existing) {
        if (existing.userName) setFullName(existing.userName);
        if (existing.nidNumber) setNidNumber(existing.nidNumber);
        if (existing.nidFrontUrl) setNidFront(existing.nidFrontUrl);
        if (existing.nidBackUrl) setNidBack(existing.nidBackUrl);
      }
    }
  }, [isOpen, userProfile.uid]);

  if (!isOpen) return null;

  // Handle Image File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size must be under 15MB.');
      return;
    }

    try {
      const compressedDataUrl = await compressImageFile(file, 900, 900, 0.8);
      if (side === 'front') {
        setNidFront(compressedDataUrl);
      } else {
        setNidBack(compressedDataUrl);
      }
      setErrorMessage('');
    } catch (_) {
      const reader = new FileReader();
      reader.onload = () => {
        if (side === 'front') {
          setNidFront(reader.result as string);
        } else {
          setNidBack(reader.result as string);
        }
        setErrorMessage('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Sample NID Auto-Filler for Instant Testing
  const handleFillSample = () => {
    setFullName(userProfile.fullName || 'Sarah Jenkins');
    setNidNumber('1994829102841');
    setNidFront('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80');
    setNidBack('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=600&q=80');
    setErrorMessage('');
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full legal name as shown on NID.');
      return;
    }
    if (!nidNumber.trim() || nidNumber.trim().length < 5) {
      setErrorMessage('Please enter a valid National ID (NID) number (minimum 5 digits).');
      return;
    }
    if (!nidFront) {
      setErrorMessage('Please upload the Front image of your NID Card.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await submitKycVerification({
        userUid: userProfile.uid,
        userEmail: userProfile.email,
        userName: fullName.trim(),
        nidNumber: nidNumber.trim(),
        nidFrontUrl: nidFront,
        nidBackUrl: nidBack || undefined
      });

      setIsSubmitting(false);
      onSuccessSubmitted();
      onClose();
    } catch (err: any) {
      console.error('KYC Submission error:', err);
      setIsSubmitting(false);
      setErrorMessage('Failed to submit verification. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      <div key="kyc-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          key="kyc-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#0E1322] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-5 border-b border-white/10 bg-[#080B14]">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl border ${
                currentKycStatus === 'verified'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-[#F5B301]/10 border-[#F5B301]/30 text-[#F5B301]'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Identity Verification (KYC)</h3>
                <p className="text-[11px] text-gray-400">
                  {currentKycStatus === 'verified' 
                    ? 'Account Permanently Verified' 
                    : 'Submit NID document for instant Firebase & automated review'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* If already permanently verified */}
          {currentKycStatus === 'verified' ? (
            <div className="p-6 space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8 fill-emerald-400/20" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-white">Identity Verified Permanently</h4>
                <p className="text-xs text-gray-400">
                  Your account identity has been verified with official NID records and compliance check.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#080B14] border border-white/10 text-left space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-gray-400">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Permanent Verified
                  </span>
                </div>
                {nidNumber && (
                  <div className="flex items-center justify-between text-gray-400">
                    <span>NID Number:</span>
                    <span className="text-white font-bold tracking-wider">{nidNumber}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-gray-400">
                  <span>User UID:</span>
                  <span className="text-amber-300 font-bold">{userProfile.uid}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Close Window
              </button>
            </div>
          ) : (
            /* Body / Form */
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Quick Sample Filler */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#131B2E] border border-white/5">
                <span className="text-gray-400 text-[11px]">Testing or fast demo setup?</span>
                <button
                  type="button"
                  onClick={handleFillSample}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#F5B301]" />
                  <span>Fill Sample NID</span>
                </button>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                  Full Name (As per NID) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. MAHMUDUR RAHMAN"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B14] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5B301] transition-all font-mono text-xs"
                  required
                />
              </div>

              {/* NID Number */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">
                  NID / National ID Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={nidNumber}
                  onChange={(e) => setNidNumber(e.target.value)}
                  placeholder="e.g. 1994829102841"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#080B14] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5B301] transition-all font-mono text-xs"
                  required
                />
              </div>

              {/* Document Upload Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* NID Front */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    NID Front Photo <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative group border-2 border-dashed border-white/15 hover:border-[#F5B301]/50 rounded-xl bg-[#080B14] p-3 text-center transition-all cursor-pointer min-h-[110px] flex flex-col items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'front')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {nidFront ? (
                      <div className="relative w-full h-20 rounded-lg overflow-hidden group">
                        <img src={nidFront} alt="NID Front" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-300 font-bold text-[10px]">
                          Click to Change
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="w-8 h-8 mx-auto rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#F5B301]">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-300">Upload Front Side</p>
                        <p className="text-[9px] text-gray-500">JPG, PNG (Max 15MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* NID Back */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    NID Back Photo <span className="text-gray-400">(Recommended)</span>
                  </label>
                  <div className="relative group border-2 border-dashed border-white/15 hover:border-[#F5B301]/50 rounded-xl bg-[#080B14] p-3 text-center transition-all cursor-pointer min-h-[110px] flex flex-col items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'back')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {nidBack ? (
                      <div className="relative w-full h-20 rounded-lg overflow-hidden group">
                        <img src={nidBack} alt="NID Back" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-300 font-bold text-[10px]">
                          Click to Change
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="w-8 h-8 mx-auto rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#F5B301]">
                          <Upload className="w-4 h-4" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-300">Upload Back Side</p>
                        <p className="text-[9px] text-gray-500">JPG, PNG (Max 15MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Automated System Info Notice */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[10.5px] text-amber-200/90 space-y-1">
                <p className="font-extrabold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#F5B301]" />
                  <span>Instant Firebase Save & 1–2 Min Automated Verification:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-300 pl-0.5">
                  <li>On clicking "Submit Verification", documents save immediately to Firebase Firestore and appear in Admin Panel.</li>
                  <li>System automatically verifies valid NID submissions within <strong>1–2 minutes</strong>.</li>
                  <li>Once verified, your status remains <strong className="text-emerald-400">Permanently Verified</strong>.</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 border border-white/10 hover:bg-white/5 text-gray-300 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#F5B301] hover:brightness-110 text-gray-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-[#F5B301]/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Submitting to Firebase...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Verification</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
