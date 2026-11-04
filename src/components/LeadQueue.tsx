import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Lead } from '../types';
import { STATUS, STATUS_L, stAbbr } from '../constants/data';
import { fullName, money, num, has, isFE } from '../utils/calculations';
import { Search, Plus, Upload, Trash2, Phone, MessageSquare } from 'lucide-react';

export const LeadQueue: React.FC = () => {
  const {
    leads,
    activeId,
    setActiveLead,
    addLead,
    clearSampleLeads,
    setIsImportOpen,
    openCommDrawer
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const filteredLeads = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return leads.filter(L => {
      if (stageFilter && L.status !== stageFilter) return false;
      if (typeFilter && L.type !== typeFilter) return false;
      if (q) {
        const hay = [
          fullName(L),
          L.phone,
          L.city,
          L.address,
          L.spouseName,
          L.email
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, searchTerm, stageFilter, typeFilter]);

  const hasSamples = leads.some(l => l.sample);

  const getSubline = (L: Lead) => {
    if (isFE(L)) {
      return [stAbbr(L.state) || L.state, L.city, has(L.amountRequested) ? `${L.amountRequested} req.` : '']
        .filter(has)
        .join(' · ');
    }
    return [L.city, has(L.loanAmount) ? money(num(L.loanAmount)) : '']
      .filter(has)
      .join(' · ');
  };

  const getVerifiedCount = (L: Lead) => {
    const fields = isFE(L)
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
          ...(L.spouseName ? ['spouseName', 'spouseAge', 'spouseDob'] : [])
        ];
    const verified = fields.filter(k => L.v?.[k]).length;
    return `${verified}/${fields.length} ✓`;
  };

  return (
    <aside className="w-full lg:w-[272px] flex-shrink-0 bg-[var(--surface)] border border-[var(--rule)] rounded-xl flex flex-col max-h-none lg:max-h-[calc(100vh-84px)] lg:sticky lg:top-[76px] overflow-hidden shadow-xs">
      {/* Header with Import and +Lead */}
      <div className="p-3 border-b border-[var(--rule)] space-y-2 bg-[var(--surface)] sticky top-0 z-10">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-[var(--accent)] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import sheet</span>
          </button>
          <button
            type="button"
            onClick={() => addLead({ firstName: '', type: 'mp' })}
            className="py-1.5 px-3 rounded-lg border border-[var(--rule)] bg-[var(--surface)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--ink)] font-medium text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lead</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, city..."
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:bg-[var(--surface)] focus:border-[var(--accent)] outline-hidden transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1.5">
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="flex-1 min-w-0 py-1 px-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)] outline-hidden"
          >
            <option value="">All stages</option>
            {STATUS.map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="flex-1 min-w-0 py-1 px-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)] outline-hidden"
          >
            <option value="">All types</option>
            <option value="mp">Mortgage</option>
            <option value="fe">Final expense</option>
          </select>
        </div>
      </div>

      {/* Leads List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--rule)]">
        {filteredLeads.length > 0 ? (
          filteredLeads.map(L => {
            const isSelected = L.id === activeId;
            return (
              <button
                key={L.id}
                type="button"
                onClick={() => setActiveLead(L.id)}
                className={`w-full p-2.5 text-left transition-all flex flex-col gap-1 cursor-pointer hover:bg-[var(--surface-2)] ${
                  isSelected ? 'bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[9.5px] font-mono font-bold px-1 py-0.5 rounded ${
                        L.type === 'fe'
                          ? 'bg-[#f2e7f6] dark:bg-[#2e1d37] text-[#7a3f8f] dark:text-[#d7a6ea]'
                          : 'bg-[var(--accent-soft)] text-[var(--accent)]'
                      }`}
                    >
                      {L.type === 'fe' ? 'FE' : 'MP'}
                    </span>
                    <span className="font-bold text-xs text-[var(--ink)] truncate">
                      {fullName(L)}
                    </span>
                    {L.sample && (
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                        Sample
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap ${
                      L.status === 'inforce'
                        ? 'bg-emerald-600 text-white'
                        : L.status === 'app'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : ['contacted', 'appt', 'quoted'].includes(L.status)
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                        : L.status === 'callback'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : ['notint', 'dnc'].includes(L.status)
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--rule)]'
                    }`}
                  >
                    {STATUS_L[L.status] || L.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--muted)] mt-1">
                  <span className="truncate max-w-[120px]">{getSubline(L) || L.phone || '—'}</span>
                  
                  <div className="flex items-center gap-1">
                    {L.phone && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCommDrawer(L, 'dialer');
                          }}
                          className="p-1 rounded bg-[var(--surface-2)] hover:bg-emerald-600 hover:text-white text-[var(--muted)] transition-colors"
                          title="Dial lead"
                        >
                          <Phone className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCommDrawer(L, 'sms');
                          }}
                          className="p-1 rounded bg-[var(--surface-2)] hover:bg-[var(--accent)] hover:text-white text-[var(--muted)] transition-colors"
                          title="Open SMS thread"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    <span className="font-mono text-[10px] flex-shrink-0" title="Fields verified">
                      {getVerifiedCount(L)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="p-6 text-center text-xs text-[var(--muted)]">
            {leads.length > 0
              ? 'No leads match the filters.'
              : 'No leads yet. Import a spreadsheet to get started.'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-[var(--rule)] bg-[var(--surface)] text-[11px] text-[var(--muted)] flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span>{leads.length} lead{leads.length === 1 ? '' : 's'} in desk</span>
          {hasSamples && (
            <button
              type="button"
              onClick={clearSampleLeads}
              className="text-rose-600 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remove samples</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
