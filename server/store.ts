// Data layer. Production uses Firestore (firebase-admin); tests use the in-memory store.
// Every route reads and writes through `Store`, so both behave the same way.
import type { Firestore } from 'firebase-admin/firestore';

export type WithId<T> = T & { _id: string };

export interface Col<T> {
  get(id: string): Promise<T | null>;
  /** Replace the whole document. */
  set(id: string, data: T): Promise<void>;
  /** Shallow merge of top-level fields. */
  update(id: string, patch: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
  /** Documents where `field` equals `value` (top-level fields only). */
  where(field: string, value: unknown): Promise<WithId<T>[]>;
  all(): Promise<WithId<T>[]>;
  setMany(items: { id: string; data: T }[]): Promise<void>;
  /** Create only if missing. Returns false when the id already exists (used to ignore repeat webhooks). */
  create(id: string, data: T): Promise<boolean>;
}

export interface Store {
  col<T>(name: string): Col<T>;
}

/** Firestore document ids can't contain "/" and must not be "." or "..". */
export const safeId = (s: string) => String(s).replace(/[/\\]/g, '_').slice(0, 300) || '_';

export function firestoreStore(db: Firestore): Store {
  return {
    col<T>(name: string): Col<T> {
      const c = db.collection(name);
      const rows = (snap: FirebaseFirestore.QuerySnapshot) =>
        snap.docs.map(d => ({ ...(d.data() as T), _id: d.id }));
      return {
        async get(id) {
          const s = await c.doc(safeId(id)).get();
          return s.exists ? (s.data() as T) : null;
        },
        async set(id, data) {
          await c.doc(safeId(id)).set(data as FirebaseFirestore.DocumentData);
        },
        async update(id, patch) {
          await c.doc(safeId(id)).set(patch as FirebaseFirestore.DocumentData, { merge: true });
        },
        async delete(id) {
          await c.doc(safeId(id)).delete();
        },
        async where(field, value) {
          return rows(await c.where(field, '==', value).get());
        },
        async all() {
          return rows(await c.get());
        },
        async setMany(items) {
          for (let i = 0; i < items.length; i += 400) {
            const batch = db.batch();
            for (const it of items.slice(i, i + 400)) batch.set(c.doc(safeId(it.id)), it.data as FirebaseFirestore.DocumentData);
            await batch.commit();
          }
        },
        async create(id, data) {
          try {
            await c.doc(safeId(id)).create(data as FirebaseFirestore.DocumentData);
            return true;
          } catch (e) {
            if ((e as { code?: number }).code === 6) return false; // ALREADY_EXISTS
            throw e;
          }
        },
      };
    },
  };
}

const clone = <T>(v: T): T => (v === undefined || v === null ? v : structuredClone(v));
/** Firestore is set to ignore undefined fields; the memory store mirrors that. */
const dropUndefined = <T>(v: T): T => JSON.parse(JSON.stringify(v ?? null));

export function memoryStore(): Store & { dump(): Record<string, Record<string, unknown>> } {
  const data = new Map<string, Map<string, unknown>>();
  const bucket = (n: string) => {
    if (!data.has(n)) data.set(n, new Map());
    return data.get(n)!;
  };
  return {
    dump: () => Object.fromEntries([...data].map(([k, m]) => [k, Object.fromEntries(m)])),
    col<T>(name: string): Col<T> {
      const b = bucket(name);
      const list = () => [...b].map(([id, v]) => ({ ...(clone(v) as T), _id: id }));
      return {
        async get(id) { return b.has(safeId(id)) ? (clone(b.get(safeId(id))) as T) : null; },
        async set(id, d) { b.set(safeId(id), dropUndefined(d)); },
        async update(id, patch) { b.set(safeId(id), dropUndefined({ ...((b.get(safeId(id)) as object) || {}), ...patch })); },
        async delete(id) { b.delete(safeId(id)); },
        async where(field, value) { return list().filter(r => (r as Record<string, unknown>)[field] === value); },
        async all() { return list(); },
        async setMany(items) { for (const it of items) b.set(safeId(it.id), dropUndefined(it.data)); },
        async create(id, d) {
          if (b.has(safeId(id))) return false;
          b.set(safeId(id), dropUndefined(d));
          return true;
        },
      };
    },
  };
}

// ---------------- Typed records ----------------

export interface UserDoc {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent';
  isVerified: boolean;
  phone: string | null;
  npn: string | null;
  profile: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  invitedBy: string | null;
  authUid: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface LeadDoc {
  userId: string;
  leadId: string;
  status: string;
  phoneDigits: string;
  createdAt: number;
  updatedAt: number;
  data: Record<string, unknown>;
}

export interface PhoneNumberDoc {
  id: string;
  userId: string;
  phoneNumber: string; // E.164
  friendlyName: string;
  twilioSid: string;
  region: string; // 2-letter state, '' if unknown
  capabilitiesVoice: boolean;
  capabilitiesSms: boolean;
  purchasedAt: string;
  isPrimary: boolean;
}

export interface TelephonyConfigDoc {
  callingMode: 'webrtc' | 'bridge';
  bridgePhone: string;
  primaryCallerId: string;
  autoLogCall: boolean;
  recordCalls: boolean;
}

export interface SmsDoc {
  id: string;
  userId: string;
  leadId: string;
  direction: 'outbound' | 'inbound';
  fromNumber: string;
  toNumber: string;
  body: string;
  status: string;
  twilioSid: string | null;
  createdAt: number;
}

export interface CallLogDoc {
  id: string;
  userId: string;
  leadId: string;
  callSid: string | null;
  outcome: string;
  notes: string;
  timestamp: number;
  duration: number;
}

export const C = {
  users: 'users',
  leads: 'leads',
  numbers: 'phoneNumbers',
  telephony: 'telephonyConfigs',
  sms: 'smsMessages',
  calls: 'callLogs',
  events: 'webhookEvents',
} as const;

export const leadDocId = (userId: string, leadId: string) => `${userId}__${leadId}`;
export const digits = (s: unknown) => String(s ?? '').replace(/\D/g, '').slice(-10);

type LogEntry = { t: number; k: string; x: string };

/**
 * The browser saves whole leads, while Twilio webhooks append activity on the server.
 * Merge so a save from a tab that hasn't refreshed never erases a logged call or text.
 */
export function mergeLead(existing: Record<string, unknown> | null, incoming: Record<string, unknown>) {
  if (!existing) return incoming;
  const key = (e: LogEntry) => `${e.t}|${e.k}|${e.x}`;
  const inLog = Array.isArray(incoming.log) ? (incoming.log as LogEntry[]) : [];
  const exLog = Array.isArray(existing.log) ? (existing.log as LogEntry[]) : [];
  const seen = new Set(inLog.map(key));
  const log = [...inLog, ...exLog.filter(e => !seen.has(key(e)))].sort((a, b) => b.t - a.t);
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
  return {
    ...existing,
    ...incoming,
    log,
    dials: Math.max(num(existing.dials), num(incoming.dials)),
    lastDial: Math.max(num(existing.lastDial), num(incoming.lastDial)) || null,
    smsOptOut: incoming.smsOptOut ?? existing.smsOptOut,
  };
}

export function toLeadDoc(userId: string, lead: Record<string, unknown>, now = Date.now()): LeadDoc {
  return {
    userId,
    leadId: String(lead.id),
    status: String(lead.status || 'new'),
    phoneDigits: digits(lead.phone),
    createdAt: typeof lead.created === 'number' ? lead.created : now,
    updatedAt: now,
    data: lead,
  };
}

/** Append an activity entry to a lead on the server (used by webhooks). */
export async function appendLeadLog(
  store: Store,
  userId: string,
  leadId: string,
  entry: LogEntry,
  mutate?: (data: Record<string, unknown>) => void,
) {
  const leads = store.col<LeadDoc>(C.leads);
  const id = leadDocId(userId, leadId);
  const doc = await leads.get(id);
  if (!doc) return null;
  const data = { ...doc.data };
  data.log = [entry, ...((data.log as LogEntry[]) || [])];
  mutate?.(data);
  await leads.set(id, toLeadDoc(userId, data, Date.now()));
  return data;
}
