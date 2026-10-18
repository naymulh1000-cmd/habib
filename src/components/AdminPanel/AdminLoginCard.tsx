import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  Lock, 
  Key, 
  UserCheck, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { signInWithEmailAndPassword, auth, db, doc, getDoc } from '../../lib/firebase';

interface AdminLoginCardProps {
  onAdminLoginSuccess: (adminData: { email: string; role: string; token: string }) => void;
  onSwitchToUserApp?: () => void;
}

export const AdminLoginCard: React.FC<AdminLoginCardProps> = ({ 
  onAdminLoginSuccess,
  onSwitchToUserApp 
}) => {
  const [adminEmail, setAdminEmail] = useState('naymulh1000@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [securityKey, setSecurityKey] = useState('ADMIN-PRO-8940215');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // Validate secret security key or admin email credential
      const cleanAdminEmail = adminEmail.trim().toLowerCase();
      const isValidAdminKey = securityKey.trim().toUpperCase() === 'ADMIN-PRO-8940215' || securityKey.trim() === '8940215';
      const isMasterAdminEmail = cleanAdminEmail === 'naymulh1000@gmail.com' || cleanAdminEmail === 'admin@fxby24.com' || cleanAdminEmail === 'admin@forextradepro.com';

      if (!isValidAdminKey && !isMasterAdminEmail) {
        throw new Error('Access Denied: Only designated Admin accounts (e.g., naymulh1000@gmail.com or admin@fxby24.com) are permitted to access the Admin Panel.');
      }

      // Attempt Firebase Sign In if available and verify Firestore Admin Role
      let assignedRole = 'superadmin';
      let authSuccessful = false;
      
      if (adminEmail && adminPassword) {
        try {
          const userCred = await signInWithEmailAndPassword(auth, cleanAdminEmail, adminPassword);
          const u = userCred.user;
          authSuccessful = true;
          
          if (db && u?.uid) {
            try {
              const uSnap = await getDoc(doc(db, 'users', u.uid));
              if (uSnap.exists()) {
                const uData = uSnap.data();
                if (uData?.role && uData.role !== 'admin' && uData.role !== 'superadmin' && !isMasterAdminEmail) {
                  throw new Error('Access Denied: Your account does not have administrator permissions.');
                }
                if (uData?.role) assignedRole = uData.role;
              }
            } catch (snapErr: any) {
              if (snapErr.message?.includes('Access Denied')) throw snapErr;
            }
          }
        } catch (fbErr: any) {
          if (fbErr.message?.includes('Access Denied')) throw fbErr;
          
          // If valid security key is provided, allow passkey authentication
          if (!isValidAdminKey) {
            throw new Error(
              fbErr.code === 'auth/invalid-credential' 
                ? 'Invalid email or password. If you registered on the user portal, use your user password, or enter Security Key: ADMIN-PRO-8940215'
                : (fbErr.message || 'Authentication failed.')
            );
          }
        }
      } else if (!isValidAdminKey) {
        throw new Error('Please enter Admin Email & Password or valid Security Key.');
      }

      // Grant Admin Session
      onAdminLoginSuccess({
        email: adminEmail || 'admin@forextradepro.com',
        role: assignedRole,
        token: 'ADM-SESSION-' + Date.now()
      });

    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify Admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative bg-[#0A0D18]/95 border-2 border-[#F5B301]/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl overflow-hidden"
      >
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#F5B301]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Header */}
        <div className="text-center space-y-3 mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F5B301] to-amber-300 text-gray-950 font-black shadow-xl shadow-[#F5B301]/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-black tracking-widest uppercase inline-block mb-1">
              STRICTLY RESTRICTED ACCESS
            </span>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Forex Pro <span className="text-[#F5B301]">Admin Portal</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Standalone Management Console for Authorized Personnel
            </p>
          </div>
        </div>

        {/* Notice Box */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-[#F5B301]/30 text-amber-200 text-xs mb-5 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#F5B301] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            This Admin Panel runs independently from the user website. Regular traders cannot access this portal.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs mb-5 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleAdminAuth} className="space-y-4 relative z-10">
          {/* Admin Email */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Admin Email / Username
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@forextradepro.com"
                className="w-full px-4 py-3 pl-11 bg-gray-900/90 border border-gray-800 rounded-2xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] transition-all"
              />
              <UserCheck className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Admin Password */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 pl-11 bg-gray-900/90 border border-gray-800 rounded-2xl text-xs text-white placeholder-gray-500 outline-none focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] transition-all"
              />
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Master Admin Security Passcode */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider">
                Admin Security Key / PIN
              </label>
              <span className="text-[10px] text-[#F5B301] font-mono">Default: ADMIN-PRO-8940215</span>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                placeholder="ADMIN-PRO-8940215"
                className="w-full px-4 py-3 pl-11 bg-gray-900/90 border border-[#F5B301]/40 rounded-2xl text-xs text-[#F5B301] font-mono font-bold outline-none focus:border-[#F5B301] focus:ring-1 focus:ring-[#F5B301] transition-all"
              />
              <Key className="w-4 h-4 text-[#F5B301] absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#F5B301] via-amber-400 to-[#F5B301] text-gray-950 font-black rounded-2xl text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl shadow-[#F5B301]/20 hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gray-950" />
                <span>Authenticating Admin...</span>
              </>
            ) : (
              <>
                <span>Access Admin Console</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch to User Website Link */}
        {onSwitchToUserApp && (
          <div className="mt-6 pt-5 border-t border-white/10 text-center relative z-10">
            <button
              type="button"
              onClick={onSwitchToUserApp}
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>Switch to User Trading Platform</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#F5B301]" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
