import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, X, RefreshCw } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  resendEmailAction?: () => void;
  resendLoading?: boolean;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    // Auto dismiss after 8 seconds unless it has an action button like resend email
    if (!toast.resendEmailAction) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl flex gap-3.5 ${
        isSuccess
          ? 'bg-[#0F231E]/95 border-emerald-500/40 text-emerald-200'
          : isError
          ? 'bg-[#2A0F13]/95 border-rose-500/40 text-rose-200'
          : isWarning
          ? 'bg-[#2B210B]/95 border-[#F5B301]/40 text-[#ffe596]'
          : 'bg-[#101522]/95 border-cyan-500/40 text-cyan-200'
      }`}
    >
      {/* Glow bar left */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isSuccess
            ? 'bg-emerald-400'
            : isError
            ? 'bg-rose-500'
            : isWarning
            ? 'bg-[#F5B301]'
            : 'bg-cyan-400'
        }`}
      />

      <div className="shrink-0 mt-0.5">
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        {(isError || isWarning) && <AlertTriangle className="w-5 h-5 text-rose-400" />}
      </div>

      <div className="flex-1 pr-4">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
          {toast.title}
        </h4>
        <p className="text-xs mt-1 text-gray-300 leading-relaxed font-medium">
          {toast.message}
        </p>

        {toast.resendEmailAction && (
          <button
            type="button"
            onClick={toast.resendEmailAction}
            disabled={toast.resendLoading}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5B301]/20 hover:bg-[#F5B301]/30 border border-[#F5B301]/40 text-[#F5B301] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${toast.resendLoading ? 'animate-spin' : ''}`} />
            <span>Resend Verification Email</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors self-start"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
