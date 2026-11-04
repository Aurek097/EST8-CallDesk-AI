import { Lead, AgentProfile, Settings } from '../types';
import { stAbbr, stName, TZ_OF, CAR_ALIAS } from '../constants/data';

export const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : NaN;
};

export const has = (v: unknown): boolean =>
  v !== undefined && v !== null && String(v).trim() !== '';

export const money = (n: number): string =>
  isFinite(n) ? '$' + Math.round(n).toLocaleString('en-US') : '';

export const money2 = (n: number): string =>
  isFinite(n)
    ? '$' +
      n.toLocaleString('en-US', {
        minimumFractionDigits: n % 1 ? 2 : 0,
        maximumFractionDigits: 2
      })
    : '';

export const ord = (n: number): string => {
  n = Math.round(n);
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const uid = (): string => Math.random().toString(36).slice(2, 9);

export function parseDate(s: unknown): Date | null {
  if (!has(s)) return null;
  const str = String(s).trim();
  let m: RegExpMatchArray | null;

  if ((m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?/))) {
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  }
  if (
    (m = str.match(
      /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?)?$/
    ))
  ) {
    let y = +m[3];
    if (y < 100) y += y > new Date().getFullYear() % 100 ? 1900 : 2000;
    let h = +(m[4] || 0);
    const ap = (m[6] || '').toLowerCase();
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
    return new Date(y, +m[1] - 1, +m[2], h, +(m[5] || 0));
  }
  if (/^\d{5}$/.test(str)) {
    const d = new Date(1899, 11, 30);
    d.setDate(d.getDate() + +str);
    return d;
  }
  const t = Date.parse(str);
  return isNaN(t) ? null : new Date(t);
}

export const fmtD = (d: Date | null): string =>
  d
    ? d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

export const fmtDT = (t: number | string | Date): string =>
  new Date(t).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

export function yearsSince(d: Date): number {
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  const md = today.getMonth() - d.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < d.getDate())) a--;
  return a;
}

export function ageOf(L: Lead): number {
  if (L.ageOverride && has(L.age)) return num(L.age);
  const d = parseDate(L.dob);
  if (d) return yearsSince(d);
  return has(L.age) ? num(L.age) : NaN;
}

export function spAgeOf(L: Lead): number {
  if (L.spouseAgeOverride && has(L.spouseAge)) return num(L.spouseAge);
  const d = parseDate(L.spouseDob);
  if (d) return yearsSince(d);
  return has(L.spouseAge) ? num(L.spouseAge) : NaN;
}

export const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

export const dayLabel = (d: Date): string =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export function fmtAppt(s?: string): string {
  if (!s) return '';
  const d = parseDate(s);
  if (!d) return s;
  const today = new Date();
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(today).getTime()) / 864e5);
  const w = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  return diff === 0 ? 'today, ' + w : diff === 1 ? 'tomorrow, ' + w : w;
}

export function weekKey(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export function leadHours(L: Lead): number {
  const d = parseDate(L.leadDate);
  return d ? (Date.now() - d.getTime()) / 36e5 : NaN;
}

export const autoOpener = (L: Lead): 'A' | 'B' => {
  const h = leadHours(L);
  return isFinite(h) && h > 72 ? 'B' : 'A';
};

export const op = (L: Lead): 'A' | 'B' => L.opener || autoOpener(L);

export function whenTok(L: Lead): string {
  const d = parseDate(L.leadDate);
  if (!d) return '';
  const today = new Date();
  const diff = Math.round((startOfDay(today).getTime() - startOfDay(d).getTime()) / 864e5);
  if (diff <= 0) return d.getHours() < 12 ? 'this morning' : 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7)
    return 'on ' + d.toLocaleDateString('en-US', { weekday: 'long' });
  return 'a while back';
}

export function ageText(L: Lead): string {
  const h = leadHours(L);
  if (!isFinite(h)) return 'No lead date';
  if (h < 1) return 'Under an hour old';
  if (h < 48) return Math.round(h) + ' hours old';
  return Math.round(h / 24) + ' days old';
}

export const isFE = (L: Lead): boolean => L.type === 'fe';
export const isMarried = (L: Lead): boolean =>
  L.married ? L.married === 'yes' : has(L.spouseName);

export const fullName = (L: Lead): string =>
  [L.firstName, L.lastName].filter(has).join(' ') || 'Unnamed lead';

export const fullAddr = (L: Lead): string => {
  const c = [L.city, [L.state, L.zip].filter(has).join(' ')].filter(has).join(', ');
  return [L.address, c].filter(has).join(', ');
};

const PLAT: Record<string, string> = {
  fb: 'Facebook',
  meta: 'Facebook',
  ig: 'Instagram',
  google: 'Google',
  'google-ads': 'Google',
  yt: 'YouTube',
  tiktok: 'TikTok'
};
export const platName = (p?: string): string =>
  PLAT[String(p || '').toLowerCase()] || 'Facebook or Google';

export function bw(L: Lead): { name: string; other: string } {
  const a = num(L.incomeA) || 0;
  const b = num(L.incomeB) || 0;
  const first = L.firstName || 'them';
  const sp = L.spouseName || 'your spouse';
  if (isMarried(L)) return b > a ? { name: sp, other: first } : { name: first, other: sp };
  return { name: first, other: L.beneficiary || 'your family' };
}

const HEALTHY = /^(none|no|n\/?a|nothing|healthy|good|great|fine|na|nope)\.?$/i;

export function road(L: Lead): { k: string; t: string; why: string } {
  const a = ageOf(L);
  const nm = L.firstName || 'They';
  const flags = ['health', 'meds', 'hospital', 'history'].filter(
    k => has((L as unknown as Record<string, unknown>)[k]) &&
      !HEALTHY.test(String((L as unknown as Record<string, unknown>)[k]).trim())
  );
  if (isFinite(a) && a > 65)
    return {
      k: 'cp',
      t: 'Lead with Critical Period',
      why: `${nm} is ${a}. Over 65, full payoff is usually the most expensive and hardest to qualify for.`
    };
  if (flags.length)
    return {
      k: 'partial',
      t: 'Partial payoff or Critical Period',
      why: `Health answers to review: ${flags
        .map(
          f =>
            ({
              health: 'medical issues',
              meds: 'medications',
              hospital: 'hospital stays',
              history: 'health history'
            }[f])
        )
        .join(', ')}. These may limit full payoff.`
    };
  if (isFinite(a))
    return {
      k: 'full',
      t: 'Full or partial payoff',
      why: `${nm} is ${a} with no health flags. Under 65 and healthy: don't present Critical Period.`
    };
  return {
    k: '',
    t: 'Not enough info yet',
    why: 'Add age and the CQF health answers to get a suggested road.'
  };
}

export const FE_TIER = ['Gold', 'Silver', 'Bronze'];

export function optLabel(L: Lead, i: number): { t: string; h: string } {
  const p = num(L.monthlyPayment);
  if (L.program === 'cp') {
    const m = num(L.monthsNeeded);
    if (!isFinite(m))
      return { t: `Option ${i}`, h: 'Enter the months they need above' };
    const mm = [Math.max(1, m - 3), m, m + 3][i - 1];
    return {
      t: `${mm} months of payments`,
      h: isFinite(p)
        ? `${money(mm * p)} benefit (${mm} × ${money(p)})`
        : 'Add the monthly payment'
    };
  }
  if (L.program === 'full' || L.program === 'partial') {
    const ten = p * 0.1;
    const lab = ['Above 10%', 'At 10%', 'Below 10%'][i - 1];
    return {
      t: lab,
      h: isFinite(p)
        ? ['more than ', 'about ', 'less than '][i - 1] +
          money2(Math.round(ten)) +
          '/mo premium'
        : 'Add the monthly payment'
    };
  }
  return { t: `Option ${i}`, h: 'Pick a program first' };
}

export function chosenText(L: Lead): string {
  const i = L.chosen;
  if (!i) return '';
  const idx = +i;
  const c = num((L as unknown as Record<string, unknown>)['optCov' + idx]);
  const p = num((L as unknown as Record<string, unknown>)['optPrem' + idx]);
  const lab = isFE(L) ? FE_TIER[idx - 1] + ' plan' : optLabel(L, idx).t;
  return [
    lab,
    isFinite(c) ? money(c) + ' of coverage' : '',
    isFinite(p) ? money2(p) + ' a month' : ''
  ]
    .filter(Boolean)
    .join(', ');
}

export const PLAN_LINE: Record<string, string> = {
  level: 'day-one coverage, meaning it pays the full amount from the first day',
  graded:
    'a plan with a {w}-year waiting period on natural causes, but accidents are covered from day one',
  gi:
    'a guaranteed-issue plan with a {w}-year waiting period on natural causes, but accidents are covered from day one'
};

export const licensedList = (p: AgentProfile): string[] =>
  (p.states || []).map(x => stAbbr(x.st)).filter(Boolean);

export const licFor = (p: AgentProfile, st?: string): string => {
  const ab = stAbbr(st);
  const r = (p.states || []).find(x => stAbbr(x.st) === ab);
  return r ? r.num : '';
};

export function clientTime(st?: string): { txt: string; h: number; z: string } | null {
  const ab = stAbbr(st);
  const z = TZ_OF[ab];
  if (!z) return null;
  const now = new Date();
  try {
    const txt = new Intl.DateTimeFormat('en-US', {
      timeZone: z,
      hour: 'numeric',
      minute: '2-digit'
    }).format(now);
    const h = +new Intl.DateTimeFormat('en-US', {
      timeZone: z,
      hour: 'numeric',
      hourCycle: 'h23'
    }).format(now);
    return { txt, h: h % 24, z };
  } catch (e) {
    return null;
  }
}

export const carKey = (c?: string): string => {
  const k = String(c || '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return CAR_ALIAS[k] || k;
};

export function writingFor(p: AgentProfile, c?: string) {
  if (!has(c)) return [];
  const k = carKey(c);
  return (p.writing || []).filter(w => {
    const wk = carKey(w.carrier);
    return has(wk) && (wk === k || wk.startsWith(k) || k.startsWith(wk));
  });
}

const QP_KEYS = [
  'first_name',
  'last_name',
  'name',
  'email',
  'phone',
  'phone_preverified',
  'state',
  'coverage_amount',
  'height_ft',
  'height_in',
  'weight',
  'gender',
  'dob',
  'health',
  'nicotine',
  'nicotine_last_use',
  'duration',
  'results_modal_override',
  'skip_confirmation'
];

export const okUrl = (u?: string): string =>
  /^https:\/\/[^\s"'<>]+$/i.test(String(u || '').trim()) ? String(u).trim() : '';

export function qpBase(L: Lead, p: AgentProfile): { u: string; fb: boolean } {
  const own = okUrl(isFE(L) ? p.qpFe : p.qpMp);
  if (own) return { u: own, fb: false };
  const fb = okUrl(p.qpMp) || okUrl(p.qpFe) || okUrl(p.quoteUrl);
  return { u: fb, fb: !!fb };
}

export function hwParse(s?: string): {
  ft: number | null;
  inch: number | null;
  wt: number | null;
} {
  const str = String(s || '');
  let ft: number | null = null;
  let inch: number | null = null;
  let wt: number | null = null;
  let m = str.match(/([4-7])\s*(?:'|’|ft\.?|feet|foot)\s*(\d{1,2})?/i);
  if (m) {
    ft = +m[1];
    inch = +(m[2] || 0);
  } else if ((m = str.match(/\b([4-7])\s*[-\s,]\s*(\d{1,2})\b/))) {
    ft = +m[1];
    inch = +m[2];
  }
  if (inch !== null && inch > 11) inch = null;
  const w = [...str.matchAll(/\d{2,3}/g)]
    .map(x => +x[0])
    .find(n => n >= 80 && n <= 600);
  if (w) wt = w;
  return { ft, inch, wt };
}

export const nicOf = (L: Lead): string =>
  L.qpNic || (L.tobacco === 'yes' ? 'currently' : L.tobacco === 'no' ? 'never' : '');

export const termOf = (L: Lead): string =>
  L.qpTerm || (L.loanTerm === '30' ? '30' : L.loanTerm === '15' ? '20' : '');

export function qpCoverage(L: Lead): number {
  const ch = L.chosen
    ? num((L as unknown as Record<string, unknown>)['optCov' + L.chosen])
    : NaN;
  if (isFinite(ch)) return ch;
  if (isFE(L)) {
    const o = num(L.optCov2);
    return isFinite(o) ? o : num(L.amountRequested);
  }
  if (L.program === 'cp') {
    const m = num(L.monthsNeeded);
    const pm = num(L.monthlyPayment);
    if (isFinite(m) && isFinite(pm)) return m * pm;
  }
  const loan = num(L.loanAmount);
  return L.program === 'partial' ? loan / 2 : loan;
}

const isoD = (d: Date | null): string =>
  d
    ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
    : '';

export function qpParams(L: Lead, p: AgentProfile): Record<string, string | number> {
  const hw = hwParse(L.hwA);
  const cov = qpCoverage(L);
  const o: Record<string, string | number> = {
    state: stAbbr(L.state),
    dob: isoD(parseDate(L.dob)),
    gender: /^m/i.test(L.gender || '')
      ? 'Male'
      : /^f/i.test(L.gender || '')
      ? 'Female'
      : '',
    height_ft: hw.ft ?? '',
    height_in: hw.ft !== null && hw.inch !== null ? hw.inch : '',
    weight: hw.wt ?? '',
    nicotine: nicOf(L),
    health: L.qpHealth || '',
    coverage_amount: isFinite(cov) && cov > 0 ? Math.round(cov) : '',
    duration: isFE(L) ? '' : termOf(L),
    results_modal_override: 'hide',
    skip_confirmation: '1'
  };
  if (p.qpContact === 'yes') {
    Object.assign(o, {
      first_name: L.firstName || '',
      last_name: L.lastName || '',
      name: [L.firstName, L.lastName].filter(has).join(' '),
      email: L.email || '',
      phone: L.phone || ''
    });
  }
  return o;
}

export function qpUrl(L: Lead, p: AgentProfile): string {
  const b = qpBase(L, p).u;
  if (!b) return '';
  let u: URL;
  try {
    u = new URL(b);
  } catch (e) {
    return '';
  }
  QP_KEYS.forEach(k => u.searchParams.delete(k));
  Object.entries(qpParams(L, p)).forEach(([k, v]) => {
    if (has(v)) u.searchParams.set(k, String(v));
  });
  return u.toString();
}

export function resolveTokens(
  template: string,
  L: Lead,
  profile: AgentProfile,
  settings: Settings
): string {
  const TOKENS: Record<string, () => string> = {
    first: () => L.firstName || '',
    last: () => L.lastName || '',
    full: () => fullName(L),
    agent: () => profile.name || '',
    agency: () => profile.callAgency || profile.imo || '',
    agentPhone: () => profile.callPhone || profile.phone || '',
    npn: () => profile.npn || '',
    licNum: () => licFor(profile, L.state),
    nextAge: () => {
      const a = ageOf(L);
      return isFinite(a) ? String(a + 1) : '';
    },
    bday: () => {
      const d = parseDate(L.dob);
      return d ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : '';
    },
    spouse: () => L.spouseName || '',
    andSpouse: () => (isMarried(L) ? ' and ' + (L.spouseName || 'your spouse') : ''),
    beneficiary: () =>
      L.beneficiary || (isMarried(L) && !isFE(L) ? L.spouseName || '' : ''),
    loan: () => money(num(L.loanAmount)),
    halfLoan: () => money(num(L.loanAmount) / 2),
    payment: () => money(num(L.monthlyPayment)),
    homeValue: () => money(num(L.homeValue)),
    equity: () => {
      const e = num(L.homeValue) - num(L.loanAmount);
      return isFinite(e) ? money(e) : '';
    },
    concern: () => L.mainConcern || '',
    goal: () => L.goal || '',
    occupation: () => L.occupation || '',
    purchase: () =>
      ({ bought: 'just bought', refi: 'refinanced' } as Record<string, string>)[
        L.purchaseType || ''
      ] || '',
    apptDay: () => fmtAppt(L.apptDay),
    apptTime: () => L.apptTime || '',
    timeA: () => settings.timeA || '',
    timeB: () => settings.timeB || '',
    breadwinner: () => bw(L).name,
    survivor: () => bw(L).other,
    incomeA: () => money(num(L.incomeA)),
    chosen: () => chosenText(L),
    benFull: () => L.benFull || L.beneficiary || '',
    months: () => L.monthsNeeded || '',
    when: () => whenTok(L),
    platform: () => platName(L.platform),
    state: () => stName(L.state),
    city: () => L.city || '',
    hobby: () => L.hobby || '',
    oneDetail: () => {
      if (has(L.beneficiary))
        return `${L.beneficiary} as who you'd want to take care of`;
      const d = parseDate(L.dob);
      if (d)
        return (
          'your birthday as ' +
          d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
        );
      return L.city ? 'that you live in ' + L.city : '';
    },
    cityOrMonth: () =>
      L.city ||
      (parseDate(L.dob)
        ? 'a birth month of ' +
          parseDate(L.dob)!.toLocaleDateString('en-US', { month: 'long' })
        : ''),
    amountReq: () => L.amountRequested || '',
    carrier: () => L.carrier || '',
    amBest: () => L.amBest || '',
    years: () => L.carrierYears || 'X',
    planLine: () => {
      const t = PLAN_LINE[L.planType || ''];
      return t ? t.replace('{w}', L.waitYears || '2') : '';
    },
    payday: () => {
      const n = num(L.payday);
      return isFinite(n) && /^\s*\d/.test(L.payday || '') ? ord(n) : L.payday || '';
    },
    draftDay: () => {
      const n = num(L.payday);
      return isFinite(n) && /^\s*\d/.test(L.payday || '')
        ? ord((n % 31) + 1)
        : has(L.payday)
        ? 'day after'
        : '';
    },
    budget: () => money(num(L.budget)),
    feCov1: () => money(num(L.optCov1)),
    feCov2: () => money(num(L.optCov2)),
    feCov3: () => money(num(L.optCov3)),
    fePrem1: () => money2(num(L.optPrem1)),
    fePrem2: () => money2(num(L.optPrem2)),
    fePrem3: () => money2(num(L.optPrem3)),
    lowerAmt: () => money(num(L.lowerAmt)),
    benIsnt: () => {
      const n = String(L.beneficiary || '');
      return /\band\b|&|,/.test(n) ||
        (/children|kids/i.test(L.benRel || '') && !n)
        ? "aren't"
        : "isn't";
    },
    lowerPrem: () => money2(num(L.lowerPrem))
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, tokenKey) => {
    const fn = TOKENS[tokenKey];
    if (!fn) return `[${tokenKey}]`;
    const val = fn();
    return has(val) ? val : `[${tokenKey}]`;
  });
}
