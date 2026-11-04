import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { exportLeadsToCsv } from '../utils/importer';
import {
  X,
  Copy,
  Check,
  Download,
  PhoneCall,
  ShieldCheck,
  Server,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sparkles
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    leads,
    setView,
    setIsNumberMarketplaceOpen,
    setIsA2POpen,
    user
  } = useApp();

  const [activeTab, setActiveTab] = useState<'general' | 'telephony'>('general');
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [showTextarea, setShowTextarea] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Diagnostics state
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoadingDiag, setIsLoadingDiag] = useState(false);

  useEffect(() => {
    if (isSettingsOpen) {
      setIsLoadingDiag(true);
      fetch('/api/telephony/diagnostics', {
        headers: {
          'x-user-email': user?.email || ''
        }
      })
        .then(res => res.json())
        .then(data => setDiagnostics(data))
        .catch(err => console.warn('Failed to load telephony diagnostics:', err))
        .finally(() => setIsLoadingDiag(false));
    }
  }, [isSettingsOpen, user?.email]);

  if (!isSettingsOpen) return null;

  const handleExportCsv = () => {
    const csv = exportLeadsToCsv(leads);
    setCsvText(csv);
    navigator.clipboard
      .writeText(csv)
      .then(() => {
        setCopiedCsv(true);
        setTimeout(() => setCopiedCsv(false), 2000);
      })
      .catch(() => {
        setShowTextarea(true);
      });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--rule)] flex items-center justify-between bg-[var(--surface-2)]">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold text-xl text-[var(--ink)]">Settings & Integrations</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[var(--rule)] bg-[var(--surface-2)]/50 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'general'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            General & Export
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('telephony')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'telephony'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-500" />
            <span>Twilio & Carrier Webhooks</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-[var(--ink)]">
          {activeTab === 'general' ? (
            <>
              {/* Funnel appointment offer times */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[var(--ink)] block">
                  Appointment Funnel Default Offer Times
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-[var(--muted)] block mb-1">Offer Time A</label>
                    <input
                      type="text"
                      value={settings.timeA}
                      onChange={e => updateSettings({ timeA: e.target.value })}
                      placeholder="5:15 pm"
                      className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[var(--muted)] block mb-1">Offer Time B</label>
                    <input
                      type="text"
                      value={settings.timeB}
                      onChange={e => updateSettings({ timeB: e.target.value })}
                      placeholder="6:45 pm"
                      className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Used in the Step 1 appointment funnel when closing the client on a specific callback window.
                </p>
              </div>

              {/* Profile redirect note */}
              <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--rule)] text-xs text-[var(--muted)] space-y-1">
                <p>
                  Your display name, agency, callback number, state licenses and carrier writing numbers now live in{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      setView('profile');
                    }}
                    className="text-[var(--accent)] font-semibold hover:underline"
                  >
                    Profile
                  </button>
                  .
                </p>
              </div>

              {/* CSV Export */}
              <div className="space-y-2 pt-2 border-t border-[var(--rule)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)]">Export Leads Data</span>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rule)] text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{copiedCsv ? 'Copied to Clipboard!' : 'Export All Leads (Copy CSV)'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  Exports all {leads.length} leads with call outcomes, notes, verified data, and policy fields so you can paste back into Excel or Google Sheets.
                </p>
                {showTextarea && (
                  <textarea
                    value={csvText}
                    readOnly
                    rows={4}
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] font-mono text-[10px]"
                  />
                )}
              </div>
            </>
          ) : (
            /* Telephony & Webhooks Tab */
            <div className="space-y-6">
              {/* Top Overview Card */}
              <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--rule)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-sm text-[var(--ink)]">Twilio Production Voice & SMS Setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsNumberMarketplaceOpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Buy Numbers</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsA2POpen(true);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>10DLC Portal</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  These 6 variables connect EST8 CallDesk to carrier telephone networks for in-browser WebRTC softphone dialing, mobile cell bridging, and carrier-registered 10DLC SMS delivery.
                </p>
              </div>

              {/* Twilio Trial Mode Box */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Twilio Trial Account Mode: Verified Numbers & Sandbox Hybrid</span>
                </div>
                <p className="text-[var(--ink)] leading-relaxed text-[11px]">
                  While on a Twilio trial, calls and texts can only reach numbers registered under <strong>Verified Caller IDs</strong> in your Twilio Console (like your personal cell phone). EST8 CallDesk automatically runs in hybrid mode: unverified leads trigger our realistic Sandbox Simulator so you can test dials, SMS threads, and script execution without receiving carrier errors.
                </p>
              </div>

              {/* Variable Checklist */}
              <div className="space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted)]">
                  Twilio Credentials Status Checklist
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {diagnostics?.variables ? (
                    Object.entries(diagnostics.variables).map(([key, v]: [string, any]) => (
                      <div
                        key={key}
                        className="p-3 rounded-xl border bg-[var(--surface-2)] flex items-center justify-between border-[var(--rule)]"
                      >
                        <div>
                          <div className="font-mono font-bold text-xs text-[var(--ink)]">{v.name}</div>
                          <div className="text-[10px] text-[var(--muted)] mt-0.5">
                            Value: <span className="font-mono text-[var(--ink)]">{v.preview}</span>
                          </div>
                        </div>

                        {v.configured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" /> NOT SET
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-4 text-[var(--muted)]">Loading credentials status...</div>
                  )}
                </div>
              </div>

              {/* Twilio Console Copy-Paste Webhook URLs */}
              <div className="space-y-3 pt-4 border-t border-[var(--rule)]">
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-[var(--muted)] block">
                    Copy-Paste Webhook URLs for Twilio Console
                  </span>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">
                    Paste these public webhook URLs into your Twilio TwiML App, Phone Numbers, and Messaging Service:
                  </p>
                </div>

                <div className="space-y-2.5 font-mono text-[11px]">
                  {/* Outbound Voice (TwiML App) */}
                  <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--rule)] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-[var(--muted)]">
                      <span>1. Voice Request URL (Paste in: Voice &rarr; Manage &rarr; TwiML Apps)</span>
                      <span className="text-emerald-600 font-mono">HTTP POST</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-[var(--surface)] p-2 rounded-lg border border-[var(--rule)]">
                      <span className="truncate text-[var(--ink)] select-all">{diagnostics?.webhooks?.voiceOutboundUrl || 'https://your-domain/api/telephony/voice/outbound'}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(diagnostics?.webhooks?.voiceOutboundUrl, 'outbound')}
                        className="px-2 py-1 rounded bg-[var(--surface-2)] hover:border-[var(--accent)] border border-[var(--rule)] font-sans text-xs flex items-center gap-1 shrink-0"
                      >
                        {copiedField === 'outbound' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'outbound' ? 'Copied' : 'Copy URL'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Inbound Voice */}
                  <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--rule)] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-[var(--muted)]">
                      <span>2. Inbound Voice URL (Paste in: Phone Numbers &rarr; Configure &rarr; Voice)</span>
                      <span className="text-emerald-600 font-mono">HTTP POST</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-[var(--surface)] p-2 rounded-lg border border-[var(--rule)]">
                      <span className="truncate text-[var(--ink)] select-all">{diagnostics?.webhooks?.voiceInboundUrl || 'https://your-domain/api/telephony/voice/inbound'}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(diagnostics?.webhooks?.voiceInboundUrl, 'inbound')}
                        className="px-2 py-1 rounded bg-[var(--surface-2)] hover:border-[var(--accent)] border border-[var(--rule)] font-sans text-xs flex items-center gap-1 shrink-0"
                      >
                        {copiedField === 'inbound' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'inbound' ? 'Copied' : 'Copy URL'}</span>
                      </button>
                    </div>
                    <span className="text-[10px] font-sans text-[var(--muted)] block">
                      Rings your in-browser softphone for 20s, then automatically falls back to your mobile cell phone.
                    </span>
                  </div>

                  {/* Inbound SMS */}
                  <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--rule)] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-[var(--muted)]">
                      <span>3. Inbound Messaging URL (Paste in: Messaging &rarr; Services &rarr; Integration)</span>
                      <span className="text-emerald-600 font-mono">HTTP POST</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-[var(--surface)] p-2 rounded-lg border border-[var(--rule)]">
                      <span className="truncate text-[var(--ink)] select-all">{diagnostics?.webhooks?.smsInboundUrl || 'https://your-domain/api/telephony/sms/inbound'}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(diagnostics?.webhooks?.smsInboundUrl, 'sms')}
                        className="px-2 py-1 rounded bg-[var(--surface-2)] hover:border-[var(--accent)] border border-[var(--rule)] font-sans text-xs flex items-center gap-1 shrink-0"
                      >
                        {copiedField === 'sms' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'sms' ? 'Copied' : 'Copy URL'}</span>
                      </button>
                    </div>
                    <span className="text-[10px] font-sans text-[var(--muted)] block">
                      Automatically matches client SMS replies to the lead and posts into their activity timeline.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--rule)] bg-[var(--surface-2)] flex items-center justify-between text-xs text-[var(--muted)]">
          <span>STIR/SHAKEN Attestation A &bull; 10DLC A2P Compliant</span>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="px-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
