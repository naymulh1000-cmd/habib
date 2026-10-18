import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  Upload, 
  Check, 
  User, 
  Sparkles, 
  AlertCircle, 
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { 
  LEADERBOARD_DEFAULT_AVATARS, 
  validateAvatarFile, 
  compressAndResizeAvatar, 
  saveUserAvatar 
} from '../lib/avatarService';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  userUid: string;
  displayName?: string;
  email?: string;
  onAvatarUpdated: (newAvatar: string) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatar,
  userUid,
  displayName,
  email,
  onAvatarUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'default' | 'upload'>('default');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectDefault = (url: string) => {
    setSelectedAvatar(url);
    setErrorMessage(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file format.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsCompressing(true);
      setUploadedFileName(file.name);
      const compressedDataUrl = await compressAndResizeAvatar(file, 320, 320, 0.85);
      setSelectedAvatar(compressedDataUrl);
    } catch (err) {
      console.error('Error compressing image:', err);
      setErrorMessage('Failed to process image. Please choose another file.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!selectedAvatar) {
      setErrorMessage('Please select or upload an avatar.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await saveUserAvatar(userUid, selectedAvatar);
      onAvatarUpdated(selectedAvatar);
      onClose();
    } catch (err) {
      console.error('Failed to save avatar:', err);
      setErrorMessage('Failed to save avatar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const userInitial = displayName?.[0]?.toUpperCase() || email?.[0]?.toUpperCase() || 'U';

  return (
    <AnimatePresence>
      <div 
        id="avatar-picker-overlay"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          id="avatar-picker-modal"
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full max-w-lg bg-[#0F1423] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#0B101D]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F5B301]/20 border border-[#F5B301]/40 flex items-center justify-center text-[#F5B301]">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">Change Profile Avatar</h3>
                <p className="text-[11px] text-gray-400">Select a default avatar or upload from gallery</p>
              </div>
            </div>
            <button
              id="avatar-picker-close-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            {/* Live Preview Container */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#0B101D] border border-white/5">
              <div className="relative w-16 h-16 rounded-2xl bg-[#F5B301]/20 border-2 border-[#F5B301] flex items-center justify-center text-[#F5B301] font-black text-2xl overflow-hidden flex-shrink-0 shadow-lg">
                {selectedAvatar ? (
                  <img
                    src={selectedAvatar}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
                {isCompressing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-[#F5B301] animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white truncate">{displayName || email?.split('@')[0] || 'User'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#F5B301]/15 text-[#F5B301] text-[10px] font-bold">
                    Active Preview
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                  {selectedAvatar ? 'Avatar selected & ready to save' : 'Using default initials'}
                </p>
                {uploadedFileName && activeTab === 'upload' && (
                  <p className="text-[10px] text-emerald-400 font-mono mt-0.5 truncate">
                    ✓ {uploadedFileName}
                  </p>
                )}
              </div>
            </div>

            {/* Tab Selection */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#0B101D] border border-white/5">
              <button
                id="avatar-tab-default"
                type="button"
                onClick={() => {
                  setActiveTab('default');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'default'
                    ? 'bg-[#F5B301] text-gray-950 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Choose Default Avatar</span>
              </button>

              <button
                id="avatar-tab-upload"
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  setErrorMessage(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-[#F5B301] text-gray-950 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload from Gallery</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: Default Avatars Grid */}
            {activeTab === 'default' && (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-400 font-medium">
                  Select an avatar from the official leaderboard roster:
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-56 overflow-y-auto p-1 pr-2">
                  {LEADERBOARD_DEFAULT_AVATARS.map((url, idx) => {
                    const isSelected = selectedAvatar === url;
                    return (
                      <button
                        key={`default-avatar-${idx}`}
                        id={`default-avatar-btn-${idx}`}
                        type="button"
                        onClick={() => handleSelectDefault(url)}
                        className={`relative aspect-square rounded-2xl overflow-hidden transition-all group cursor-pointer border-2 ${
                          isSelected
                            ? 'border-[#F5B301] scale-105 shadow-lg shadow-[#F5B301]/25 ring-2 ring-[#F5B301]/40'
                            : 'border-white/10 hover:border-white/40 hover:scale-102'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Avatar option ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:brightness-110 transition-all"
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F5B301] text-gray-950 flex items-center justify-center shadow-md">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Upload from Gallery */}
            {activeTab === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  id="avatar-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div
                  id="avatar-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-white/20 hover:border-[#F5B301]/60 bg-[#0B101D]/70 hover:bg-[#0B101D] flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#F5B301]/10 group-hover:bg-[#F5B301]/20 border border-[#F5B301]/30 flex items-center justify-center text-[#F5B301] transition-colors">
                    {isCompressing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ImageIcon className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-[#F5B301] transition-colors">
                      {isCompressing ? 'Compressing image...' : 'Click to select photo from gallery'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Supports JPG, PNG, and WebP (auto-optimized & compressed)
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/60 border border-white/5 text-[11px] text-gray-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-300 font-semibold">
                    <Sparkles className="w-3.5 h-3.5 text-[#F5B301]" />
                    <span>Instant Smart Compression</span>
                  </div>
                  <p>
                    High-resolution photos are automatically compressed on-device to ensure instant loading without quality loss.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0B101D] flex items-center gap-3">
            <button
              id="avatar-picker-cancel-btn"
              type="button"
              onClick={onClose}
              disabled={isSaving || isCompressing}
              className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              id="avatar-picker-save-btn"
              type="button"
              onClick={handleSave}
              disabled={isSaving || isCompressing || !selectedAvatar}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F5B301] to-amber-400 hover:brightness-110 active:scale-[0.98] text-gray-950 text-xs font-black transition-all shadow-lg shadow-[#F5B301]/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Save Avatar</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
