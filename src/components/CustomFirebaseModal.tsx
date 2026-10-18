import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, X, Check, RefreshCw, ExternalLink, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { activeFirebaseConfig, auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface CustomFirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomFirebaseModal: React.FC<CustomFirebaseModalProps> = ({ isOpen, onClose }) => {
  const [jsonConfig, setJsonConfig] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'warning' | 'error'; message: string; details?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'paste' | 'fields' | 'guide'>('paste');

  useEffect(() => {
    const stored = localStorage.getItem('custom_firebase_config');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setApiKey(parsed.apiKey || '');
        setAuthDomain(parsed.authDomain || '');
        setProjectId(parsed.projectId || '');
        setStorageBucket(parsed.storageBucket || '');
        setMessagingSenderId(parsed.messagingSenderId || '');
        setAppId(parsed.appId || '');
        setJsonConfig(JSON.stringify(parsed, null, 2));
      } catch (_) {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const runDiagnosticTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      if (!activeFirebaseConfig.apiKey || activeFirebaseConfig.apiKey.length < 20) {
        setTestResult({
          status: 'error',
          message: 'INVALID_API_KEY',
          details: 'Your Firebase API Key is invalid. Please copy a valid API Key from Firebase Console.'
        });
        setTesting(false);
        return;
      }

      // Test sign-in with dummy credentials to check if Firebase Auth service is active
      await signInWithEmailAndPassword(auth, "diagnostic_test_check@example.com", "dummyPass123!");
      setTestResult({
        status: 'success',
        message: 'Firebase Connection Active & Operational!',
        details: 'Firebase connection established successfully.'
      });
    } catch (err: any) {
      console.log('Firebase diagnostic test result:', err.code, err.message);

      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        // User not found means Auth service is CONNECTED and ACTIVE!
        setTestResult({
          status: 'success',
          message: '✅ Firebase Connection Active!',
          details: 'Your Firebase Auth server is connected correctly. You can now sign up or sign in.'
        });
      } else if (err.code === 'auth/operation-not-allowed') {
        setTestResult({
          status: 'warning',
          message: '⚠️ Email/Password Sign-In is DISABLED in your Firebase Console',
          details: 'Email/Password login is disabled in your project. Go to Firebase Console -> Authentication -> Sign-in method and enable Email/Password.'
        });
      } else if (err.code === 'auth/unauthorized-domain' || err.code === 'auth/invalid-origin') {
        setTestResult({
          status: 'warning',
          message: '⚠️ Domain Not Authorized in Firebase',
          details: 'Go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add your app domain.'
        });
      } else if (err.code === 'auth/api-key-not-valid' || err.code === 'auth/invalid-api-key' || err.message?.includes('api-key-not-valid')) {
        setTestResult({
          status: 'error',
          message: '❌ Invalid Firebase API Key',
          details: 'The provided API key is invalid. Please copy the correct web app firebaseConfig.'
        });
      } else {
        setTestResult({
          status: 'warning',
          message: `Notice: ${err.code || 'Connection Checked'}`,
          details: err.message || 'Firebase Credentials checked.'
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSaveJson = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let configObj: any = {};
      if (activeTab === 'paste') {
        let cleanText = jsonConfig.trim();
        if (cleanText.includes('const firebaseConfig =')) {
          cleanText = cleanText.replace(/const firebaseConfig =/g, '').replace(/;/g, '');
        }
        configObj = JSON.parse(cleanText);
      } else {
        configObj = {
          apiKey: apiKey.trim(),
          authDomain: authDomain.trim(),
          projectId: projectId.trim(),
          storageBucket: storageBucket.trim(),
          messagingSenderId: messagingSenderId.trim(),
          appId: appId.trim(),
        };
      }

      if (!configObj.apiKey || !configObj.projectId) {
        setStatusMsg('❌ API Key and Project ID are required!');
        return;
      }

      localStorage.setItem('custom_firebase_config', JSON.stringify(configObj));
      setStatusMsg('✅ Custom Firebase Config saved! Reloading application...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setStatusMsg('❌ Invalid JSON format. Please paste a valid firebaseConfig object.');
    }
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('custom_firebase_config');
    setStatusMsg('Restored default AI Studio project. Reloading...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const isCustomActive = Boolean(localStorage.getItem('custom_firebase_config'));

  return (
    <AnimatePresence>
      <div key="custom-firebase-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          key="custom-firebase-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#101522] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider">
              <Settings className="w-4 h-4 text-[#F5B301]" />
              <span>Connect Your Own Firebase Project</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Connected Status & Diagnostics */}
          <div className="my-3 p-3 rounded-xl bg-gray-900/90 border border-gray-800 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isCustomActive ? 'bg-emerald-400 animate-ping' : 'bg-[#15eaff]'}`} />
                <span className="text-gray-300 font-medium">Active Project:</span>
                <span className="font-mono font-bold text-[#F5B301]">{activeFirebaseConfig.projectId}</span>
              </div>
              <button
                type="button"
                onClick={runDiagnosticTest}
                disabled={testing}
                className="px-2.5 py-1 rounded bg-[#F5B301]/20 hover:bg-[#F5B301]/30 text-[#F5B301] text-[11px] font-bold border border-[#F5B301]/40 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Checking...' : 'Test Connection'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs leading-relaxed space-y-1 ${
                  testResult.status === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : testResult.status === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {testResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
                {testResult.details && (
                  <p className="text-[11px] text-gray-200">{testResult.details}</p>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800 mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'border-[#F5B301] text-[#F5B301]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Paste Config Object
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fields')}
              className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'fields'
                  ? 'border-[#F5B301] text-[#F5B301]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Individual Fields
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
                activeTab === 'guide'
                  ? 'border-[#F5B301] text-[#F5B301]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Setup Guide 📖
            </button>
          </div>

          {statusMsg && (
            <div className="mb-3 p-2.5 rounded-xl bg-[#F5B301]/10 border border-[#F5B301]/30 text-[#F5B301] text-xs font-semibold">
              {statusMsg}
            </div>
          )}

          {/* Tab 1: Paste Object */}
          {activeTab === 'paste' && (
            <form onSubmit={handleSaveJson} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Paste your Firebase Web App SDK Config Object:
                </label>
                <textarea
                  value={jsonConfig}
                  onChange={(e) => setJsonConfig(e.target.value)}
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "your-app.firebaseapp.com",\n  "projectId": "your-app-id",\n  "storageBucket": "your-app.appspot.com",\n  "messagingSenderId": "123456789",\n  "appId": "1:123456:web:abc"\n}`}
                  rows={8}
                  className="w-full p-3 bg-[#1A2030] border border-gray-700 rounded-xl text-xs font-mono text-emerald-300 placeholder-gray-600 outline-none focus:border-[#F5B301]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#15eaff] to-[#00b2e3] hover:brightness-110 text-gray-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Connect Project</span>
                </button>

                {isCustomActive && (
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="py-2.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1"
                    title="Reset to default"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Tab 2: Individual Fields */}
          {activeTab === 'fields' && (
            <form onSubmit={handleSaveJson} className="space-y-2.5">
              <div>
                <label className="text-[11px] text-gray-400">API Key (apiKey) *</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-[#1A2030] border border-gray-700 rounded-lg text-xs text-white font-mono outline-none focus:border-[#F5B301]"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400">Auth Domain (authDomain)</label>
                <input
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="your-project.firebaseapp.com"
                  className="w-full px-3 py-2 bg-[#1A2030] border border-gray-700 rounded-lg text-xs text-white font-mono outline-none focus:border-[#F5B301]"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400">Project ID (projectId) *</label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="your-project-id"
                  className="w-full px-3 py-2 bg-[#1A2030] border border-gray-700 rounded-lg text-xs text-white font-mono outline-none focus:border-[#F5B301]"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-400">App ID (appId)</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:123456789:web:abcdef"
                  className="w-full px-3 py-2 bg-[#1A2030] border border-gray-700 rounded-lg text-xs text-white font-mono outline-none focus:border-[#F5B301]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#15eaff] to-[#00b2e3] hover:brightness-110 text-gray-950 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </form>
          )}

          {/* Tab 3: Setup Instructions */}
          {activeTab === 'guide' && (
            <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
              <div className="p-3 bg-gray-900/80 rounded-xl border border-gray-800 space-y-2">
                <h4 className="font-bold text-[#F5B301] flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>How to configure a custom Firebase Project:</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-300 pl-1">
                  <li>
                    Open your project in{' '}
                    <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-[#15eaff] underline font-bold">
                      Firebase Console
                    </a>.
                  </li>
                  <li>
                    <b>1. Enable Email/Password Login:</b>
                    <p className="text-[11px] text-gray-400 pl-4 mt-0.5">
                      Console -&gt; <b>Authentication</b> -&gt; <b>Sign-in method</b> -&gt; Enable <b>Email/Password</b>.
                    </p>
                  </li>
                  <li>
                    <b>2. Create Firestore Database:</b>
                    <p className="text-[11px] text-gray-400 pl-4 mt-0.5">
                      Console -&gt; <b>Firestore Database</b> -&gt; <b>Create database</b> in test mode.
                    </p>
                  </li>
                  <li>
                    <b>3. Email Verification & Branding Setup:</b>
                    <p className="text-[11px] text-gray-400 pl-4 mt-0.5">
                      Console -&gt; <b>Authentication</b> -&gt; <b>Templates</b> -&gt; <b>Email address verification</b>:<br />
                      &bull; <b>Public-facing name:</b> <span className="text-[#F5B301] font-bold">Forex Trade Pro</span><br />
                      &bull; <b>Sender name:</b> <span className="text-[#F5B301] font-bold">Forex Trade Pro</span><br />
                      &bull; <b>Subject:</b> <span className="text-emerald-300 font-bold">Verify Your Forex Trade Pro Account</span><br />
                      <span className="text-[10px] text-cyan-300 block mt-1">
                        *Note: Sender email uses your project&apos;s default domain until a custom domain is connected in Firebase Console.
                      </span>
                    </p>
                  </li>
                  <li>
                    <b>4. Copy Config:</b>
                    <p className="text-[11px] text-gray-400 pl-4 mt-0.5">
                      Go to <b>Project Settings</b> (⚙️) -&gt; <b>Your apps</b> -&gt; Copy Web App <code>firebaseConfig</code> and paste in the 1st tab.
                    </p>
                  </li>
                  <li>
                    <b>5. Custom Domain (fxby24.com) Setup:</b>
                    <p className="text-[11px] text-gray-400 pl-4 mt-0.5">
                      &bull; <b>Auth Allowed Domains:</b> Console -&gt; <b>Authentication</b> -&gt; <b>Settings</b> -&gt; <b>Authorized domains</b> -&gt; Add <code className="text-amber-300 font-bold">fxby24.com</code> and <code className="text-amber-300 font-bold">www.fxby24.com</code>.<br />
                      &bull; <b>Firebase Hosting:</b> Console -&gt; <b>Hosting</b> -&gt; <b>Add custom domain</b> -&gt; Enter <code className="text-amber-300 font-bold">fxby24.com</code> and connect DNS records.
                    </p>
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-[#15eaff]/10 border border-[#15eaff]/30 rounded-xl space-y-1">
                <h5 className="font-bold text-[#15eaff]">💡 Test Connection Feature:</h5>
                <p className="text-[11px] text-gray-300">
                  Click the <b>Test Connection</b> button above to verify your credentials against Firebase.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
