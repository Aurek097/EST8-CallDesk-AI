import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lead } from '../types';
import { num, money, fmtD, parseDate, fullAddr, ageOf, spAgeOf } from '../utils/calculations';
import { stName } from '../constants/data';
import { Check, Edit2, CheckCircle2 } from 'lucide-react';

interface VerifyChipProps {
  field: string;
  lead: Lead;
}

export const VF_META: Record<
  string,
  { label: string; show?: (L: Lead) => string; set?: (L: Lead, v: string) => Partial<Lead> }
> = {
  firstName: { label: 'First name' },
  lastName: { label: 'Last name' },
  phone: { label: 'Phone' },
  email: { label: 'Email' },
  address: {
    label: 'Address',
    show: fullAddr,
    set: (_L, v) => ({ address: v, city: '', state: '', zip: '' })
  },
  loanAmount: { label: 'Loan amount', show: L => money(num(L.loanAmount)) },
  age: {
    label: 'Age',
    show: L => {
      const a = ageOf(L);
      return isFinite(a) ? String(a) : '';
    },
    set: (_L, v) => ({ age: v, ageOverride: true })
  },
  dob: { label: 'Date of birth', show: L => fmtD(parseDate(L.dob)) || L.dob || '' },
  spouseName: { label: "Spouse's name" },
  spouseAge: {
    label: "Spouse's age",
    show: L => {
      const a = spAgeOf(L);
      return isFinite(a) ? String(a) : '';
    },
    set: (_L, v) => ({ spouseAge: v, spouseAgeOverride: true })
  },
  spouseDob: { label: "Spouse's DOB", show: L => fmtD(parseDate(L.spouseDob)) || L.spouseDob || '' },
  state: { label: 'State', show: L => stName(L.state) },
  location: {
    label: 'City / ZIP',
    show: L => [L.city, L.zip].filter(Boolean).join(' '),
    set: (_L, v) => ({ city: v, zip: '' })
  },
  amountRequested: { label: 'Amount requested' },
  beneficiary: { label: 'Beneficiary' },
  benRel: { label: 'Relationship' },
  hasLife: { label: 'Has life insurance' },
  heartStrokeCancer: { label: 'Heart attack, stroke or cancer' }
};

export const getVShow = (k: string, L: Lead): string => {
  const meta = VF_META[k];
  if (meta?.show) return meta.show(L);
  return String((L as unknown as Record<string, unknown>)[k] ?? '');
};

export const VerifyChip: React.FC<VerifyChipProps> = ({ field, lead }) => {
  const { toggleVerification, fixVerification } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const currentVal = getVShow(field, lead);
  const [editVal, setEditVal] = useState(currentVal);

  const status = lead.v?.[field];
  const hasValue = Boolean(currentVal && currentVal.trim());

  const handleSave = () => {
    setIsEditing(false);
    if (editVal.trim() !== currentVal.trim()) {
      fixVerification(lead.id, field, editVal.trim());
    }
  };

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-400 rounded px-1.5 py-0.5 align-baseline">
        <input
          type="text"
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          onBlur={handleSave}
          autoFocus
          className="text-xs bg-white dark:bg-zinc-900 border border-[var(--accent)] px-1 rounded outline-hidden text-[var(--ink)] w-32"
        />
        <button
          type="button"
          onClick={handleSave}
          className="text-[10px] bg-emerald-600 text-white px-1 rounded hover:bg-emerald-700"
        >
          Save
        </button>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border transition-all align-baseline ${
        status === 'ok'
          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
          : status === 'fixed'
          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-800 dark:text-amber-300'
          : hasValue
          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
          : 'bg-amber-50 dark:bg-amber-950/40 border-dashed border-amber-400 text-amber-800 dark:text-amber-300 italic'
      }`}
      title={
        status === 'fixed' && lead.orig?.[field]
          ? `Original on lead: ${lead.orig[field]}`
          : status === 'ok'
          ? 'Verified'
          : 'Not verified yet'
      }
    >
      <span className="font-semibold font-mono">
        {hasValue ? currentVal : `[${VF_META[field]?.label || field} not on lead]`}
      </span>

      <span className="inline-flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => toggleVerification(lead.id, field)}
          className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer ${
            status === 'ok' ? 'text-emerald-700 font-bold' : 'text-[var(--muted)]'
          }`}
          title={status === 'ok' ? 'Unmark verified' : 'Mark verified'}
        >
          {status === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Check className="w-3 h-3" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditVal(currentVal);
            setIsEditing(true);
          }}
          className="text-[10px] text-[var(--muted)] hover:text-[var(--ink)] px-1 py-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
          title="Fix value"
        >
          Fix
        </button>
      </span>
    </span>
  );
};
