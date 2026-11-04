import React from 'react';
import { useApp } from '../context/AppContext';
import { FormattedScriptText } from './FormattedScriptText';
import {
  isFE,
  autoOpener,
  op,
  ageText,
  road,
  optLabel,
  chosenText,
  num,
  money,
  money2,
  clientTime,
  licensedList,
  licFor,
  qpUrl,
  qpParams,
  qpBase,
  writingFor,
  dayLabel,
  addDays
} from '../utils/calculations';
import {
  STATUS_L,
  HQ,
  DELIV,
  FE_TIER,
  stName,
  stAbbr
} from '../constants/data';
import {
  Clock,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Copy,
  CheckCircle,
  PhoneCall,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  MessageSquare,
  Phone
} from 'lucide-react';

export const ScriptView: React.FC = () => {
  const {
    activeLead,
    updateLead,
    setLeadStage,
    logLeadDial,
    profile,
    stats,
    settings,
    openCommDrawer
  } = useApp();

  if (!activeLead) {
    return (
      <section className="flex-1 max-w-[780px] mx-auto w-full p-8 text-center bg-[var(--surface)] border border-dashed border-[var(--rule)] rounded-xl my-4">
        <h2 className="font-display font-bold text-xl text-[var(--ink)]">No Lead Selected</h2>
        <p className="text-xs text-[var(--muted)] mt-1">Select a lead from the queue or import a spreadsheet to start dialing.</p>
      </section>
    );
  }

  const L = activeLead;
  const fe = isFE(L);
  const currentStep = L.step || 1;
  const currentOpener = op(L);

  const setField = (field: string, val: any) => {
    updateLead(L.id, { [field]: val });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Helper renderers for script elements
  const Say: React.FC<{ children: React.ReactNode; sm?: boolean }> = ({ children, sm }) => {
    const textContent = React.Children.toArray(children)
      .map(c => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
      .join('');
    return (
      <p className={`font-body font-normal text-[var(--ink)] leading-relaxed max-w-[66ch] ${sm ? 'text-[16px]' : 'text-[18px] md:text-[19px]'}`}>
        <FormattedScriptText text={textContent} lead={L} />
      </p>
    );
  };

  const Cue: React.FC<{ label?: string; children: React.ReactNode; isRule?: boolean }> = ({
    label = 'Cue',
    children,
    isRule
  }) => (
    <p className="text-xs text-[var(--muted)] flex items-baseline gap-2 max-w-[70ch]">
      <span
        className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-semibold flex-shrink-0 ${
          isRule
            ? 'text-rose-600 border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40'
            : 'border-[var(--rule)] text-[var(--muted)] bg-[var(--surface-2)]'
        }`}
      >
        {label}
      </span>
      <span>{children}</span>
    </p>
  );

  const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--rule)] text-xs text-[var(--muted)] max-w-[70ch]">
      {children}
    </div>
  );

  const Sub: React.FC<{ children: string }> = ({ children }) => (
    <h4 className="font-display font-bold text-base text-[var(--ink)] mt-3 mb-1">
      {children}
    </h4>
  );

  // Dial Outcome Buttons Row
  const DialRow = () => (
    <div className="p-3 bg-[var(--surface-2)] border border-[var(--rule)] rounded-xl flex flex-wrap items-center justify-between gap-2.5 my-2">
      <span className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5">
        <PhoneCall className="w-3.5 h-3.5 text-[var(--action)]" />
        <span>Log this call attempt:</span>
      </span>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => logLeadDial(L.id, 'na')}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
        >
          No answer
        </button>
        <button
          type="button"
          onClick={() => logLeadDial(L.id, 'vm')}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
        >
          Left voicemail
        </button>
        <button
          type="button"
          onClick={() => logLeadDial(L.id, 'text')}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all cursor-pointer"
        >
          Sent text
        </button>
        <button
          type="button"
          onClick={() => logLeadDial(L.id, 'talk')}
          className="px-3 py-1 text-xs font-bold rounded-md bg-[var(--action)] text-white hover:brightness-110 shadow-xs transition-all cursor-pointer"
        >
          Talked
        </button>

        <div className="h-4 w-px bg-[var(--rule)] mx-1" />

        <button
          type="button"
          onClick={() => openCommDrawer(L, 'dialer')}
          className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-all shadow-xs cursor-pointer"
          title="Open Softphone Dialpad Drawer"
        >
          <Phone className="w-3 h-3" />
          <span>Softphone</span>
        </button>

        <button
          type="button"
          onClick={() => openCommDrawer(L, 'sms')}
          className="px-2.5 py-1 text-xs font-bold rounded-md bg-[var(--accent)] hover:brightness-110 text-white flex items-center gap-1 transition-all shadow-xs cursor-pointer"
          title="Open Two-Way SMS Thread"
        >
          <MessageSquare className="w-3 h-3" />
          <span>SMS Drawer</span>
        </button>
      </div>
    </div>
  );

  // Compliance card for FE
  const FEComplianceBox = () => {
    const ab = stAbbr(L.state);
    const licStates = licensedList(profile);
    const isLicensed = ab ? licStates.includes(ab) : false;
    const t = clientTime(L.state);
    const inHours = t ? t.h >= 8 && t.h < 21 : true;
    const hoursOld = ageText(L);
    const suggestedOpener = autoOpener(L);

    return (
      <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
        isLicensed && inHours
          ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-900/60'
          : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
      }`}>
        <div className="flex items-start gap-2.5">
          {isLicensed ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="space-y-1">
            <div>
              {ab ? (
                isLicensed ? (
                  <span>
                    <b className="font-semibold text-emerald-800 dark:text-emerald-300">{stName(ab)}:</b> You are licensed here
                    {licFor(profile, ab) && (
                      <span className="font-mono ml-1.5 font-bold">· license {licFor(profile, ab)}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-rose-700 dark:text-rose-300 font-semibold">
                    {stName(ab)}: NOT one of your licensed states! Do not quote or write.
                  </span>
                )
              ) : (
                <span className="text-amber-700 dark:text-amber-300">
                  No state on lead. Confirm client's state before quoting.
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[var(--muted)]">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Client local time: <b className="text-[var(--ink)] font-mono">{t?.txt || '—'}</b>{' '}
                {t ? (
                  inHours ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">(Inside 8 a.m. – 9 p.m. window)</span>
                  ) : (
                    <span className="text-rose-600 font-bold">(Outside 8 a.m. – 9 p.m. Wait to call!)</span>
                  )
                ) : (
                  '(8 a.m. – 9 p.m. window)'
                )}
              </span>
            </div>

            <div className="text-[11px] text-[var(--muted)] pt-1">
              Lead is <b>{hoursOld}</b> → Suggested <b className="text-[var(--action)]">Opener {suggestedOpener}</b>{' '}
              ({suggestedOpener === 'A' ? 'fresh 0–72h: speed to dial' : 'aged: 1–2 calls/day, test times'})
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Quoteplicity Card
  const QuoteplicityBox = () => {
    const base = qpBase(L, profile);
    const qUrl = qpUrl(L, profile);
    const params = qpParams(L, profile);

    if (!base.u) {
      return (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 space-y-2">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Quoteplicity Link Setup
          </div>
          <p>
            Add your Quoteplicity quote links in <b>Profile → Quoting</b> to enable 1-click pre-filled quoting from this lead.
          </p>
        </div>
      );
    }

    return (
      <div className="p-4 rounded-xl border border-[var(--rule)] bg-[var(--surface-2)] text-xs space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-display font-bold text-sm text-[var(--ink)] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" /> Quoteplicity · Pre-filled Lead
          </h4>
          <span className="text-[11px] font-mono text-[var(--muted)]">{fe ? 'Final Expense' : 'Mortgage Protection'}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--rule)]">
          <div><span className="text-[var(--muted)] block">State:</span> <b>{params.state || '—'}</b></div>
          <div><span className="text-[var(--muted)] block">DOB:</span> <b>{params.dob || '—'}</b></div>
          <div><span className="text-[var(--muted)] block">Gender:</span> <b>{params.gender || '—'}</b></div>
          <div><span className="text-[var(--muted)] block">Coverage:</span> <b>{params.coverage_amount ? money(+params.coverage_amount) : '—'}</b></div>
          <div><span className="text-[var(--muted)] block">Height:</span> <b>{params.height_ft ? `${params.height_ft}' ${params.height_in}″` : '—'}</b></div>
          <div><span className="text-[var(--muted)] block">Weight:</span> <b>{params.weight ? `${params.weight} lb` : '—'}</b></div>
          <div><span className="text-[var(--muted)] block">Nicotine:</span> <b>{params.nicotine || 'never'}</b></div>
          <div><span className="text-[var(--muted)] block">Health:</span> <b>{params.health || 'Standard'}</b></div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <a
            href={qUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-[var(--action)] text-white font-bold text-xs flex items-center gap-1.5 hover:brightness-110 shadow-xs transition-all cursor-pointer"
          >
            <span>Open Pre-filled Quote</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => {
              const summary = `Client: ${L.firstName || ''} ${L.lastName || ''}\nState: ${L.state || ''}\nDOB: ${L.dob || ''}\nCoverage: ${params.coverage_amount || ''}\nMeds: ${L.meds || 'None'}`;
              copyToClipboard(summary);
            }}
            className="px-3 py-2 rounded-lg border border-[var(--rule)] bg-[var(--surface)] text-[var(--ink)] text-xs font-medium hover:border-[var(--accent)] flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3 h-3 text-[var(--muted)]" />
            <span>Copy summary</span>
          </button>
        </div>
      </div>
    );
  };

  // Section letters list
  const sectionNav = fe
    ? [
        { id: 'pre', tag: 'C', title: 'Compliance' },
        { id: 'oa', tag: 'O', title: 'Opener' },
        { id: 'why', tag: 'W', title: 'Why' },
        { id: 'cost', tag: 'W', title: 'Cost Edu' },
        { id: 'ff', tag: 'F', title: 'Fact-finder' },
        { id: 'hq', tag: 'H', title: 'Health' },
        { id: 'qt', tag: 'Q', title: 'Quote' },
        { id: 'pc', tag: 'P', title: 'Close' },
        { id: 'ap', tag: 'A', title: 'Application' },
        { id: 'li', tag: 'L', title: 'Lock-in' }
      ]
    : currentStep === 1
    ? [
        { id: 'b', tag: 'B', title: 'Be busy' },
        { id: 'e1', tag: 'E', title: 'Reason calling' },
        { id: 'e2', tag: 'E', title: 'The why' },
        { id: 'cqf', tag: 'E', title: 'CQF questions' },
        { id: 'piv', tag: 'S', title: 'Pivot' },
        { id: 'set', tag: 'S', title: 'Set appointment' },
        { id: 'tie', tag: 'T', title: 'Tie down' }
      ]
    : [
        { id: 'rap', tag: 'R', title: 'Rapport' },
        { id: 'tr', tag: 'R', title: 'Transition' },
        { id: 'mp', tag: 'R', title: 'Mortgage protection' },
        { id: 'role', tag: 'R', title: 'Role & purpose' },
        { id: 'hl', tag: 'E', title: 'Verify health' },
        { id: 'fif', tag: 'E', title: 'Financial (FIF)' },
        { id: 'exp', tag: 'E', title: 'Budget' },
        { id: 'cash', tag: 'E', title: 'Cash flow' },
        { id: 'cfa', tag: 'E', title: 'Analysis' },
        { id: 'qq', tag: 'E', title: 'Quality Qs' },
        { id: 'tai', tag: 'A', title: 'Think about it' },
        { id: 'prog', tag: 'A', title: 'Explain programs' },
        { id: 'opt', tag: 'A', title: 'Show options' },
        { id: 'close', tag: 'A', title: 'Close' },
        { id: 'app', tag: 'A', title: 'Application' },
        { id: 'lock', tag: 'L', title: 'Lock it down' },
        { id: 'ref', tag: 'L', title: 'Referrals' },
        { id: 'reset', tag: 'L', title: 'Reset' },
        { id: 'svy', tag: 'L', title: 'Client survey' }
      ];

  const scrollToSec = (id: string) => {
    const el = document.getElementById(`sec-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="flex-1 max-w-[780px] w-full mx-auto pb-16">
      {/* Script Header */}
      <div className="pb-4 border-b border-[var(--rule)] mb-4">
        <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold">
          {fe
            ? `Final expense · one call · ${ageText(L)}`
            : `Step ${currentStep} of 2 · ${currentStep === 1 ? 'Phone Call' : 'Appointment'}`}
        </div>
        <h2 className="font-display font-bold text-2xl md:text-3xl text-[var(--ink)] mt-0.5">
          {fe
            ? 'Final expense call'
            : currentStep === 1
            ? 'Set the appointment'
            : 'The presentation'}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)] mt-1.5">
          <span className="font-bold text-[var(--ink)]">
            {L.firstName} {L.lastName}
            {!fe && L.spouseName ? ` & ${L.spouseName}` : ''}
          </span>
          {L.phone && <span className="font-mono">{L.phone}</span>}
          <span>{L.city ? `${L.city}, ${L.state || ''}` : L.state || ''}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--rule)]">
            {STATUS_L[L.status] || L.status}
          </span>
        </div>
      </div>

      {/* Sticky Outline Nav */}
      <nav className="sticky top-[60px] z-30 bg-[var(--bg)]/90 backdrop-blur-md py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[var(--rule)] mb-5">
        {sectionNav.map(sec => (
          <button
            key={sec.id}
            type="button"
            onClick={() => scrollToSec(sec.id)}
            className="flex-shrink-0 px-2.5 py-1 text-xs rounded-full border border-[var(--rule)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)] transition-all cursor-pointer font-medium"
          >
            <b className={`font-display mr-1 ${fe ? 'text-[#7a3f8f] dark:text-[#d7a6ea]' : 'text-[var(--accent)]'}`}>
              {sec.tag}
            </b>
            {sec.title}
          </button>
        ))}
      </nav>

      {/* Script Sections */}
      <div className="space-y-5">
        {fe ? (
          /* ========================================================================= */
          /*                          FINAL EXPENSE SCRIPT                             */
          /* ========================================================================= */
          <>
            {/* C: Before you dial */}
            <div id="sec-pre" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  C
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Before you dial</h3>
              </div>

              <FEComplianceBox />

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="text-xs text-[var(--muted)]">Opener mode:</div>
                <div className="flex bg-[var(--surface-2)] border border-[var(--rule)] rounded-full p-0.5">
                  <button
                    type="button"
                    onClick={() => setField('opener', 'A')}
                    className={`px-3 py-1 text-xs rounded-full font-medium ${
                      currentOpener === 'A' ? 'bg-[#7a3f8f] text-white font-bold' : 'text-[var(--muted)]'
                    }`}
                  >
                    Opener A · fresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setField('opener', 'B')}
                    className={`px-3 py-1 text-xs rounded-full font-medium ${
                      currentOpener === 'B' ? 'bg-[#7a3f8f] text-white font-bold' : 'text-[var(--muted)]'
                    }`}
                  >
                    Opener B · aged
                  </button>
                </div>

                <div className="flex items-center gap-1.5 ml-auto text-xs">
                  <span className="text-[var(--muted)]">DNC:</span>
                  <button
                    type="button"
                    onClick={() => setField('dncChecked', L.dncChecked === 'yes' ? 'no' : 'yes')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      L.dncChecked === 'yes'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-[var(--surface-2)] text-[var(--muted)] border-[var(--rule)]'
                    }`}
                  >
                    {L.dncChecked === 'yes' ? '✓ Scrubbed' : 'Not scrubbed'}
                  </button>
                </div>
              </div>

              <Cue isRule label="Rule">
                Say your name, that you're a licensed agent, and the agency name. Never say or imply this is a government, state, Medicare or Social Security program, and never call it "free."
              </Cue>

              <DialRow />
            </div>

            {/* O: Opener */}
            <div id="sec-oa" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  O
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">
                  {currentOpener === 'A' ? 'Opener A: fresh digital lead' : 'Opener B: aged lead'}
                </h3>
              </div>

              {currentOpener === 'A' ? (
                <>
                  <Cue label="Posture">
                    Speed wins. They just filled out the form, so you're returning their call, not cold calling. Fast, confident, "I'm getting back to you."
                  </Cue>
                  <Say>
                    "Hi, is this {'{{first}}'}? Hey {'{{first}}'}, this is {'{{agent}}'}, I'm a licensed insurance agent with {'{{agency}}'}. I'm getting back to you on the request you sent in {'{{when}}'} about final expense coverage, the plans that take care of burial and funeral costs. You remember filling that out?"
                  </Say>

                  <Cue label="Recording">If you record, say it right after they confirm who they are.</Cue>
                  <Say sm>"Just so you know, this call may be recorded for quality."</Say>

                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs text-[var(--muted)]">Client response:</span>
                    <button
                      type="button"
                      onClick={() => setField('remembers', 'yes')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        L.remembers === 'yes' ? 'bg-[#7a3f8f] text-white font-bold' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                      }`}
                    >
                      Remembers
                    </button>
                    <button
                      type="button"
                      onClick={() => setField('remembers', 'no')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        L.remembers === 'no' ? 'bg-[#7a3f8f] text-white font-bold' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                      }`}
                    >
                      Doesn't remember
                    </button>
                  </div>

                  {L.remembers === 'no' && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 space-y-2 text-sm">
                      <Say>
                        "No problem at all, it was a short form, probably on {'{{platform}}'}. It asked your age and who you'd want to take care of when you pass. You put down {'{{oneDetail}}'}. Ring a bell?"
                      </Say>
                    </div>
                  )}

                  <Sub>Confirm state and set agenda</Sub>
                  <Say>
                    "Perfect. And you're still in [[v:state]], right? Great. So here's how this works. I'm going to ask you a few questions, see exactly what you qualify for, and show you the prices. Takes about 15 minutes. If it makes sense, great. If not, no hard feelings. Fair enough?"
                  </Say>
                  <Say>
                    "Do you have a pen and paper handy? I'm going to give you some numbers you'll want to write down."
                  </Say>
                  <Cue>The pen and paper keeps them engaged and signals this is a real appointment, not a pitch.</Cue>
                </>
              ) : (
                <>
                  <Cue label="Posture">
                    They've been called before. Slow down, sound curious. Your only goal in the first minute is to find out if the need is still open.
                  </Cue>
                  <Say>
                    "Hi, is this {'{{first}}'}? {'{{first}}'}, this is {'{{agent}}'}, I'm a licensed agent with {'{{agency}}'}. This call may be recorded for quality. I'm following up on a request you put in a while back about burial insurance, and it looks like nobody ever finished helping you with it. Did you ever end up getting something in place?"
                  </Say>
                  <Cue>Then stop talking. Let them answer.</Cue>

                  <div className="space-y-2 pt-2">
                    <span className="text-xs text-[var(--muted)] block">Client answered:</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ['never', '"No, I never did"'],
                        ['got', '"Yes, I got something"'],
                        ['forgot', '"I don\'t remember asking"']
                      ].map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setField('agedBranch', val)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            L.agedBranch === val ? 'bg-[#7a3f8f] text-white' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {L.agedBranch === 'never' && (
                    <div className="space-y-2 pt-2">
                      <Say>"Okay, you're not alone. A lot of folks start looking and then life gets busy. What was it that got you looking into it in the first place?"</Say>
                      <textarea
                        value={L.why || ''}
                        onChange={e => setField('why', e.target.value)}
                        placeholder="Their why in their own words..."
                        className="w-full p-2.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)]"
                        rows={2}
                      />
                    </div>
                  )}

                  {L.agedBranch === 'got' && (
                    <div className="space-y-2 pt-2">
                      <Say>"Good for you, that's the most important thing. Out of curiosity, who did you go with, and do you know if it pays the full amount from day one, or is there a waiting period?"</Say>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={L.existingCarrier || ''}
                          onChange={e => setField('existingCarrier', e.target.value)}
                          placeholder="Who they went with..."
                          className="flex-1 p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                        />
                        <select
                          value={L.existingPays || ''}
                          onChange={e => setField('existingPays', e.target.value)}
                          className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                        >
                          <option value="">Waiting period or day one?</option>
                          <option value="wait">Waiting period / GI</option>
                          <option value="dayone">Day-one and happy</option>
                        </select>
                      </div>
                      {L.existingPays === 'wait' && (
                        <Say>"A lot of people get placed in a plan with a two- or three-year wait when their health would qualify them for day-one coverage. Would it be worth five minutes to see if you qualify for better? If not, you keep what you have."</Say>
                      )}
                    </div>
                  )}

                  {L.agedBranch === 'forgot' && (
                    <div className="space-y-2 pt-2">
                      <Say>"That's fair, it may have been a while. It was a short form about burial or final expense coverage, and it had your name and {'{{cityOrMonth}}'} on it. Is planning ahead for that something that's still on your mind, or should I take you off my list?"</Say>
                      <button
                        type="button"
                        onClick={() => setLeadStage(L.id, 'dnc')}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                      >
                        They want off: Mark Do Not Call
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* W: Rapport & Why */}
            <div id="sec-why" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  W
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Rapport and the "why"</h3>
              </div>

              {L.hobby && (
                <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 text-xs text-purple-900 dark:text-purple-200">
                  On the lead, their favorite hobby is: <b>{L.hobby}</b>. Work it into conversation!
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Say>"Before I get to the insurance questions, tell me a little about you. Who's in the family?"</Say>
                  <input
                    type="text"
                    value={L.family || ''}
                    onChange={e => setField('family', e.target.value)}
                    placeholder="Kids, grandkids, spouse..."
                    className="w-full mt-1.5 p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                  />
                </div>

                <div>
                  <Say>"If something happened to you tomorrow, who would be the one handling your arrangements?"</Say>
                  <input
                    type="text"
                    value={L.handler || ''}
                    onChange={e => setField('handler', e.target.value)}
                    placeholder="Name and relationship..."
                    className="w-full mt-1.5 p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                  />
                </div>

                <div>
                  <Say>"Have you ever had to bury a loved one? How was that paid for? Did they have coverage, or did the family have to come together?"</Say>
                  <textarea
                    value={L.pastFuneral || ''}
                    onChange={e => setField('pastFuneral', e.target.value)}
                    placeholder="Their story..."
                    className="w-full mt-1.5 p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                    rows={2}
                  />
                </div>

                <div>
                  <Say>"What made you want to look into this now?"</Say>
                  <textarea
                    value={L.why || ''}
                    onChange={e => setField('why', e.target.value)}
                    placeholder="Their why..."
                    className="w-full mt-1.5 p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                    rows={2}
                  />
                </div>

                <Say>"So if I'm hearing you right, the main thing is making sure {'{{beneficiary}}'} {'{{benIsnt}}'} stuck with the bill. Is that right?"</Say>
              </div>
            </div>

            {/* W: Cost Education */}
            <div id="sec-cost" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  W
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Cost education</h3>
              </div>
              <Say>
                "Do you have an idea what a funeral costs today? The national median for a funeral with a viewing and burial is about $8,300, closer to $10,000 with a burial vault, and that's before the cemetery plot and headstone. A cremation with a viewing runs about $6,300. Do you see yourself being buried or cremated?"
              </Say>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">Preference:</span>
                {['burial', 'cremation', 'unsure'].map(pref => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => setField('burialPref', pref)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border ${
                      L.burialPref === pref
                        ? 'bg-[#7a3f8f] text-white font-bold'
                        : 'bg-[var(--surface-2)] border-[var(--rule)]'
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>

            {/* F: Fact-finder */}
            <div id="sec-ff" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  F
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Fact-finder</h3>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-[var(--surface-2)] rounded-lg text-xs space-y-2">
                  <Say sm>"Let me confirm your full name and date of birth."</Say>
                  <div className="text-[var(--muted)]">
                    On lead: [[v:firstName]] [[v:lastName]] · born [[v:dob]] · age [[v:age]]
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-[var(--muted)]">Gender:</span>
                    {['Male', 'Female'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setField('gender', g)}
                        className={`px-3 py-0.5 rounded-full text-xs font-medium border ${
                          L.gender === g ? 'bg-[#7a3f8f] text-white font-bold' : 'bg-[var(--surface)] border-[var(--rule)]'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Say sm>"About how tall are you, and what do you weigh?"</Say>
                  <input
                    type="text"
                    value={L.hwA || ''}
                    onChange={e => setField('hwA', e.target.value)}
                    placeholder="e.g. 5'10, 180"
                    className="mt-1 p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs w-48 font-mono"
                  />
                </div>

                <div>
                  <Say sm>"Any tobacco or nicotine in the last 12 months, including vaping?"</Say>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setField('tobacco', 'no')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        L.tobacco === 'no' ? 'bg-emerald-600 text-white font-bold' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                      }`}
                    >
                      No tobacco
                    </button>
                    <button
                      type="button"
                      onClick={() => setField('tobacco', 'yes')}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        L.tobacco === 'yes' ? 'bg-rose-600 text-white font-bold' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                      }`}
                    >
                      Yes, tobacco
                    </button>
                  </div>
                </div>

                <div>
                  <Say sm>"Who would you want this to go to? What's their full name and relationship?"</Say>
                  <div className="text-xs text-[var(--muted)] mb-1">
                    On form: [[v:beneficiary]] · [[v:benRel]]
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={L.benFull || ''}
                      onChange={e => setField('benFull', e.target.value)}
                      placeholder="Beneficiary full legal name..."
                      className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                    />
                    <input
                      type="text"
                      value={L.benDob || ''}
                      onChange={e => setField('benDob', e.target.value)}
                      placeholder="Beneficiary DOB if known..."
                      className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Say sm>"Is your income Social Security, pension or work? What day of the month does it hit?"</Say>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['ss', 'pension', 'work', 'other'].map(src => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setField('incomeSource', src)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border uppercase ${
                          L.incomeSource === src ? 'bg-[#7a3f8f] text-white font-bold' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                        }`}
                      >
                        {src === 'ss' ? 'Social Security' : src}
                      </button>
                    ))}
                    <input
                      type="text"
                      value={L.payday || ''}
                      onChange={e => setField('payday', e.target.value)}
                      placeholder="e.g. 3rd, or 2nd Wed"
                      className="p-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs w-36 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <Say sm>"If we found the right plan, what monthly amount could you set aside without it taking food off the table?"</Say>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="text"
                      value={L.budget || ''}
                      onChange={e => setField('budget', e.target.value)}
                      placeholder="$ / month"
                      className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs w-36 font-mono font-bold"
                    />
                    <span className="text-xs text-[var(--muted)]">
                      Requested: [[v:amountRequested]]
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* H: Health Questions */}
            <div id="sec-hq" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  H
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Health questions</h3>
              </div>

              <Say>
                "Now a few health questions. Just answer as accurately as you can. The insurance company checks prescription and medical records, and being accurate now is what makes sure your family gets paid later."
              </Say>

              <div className="text-xs text-[var(--muted)]">
                On lead, history of heart attack, stroke or cancer: [[v:heartStrokeCancer]]
              </div>

              <div>
                <Say sm>"Easiest way to do this: can you grab your medication bottles and read me the names? Don't worry about the doses."</Say>
                <textarea
                  value={L.meds || ''}
                  onChange={e => setField('meds', e.target.value)}
                  placeholder="Medication names and what they are taken for..."
                  className="w-full mt-1.5 p-2.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                  rows={3}
                />
              </div>

              <Sub>Carrier Knockout / Underwriting Checklist</Sub>
              <div className="space-y-2 border-t border-[var(--rule)] pt-2">
                {HQ.map(([key, label]) => {
                  const val = (L as any)[key];
                  return (
                    <div key={key} className="flex items-center justify-between text-xs py-1 border-b border-[var(--rule)]/50">
                      <span className="text-[var(--ink)] pr-2">{label}</span>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setField(key, 'no')}
                          className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                            val === 'no' ? 'bg-emerald-600 text-white' : 'bg-[var(--surface-2)] text-[var(--muted)]'
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => setField(key, 'yes')}
                          className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                            val === 'yes' ? 'bg-rose-600 text-white' : 'bg-[var(--surface-2)] text-[var(--muted)]'
                          }`}
                        >
                          Yes
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Q: Run Quote */}
            <div id="sec-qt" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  Q
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Run the quote</h3>
              </div>
              <Say>"Give me about two minutes while I check which companies will approve you at the best price. Stay right there."</Say>
              <QuoteplicityBox />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Carrier Chosen</label>
                  <input
                    type="text"
                    value={L.carrier || ''}
                    onChange={e => setField('carrier', e.target.value)}
                    placeholder="e.g. Mutual of Omaha, Americo"
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Plan Underwriting</label>
                  <select
                    value={L.planType || 'level'}
                    onChange={e => setField('planType', e.target.value)}
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                  >
                    <option value="level">Level (Day One Coverage)</option>
                    <option value="graded">Graded (Waiting period)</option>
                    <option value="gi">Guaranteed Issue</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1">A.M. Best Rating</label>
                  <input
                    type="text"
                    value={L.amBest || 'A+ Superior'}
                    onChange={e => setField('amBest', e.target.value)}
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                  />
                </div>
              </div>

              {L.carrier && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 text-xs text-blue-950 dark:text-blue-200">
                  Writing numbers for <b>{L.carrier}</b>:{' '}
                  {writingFor(profile, L.carrier).map(w => (
                    <span key={w.id} className="font-mono font-bold mr-2">
                      {w.num} ({w.status})
                    </span>
                  ))}
                  <span className="ml-2 font-mono">· NPN: {profile.npn}</span>
                </div>
              )}
            </div>

            {/* P: Close (3 Options) */}
            <div id="sec-pc" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  P
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Three-option close</h3>
              </div>

              <Say>
                "Okay {'{{first}}'}, I've got good news. Based on what you told me, you qualify with {'{{carrier}}'}, a company rated {'{{amBest}}'}. Your plan is {'{{planLine}}'}."
              </Say>

              <Sub>Three Options (Gold, Silver, Bronze)</Sub>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map(idx => {
                  const tier = FE_TIER[idx - 1];
                  const isSelected = L.chosen === String(idx);
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-[var(--action)] bg-[var(--action-soft)] ring-2 ring-[var(--action)] shadow-sm'
                          : 'border-[var(--rule)] bg-[var(--surface)]'
                      }`}
                    >
                      <div className="font-display font-bold text-sm text-[var(--ink)]">{tier} Plan</div>
                      <div className="text-[11px] text-[var(--muted)] mb-2">
                        {idx === 1 ? 'Full funeral + extra' : idx === 2 ? 'Traditional funeral' : 'Basic / cremation'}
                      </div>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={(L as any)[`optCov${idx}`] || ''}
                          onChange={e => setField(`optCov${idx}`, e.target.value)}
                          placeholder="Coverage ($)"
                          className="w-full text-center p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono font-bold"
                        />
                        <input
                          type="text"
                          value={(L as any)[`optPrem${idx}`] || ''}
                          onChange={e => setField(`optPrem${idx}`, e.target.value)}
                          placeholder="Premium ($/mo)"
                          className="w-full text-center p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setField('chosen', String(idx));
                          setField('polCov', (L as any)[`optCov${idx}`]);
                          setField('polPrem', (L as any)[`optPrem${idx}`]);
                        }}
                        className={`w-full mt-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-[var(--action)] text-white shadow-xs'
                            : 'bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--rule)]'
                        }`}
                      >
                        {isSelected ? '✓ Selected' : 'Choose ' + tier}
                      </button>
                    </div>
                  );
                })}
              </div>

              <Say>"Which of those three fits best for you and your family?"</Say>
              <Cue>Then be quiet. Whoever talks first loses. If they pick one, move right into the application.</Cue>

              <button
                type="button"
                onClick={() => setLeadStage(L.id, 'quoted')}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110"
              >
                Mark quoted
              </button>
            </div>

            {/* A: Application & Bank Draft */}
            <div id="sec-ap" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  A
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Application & bank draft</h3>
              </div>
              <Say>
                "Great choice. Let's get you protected today. I'll fill out the application with you now, and the company will give us a decision, usually today or within a few days."
              </Say>
              <div className="p-3 bg-[var(--surface-2)] rounded-lg text-xs space-y-2">
                <div className="font-semibold text-[var(--ink)]">Application Checklist:</div>
                <ul className="list-disc pl-5 space-y-1 text-[var(--muted)]">
                  <li>Read every health question exactly as written on the carrier application.</li>
                  <li>Confirm beneficiary full legal name ({'{{benFull}}'}), relationship, and DOB.</li>
                  <li>Confirm mailing address and best phone number.</li>
                </ul>
              </div>

              <Sub>Payment Draft Date</Sub>
              <Say>
                "Most of my clients like to set the payment for right after their Social Security comes in, so it never gets in the way. You said yours comes on the {'{{payday}}'}. Should we set it for the {'{{draftDay}}'}?"
              </Say>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">Draft date agreed:</span>
                <input
                  type="text"
                  value={L.draftDate || ''}
                  onChange={e => setField('draftDate', e.target.value)}
                  placeholder="e.g. 4th of month"
                  className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs w-40 font-mono"
                />
              </div>

              <Cue isRule label="Rule">
                Enter bank details ONLY in the carrier's secure application. EST8 CallDesk never has a field for them to ensure full PCI/data compliance.
              </Cue>

              <button
                type="button"
                onClick={() => {
                  setLeadStage(L.id, 'app');
                  setField('appDate', new Date().toISOString().slice(0, 10));
                }}
                className="w-full py-3 rounded-xl bg-[var(--action)] text-white font-bold text-sm hover:brightness-110 shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Application submitted</span>
              </button>
            </div>

            {/* L: Lock-in and Referral */}
            <div id="sec-li" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#7a3f8f] text-white flex items-center justify-center font-display font-bold text-lg">
                  L
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Lock-in and referral</h3>
              </div>
              <Say>"Congratulations, {'{{first}}'}, you've done something most people never get around to. Let me tell you what happens next."</Say>
              <div className="space-y-2 text-sm text-[var(--ink)] pl-3 border-l-2 border-[#7a3f8f]">
                <p>1. "The company may call you for a short phone interview. Answer the same way you did with me."</p>
                <p>2. "Your policy will come in the mail in about 2 to 3 weeks. Put it somewhere your family can find it."</p>
                <p>3. "Save my number: {'{{agentPhone}}'}. If anyone ever calls about changing your coverage, will you call me first before you make any decision?"</p>
              </div>

              <Sub>Referral ask</Sub>
              <Say>
                "One last thing. Who else in your family or church would want the same peace of mind? I'll treat them exactly the way I treated you."
              </Say>
              <textarea
                value={L.referrals || ''}
                onChange={e => setField('referrals', e.target.value)}
                placeholder="Referrals: names and phone numbers..."
                className="w-full p-2.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                rows={3}
              />
            </div>
          </>
        ) : currentStep === 1 ? (
          /* ========================================================================= */
          /*                 MORTGAGE STEP 1: SET APPOINTMENT (B.E.S.T.)               */
          /* ========================================================================= */
          <>
            {/* B: Be busy */}
            <div id="sec-b" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  B
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Be busy</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--rule)]">
                  <div className="font-mono text-xl font-bold text-[var(--ink)]">{stats.dials}</div>
                  <div className="text-[11px] text-[var(--muted)]">dials this week · goal 500</div>
                  <div className="h-1.5 bg-[var(--rule)] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.min(100, stats.dials / 5)}%` }} />
                  </div>
                </div>
                <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--rule)]">
                  <div className="font-mono text-xl font-bold text-[var(--ink)]">{stats.appts}</div>
                  <div className="text-[11px] text-[var(--muted)]">appointments · goal 20</div>
                  <div className="h-1.5 bg-[var(--rule)] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, stats.appts * 5)}%` }} />
                  </div>
                </div>
                <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--rule)]">
                  <div className="font-mono text-xl font-bold text-[var(--ink)]">{L.dials || 0}</div>
                  <div className="text-[11px] text-[var(--muted)]">dials to this lead</div>
                </div>
              </div>

              <Note>
                Pick up the phone. This is a numbers game: the more dials, the more appointments, the more families you help. Most full-time agents make 500+ dials weekly.
              </Note>

              <DialRow />
            </div>

            {/* E: Establish reason calling */}
            <div id="sec-e1" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  E
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Establish the reason you're calling</h3>
              </div>
              <Cue label="Mindset">They sent in a request asking for help. Now it's your turn to help them get covered.</Cue>

              <Say>"Hey, {'{{first}}'}."</Say>
              <Cue>Wait for response.</Cue>

              <Say>"Hey, this is {'{{agent}}'}. I'm calling about your mortgage over at [[v:address]]. Looks like it's for [[v:loanAmount]]."</Say>
              <Cue>Pause and wait.</Cue>

              <Say>
                "I was getting back to you about the form you responded to regarding the mortgage protection coverage that would help pay the mortgage for your family if something were to happen. I just needed to quickly verify the information you provided so we can get those options worked up for you."
              </Say>

              <Say>"You had put down that you're [[v:age]]. Is that correct? And when do you turn {'{{nextAge}}'}? When's your birthday?"</Say>
              <div className="text-xs text-[var(--muted)]">Birthday on lead: [[v:dob]]</div>

              <div className="p-3 bg-[var(--surface-2)] rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-[var(--ink)]">Married, or a spouse on the loan?</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setField('married', 'yes')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      L.married === 'yes' ? 'bg-[var(--accent)] text-white font-bold' : 'bg-[var(--surface)] border-[var(--rule)]'
                    }`}
                  >
                    Married
                  </button>
                  <button
                    type="button"
                    onClick={() => setField('married', 'no')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      L.married === 'no' ? 'bg-[var(--accent)] text-white font-bold' : 'bg-[var(--surface)] border-[var(--rule)]'
                    }`}
                  >
                    Single
                  </button>
                </div>
                {L.married === 'yes' && (
                  <div className="pt-2 space-y-2">
                    <input
                      type="text"
                      value={L.spouseName || ''}
                      onChange={e => setField('spouseName', e.target.value)}
                      placeholder="Spouse name..."
                      className="p-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface)] text-xs w-48"
                    />
                    <Say sm>"And I have {'{{spouse}}'}'s age as [[v:spouseAge]] and date of birth as [[v:spouseDob]]?"</Say>
                  </div>
                )}
              </div>
            </div>

            {/* E: The why */}
            <div id="sec-e2" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  E
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">The why: who's counting on them</h3>
              </div>
              <Say>
                "Now, one of the most common needs my clients have is that if something were to happen, their family would need to be able to keep paying bills, manage their life and kids, and take care of the mortgage. Is that how you feel?"
              </Say>
              <Say>"God forbid something were to happen to you, who would be financially responsible for the bills?"</Say>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={L.beneficiary || ''}
                  onChange={e => setField('beneficiary', e.target.value)}
                  placeholder="Beneficiary name..."
                  className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                />
                <input
                  type="text"
                  value={L.benRel || ''}
                  onChange={e => setField('benRel', e.target.value)}
                  placeholder="Relationship (spouse, children)..."
                  className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                />
              </div>

              <Say>"Can I ask, did you guys just buy your home, or did you refinance it?"</Say>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setField('purchaseType', 'bought')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    L.purchaseType === 'bought' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                  }`}
                >
                  Just bought
                </button>
                <button
                  type="button"
                  onClick={() => setField('purchaseType', 'refi')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    L.purchaseType === 'refi' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                  }`}
                >
                  Refinanced
                </button>
              </div>
            </div>

            {/* E: CQF */}
            <div id="sec-cqf" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  E
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Client qualification form (CQF)</h3>
              </div>

              <Say>"I have a couple of quick questions so I can make sure I'm looking at the right companies for you."</Say>

              <div className="space-y-3 divide-y divide-[var(--rule)]/60 text-xs">
                <div className="pt-2">
                  <span className="font-semibold block mb-1">1. Health & Medical issues:</span>
                  <input
                    type="text"
                    value={L.health || ''}
                    onChange={e => setField('health', e.target.value)}
                    placeholder="None, high blood pressure, etc..."
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                  />
                </div>

                <div className="pt-2">
                  <span className="font-semibold block mb-1">2. Nicotine / Tobacco (last 12 mo):</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setField('tobacco', 'no')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        L.tobacco === 'no' ? 'bg-emerald-600 text-white' : 'bg-[var(--surface-2)] border border-[var(--rule)]'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => setField('tobacco', 'yes')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        L.tobacco === 'yes' ? 'bg-rose-600 text-white' : 'bg-[var(--surface-2)] border border-[var(--rule)]'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="font-semibold block mb-1">3. Medications:</span>
                  <textarea
                    value={L.meds || ''}
                    onChange={e => setField('meds', e.target.value)}
                    placeholder="Medications and doses..."
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                    rows={2}
                  />
                </div>

                <div className="pt-2">
                  <span className="font-semibold block mb-1">4. Major surgeries or hospital stays (10 yrs):</span>
                  <input
                    type="text"
                    value={L.hospital || ''}
                    onChange={e => setField('hospital', e.target.value)}
                    placeholder="None, surgery date..."
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                  />
                </div>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold block mb-1">Height / Weight:</span>
                    <input
                      type="text"
                      value={L.hwA || ''}
                      onChange={e => setField('hwA', e.target.value)}
                      placeholder="e.g. 5'10, 180"
                      className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="font-semibold block mb-1">Occupation:</span>
                    <input
                      type="text"
                      value={L.occupation || ''}
                      onChange={e => setField('occupation', e.target.value)}
                      placeholder="e.g. Electrician, Nurse"
                      className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="font-semibold block mb-1">Monthly Mortgage Payment:</span>
                    <input
                      type="text"
                      value={L.monthlyPayment || ''}
                      onChange={e => setField('monthlyPayment', e.target.value)}
                      placeholder="$ / month"
                      className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="font-semibold block mb-1">Loan Term:</span>
                    <div className="flex gap-2">
                      {['30', '15', 'other'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setField('loanTerm', t)}
                          className={`flex-1 py-1 rounded-lg text-xs font-semibold border ${
                            L.loanTerm === t ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                          }`}
                        >
                          {t}-yr
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="font-semibold block mb-1">Main Concern & Goal:</span>
                  <input
                    type="text"
                    value={L.mainConcern || ''}
                    onChange={e => setField('mainConcern', e.target.value)}
                    placeholder="Their main concern in their words..."
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs"
                  />
                </div>
              </div>
            </div>

            {/* S: Pivot */}
            <div id="sec-piv" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  S
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Pivot: Present now or set appointment</h3>
              </div>
              <Say>
                "We've addressed a lot of things, and if you can stay with me, I can go over some options that will solve the issues we discussed. Does that work?"
              </Say>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted)]">Can they stay on now?</span>
                <button
                  type="button"
                  onClick={() => setField('stayNow', 'yes')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    L.stayNow === 'yes' ? 'bg-[var(--action)] text-white font-bold' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                  }`}
                >
                  Yes, present now
                </button>
                <button
                  type="button"
                  onClick={() => setField('stayNow', 'no')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    L.stayNow === 'no' ? 'bg-[var(--accent)] text-white font-bold' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                  }`}
                >
                  No, set appointment
                </button>
              </div>

              {L.stayNow === 'yes' ? (
                <button
                  type="button"
                  onClick={() => updateLead(L.id, { step: 2 })}
                  className="w-full py-2.5 rounded-xl bg-[var(--action)] text-white font-bold text-sm hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Go to Step 2: The Presentation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <Say sm>"I completely understand, I have a busy day too."</Say>
              )}
            </div>

            {/* S: Set Appointment & T: Tie Down */}
            {L.stayNow !== 'yes' && (
              <>
                <div id="sec-set" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                      S
                    </span>
                    <h3 className="font-display font-bold text-xl text-[var(--ink)]">Set the appointment</h3>
                  </div>
                  <Say>
                    "Okay, that makes a lot of sense. I have enough information to start shopping your case across all the carriers. Let me just pull up my calendar."
                  </Say>
                  <Cue label="Funnel">Two days, two timeframes, two times. Book within 48 hours.</Cue>

                  <div className="p-3 bg-[var(--surface-2)] rounded-lg text-xs flex gap-3 text-[var(--muted)]">
                    <span><b>Today:</b> {dayLabel(new Date())}</span>
                    <span>·</span>
                    <span><b>Tomorrow:</b> {dayLabel(addDays(1))}</span>
                  </div>

                  <Say>"I have a couple of openings either today or tomorrow. Which of those would work best?"</Say>
                  <Say>"Okay. I have an opening at {'{{timeA}}'} or I can squeeze you in at {'{{timeB}}'}. Which of those would be better for you{'{{andSpouse}}'}?"</Say>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    <input
                      type="date"
                      value={L.apptDay || ''}
                      onChange={e => setField('apptDay', e.target.value)}
                      className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono"
                    />
                    <input
                      type="text"
                      value={L.apptTime || ''}
                      onChange={e => setField('apptTime', e.target.value)}
                      placeholder="e.g. 5:15 pm"
                      className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono"
                    />
                  </div>
                </div>

                <div id="sec-tie" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                      T
                    </span>
                    <h3 className="font-display font-bold text-xl text-[var(--ink)]">Tie down</h3>
                  </div>
                  <Say>"Okay, grab a pen and paper and let me know when you're ready. I'm going to give you my information and a few things to have ready."</Say>
                  <Say>
                    "Go ahead and write down my name. It's {'{{agent}}'}. Then write down 'Mortgage Protection.' And what time did we say again? Perfect. Write that down as well."
                  </Say>
                  <Say>
                    "Okay, I have us down for {'{{apptDay}}'} at {'{{apptTime}}'}. I really value our time and keep a tight schedule. Have a great day and we'll talk then!"
                  </Say>
                  <button
                    type="button"
                    onClick={() => setLeadStage(L.id, 'appt')}
                    className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-sm hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Mark appointment set</span>
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          /* ========================================================================= */
          /*                 MORTGAGE STEP 2: PRESENTATION (R.E.A.L.)                  */
          /* ========================================================================= */
          <>
            {/* R: Rapport & Transition */}
            <div id="sec-rap" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  R
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Rapport & transition</h3>
              </div>
              <Cue>Build rapport for a few minutes. Find common ground, but stay in control.</Cue>
              <Say>"So, let me start off by showing you a few things about me."</Say>
              <Cue>Share screen: Insurance license, driver's license, family photo, and lead form.</Cue>
              <Say>"Let me show you, this is what you folks mailed in... What was your main concern?"</Say>
              <Note>
                On the phone they said: <b>{L.mainConcern || 'No concern captured yet'}</b>
              </Note>
            </div>

            {/* R: Mortgage Protection explanation */}
            <div id="sec-mp" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  R
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">What is mortgage protection?</h3>
              </div>
              <Say>
                "Mortgage protection is a life insurance policy for homeowners that will pay off the mortgage or make payments while the family is in transition after someone dies or gets sick. This is portable, not decreasing term, and your family is the beneficiary, not the lender."
              </Say>
              <Say>"Now, some people do a full payoff, some do half, and a lot of people do Critical Period payments to protect the home. Make sense?"</Say>
            </div>

            {/* E: Financial Information Form (FIF) & Equity */}
            <div id="sec-fif" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  E
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Financial information & home equity</h3>
              </div>

              <Say>"If you were patient and got top dollar on the open market, what would your home sell for today?"</Say>
              <input
                type="text"
                value={L.homeValue || ''}
                onChange={e => setField('homeValue', e.target.value)}
                placeholder="Sale value (e.g. 420000)"
                className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono font-bold w-48"
              />

              {L.homeValue && L.loanAmount && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-300 text-xs">
                  <Say sm>
                    "Okay! If we subtract what is owed from what it would sell for, we get {'{{equity}}'} in home equity. Let's make sure that equity stays with your family and never walks out the front door!"
                  </Say>
                </div>
              )}
            </div>

            {/* E: Cash Flow Analysis */}
            <div id="sec-cfa" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  E
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Cash flow analysis</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-semibold block mb-1">Monthly Income ({L.firstName || 'Client'}):</span>
                  <input
                    type="text"
                    value={L.incomeA || ''}
                    onChange={e => setField('incomeA', e.target.value)}
                    placeholder="$ / month"
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] font-mono"
                  />
                </div>
                <div>
                  <span className="font-semibold block mb-1">Monthly Bills & Debt:</span>
                  <input
                    type="text"
                    value={L.otherBills || ''}
                    onChange={e => setField('otherBills', e.target.value)}
                    placeholder="All other bills ($ / mo)"
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] font-mono"
                  />
                </div>
              </div>

              {L.incomeA && (
                <div className="p-3.5 bg-[var(--surface-2)] rounded-xl border border-[var(--rule)] space-y-2 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-[var(--muted)]">Combined Monthly Income:</span>
                    <b className="text-[var(--ink)]">{money(num(L.incomeA))}</b>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-[var(--muted)]">Household Expenses:</span>
                    <b className="text-[var(--ink)]">{money((num(L.monthlyPayment) || 0) + (num(L.otherBills) || 0))}</b>
                  </div>
                  <div className="border-t border-[var(--rule)] pt-2 flex justify-between font-mono font-bold text-sm">
                    <span>Surplus / Deficit:</span>
                    <span className={num(L.incomeA) - (num(L.monthlyPayment) || 0) - (num(L.otherBills) || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {money(num(L.incomeA) - (num(L.monthlyPayment) || 0) - (num(L.otherBills) || 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* A: Suggested Road & Options */}
            <div id="sec-opt" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  A
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Show options</h3>
              </div>

              {/* Road suggestion */}
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 text-xs">
                <div className="font-bold text-blue-900 dark:text-blue-200">{road(L).t}</div>
                <div className="text-[var(--muted)] mt-0.5">{road(L).why}</div>
              </div>

              <div className="flex gap-2">
                {['full', 'partial', 'cp'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setField('program', p)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize border ${
                      L.program === p ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] border-[var(--rule)]'
                    }`}
                  >
                    {p === 'cp' ? 'Critical Period' : p + ' Payoff'}
                  </button>
                ))}
              </div>

              <QuoteplicityBox />

              {/* 3 Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {[1, 2, 3].map(idx => {
                  const opt = optLabel(L, idx);
                  const isSelected = L.chosen === String(idx);
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-[var(--action)] bg-[var(--action-soft)] ring-2 ring-[var(--action)] shadow-sm'
                          : 'border-[var(--rule)] bg-[var(--surface)]'
                      }`}
                    >
                      <div className="font-display font-bold text-sm text-[var(--ink)]">{opt.t}</div>
                      <div className="text-[10px] text-[var(--muted)] mb-2">{opt.h}</div>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={(L as any)[`optCov${idx}`] || ''}
                          onChange={e => setField(`optCov${idx}`, e.target.value)}
                          placeholder="Coverage ($)"
                          className="w-full text-center p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono font-bold"
                        />
                        <input
                          type="text"
                          value={(L as any)[`optPrem${idx}`] || ''}
                          onChange={e => setField(`optPrem${idx}`, e.target.value)}
                          placeholder="Premium ($/mo)"
                          className="w-full text-center p-1.5 rounded border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setField('chosen', String(idx));
                          setField('polCov', (L as any)[`optCov${idx}`]);
                          setField('polPrem', (L as any)[`optPrem${idx}`]);
                        }}
                        className={`w-full mt-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-[var(--action)] text-white shadow-xs'
                            : 'bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--rule)]'
                        }`}
                      >
                        {isSelected ? '✓ Picked' : `Select Option ${idx}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              <Say>"Okay, now which one of these fits most comfortably inside your budget?"</Say>
              <Cue>Be quiet. Once they pick, repeat it back and begin the application.</Cue>

              <button
                type="button"
                onClick={() => setLeadStage(L.id, 'quoted')}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110"
              >
                Mark quoted
              </button>
            </div>

            {/* A: Application & Policy Delivery */}
            <div id="sec-app" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  A
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Application & policy delivery</h3>
              </div>
              <Say>"Okay, from here I'm going to share my screen and finish filling out your paperwork. Go ahead and grab your driver's license for me."</Say>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted)] mb-1">Carrier</label>
                  <input
                    type="text"
                    value={L.carrier || ''}
                    onChange={e => setField('carrier', e.target.value)}
                    placeholder="Mutual of Omaha, Foresters, Americo..."
                    className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-semibold"
                  />
                </div>

                {L.carrier && DELIV[L.carrier] && (
                  <div className="p-3 bg-[var(--surface-2)] rounded-lg text-xs space-y-1">
                    <Say sm>{DELIV[L.carrier].s}</Say>
                    {DELIV[L.carrier].n && (
                      <div className="text-[11px] text-[var(--muted)]">{DELIV[L.carrier].n}</div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setLeadStage(L.id, 'app');
                    setField('appDate', new Date().toISOString().slice(0, 10));
                  }}
                  className="w-full py-3 rounded-xl bg-[var(--action)] text-white font-bold text-sm hover:brightness-110 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Application submitted</span>
                </button>
              </div>
            </div>

            {/* L: Lock it down */}
            <div id="sec-lock" className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-display font-bold text-lg">
                  L
                </span>
                <h3 className="font-display font-bold text-xl text-[var(--ink)]">Lock it down: Secure the sale</h3>
              </div>
              <Say>"One thing I take pride in is making sure you're satisfied with your program. Tell me in your own words: what did we just do here today?"</Say>
              <Say>"Also, let's take a minute to save my number in your phone: {'{{agentPhone}}'}."</Say>
              <Cue>Having them save your number means they recognize it when you follow up.</Cue>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
