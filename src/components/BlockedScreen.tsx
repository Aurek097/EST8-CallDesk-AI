import React from 'react';
import { ShieldAlert, Lock, Mail, ArrowRight, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

interface BlockedScreenProps {
  email: string;
  errorMessage?: string;
  onRetry: () => void;
  onLoginAsAdmin: () => void;
  onSignOut: () => void;
}

export const BlockedScreen: React.FC<BlockedScreenProps> = ({
  email,
  errorMessage,
  onRetry,
  onLoginAsAdmin,
  onSignOut
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-950/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-amber-950/15 rounded-full blur-[90px] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-8 backdrop-blur-xl">
        {/* Header Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-5 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-red-500/10 text-red-400 border border-red-500/20 mb-3">
            <ShieldAlert className="w-3.5 h-3.5" /> Access Restricted
          </span>

          <h1 className="text-2xl font-bold tracking-tight text-white">EST8 CallDesk CRM</h1>
          <p className="text-sm text-slate-400 mt-1">Private Enterprise Mortgage & Final Expense Dialer</p>
        </div>

        {/* Informational Message */}
        <div className="mt-6 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
            <span className="text-slate-400">Authenticated Google Account:</span>
            <span className="font-mono font-medium text-slate-200 truncate max-w-[220px]">{email || 'Not verified'}</span>
          </div>

          <p className="text-slate-300 leading-relaxed">
            {errorMessage || 'This Google Account has not been pre-registered or authorized by an administrator. In order to access carrier writing numbers, client lead pipelines, and script routing, your upline manager must create your profile.'}
          </p>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-amber-300 flex items-start gap-2.5">
            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-[11px] text-amber-200 uppercase tracking-wide">Upline Administrator Contact</p>
              <p className="text-xs text-amber-300/90 mt-0.5">
                Contact <strong className="text-white">Andrew Chavis</strong> at{' '}
                <span className="font-mono text-amber-200 underline">aurek97@gmail.com</span> to request downline agent activation.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" /> Check Verification Status Again
          </button>

          <button
            onClick={onLoginAsAdmin}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition"
          >
            <CheckCircle2 className="w-4 h-4" /> Sign In as Admin (Andrew Chavis)
          </button>

          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out / Use Different Account
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/60 text-center text-[11px] text-slate-500">
          EST8 Financial Group &bull; in partnership with Symmetry Financial Group
        </div>
      </div>
    </div>
  );
};
