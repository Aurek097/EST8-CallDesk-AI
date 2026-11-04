import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { authHeaders } from '../lib/firebase';
import { ShieldCheck, CheckCircle2, Clock, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import type { A2PRegistration } from '../types';

interface A2PStatus {
  configured: boolean;
  registered: boolean;
  registration: A2PRegistration | null;
  error?: string;
}

const CONSOLE = {
  compliance: 'https://console.twilio.com/us1/develop/sms/regulatory-compliance/a2p-10dlc-overview',
  services: 'https://console.twilio.com/us1/develop/sms/services',
  guide: 'https://www.twilio.com/docs/messaging/compliance/a2p-10dlc',
};

const STATUS_COPY: Record<string, { label: string; tone: 'good' | 'warn' | 'bad'; text: string }> = {
  approved: { label: 'Approved', tone: 'good', text: 'Your campaign is approved. Texts to leads go out on your registered numbers.' },
  in_review: { label: 'In carrier review', tone: 'warn', text: 'Twilio and the carriers are reviewing your campaign. This usually takes several business days. Texts may be blocked until it is approved.' },
  pending: { label: 'Submitted', tone: 'warn', text: 'Your campaign was submitted and is waiting for review.' },
  rejected: { label: 'Rejected', tone: 'bad', text: 'The campaign was rejected. Read the carrier feedback below, fix it in the Twilio Console, and resubmit.' },
};

const toneClass = {
  good: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
  bad: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30',
};

/** A2P 10DLC status, read live from Twilio. Registration itself happens in the Twilio Console. */
export const A2PRegistrationModal: React.FC = () => {
  const { isA2POpen, setIsA2POpen } = useApp();
  const [data, setData] = useState<A2PStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/telephony/a2p', { headers: authHeaders() });
      if (!res.ok) throw new Error(`Couldn't load the status (error ${res.status}).`);
      setData(await res.json());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isA2POpen) load();
  }, [isA2POpen, load]);

  if (!isA2POpen) return null;

  const reg = data?.registration ?? null;
  const status = reg ? STATUS_COPY[reg.status] ?? STATUS_COPY.pending : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-labelledby="a2p-title">
      <div className="w-full max-w-2xl bg-[var(--surface)] text-[var(--ink)] border border-[var(--rule)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-[var(--rule)] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="a2p-title" className="font-bold text-lg">Texting registration (A2P 10DLC)</h2>
              <p className="text-sm text-[var(--muted)]">
                U.S. carriers block business texts from local numbers until your business and texting campaign are registered. Calling doesn't need this.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setIsA2POpen(false)} className="text-[var(--muted)] hover:text-[var(--ink)] text-2xl leading-none p-1" aria-label="Close">
            &times;
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {loading && <p className="text-sm text-[var(--muted)]">Checking Twilio…</p>}
          {loadError && (
            <div className={`p-3 rounded-lg border text-sm ${toneClass.bad}`}>{loadError}</div>
          )}

          {data && !data.configured && (
            <div className={`p-3 rounded-lg border text-sm flex gap-2 ${toneClass.warn}`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Texting isn't connected yet. Add <code>TWILIO_MESSAGING_SERVICE_SID</code> (starts with MG) in the app's secrets after you create a Messaging Service in Twilio.
              </span>
            </div>
          )}

          {data?.error && <div className={`p-3 rounded-lg border text-sm ${toneClass.bad}`}>{data.error}</div>}

          {data?.configured && !data.error && !reg && (
            <div className={`p-3 rounded-lg border text-sm flex gap-2 ${toneClass.warn}`}>
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              <span>No campaign is registered on your Messaging Service yet. Follow the steps below.</span>
            </div>
          )}

          {reg && status && (
            <div className={`p-4 rounded-lg border ${toneClass[status.tone]}`}>
              <div className="flex items-center gap-2 font-bold">
                {status.tone === 'good' ? <CheckCircle2 className="w-4 h-4" /> : status.tone === 'warn' ? <Clock className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {status.label}
              </div>
              <p className="text-sm mt-1">{status.text}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs mt-3 text-[var(--ink)]">
                {reg.campaignUseCase && (<><dt className="text-[var(--muted)]">Use case</dt><dd>{reg.campaignUseCase}</dd></>)}
                {reg.campaignSid && (<><dt className="text-[var(--muted)]">Campaign</dt><dd className="font-mono break-all">{reg.campaignSid}</dd></>)}
                {reg.brandSid && (<><dt className="text-[var(--muted)]">Brand</dt><dd className="font-mono break-all">{reg.brandSid}</dd></>)}
                {reg.updatedAt && (<><dt className="text-[var(--muted)]">Last update</dt><dd>{new Date(reg.updatedAt).toLocaleString()}</dd></>)}
              </dl>
              {reg.carrierFeedback && (
                <p className="text-xs mt-3 break-words"><strong>Carrier feedback:</strong> {reg.carrierFeedback}</p>
              )}
            </div>
          )}

          {reg?.status !== 'approved' && (
            <ol className="space-y-3 text-sm list-decimal pl-5">
              <li>
                <strong>Register your brand.</strong> In the Twilio Console, open Messaging → Regulatory Compliance and create a customer profile and brand for EST8 Financial Group. You'll need the business's legal name, EIN and address exactly as the IRS has them. A sole proprietor without an EIN can register as a Sole Proprietor brand instead.
              </li>
              <li>
                <strong>Create a Messaging Service</strong> and add your Twilio numbers to it. Put its SID (MG…) in the app's secrets as <code>TWILIO_MESSAGING_SERVICE_SID</code>.
              </li>
              <li>
                <strong>Register a campaign</strong> on that service. Describe how leads opt in (your lead forms and their consent language), include two sample texts with "Reply STOP to opt out," and list STOP / START as keywords. CallDesk already honors STOP and START replies automatically.
              </li>
              <li>
                <strong>Wait for approval.</strong> This screen reads the status from Twilio each time you open it.
              </li>
            </ol>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <a href={CONSOLE.compliance} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-semibold">
              Open A2P registration in Twilio <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a href={CONSOLE.services} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--rule)] text-sm">
              Messaging Services <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a href={CONSOLE.guide} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--rule)] text-sm">
              Twilio's A2P guide <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--rule)] text-sm ml-auto">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Check again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
