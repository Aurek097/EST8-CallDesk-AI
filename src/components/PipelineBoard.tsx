import React from 'react';
import { useApp } from '../context/AppContext';
import { Lead, Stage } from '../types';
import { STAGES, PARKED, STATUS_L, STAGE_I } from '../constants/data';
import {
  fullName,
  money,
  money2,
  num,
  has,
  isFE,
  startOfDay,
  fmtDT
} from '../utils/calculations';
import {
  TrendingUp,
  Calendar,
  FileCheck2,
  CheckCircle2,
  Clock,
  ArrowRight
} from 'lucide-react';

export const PipelineBoard: React.FC = () => {
  const { leads, setActiveLead, setView, setLeadStage } = useApp();

  const openLeadInDialer = (id: string) => {
    setActiveLead(id);
    setView('dialer');
  };

  const prem = (stages: string[]) =>
    leads
      .filter(l => stages.includes(l.status))
      .reduce(
        (sum, l) =>
          sum +
          (num(l.polPrem) ||
            num((l as any)[`optPrem${l.chosen}`]) ||
            0),
        0
      );

  const countOf = (stages: string[]) =>
    leads.filter(l => stages.includes(l.status)).length;

  // Due today follow-ups
  const today = new Date();
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const dueToday = leads
    .filter(
      l =>
        has(l.followAt) &&
        new Date(l.followAt!) <= endOfToday &&
        !['dnc', 'notint', 'inforce'].includes(l.status)
    )
    .sort(
      (a, b) =>
        new Date(a.followAt!).getTime() - new Date(b.followAt!).getTime()
    );

  const getSubline = (L: Lead) => {
    if (isFE(L)) {
      return [L.state, L.city, has(L.amountRequested) ? `${L.amountRequested} req.` : '']
        .filter(has)
        .join(' · ');
    }
    return [L.city, has(L.loanAmount) ? money(num(L.loanAmount)) : '']
      .filter(has)
      .join(' · ');
  };

  const nextStageOf = (currentStatus: string): [string, string] | null => {
    const idx = STAGE_I[currentStatus];
    if (idx !== undefined && idx < STAGES.length - 1) {
      return STAGES[idx + 1];
    }
    return null;
  };

  return (
    <section className="w-full max-w-[1720px] mx-auto p-4 md:p-6 space-y-6">
      {/* Summary metric tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--muted)] font-medium block">Total Leads in Desk</span>
            <span className="font-mono font-bold text-2xl text-[var(--ink)] mt-0.5 block">
              {leads.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[var(--accent)] flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--muted)] font-medium block">Appointments Set</span>
            <span className="font-mono font-bold text-2xl text-[var(--ink)] mt-0.5 block">
              {countOf(['appt'])}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--muted)] font-medium block">Applications Pending</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono font-bold text-2xl text-[var(--ink)]">
                {countOf(['app'])}
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {money2(prem(['app']))}/mo
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--muted)] font-medium block">Policies In Force</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono font-bold text-2xl text-[var(--ink)]">
                {countOf(['inforce'])}
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                {money2(prem(['inforce']))}/mo
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Follow-ups Due Today */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs space-y-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-amber-500" /> Follow-ups Due Today
        </span>
        {dueToday.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {dueToday.map(L => {
              const dt = new Date(L.followAt!);
              const isOverdue = startOfDay(dt) < startOfDay(today);
              return (
                <div
                  key={L.id}
                  className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--rule)] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openLeadInDialer(L.id)}
                      className="font-bold text-xs text-[var(--ink)] hover:text-[var(--accent)] hover:underline truncate block text-left"
                    >
                      {fullName(L)}
                    </button>
                    <div className="text-[11px] text-[var(--muted)] flex items-center gap-1">
                      <span className="font-mono">
                        {dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      {L.followWhat && <span className="truncate">· {L.followWhat}</span>}
                    </div>
                  </div>
                  {isOverdue && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded uppercase">
                      Overdue
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] pt-1">No follow-ups due today. Set them directly on any lead card.</p>
        )}
      </div>

      {/* Kanban Board Columns */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1240px]">
          {STAGES.map(([stageKey, stageLabel]) => {
            const columnLeads = leads.filter(l => l.status === stageKey);
            return (
              <div
                key={stageKey}
                className="flex-1 min-w-[210px] max-w-[260px] bg-[var(--surface-2)] border border-[var(--rule)] rounded-2xl p-3 flex flex-col gap-2.5 min-h-[350px]"
              >
                <div className="flex items-center justify-between pb-1 px-1 border-b border-[var(--rule)]">
                  <span className="font-display font-bold text-xs text-[var(--ink)]">
                    {stageLabel}
                  </span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)] border border-[var(--rule)]">
                    {columnLeads.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto">
                  {columnLeads.map(L => {
                    const nextSt = nextStageOf(L.status);
                    return (
                      <div
                        key={L.id}
                        className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs space-y-2 hover:border-[var(--accent)] transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => openLeadInDialer(L.id)}
                          className="font-bold text-xs text-[var(--ink)] hover:text-[var(--accent)] hover:underline truncate block text-left w-full cursor-pointer"
                        >
                          <span
                            className={`inline-block text-[9px] font-mono font-bold px-1 rounded mr-1 ${
                              L.type === 'fe'
                                ? 'bg-[#f2e7f6] dark:bg-[#2e1d37] text-[#7a3f8f] dark:text-[#d7a6ea]'
                                : 'bg-[var(--accent-soft)] text-[var(--accent)]'
                            }`}
                          >
                            {L.type === 'fe' ? 'FE' : 'MP'}
                          </span>
                          {fullName(L)}
                        </button>

                        <div className="text-[11px] text-[var(--muted)] truncate">
                          {getSubline(L) || L.phone || '—'}
                        </div>

                        {L.followAt && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {new Date(L.followAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}

                        {nextSt && (
                          <div className="pt-1.5 border-t border-[var(--rule)] flex justify-end">
                            <button
                              type="button"
                              onClick={() => setLeadStage(L.id, nextSt[0] as Stage)}
                              className="px-2 py-1 rounded-md text-[10.5px] font-semibold border border-[var(--rule)] bg-[var(--surface-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>{nextSt[1]}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {columnLeads.length === 0 && (
                    <div className="text-center py-8 text-xs text-[var(--muted)]">
                      No leads in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Parked Column */}
          <div className="flex-1 min-w-[210px] max-w-[260px] bg-[var(--surface-2)] border border-[var(--rule)] rounded-2xl p-3 flex flex-col gap-2.5 min-h-[350px]">
            <div className="flex items-center justify-between pb-1 px-1 border-b border-[var(--rule)]">
              <span className="font-display font-bold text-xs text-[var(--ink)]">
                Parked
              </span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--muted)] border border-[var(--rule)]">
                {leads.filter(l => PARKED.some(p => p[0] === l.status)).length}
              </span>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto">
              {leads
                .filter(l => PARKED.some(p => p[0] === l.status))
                .map(L => (
                  <div
                    key={L.id}
                    className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => openLeadInDialer(L.id)}
                        className="font-bold text-xs text-[var(--ink)] hover:text-[var(--accent)] hover:underline truncate block text-left cursor-pointer"
                      >
                        {fullName(L)}
                      </button>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--rule)]">
                        {STATUS_L[L.status]}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      {getSubline(L) || L.phone || '—'}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
