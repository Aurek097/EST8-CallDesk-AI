import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Lock, Sparkles, X, User, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginOpen, setIsLoginOpen, loginWithGoogle, user, isVerified, verificationError } = useApp();
  const [customEmail, setCustomEmail] = useState(user?.email || 'aurek97@gmail.com');
  const [customName, setCustomName] = useState(user?.name || 'Andrew Chavis');
  const [isCustomizing, setIsCustomizing] = useState(false);

  if (!isLoginOpen) return null;

  const handleGoogleSubmit = () => {
    loginWithGoogle({
      email: customEmail.trim().toLowerCase(),
      name: customName.trim(),
      role: customEmail.trim().toLowerCase() === 'aurek97@gmail.com' ? 'admin' : 'agent'
    });
  };

  const handleAdminQuickLogin = () => {
    setCustomEmail('aurek97@gmail.com');
    setCustomName('Andrew Chavis');
    loginWithGoogle({
      email: 'aurek97@gmail.com',
      name: 'Andrew Chavis',
      role: 'admin'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close button */}
        {user && isVerified && (
          <button
            type="button"
            onClick={() => setIsLoginOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Banner */}
        <div className="bg-gradient-to-br from-[#19388B] to-[#12245b] text-white p-7 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FF701F]/15 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md mb-3 border border-white/20 text-white font-display font-bold text-2xl shadow-inner">
              E8
            </div>
            <h2 className="font-display font-bold text-2xl tracking-tight text-white">
              EST8 CallDesk
            </h2>
            <div className="text-xs text-blue-200 mt-1 font-medium">
              Enterprise Mortgage & Final Expense CRM
            </div>
            <div className="text-[11px] text-blue-300/80 mt-1.5 flex items-center justify-center gap-1">
              <span>Strictly Invite-Only</span>
              <span>&bull;</span>
              <span className="font-semibold text-white/90">Multi-User Verified</span>
            </div>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6">
          <div className="text-center mb-5">
            <h3 className="font-display font-bold text-lg text-[var(--ink)]">
              Authorized Agent Access
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1">
              Sign in with your authorized Google Account. All client leads, call activity, and notes are strictly isolated to your verified profile.
            </p>
          </div>

          {/* Quick Admin Option */}
          <button
            type="button"
            onClick={handleAdminQuickLogin}
            className="w-full mb-3 flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold transition"
          >
            <div className="flex items-center gap-2 text-left">
              <CheckCircle2 className="w-4 h-4 text-amber-500" />
              <div>
                <div className="font-bold">Super Admin Quick Access</div>
                <div className="text-[10px] text-[var(--muted)] font-normal">aurek97@gmail.com (Andrew Chavis)</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[10px] font-bold">ADMIN</span>
          </button>

          {/* Google Sign In Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSubmit}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[var(--rule)] bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-semibold text-sm shadow-sm hover:shadow transition-all active:scale-[0.99] cursor-pointer"
            >
              {/* Google G SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-[var(--muted)] px-1">
              <span>Selected Account: <b className="text-[var(--ink)]">{customEmail}</b></span>
              <button
                type="button"
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                {isCustomizing ? 'Hide details' : 'Change email'}
              </button>
            </div>
          </div>

          {/* Optional account customization */}
          {isCustomizing && (
            <div className="mt-4 p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--rule)] space-y-3 text-xs animate-in fade-in duration-150">
              <div>
                <label className="block text-[var(--muted)] font-medium mb-1">Google Email to Verify</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={e => setCustomEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]"
                  placeholder="agent@example.com"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Must be registered in the CRM database by Admin Andrew Chavis to pass the verification gate.
                </span>
              </div>
              <div>
                <label className="block text-[var(--muted)] font-medium mb-1">Agent Full Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)]"
                  placeholder="Agent Name"
                />
              </div>
            </div>
          )}

          {/* Trust badges */}
          <div className="mt-6 pt-5 border-t border-[var(--rule)] grid grid-cols-2 gap-3 text-[11px] text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Strict Data Isolation</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Invite-Only Gate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
