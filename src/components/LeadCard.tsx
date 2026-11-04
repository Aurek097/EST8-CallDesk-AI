import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lead, Stage, DialOutcome } from '../types';
import {
  fullName,
  isFE,
  isMarried,
  num,
  money,
  money2,
  ageOf,
  spAgeOf,
  road,
  fmtAppt,
  writingFor,
  fmtDT
} from '../utils/calculations';
import {
  STAGES,
  PARKED,
  STATUS_L,
  STAGE_I,
  OBJ,
  TPL,
  LEAD_FIELDS,
  stName
} from '../constants/data';
import { VF_META, getVShow } from './VerifyChip';
import { FormattedScriptText } from './FormattedScriptText';
import {
  Copy,
  Check,
  PhoneCall,
  Phone,
  Clock,
  Trash2,
  ChevronDown,
  AlertCircle,
  FileCheck2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Send
} from 'lucide-react';

export const LeadCard: React.FC = () => {
  const {
    activeLead,
    updateLead,
    deleteLead,
    setLeadStage,
    logLeadDial,
    addLeadNote,
    toggleVerification,
    profile,
    startCall,
    sendSms,
    openCommDrawer
  } = useApp();

  const [noteText, setNoteText] = useState('');
  const [noteKind, setNoteKind] = useState<'note' | 'call' | 'vm' | 'text'>('note');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [delArmed, setDelArmed] = useState(false);
  const [copiedTplIdx, setCopiedTplIdx] = useState<number | null>(null);

  if (!activeLead) {
    return (
      <aside className="w-full lg:w-[340px] flex-shrink-0 bg-[var(--surface)] border border-[var(--rule)] rounded-xl p-6 text-center text-xs text-[var(--muted)]">
        Pick a lead from the queue to view details.
      </aside>
    );
  }

  const L = activeLead;
  const fe = isFE(L);
  const married = isMarried(L);

  const handleCopyPhone = () => {
    if (L.phone) {
      navigator.clipboard.writeText(L.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 1500);
    }
  };

  const handleAddNote = () => {
    if (noteText.trim()) {
      addLeadNote(L.id, noteKind, noteText);
      setNoteText('');
    }
  };

  const handleDelete = () => {
    if (!delArmed) {
      setDelArmed(true);
      setTimeout(() => setDelArmed(false), 4000);
    } else {
      deleteLead(L.id);
      setDelArmed(false);
    }
  };

  // Verification fields list
  const vFields = fe
    ? [
        'firstName',
        'lastName',
        'dob',
        'age',
        'phone',
        'email',
        'state',
        'location',
        'amountRequested',
        'beneficiary',
        'benRel',
        'hasLife',
        'heartStrokeCancer'
      ]
    : [
        'firstName',
        'phone',
        'email',
        'address',
        'loanAmount',
        'age',
        'dob',
        ...(married ? ['spouseName', 'spouseAge', 'spouseDob'] : [])
      ];

  const verifiedCount = vFields.filter(k => L.v?.[k]).length;
  const currentStageIndex = STAGE_I[L.status];
  const tpls = fe ? TPL[L.opener || 'A'] : null;

  const writing = L.carrier ? writingFor(profile, L.carrier) : [];

  return (
    <aside className="w-full lg:w-[340px] flex-shrink-0 bg-[var(--surface)] border border-[var(--rule)] rounded-xl flex flex-col max-h-none lg:max-h-[calc(100vh-84px)] lg:sticky lg:top-[76px] overflow-y-auto shadow-xs divide-y divide-[var(--rule)]">
      {/* Lead Card Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--muted)]">
          <span className="uppercase tracking-wider">Lead Card</span>
          {L.sample && (
            <span className="font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded text-[9.5px]">
              SAMPLE LEAD
            </span>
          )}
        </div>

        <div>
          <h2 className="font-display font-bold text-lg text-[var(--ink)] leading-snug">
            {fullName(L)}
            {!fe && married && L.spouseName ? ` & ${L.spouseName}` : ''}
          </h2>

          <div className="flex items-center gap-2 mt-1">
            {L.phone ? (
              <>
                <span className="font-mono text-sm font-semibold text-[var(--ink)]">
                  {L.phone}
                </span>
                <button
                  type="button"
                  onClick={() => openCommDrawer(L, 'dialer')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="Open Softphone Dialpad"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Dial</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCommDrawer(L, 'sms')}
                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white text-[var(--accent)] flex items-center gap-1 transition-all cursor-pointer"
                  title="Open Two-Way SMS Messenger Drawer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>SMS</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="px-2 py-1 rounded text-[11px] border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--accent)] flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedPhone ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-amber-600 italic">No phone on file</span>
            )}
            <span className="text-xs text-[var(--muted)] ml-auto font-mono">
              {L.dials || 0} dial{L.dials === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Lead Type Switcher */}
        <div className="flex bg-[var(--surface-2)] border border-[var(--rule)] rounded-lg p-0.5 text-xs">
          <button
            type="button"
            onClick={() => updateLead(L.id, { type: 'mp' })}
            className={`flex-1 py-1 rounded-md font-semibold transition-all ${
              !fe ? 'bg-[var(--accent)] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Mortgage Protection
          </button>
          <button
            type="button"
            onClick={() => updateLead(L.id, { type: 'fe' })}
            className={`flex-1 py-1 rounded-md font-semibold transition-all ${
              fe ? 'bg-[#7a3f8f] text-white shadow-xs' : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            Final Expense
          </button>
        </div>

        {/* Stage Stepper */}
        <div>
          <span className="text-[11px] font-semibold text-[var(--muted)] block mb-1.5">
            Pipeline Stage
          </span>
          <div className="flex flex-wrap gap-1">
            {STAGES.map(([stVal, stLabel], idx) => {
              const isCur = L.status === stVal;
              const isDone = currentStageIndex !== undefined && idx < currentStageIndex;
              return (
                <button
                  key={stVal}
                  type="button"
                  onClick={() => setLeadStage(L.id, stVal as Stage)}
                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer ${
                    isCur
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] font-bold shadow-xs'
                      : isDone
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-transparent'
                      : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--rule)] hover:border-[var(--accent)]'
                  }`}
                >
                  {stLabel}
                </button>
              );
            })}
            {PARKED.map(([stVal, stLabel]) => {
              const isCur = L.status === stVal;
              return (
                <button
                  key={stVal}
                  type="button"
                  onClick={() => setLeadStage(L.id, stVal as Stage)}
                  className={`px-2 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer ${
                    isCur
                      ? stVal === 'callback'
                        ? 'bg-amber-600 text-white font-bold border-amber-600'
                        : 'bg-rose-600 text-white font-bold border-rose-600'
                      : 'bg-[var(--surface-2)] text-[var(--muted)] border-[var(--rule)]'
                  }`}
                >
                  {stLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Dial Log Buttons */}
        <div className="pt-1">
          <span className="text-[11px] font-semibold text-[var(--muted)] block mb-1.5">
            Log Attempt
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => logLeadDial(L.id, 'na')}
              className="py-1 px-2 text-xs rounded border border-[var(--rule)] bg-[var(--surface-2)] hover:border-[var(--accent)] text-[var(--ink)]"
            >
              No answer
            </button>
            <button
              type="button"
              onClick={() => logLeadDial(L.id, 'vm')}
              className="py-1 px-2 text-xs rounded border border-[var(--rule)] bg-[var(--surface-2)] hover:border-[var(--accent)] text-[var(--ink)]"
            >
              Left voicemail
            </button>
            <button
              type="button"
              onClick={() => logLeadDial(L.id, 'text')}
              className="py-1 px-2 text-xs rounded border border-[var(--rule)] bg-[var(--surface-2)] hover:border-[var(--accent)] text-[var(--ink)]"
            >
              Sent text
            </button>
            <button
              type="button"
              onClick={() => logLeadDial(L.id, 'talk')}
              className="py-1 px-2 text-xs rounded bg-[var(--action)] text-white font-bold hover:brightness-110 shadow-xs"
            >
              Talked
            </button>
          </div>
        </div>
      </div>

      {/* Next Follow-up Section */}
      <div className="p-4 space-y-2.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Next Follow-up
        </span>
        <div className="space-y-2">
          <div>
            <label className="block text-[11px] text-[var(--muted)] mb-0.5">When</label>
            <input
              type="datetime-local"
              value={L.followAt || ''}
              onChange={e => updateLead(L.id, { followAt: e.target.value })}
              className="w-full p-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--muted)] mb-0.5">What for</label>
            <input
              type="text"
              value={L.followWhat || ''}
              onChange={e => updateLead(L.id, { followWhat: e.target.value })}
              placeholder="e.g. Call back with quote from Americo"
              className="w-full p-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
            />
          </div>
          {!fe && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--rule)]">
              <div>
                <label className="block text-[11px] text-[var(--muted)] mb-0.5">Appt Date</label>
                <input
                  type="date"
                  value={L.apptDay || ''}
                  onChange={e => updateLead(L.id, { apptDay: e.target.value })}
                  className="w-full p-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--muted)] mb-0.5">Appt Time</label>
                <input
                  type="text"
                  value={L.apptTime || ''}
                  onChange={e => updateLead(L.id, { apptTime: e.target.value })}
                  placeholder="6:45 pm"
                  className="w-full p-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notes & Activity Log */}
      <div className="p-4 space-y-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" /> Notes and Activity
        </span>

        <div className="space-y-2">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a call note, promises made, next steps..."
            rows={2}
            className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)] outline-hidden focus:border-[var(--accent)]"
          />
          <div className="flex gap-2">
            <select
              value={noteKind}
              onChange={e => setNoteKind(e.target.value as any)}
              className="p-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)]"
            >
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="vm">Voicemail</option>
              <option value="text">Text</option>
            </select>
            <button
              type="button"
              onClick={() => {
                if (noteKind === 'text' && L.phone) {
                  sendSms(L.id, L.phone, noteText);
                  setNoteText('');
                } else {
                  handleAddNote();
                }
              }}
              disabled={!noteText.trim()}
              className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>{noteKind === 'text' ? 'Send 10DLC SMS' : 'Add to activity'}</span>
            </button>
          </div>
        </div>

        {/* Activity feed */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {L.log && L.log.length > 0 ? (
            L.log.map((entry, idx) => (
              <div key={idx} className="text-xs p-2 rounded-lg bg-[var(--surface-2)] space-y-0.5">
                <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                  <span className="font-mono uppercase font-bold text-[var(--accent)]">
                    {entry.k}
                  </span>
                  <span>{fmtDT(entry.t)}</span>
                </div>
                <div className="text-[var(--ink)] whitespace-pre-wrap">{entry.x}</div>
              </div>
            ))
          ) : (
            <div className="text-xs text-[var(--muted)] italic">No activity yet.</div>
          )}
        </div>
      </div>

      {/* Field Verification Checklist */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold">
            Verify the Lead
          </span>
          <span className="font-mono text-xs font-bold text-[var(--accent)]">
            {verifiedCount} of {vFields.length}
          </span>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
          {vFields.map(field => {
            const val = getVShow(field, L);
            const status = L.v?.[field];
            const meta = VF_META[field];
            return (
              <div
                key={field}
                className="flex items-center justify-between py-1 border-b border-[var(--rule)]/60 gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-[var(--muted)]">{meta?.label || field}</div>
                  <div className="font-semibold text-[var(--ink)] truncate font-mono">
                    {val || <span className="text-amber-600 font-normal italic">not on lead</span>}
                  </div>
                  {status === 'fixed' && L.orig?.[field] && (
                    <div className="text-[10px] text-[var(--muted)]">Lead had: {L.orig[field]}</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleVerification(L.id, field)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all flex-shrink-0 ${
                    status === 'ok'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300'
                      : status === 'fixed'
                      ? 'bg-amber-100 text-amber-800 border-amber-400 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-[var(--surface-2)] text-[var(--muted)] border-[var(--rule)] hover:border-[var(--accent)]'
                  }`}
                >
                  {status === 'ok' ? 'Verified' : status === 'fixed' ? 'Corrected' : 'Verify'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Snapshot Card */}
      <div className="p-4 space-y-2 text-xs">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold">
          Snapshot
        </span>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--rule)] font-mono">
          <div><span className="text-[var(--muted)] block text-[10px]">Age:</span> <b>{ageOf(L) || '—'}</b></div>
          <div><span className="text-[var(--muted)] block text-[10px]">State:</span> <b>{stName(L.state) || '—'}</b></div>
          <div>
            <span className="text-[var(--muted)] block text-[10px]">{fe ? 'Requested:' : 'Loan:'}</span>
            <b>{fe ? L.amountRequested || '—' : money(num(L.loanAmount)) || '—'}</b>
          </div>
          <div>
            <span className="text-[var(--muted)] block text-[10px]">{fe ? 'Budget:' : 'Payment:'}</span>
            <b>{fe ? (L.budget ? money(num(L.budget)) + '/mo' : '—') : (L.monthlyPayment ? money(num(L.monthlyPayment)) + '/mo' : '—')}</b>
          </div>
          <div className="col-span-2">
            <span className="text-[var(--muted)] block text-[10px]">Beneficiary:</span>
            <b>{L.benFull || L.beneficiary || '—'}</b>
          </div>
        </div>
      </div>

      {/* Policy Section (Accordion) */}
      <div className="p-4">
        <details open={['quoted', 'app', 'inforce'].includes(L.status)} className="group">
          <summary className="font-bold text-xs cursor-pointer list-none flex items-center justify-between text-[var(--ink)]">
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-[var(--accent)]" /> Policy Details
            </span>
            <ChevronDown className="w-4 h-4 text-[var(--muted)] group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[var(--muted)] block mb-0.5">Carrier</label>
                <input
                  type="text"
                  value={L.carrier || ''}
                  onChange={e => updateLead(L.id, { carrier: e.target.value })}
                  placeholder="e.g. Mutual of Omaha"
                  className="w-full p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--muted)] block mb-0.5">Coverage</label>
                <input
                  type="text"
                  value={L.polCov || ''}
                  onChange={e => updateLead(L.id, { polCov: e.target.value })}
                  placeholder="$"
                  className="w-full p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--muted)] block mb-0.5">Premium / mo</label>
                <input
                  type="text"
                  value={L.polPrem || ''}
                  onChange={e => updateLead(L.id, { polPrem: e.target.value })}
                  placeholder="$ / mo"
                  className="w-full p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--muted)] block mb-0.5">App Date</label>
                <input
                  type="date"
                  value={L.appDate || ''}
                  onChange={e => updateLead(L.id, { appDate: e.target.value })}
                  className="w-full p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--muted)] block mb-0.5">Draft Day</label>
                <input
                  type="text"
                  value={L.draftDate || ''}
                  onChange={e => updateLead(L.id, { draftDate: e.target.value })}
                  placeholder="e.g. 3rd"
                  className="w-full p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-[var(--muted)] block mb-0.5">Policy Number</label>
                <input
                  type="text"
                  value={L.policyNo || ''}
                  onChange={e => updateLead(L.id, { policyNo: e.target.value })}
                  placeholder="POL-12345"
                  className="w-full p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono"
                />
              </div>
            </div>

            {L.carrier && writing.length > 0 && (
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded border border-emerald-300 text-[11px] text-emerald-900 dark:text-emerald-300">
                Writing number: <b>{writing[0].num}</b> ({writing[0].status})
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Objection Handling / Voicemail Templates (FE) */}
      {fe ? (
        <>
          <div className="p-4">
            <details className="group">
              <summary className="font-bold text-xs cursor-pointer list-none flex items-center justify-between text-[var(--ink)]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#7a3f8f]" /> Objection Handling (10 Scripts)
                </span>
                <ChevronDown className="w-4 h-4 text-[var(--muted)] group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 space-y-3 text-xs">
                {OBJ.map(([theySay, behindIt, sayThis, tip], i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rule)] space-y-1">
                    <div className="font-bold text-[var(--ink)]">{theySay}</div>
                    <div className="text-[11px] text-[var(--muted)] italic">Why: {behindIt}</div>
                    <div className="text-xs pt-1 border-t border-[var(--rule)]/60 text-[var(--ink)]">
                      <FormattedScriptText text={sayThis} lead={L} />
                    </div>
                    {tip && (
                      <div className="text-[11px] text-[var(--accent)] font-medium pt-0.5">
                        <FormattedScriptText text={tip} lead={L} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </div>

          <div className="p-4">
            <details className="group">
              <summary className="font-bold text-xs cursor-pointer list-none flex items-center justify-between text-[var(--ink)]">
                <span className="flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-[#7a3f8f]" /> Voicemail & Text Templates
                </span>
                <ChevronDown className="w-4 h-4 text-[var(--muted)] group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-3 space-y-3 text-xs">
                {tpls?.map(([title, body], i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rule)] space-y-1.5">
                    <div className="font-bold text-[var(--ink)] flex items-center justify-between">
                      <span>{title}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(body);
                          setCopiedTplIdx(i);
                          setTimeout(() => setCopiedTplIdx(null), 1500);
                        }}
                        className="text-[11px] px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--rule)] hover:border-[var(--accent)] cursor-pointer"
                      >
                        {copiedTplIdx === i ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      <FormattedScriptText text={body} lead={L} />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </>
      ) : (
        <div className="p-4">
          <details className="group">
            <summary className="font-bold text-xs cursor-pointer list-none flex items-center justify-between text-[var(--ink)]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" /> Power Phrases
              </span>
              <ChevronDown className="w-4 h-4 text-[var(--muted)] group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-2 text-xs text-[var(--ink)]">
              <div className="p-2 bg-[var(--surface-2)] rounded border border-[var(--rule)] font-medium">"That's exactly why I'm calling."</div>
              <div className="p-2 bg-[var(--surface-2)] rounded border border-[var(--rule)] font-medium">"Here's what we're going to do."</div>
              <div className="p-2 bg-[var(--surface-2)] rounded border border-[var(--rule)] font-medium">"Grab a pen and let me know when you're ready."</div>
              <div className="p-2 bg-[var(--surface-2)] rounded border border-[var(--rule)] text-[11px] text-[var(--muted)]">
                <b>If they say "Can you just email me?"</b><br />
                "That's a great idea! I'll be super brief. Let me verify your information quickly, then I'll get your options out to you."
              </div>
            </div>
          </details>
        </div>
      )}

      {/* All Lead Fields Accordion */}
      <div className="p-4">
        <details className="group">
          <summary className="font-bold text-xs cursor-pointer list-none flex items-center justify-between text-[var(--ink)]">
            <span>All Lead Fields</span>
            <ChevronDown className="w-4 h-4 text-[var(--muted)] group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            {LEAD_FIELDS.map(([key, label]) => (
              <div key={key}>
                <label className="text-[11px] text-[var(--muted)] block mb-0.5">{label}</label>
                <input
                  type="text"
                  value={(L as any)[key] || ''}
                  onChange={e => updateLead(L.id, { [key]: e.target.value })}
                  className="w-full p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                />
              </div>
            ))}
            {L.extra && Object.keys(L.extra).length > 0 && (
              <div className="pt-2 border-t border-[var(--rule)]">
                <span className="font-bold text-[11px] text-[var(--muted)] block mb-1">Extra Sheet Columns</span>
                {Object.entries(L.extra).map(([k, v]) => (
                  <div key={k} className="text-[11px] text-[var(--muted)] py-0.5">
                    <b>{k}:</b> {v}
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Danger Zone: Delete Lead */}
      <div className="p-4">
        <button
          type="button"
          onClick={handleDelete}
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            delArmed
              ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
              : 'border-[var(--rule)] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{delArmed ? 'Tap again to confirm delete' : 'Delete lead'}</span>
        </button>
      </div>
    </aside>
  );
};
