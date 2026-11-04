import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StateLicense, CarrierWritingNumber } from '../types';
import { ROLES, WSTAT, ST, stName, stAbbr } from '../constants/data';
import { credAlerts } from '../utils/profileAlerts';
import { uid, licensedList, fmtD, parseDate } from '../utils/calculations';
import {
  ShieldAlert,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Camera,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { profile, updateProfile } = useApp();
  const [showAdjust, setShowAdjust] = useState(false);
  const [showDL, setShowDL] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const alerts = credAlerts(profile);
  const licStates = licensedList(profile);
  const residentState = profile.states.find(s => s.home);
  const appointedCount = profile.writing.filter(w => w.status === 'Appointed').length;
  const eoDate = parseDate(profile.eoExp);

  const copyVal = (key: string, val: string) => {
    if (val) {
      navigator.clipboard.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !/^image\//.test(file.type)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const mx = 480;
        const sc = Math.min(1, mx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * sc);
        canvas.height = Math.round(img.height * sc);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          updateProfile({
            photo: canvas.toDataURL('image/jpeg', 0.85),
            photoX: 50,
            photoY: 35
          });
          setShowAdjust(true);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Licensing handlers
  const handleAddState = () => {
    const newSt: StateLicense = {
      id: uid(),
      st: '',
      num: '',
      home: profile.states.length === 0,
      exp: ''
    };
    updateProfile({ states: [...profile.states, newSt] });
  };

  const handleUpdateState = (id: string, updates: Partial<StateLicense>) => {
    updateProfile({
      states: profile.states.map(s => (s.id === id ? { ...s, ...updates } : s))
    });
  };

  const handleRemoveState = (id: string) => {
    updateProfile({
      states: profile.states.filter(s => s.id !== id)
    });
  };

  const handleSetResident = (id: string) => {
    updateProfile({
      states: profile.states.map(s => ({
        ...s,
        home: s.id === id
      }))
    });
  };

  // Carrier writing handlers
  const handleAddCarrier = () => {
    const newW: CarrierWritingNumber = {
      id: uid(),
      carrier: '',
      num: '',
      status: 'Appointed'
    };
    updateProfile({ writing: [...profile.writing, newW] });
  };

  const handleUpdateCarrier = (id: string, updates: Partial<CarrierWritingNumber>) => {
    updateProfile({
      writing: profile.writing.map(w => (w.id === id ? { ...w, ...updates } : w))
    });
  };

  const handleRemoveCarrier = (id: string) => {
    updateProfile({
      writing: profile.writing.filter(w => w.id !== id)
    });
  };

  const initials = profile.name
    ? profile.name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AC';

  return (
    <section className="w-full max-w-[940px] mx-auto p-4 md:p-6 space-y-6">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alt, i) => (
            <div
              key={i}
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${
                alt.type === 'bad'
                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{alt.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Profile & Photo Section */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs space-y-5">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold">
            Agent Profile
          </span>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Your photo, name, role and contact details. Your name and agency are what the scripts read on calls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 pt-1">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-display font-bold text-2xl border-2 border-[var(--rule)] shadow-sm flex-shrink-0">
            {profile.photo ? (
              <img
                src={profile.photo}
                alt={profile.name}
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${profile.photoX || 50}% ${profile.photoY || 35}%`
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rule)] text-xs font-semibold text-[var(--ink)] hover:border-[var(--accent)] cursor-pointer flex items-center gap-1.5 transition-all">
                <Camera className="w-3.5 h-3.5" />
                <span>{profile.photo ? 'Change photo' : 'Add photo'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              {profile.photo && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAdjust(!showAdjust)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--rule)] text-xs text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Adjust position</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProfile({ photo: '' })}
                    className="px-2 py-1.5 text-xs text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            <div className="text-[11px] text-[var(--muted)]">
              JPG or PNG. Use position sliders to center face in circular crop.
            </div>

            {showAdjust && profile.photo && (
              <div className="p-3 bg-[var(--surface-2)] border border-[var(--rule)] rounded-xl flex gap-4 text-xs">
                <label className="flex items-center gap-2">
                  <span className="text-[var(--muted)]">Left ↔ Right</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={profile.photoX || 50}
                    onChange={e => updateProfile({ photoX: +e.target.value })}
                    className="w-24 accent-[var(--accent)]"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-[var(--muted)]">Up ↕ Down</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={profile.photoY || 35}
                    onChange={e => updateProfile({ photoY: +e.target.value })}
                    className="w-24 accent-[var(--accent)]"
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">Display Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => updateProfile({ name: e.target.value })}
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)]"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">Role</label>
            <select
              value={profile.role}
              onChange={e => updateProfile({ role: e.target.value })}
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)]"
            >
              {ROLES.map(r => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">
              Phone Number <span className="text-[10px] text-[var(--muted)] font-normal">(Licensing support only)</span>
            </label>
            <input
              type="text"
              value={profile.phone}
              onChange={e => updateProfile({ phone: e.target.value })}
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={e => updateProfile({ email: e.target.value })}
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)]"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">Booking / Calendar Link</label>
            <input
              type="url"
              value={profile.booking}
              onChange={e => updateProfile({ booking: e.target.value })}
              placeholder="https://calendly.com/your-handle"
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">IMO / Agency</label>
            <input
              type="text"
              value={profile.imo}
              onChange={e => updateProfile({ imo: e.target.value })}
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)]"
            />
          </div>
        </div>
      </div>

      {/* On Your Calls Section */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs space-y-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold">
            On Your Calls
          </span>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            What the scripts say when you introduce yourself and give out your callback number.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">Agency Name Said on Calls</label>
            <input
              type="text"
              value={profile.callAgency}
              onChange={e => updateProfile({ callAgency: e.target.value })}
              placeholder="EST8 Financial"
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-medium"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">Callback Number Given to Clients</label>
            <input
              type="text"
              value={profile.callPhone}
              onChange={e => updateProfile({ callPhone: e.target.value })}
              placeholder="(361) 761-0910"
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono font-medium"
            />
          </div>
        </div>
      </div>

      {/* Quoting Section */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs space-y-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold">
            Quoting & Quoteplicity Links
          </span>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            In Quoteplicity's Link Builder, copy your engine links. The desk automatically appends the lead's state, DOB, gender, height, weight, nicotine, coverage and term.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">
              Mortgage Protection Link (No Exam / Term)
            </label>
            <input
              type="url"
              value={profile.qpMp}
              onChange={e => updateProfile({ qpMp: e.target.value })}
              placeholder="https://20009a4c1a8eb5e9.quoteplicity.com/quote/no-exam"
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">
              Final Expense Link (Final Expense Engine)
            </label>
            <input
              type="url"
              value={profile.qpFe}
              onChange={e => updateProfile({ qpFe: e.target.value })}
              placeholder="https://20009a4c1a8eb5e9.quoteplicity.com/quote/final-expense"
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono text-[11px]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[var(--muted)] font-semibold mb-1">
              Send Lead's Name, Email and Phone to Quoteplicity?
            </label>
            <select
              value={profile.qpContact}
              onChange={e => updateProfile({ qpContact: e.target.value as any })}
              className="p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)]"
            >
              <option value="no">No, quote only (prevents triggering Quoteplicity CRM automations)</option>
              <option value="yes">Yes, send contact details</option>
            </select>
          </div>
        </div>
      </div>

      {/* Licensing Section */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold">
              State Licensing
            </span>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              The compliance check uses these states, and scripts display your license number when calling clients in them.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddState}
            className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rule)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add state</span>
          </button>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--muted)] font-mono">
            NPN: <b className="text-[var(--ink)]">{profile.npn || '—'}</b>
          </span>
          <span className="px-2.5 py-1 rounded-full border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--muted)]">
            Licensed: <b className="text-[var(--ink)] font-mono">{licStates.join(' · ') || 'None'}</b>
          </span>
          {residentState && (
            <span className="px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200">
              Resident: <b>{residentState.st}</b>
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--muted)]">
            Appointed: <b className="text-[var(--ink)]">{appointedCount} carriers</b>
          </span>
          {eoDate && (
            <span className="px-2.5 py-1 rounded-full border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--muted)]">
              E&O: <b className="text-[var(--ink)]">{fmtD(eoDate)}</b>
            </span>
          )}
        </div>

        {/* NPN input */}
        <div className="max-w-xs text-xs">
          <label className="block text-[var(--muted)] font-semibold mb-1">NPN (National Producer Number)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={profile.npn}
              onChange={e => updateProfile({ npn: e.target.value })}
              className="flex-1 p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs font-mono font-bold"
            />
            <button
              type="button"
              onClick={() => copyVal('npn', profile.npn)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface)] text-xs text-[var(--muted)] hover:text-[var(--ink)]"
            >
              {copiedKey === 'npn' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* State licenses list */}
        <div className="space-y-2.5 pt-2">
          {profile.states.map(s => (
            <div
              key={s.id}
              className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--rule)] flex flex-wrap items-center gap-2.5 text-xs"
            >
              <div className="w-36">
                <select
                  value={s.st}
                  onChange={e => handleUpdateState(s.id, { st: e.target.value })}
                  className="w-full p-1.5 rounded border border-[var(--rule)] bg-[var(--surface)] text-xs"
                >
                  <option value="">Choose state...</option>
                  {Object.entries(ST).map(([code, name]) => (
                    <option key={code} value={code}>
                      {code} · {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[140px] flex gap-1.5">
                <input
                  type="text"
                  value={s.num}
                  onChange={e => handleUpdateState(s.id, { num: e.target.value })}
                  placeholder="License number..."
                  className="flex-1 p-1.5 rounded border border-[var(--rule)] bg-[var(--surface)] text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => copyVal(s.id, s.num)}
                  className="px-2 py-1 rounded border border-[var(--rule)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  {copiedKey === s.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="w-36">
                <input
                  type="date"
                  value={s.exp || ''}
                  onChange={e => handleUpdateState(s.id, { exp: e.target.value })}
                  className="w-full p-1.5 rounded border border-[var(--rule)] bg-[var(--surface)] text-xs font-mono"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSetResident(s.id)}
                className={`px-2.5 py-1.5 rounded text-[11px] font-bold border transition-all ${
                  s.home
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                    : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--rule)]'
                }`}
              >
                {s.home ? 'Resident' : 'Make resident'}
              </button>

              <button
                type="button"
                onClick={() => handleRemoveState(s.id)}
                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                title="Remove state"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Carrier Writing Numbers */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold">
              Carrier Writing Numbers
            </span>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              These carriers populate script suggestions and your writing number auto-displays when writing an application.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddCarrier}
            className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--rule)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add carrier</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {profile.writing.map(w => (
            <div
              key={w.id}
              className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--rule)] flex flex-wrap items-center gap-2.5 text-xs"
            >
              <input
                type="text"
                value={w.carrier}
                onChange={e => handleUpdateCarrier(w.id, { carrier: e.target.value })}
                placeholder="Carrier name..."
                className="flex-1 min-w-[160px] p-1.5 rounded border border-[var(--rule)] bg-[var(--surface)] text-xs font-medium"
              />
              <div className="flex-1 min-w-[120px] flex gap-1.5">
                <input
                  type="text"
                  value={w.num}
                  onChange={e => handleUpdateCarrier(w.id, { num: e.target.value })}
                  placeholder="Writing #"
                  className="flex-1 p-1.5 rounded border border-[var(--rule)] bg-[var(--surface)] text-xs font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={() => copyVal(w.id, w.num)}
                  className="px-2 py-1 rounded border border-[var(--rule)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  {copiedKey === w.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <select
                value={w.status}
                onChange={e => handleUpdateCarrier(w.id, { status: e.target.value as any })}
                className="p-1.5 rounded border border-[var(--rule)] bg-[var(--surface)] text-xs"
              >
                {WSTAT.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleRemoveCarrier(w.id)}
                className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                title="Remove carrier"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sensitive Additional Info Section */}
      <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--rule)] shadow-xs space-y-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted)] font-bold">
            Contracting & E&O Details
          </span>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Details required for carrier onboarding and E&O coverage tracking. Kept confidential in your browser session.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">Date of Birth</label>
            <input
              type="date"
              value={profile.dob}
              onChange={e => updateProfile({ dob: e.target.value })}
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">Driver's License #</label>
            <div className="flex gap-2">
              <input
                type={showDL ? 'text' : 'password'}
                value={profile.dl}
                onChange={e => updateProfile({ dl: e.target.value })}
                placeholder="DL number..."
                className="flex-1 p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowDL(!showDL)}
                className="px-3 py-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1"
              >
                {showDL ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showDL ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">Driver's License State</label>
            <select
              value={profile.dlState}
              onChange={e => updateProfile({ dlState: e.target.value })}
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)]"
            >
              <option value="">Choose state...</option>
              {Object.entries(ST).map(([code, name]) => (
                <option key={code} value={code}>
                  {code} · {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">AML Provider</label>
            <input
              type="text"
              value={profile.aml}
              onChange={e => updateProfile({ aml: e.target.value })}
              placeholder="SuranceBay, LLC."
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)]"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">AML Course Completed Date</label>
            <input
              type="date"
              value={profile.amlDate}
              onChange={e => updateProfile({ amlDate: e.target.value })}
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">E&O Carrier</label>
            <input
              type="text"
              value={profile.eo}
              onChange={e => updateProfile({ eo: e.target.value })}
              placeholder="Next Insurance US Company"
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)]"
            />
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">E&O Policy Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profile.eoPolicy}
                onChange={e => updateProfile({ eoPolicy: e.target.value })}
                className="flex-1 p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono"
              />
              <button
                type="button"
                onClick={() => copyVal('eoPol', profile.eoPolicy)}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--rule)] bg-[var(--surface)] text-xs text-[var(--muted)]"
              >
                {copiedKey === 'eoPol' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[var(--muted)] font-semibold mb-1">E&O Expires</label>
            <input
              type="date"
              value={profile.eoExp}
              onChange={e => updateProfile({ eoExp: e.target.value })}
              className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-[var(--ink)] font-mono"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
