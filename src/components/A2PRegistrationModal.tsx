import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building,
  Send,
  Sparkles,
  Lock,
  X,
  ExternalLink,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

export const A2PRegistrationModal: React.FC = () => {
  const { isA2POpen, setIsA2POpen, a2pRegistration, submitA2PRegistration, user } = useApp();

  const [step, setStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState(a2pRegistration?.businessName || 'EST8 Financial Group LLC');
  const [ein, setEin] = useState(a2pRegistration?.ein || '84-9201948');
  const [businessType, setBusinessType] = useState<'llc' | 'corporation' | 'sole_proprietorship'>(
    a2pRegistration?.businessType || 'llc'
  );
  const [brandType, setBrandType] = useState<'STANDARD' | 'SOLE_PROPRIETOR'>('STANDARD');
  const [campaignUseCase, setCampaignUseCase] = useState(
    a2pRegistration?.campaignUseCase || 'Mortgage Protection & Final Expense Customer Care & Appointment Follow-up'
  );
  const [sampleMessage1, setSampleMessage1] = useState(
    a2pRegistration?.sampleMessage1 ||
      'Hi Marcus, this is Andrew Chavis with EST8 Financial Group following up on your mortgage protection request for your home in Columbia. When is a good time for a brief 5-min review? Reply STOP to cancel.'
  );
  const [sampleMessage2, setSampleMessage2] = useState(
    a2pRegistration?.sampleMessage2 ||
      'Hi David, Andrew Chavis here with EST8 Financial. I have the updated carrier rate comparisons ready for your review. Let me know if you are free around 2pm or 4pm today.'
  );
  const [optInKeywords, setOptInKeywords] = useState(a2pRegistration?.optInKeywords || 'START, YES, AGREE');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  if (!isA2POpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitA2PRegistration({
        businessName,
        ein,
        businessType,
        brandType,
        campaignUseCase,
        sampleMessage1,
        sampleMessage2,
        optInKeywords
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApproved = a2pRegistration?.status === 'approved';
  const isInReview = a2pRegistration?.status === 'in_review' || a2pRegistration?.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-100 text-lg">A2P 10DLC Brand & Campaign Verification</h2>
                {isApproved && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED 100%
                  </span>
                )}
                {isInReview && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> CARRIER IN REVIEW
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Carrier registration portal for US mobile network SMS & voice compliance</p>
            </div>
          </div>
          <button
            onClick={() => setIsA2POpen(false)}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Live Stepper Tracker */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-bold mb-1">
                ✓
              </div>
              <span className="text-[11px] font-semibold text-slate-200">1. Brand Identity</span>
              <span className="text-[10px] text-emerald-400">EIN Verified</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-xs font-bold mb-1">
                ✓
              </div>
              <span className="text-[11px] font-semibold text-slate-200">2. TCR Registry</span>
              <span className="text-[10px] text-emerald-400">TCR Attested</span>
            </div>
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                  isApproved ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950 animate-pulse'
                }`}
              >
                {isApproved ? '✓' : '3'}
              </div>
              <span className="text-[11px] font-semibold text-slate-200">3. Carrier Vetting</span>
              <span className={`text-[10px] ${isApproved ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isApproved ? 'Approved' : 'In Review (T-Mobile/AT&T)'}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                  isApproved ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {isApproved ? '✓' : '4'}
              </div>
              <span className="text-[11px] font-semibold text-slate-200">4. High Throughput</span>
              <span className={`text-[10px] ${isApproved ? 'text-emerald-400' : 'text-slate-500'}`}>
                {isApproved ? 'Active (50 MPS)' : 'Pending Vetting'}
              </span>
            </div>
          </div>
        </div>

        {/* Wizard Form / Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-300">
          {submitSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>A2P 10DLC Registration submitted to The Campaign Registry (TCR). Review typically completes in 24-48 hours.</span>
            </div>
          )}

          {/* Section 1: Business Entity */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Building className="w-4 h-4 text-blue-400" />
              <h3 className="font-bold text-slate-100 text-sm">Step 1: Legal Business Entity (Brand)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Legal Business Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Federal Tax ID / EIN *</label>
                <input
                  type="text"
                  required
                  placeholder="XX-XXXXXXX"
                  value={ein}
                  onChange={e => setEin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Entity Structure</label>
                <select
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="llc">Limited Liability Company (LLC)</option>
                  <option value="corporation">Corporation (Inc/Corp)</option>
                  <option value="sole_proprietorship">Sole Proprietor (SSN)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Registration Tier</label>
                <select
                  value={brandType}
                  onChange={e => setBrandType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="STANDARD">Standard Brand (Commercial High-Volume)</option>
                  <option value="SOLE_PROPRIETOR">Sole Proprietor Brand (Low Volume)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Campaign Use Case */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-slate-100 text-sm">Step 2: Campaign Purpose & Use Case</h3>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Campaign Description</label>
              <input
                type="text"
                value={campaignUseCase}
                onChange={e => setCampaignUseCase(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Declared to mobile carriers (Verizon, AT&T, T-Mobile) to bypass carrier spam filters.
              </span>
            </div>
          </div>

          {/* Section 3: Compliant Message Samples & Opt-In */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Send className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-slate-100 text-sm">Step 3: Carrier Sample Messages & Opt-In Proof</h3>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Sample Message #1 (Appointment Follow-up) *</label>
              <textarea
                rows={2}
                value={sampleMessage1}
                onChange={e => setSampleMessage1(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Sample Message #2 (Quote Presentation)</label>
              <textarea
                rows={2}
                value={sampleMessage2}
                onChange={e => setSampleMessage2(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mandatory CTIA & Carrier Disclosures Included Automatically:</span>
              </div>
              <p>&bull; Every outgoing template includes "Reply STOP to cancel, HELP for assistance".</p>
              <p>&bull; Message frequency varies. Msg & data rates may apply.</p>
              <p>&bull; Opt-in keywords: <span className="font-mono text-slate-200">{optInKeywords}</span></p>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <div className="text-[11px] text-slate-500 font-mono">
              Brand SID: {a2pRegistration?.brandSid || 'BN_PENDING'} &bull; Campaign SID: {a2pRegistration?.campaignSid || 'CP_PENDING'}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsA2POpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting to TCR...' : 'Submit / Re-verify Brand'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
