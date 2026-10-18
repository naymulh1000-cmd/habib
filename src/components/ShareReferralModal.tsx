import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Gift, 
  Sparkles, 
  DollarSign, 
  CheckCircle2, 
  ExternalLink,
  MessageCircle,
  Send,
  Mail,
  Smartphone,
  Users
} from 'lucide-react';

interface ShareReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralCode: string;
  referralLink: string;
  onOpenMyReferrals?: () => void;
  referralCount?: number;
}

export const ShareReferralModal: React.FC<ShareReferralModalProps> = ({
  isOpen,
  onClose,
  referralCode,
  referralLink,
  onOpenMyReferrals,
  referralCount
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const effectiveLink = referralLink || `https://fxby24.com/?ref=${referralCode}`;
  const shareText = `Start trading on Forex Trade Pro! Create an account with my referral link and get a bonus when you deposit $250 or more: ${effectiveLink}`;
  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(effectiveLink);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(effectiveLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      try {
        const input = document.createElement('input');
        input.value = effectiveLink;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (_) {}
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Forex Trade Pro Referral',
          text: shareText,
          url: effectiveLink
        });
      } catch (_) {}
    } else {
      handleCopy();
    }
  };

  const shareChannels = [
    {
      name: 'WhatsApp',
      color: 'bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400',
      iconColor: 'bg-emerald-500 text-gray-950',
      action: () => window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank')
    },
    {
      name: 'Facebook',
      color: 'bg-blue-600/15 border-blue-600/30 hover:bg-blue-600/25 text-blue-400',
      iconColor: 'bg-blue-600 text-white',
      action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`, '_blank')
    },
    {
      name: 'Messenger',
      color: 'bg-sky-500/15 border-sky-500/30 hover:bg-sky-500/25 text-sky-400',
      iconColor: 'bg-gradient-to-r from-blue-500 to-pink-500 text-white',
      action: () => {
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          window.open(`fb-messenger://share/?link=${encodedUrl}`, '_blank');
        } else {
          window.open(`https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=291494419107518&redirect_uri=${encodedUrl}`, '_blank');
        }
      }
    },
    {
      name: 'Telegram',
      color: 'bg-cyan-500/15 border-cyan-500/30 hover:bg-cyan-500/25 text-cyan-400',
      iconColor: 'bg-cyan-500 text-gray-950',
      action: () => window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank')
    },
    {
      name: 'Gmail',
      color: 'bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/25 text-rose-400',
      iconColor: 'bg-rose-500 text-white',
      action: () => window.open(`mailto:?subject=${encodeURIComponent('Join Forex Trade Pro - Get Trading Bonus')}&body=${encodedText}`, '_blank')
    }
  ];

  return (
    <AnimatePresence>
      <div 
        id="share-referral-backdrop" 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="share-referral-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-[#0E1322] border border-[#F5B301]/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#080B14]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#F5B301] to-amber-600 flex items-center justify-center text-gray-950 shadow-md shadow-[#F5B301]/20">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>Refer Friends & Earn $25</span>
                  <Sparkles className="w-3.5 h-3.5 text-[#F5B301]" />
                </h3>
                <p className="text-[10px] text-gray-400">Share your unique referral link</p>
              </div>
            </div>
            <button
              id="close-share-referral-btn"
              onClick={onClose}
              className="p-1.5 rounded-full bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto">
            {/* Promo Card Highlight */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#F5B301]/5 to-transparent border border-[#F5B301]/20 text-center space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F5B301]/20 border border-[#F5B301]/30 text-[#F5B301] text-[10px] font-black uppercase tracking-wider">
                <DollarSign className="w-3 h-3" /> $25 Referral Reward
              </span>
              <h4 className="text-xs font-bold text-white mt-1">
                Invite friends and earn an instant bonus on their first deposit!
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                When a friend signs up using your link and makes their first deposit of <strong className="text-amber-300">$250 or more</strong>, you receive <strong className="text-[#F5B301]">$25.00 in your Bonus Wallet</strong>.
              </p>
            </div>

            {/* Referral Code & Link Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400 font-medium">Your Referral ID:</span>
                <span className="font-mono font-black text-[#F5B301] px-2 py-0.5 rounded bg-[#F5B301]/10 border border-[#F5B301]/30">
                  {referralCode}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-gray-950/80 border border-white/10">
                <input
                  type="text"
                  readOnly
                  value={effectiveLink}
                  className="flex-1 bg-transparent text-xs text-gray-200 font-mono focus:outline-none select-all truncate"
                />
                <button
                  id="modal-copy-link-action-btn"
                  type="button"
                  onClick={handleCopy}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied 
                      ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20' 
                      : 'bg-[#F5B301] hover:brightness-110 text-gray-950 shadow-md shadow-[#F5B301]/20 active:scale-95'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              {/* My Total Referrals Action Button */}
              {onOpenMyReferrals && (
                <button
                  id="modal-open-my-referrals-btn"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMyReferrals();
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#F5B301]/15 to-amber-500/10 hover:from-[#F5B301]/25 hover:to-amber-500/20 border border-[#F5B301]/40 text-[#F5B301] font-black text-xs flex items-center justify-between transition-all cursor-pointer shadow-md shadow-[#F5B301]/10 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#F5B301] text-gray-950 flex items-center justify-center shadow-sm">
                      <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                    <span>My Total Referrals</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {typeof referralCount === 'number' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#F5B301] text-gray-950 text-[10px] font-black">
                        {referralCount}
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-white/70">View &rarr;</span>
                  </div>
                </button>
              )}
            </div>

            {/* Social Share Grid */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Direct Share
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {shareChannels.map((channel) => (
                  <button
                    key={channel.name}
                    id={`share-${channel.name.toLowerCase()}-btn`}
                    type="button"
                    onClick={channel.action}
                    className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${channel.color}`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-sm ${channel.iconColor}`}>
                      {channel.name === 'WhatsApp' && <MessageCircle className="w-4 h-4" />}
                      {channel.name === 'Facebook' && <span className="font-serif font-black">f</span>}
                      {channel.name === 'Messenger' && <Send className="w-3.5 h-3.5" />}
                      {channel.name === 'Telegram' && <Send className="w-3.5 h-3.5" />}
                      {channel.name === 'Gmail' && <Mail className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-xs font-bold">{channel.name}</span>
                  </button>
                ))}

                {/* Native Share button */}
                <button
                  id="share-native-mobile-btn"
                  type="button"
                  onClick={handleNativeShare}
                  className="p-2.5 rounded-2xl border border-white/10 bg-gray-900/80 hover:bg-white/5 text-gray-200 flex items-center gap-2.5 transition-all cursor-pointer col-span-2 sm:col-span-1"
                >
                  <div className="w-7 h-7 rounded-xl bg-gray-800 text-[#F5B301] flex items-center justify-center shrink-0 shadow-sm">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold">More Apps</span>
                </button>
              </div>
            </div>

            {/* Terms / Rules Note */}
            <div className="p-3 rounded-xl bg-gray-900/60 border border-white/5 text-[10px] text-gray-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-gray-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Referral Bonus Terms:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-gray-400">
                <li>Bonus is eligible only on the user's first approved deposit (min $250).</li>
                <li>Bonus is credited directly to your <strong>Bonus Wallet</strong>.</li>
                <li>Bonus is not credited upon signup; it triggers automatically once deposit is confirmed.</li>
                <li>Duplicate or fraudulent bonuses are automatically filtered and blocked.</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-white/10 bg-[#080B14] flex items-center justify-between">
            <button
              id="footer-share-copy-btn"
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-white/10"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>

            <button
              id="footer-share-close-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-xs cursor-pointer border border-white/10"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
