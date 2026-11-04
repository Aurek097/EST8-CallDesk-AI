// Calling rules the server enforces no matter what the browser sends.

const STATE_NAMES: Record<string, string> = {
  ALABAMA: 'AL', ALASKA: 'AK', ARIZONA: 'AZ', ARKANSAS: 'AR', CALIFORNIA: 'CA', COLORADO: 'CO', CONNECTICUT: 'CT',
  DELAWARE: 'DE', 'DISTRICT OF COLUMBIA': 'DC', FLORIDA: 'FL', GEORGIA: 'GA', HAWAII: 'HI', IDAHO: 'ID', ILLINOIS: 'IL',
  INDIANA: 'IN', IOWA: 'IA', KANSAS: 'KS', KENTUCKY: 'KY', LOUISIANA: 'LA', MAINE: 'ME', MARYLAND: 'MD',
  MASSACHUSETTS: 'MA', MICHIGAN: 'MI', MINNESOTA: 'MN', MISSISSIPPI: 'MS', MISSOURI: 'MO', MONTANA: 'MT',
  NEBRASKA: 'NE', NEVADA: 'NV', 'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', OHIO: 'OH', OKLAHOMA: 'OK', OREGON: 'OR', PENNSYLVANIA: 'PA',
  'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC', 'SOUTH DAKOTA': 'SD', TENNESSEE: 'TN', TEXAS: 'TX', UTAH: 'UT',
  VERMONT: 'VT', VIRGINIA: 'VA', WASHINGTON: 'WA', 'WEST VIRGINIA': 'WV', WISCONSIN: 'WI', WYOMING: 'WY',
};
const CODES = new Set(Object.values(STATE_NAMES));

/** "Texas", "tx" or "TX" → "TX". Unknown → "". */
export function stateCode(s: unknown): string {
  const v = String(s ?? '').trim().toUpperCase();
  if (CODES.has(v)) return v;
  return STATE_NAMES[v] ?? '';
}

/** Main time zone per state, for the 8 a.m.–9 p.m. calling window. */
const ZONES: Record<string, string> = {
  'America/New_York': 'CT DE DC FL GA IN KY ME MD MA NH NJ NY NC OH PA RI SC VT VA WV',
  'America/Detroit': 'MI',
  'America/Chicago': 'AL AR IL IA KS LA MN MS MO NE ND OK SD TN TX WI',
  'America/Denver': 'CO ID MT NM UT WY',
  'America/Phoenix': 'AZ',
  'America/Los_Angeles': 'CA NV OR WA',
  'America/Anchorage': 'AK',
  'Pacific/Honolulu': 'HI',
};
const TZ_OF: Record<string, string> = {};
for (const [zone, list] of Object.entries(ZONES)) for (const st of list.split(' ')) TZ_OF[st] = zone;

export function localHour(st: string, now = new Date()): number | null {
  const zone = TZ_OF[st];
  if (!zone) return null;
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', hourCycle: 'h23' }).format(now)) % 24;
}

/** True from 8:00 a.m. to 8:59 p.m. in the state's main time zone. */
export function inCallingHours(st: string, now = new Date()): boolean {
  const h = localHour(st, now);
  return h !== null && h >= 8 && h < 21;
}

/** U.S. numbers only (blocks international toll fraud). Returns +1XXXXXXXXXX or ''. */
export function toUSE164(raw: unknown): string {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 10 && /^[2-9]/.test(d)) return '+1' + d;
  if (d.length === 11 && d.startsWith('1') && /^[2-9]/.test(d[1])) return '+' + d;
  return '';
}

/** States from the agent's Profile → Licensing list. */
export function licensedStates(profile: Record<string, unknown> | null | undefined): string[] {
  const rows = Array.isArray(profile?.states) ? (profile!.states as { st?: string }[]) : [];
  return rows.map(r => stateCode(r.st)).filter(Boolean);
}

export interface CallCheck {
  ok: boolean;
  to: string;
  state: string;
  /** Spoken to the agent and shown in the app when a call is stopped. */
  reason: string;
}

/** Every rule a lead call must pass before Twilio dials it. */
export function checkLeadCall(
  lead: Record<string, unknown>,
  profile: Record<string, unknown> | null | undefined,
  now = new Date(),
): CallCheck {
  const to = toUSE164(lead.phone);
  const st = stateCode(lead.state);
  const licensed = licensedStates(profile);
  const fail = (reason: string): CallCheck => ({ ok: false, to, state: st, reason });
  if (!to) return fail('This lead does not have a valid U.S. phone number.');
  if (lead.status === 'dnc') return fail('This lead is marked Do not call.');
  if (!st) return fail('This lead has no state. Add the state, then call again.');
  if (!licensed.length) return fail('Add your licensed states in Profile before calling leads.');
  if (!licensed.includes(st)) return fail(`This lead is in ${st}, which is not one of your licensed states.`);
  if (!inCallingHours(st, now)) return fail(`It is outside 8 a.m. to 9 p.m. for this lead in ${st}. Call back later.`);
  return { ok: true, to, state: st, reason: '' };
}

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'REVOKE']);
const START_WORDS = new Set(['START', 'UNSTOP', 'YES']);
export const smsKeyword = (body: string): 'stop' | 'start' | null => {
  const w = body.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (STOP_WORDS.has(w)) return 'stop';
  if (START_WORDS.has(w)) return 'start';
  return null;
};
