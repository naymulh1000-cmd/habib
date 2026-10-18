import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Clock, 
  ExternalLink, 
  ShieldCheck, 
  Copy, 
  Check, 
  Send,
  MessageCircle,
  PhoneCall
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useHelplineConfig, formatHelplineUrl } from '../lib/helplineConfig';

interface HelpLineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpLineModal: React.FC<HelpLineModalProps> = ({ isOpen, onClose }) => {
  const helpline = useHelplineConfig();
  const [copiedTelegram, setCopiedTelegram] = useState(false);
  const [copiedGmail, setCopiedGmail] = useState(false);

  if (!isOpen) return null;

  // Resolve links dynamically from state / admin config
  const rawTelegram = helpline.telegramUrl || 'https://t.me/ftpsupport24';
  const rawGmail = helpline.gmailUrl || 'forextradepro24@gmail.com';
  
  const telegramHref = formatHelplineUrl(rawTelegram, 'telegram');
  const gmailHref = formatHelplineUrl(rawGmail, 'email');
  const hotlineHref = helpline.hotlinePhone ? formatHelplineUrl(helpline.hotlinePhone, 'phone') : '';
  const whatsappHref = helpline.whatsappUrl ? formatHelplineUrl(helpline.whatsappUrl, 'whatsapp') : '';
  const customHref = helpline.customLinkUrl ? formatHelplineUrl(helpline.customLinkUrl, 'generic') : '';

  const cleanTelegramUsername = rawTelegram.replace(/^https?:\/\/(www\.)?t\.me\//i, '').replace(/^@/, '') || 'ftpsupport24';
  const cleanGmailAddress = rawGmail.replace(/^mailto:/i, '') || 'forextradepro24@gmail.com';

  const handleCopyTelegram = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`@${cleanTelegramUsername}`);
    setCopiedTelegram(true);
    setTimeout(() => setCopiedTelegram(false), 2000);
  };

  const handleCopyGmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(cleanGmailAddress);
    setCopiedGmail(true);
    setTimeout(() => setCopiedGmail(false), 2000);
  };

  return (
    <AnimatePresence>
      <div key="helpline-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          key="helpline-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#0E1424] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl text-white space-y-4 overflow-hidden"
        >
          {/* Top Decorative Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-gradient-to-b from-[#F5B301]/15 to-transparent blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between pb-3 border-b border-gray-800/80">
            <BrandLogo size="xs" subtext="24/7 OFFICIAL SUPPORT" />
            <button 
              onClick={onClose} 
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Intro Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-amber-500/10 border border-white/10 text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-medium text-gray-200">
              Official 24/7 Trading & Account Support Channels
            </span>
          </div>

          <div className="space-y-3">
            {/* 1. TELEGRAM SUPPORT CARD (@ftpsupport24) */}
            <div className="relative group p-4 bg-gradient-to-r from-[#0F1E36] to-[#0A1628] border border-cyan-500/30 hover:border-cyan-400/80 rounded-2xl transition-all shadow-lg hover:shadow-cyan-500/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20">
                    <Send className="w-5 h-5 text-white transform -rotate-12 translate-x-0.5 -translate-y-0.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">
                        {helpline.telegramLabel || 'Telegram Support'}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[9px] uppercase tracking-wider">
                        Fastest (1-2 Min)
                      </span>
                    </div>
                    <p className="font-mono text-cyan-300 text-xs font-bold mt-0.5 truncate">
                      @{cleanTelegramUsername}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Direct 1-on-1 Help & Instant Verification
                    </p>
                  </div>
                </div>

                {/* Copy Username button */}
                <button
                  type="button"
                  onClick={handleCopyTelegram}
                  className="p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-cyan-300 border border-white/5 hover:border-cyan-500/40 transition-all shrink-0 cursor-pointer"
                  title="Copy Telegram Username"
                >
                  {copiedTelegram ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Direct Open Action Button */}
              <a
                href={telegramHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 hover:from-cyan-400 to-blue-600 hover:to-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-cyan-500/25 transition-all cursor-pointer group-hover:scale-[1.01]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open Telegram Chat (@{cleanTelegramUsername})</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>

            {/* 2. GMAIL / EMAIL DESK CARD (forextradepro24@gmail.com) */}
            <div className="relative group p-4 bg-gradient-to-r from-[#14231E] to-[#0D1C17] border border-emerald-500/30 hover:border-emerald-400/80 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">
                        {helpline.gmailLabel || 'Official Gmail Support'}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px] uppercase tracking-wider">
                        Official Mail
                      </span>
                    </div>
                    <p className="font-mono text-emerald-300 text-xs font-bold mt-0.5 truncate">
                      {cleanGmailAddress}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Account security, VIP inquiries & statements
                    </p>
                  </div>
                </div>

                {/* Copy Email button */}
                <button
                  type="button"
                  onClick={handleCopyGmail}
                  className="p-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/40 transition-all shrink-0 cursor-pointer"
                  title="Copy Gmail Address"
                >
                  {copiedGmail ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Direct Send Email Action Button */}
              <a
                href={gmailHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 hover:from-emerald-500 to-teal-700 hover:to-teal-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-500/25 transition-all cursor-pointer group-hover:scale-[1.01]"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Email to {cleanGmailAddress}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>

            {/* OPTIONAL: Extra Channels configured by Admin in future */}
            {(hotlineHref || whatsappHref || customHref) && (
              <div className="space-y-2 pt-1 border-t border-gray-800">
                {hotlineHref && (
                  <a
                    href={hotlineHref}
                    className="p-3 bg-gradient-to-r from-[#F5B301]/10 to-amber-500/10 border border-[#F5B301]/30 hover:border-[#F5B301] rounded-xl flex items-center justify-between transition-all cursor-pointer group"
                  >
                    <div>
                      <p className="font-bold text-[#F5B301] text-xs">{helpline.hotlineLabel || '24/7 Phone Hotline'}</p>
                      <p className="text-gray-300 font-mono text-xs font-bold mt-0.5 group-hover:text-white">
                        {helpline.hotlinePhone}
                      </p>
                    </div>
                    <PhoneCall className="w-5 h-5 text-[#F5B301] group-hover:scale-110 transition-transform" />
                  </a>
                )}

                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-gray-900 border border-emerald-500/30 hover:border-emerald-400 rounded-xl flex items-center justify-between text-emerald-400 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-bold text-xs">{helpline.whatsappLabel || 'WhatsApp Support'}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                {customHref && (
                  <a
                    href={customHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-gray-900 border border-[#F5B301]/30 hover:border-[#F5B301] rounded-xl flex items-center justify-between text-[#F5B301] transition-all cursor-pointer"
                  >
                    <span className="font-bold text-xs">{helpline.customLinkTitle || 'VIP Support Desk'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Operating Hours & Support Notice */}
            <div className="p-3 bg-gray-950/80 border border-gray-800 rounded-xl flex items-start gap-2 text-xs text-gray-400">
              <Clock className="w-4 h-4 text-[#F5B301] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                {helpline.supportNotice || 'Our official 24/7 support desk is always active. Contact us via Telegram or Gmail for instant resolution.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-800/80 hover:bg-gray-700 text-gray-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            Close Support Desk
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
