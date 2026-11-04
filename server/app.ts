// Builds the API. server.ts runs it; tests build it with an in-memory store and fake sign-in.
import express, { type NextFunction, type Request, type Response } from 'express';
import { authenticate, blankProfile, publicUser, requireAdmin, requireUser, type VerifyToken } from './auth.ts';
import { C, leadDocId, mergeLead, toLeadDoc, type LeadDoc, type Store, type UserDoc } from './store.ts';
import { createTelephonyRouter, type TwilioLike } from './twilio.ts';

export interface AppDeps {
  store: Store;
  verifyToken: VerifyToken;
  twilioClient?: TwilioLike | null;
}

const LEAD_ID = /^[A-Za-z0-9_.:-]{1,120}$/;
type Lead = Record<string, unknown> & { id: string };

export function createApp({ store, verifyToken, twilioClient = null }: AppDeps) {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  const users = store.col<UserDoc>(C.users);
  const leads = store.col<LeadDoc>(C.leads);
  const auth = requireUser(store, verifyToken);
  const wrap =
    (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) =>
      fn(req, res).catch(next);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  // Firebase web config is public by design (it identifies the project; security comes from sign-in checks).
  app.get('/api/public-config', (_req, res) => {
    const { FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_APP_ID } = process.env;
    res.json({
      firebase: FIREBASE_API_KEY && FIREBASE_PROJECT_ID
        ? {
            apiKey: FIREBASE_API_KEY,
            authDomain: FIREBASE_AUTH_DOMAIN || `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
            projectId: FIREBASE_PROJECT_ID,
            appId: FIREBASE_APP_ID || undefined,
          }
        : null,
    });
  });

  // ---------------- Auth ----------------
  app.get('/api/auth/me', wrap(async (req, res) => {
    const r = await authenticate(req, store, verifyToken);
    if (!r.ok) {
      if (r.status === 401) return res.status(401).json({ authenticated: false, error: r.error, message: r.message });
      return res.json({ authenticated: false, isVerified: false, email: r.email, error: r.error, message: r.message });
    }
    const now = new Date().toISOString();
    await users.update(r.user.id, { lastLoginAt: now });
    res.json({ authenticated: true, isVerified: true, user: publicUser(r.user, r.user.picture) });
  }));

  // ---------------- Leads (each agent sees only their own) ----------------
  /** Admins may work another agent's book with ?as_user_id=; everyone else is their own. */
  const targetUserId = async (req: Request) => {
    const asId = String(req.query.as_user_id || req.body?.as_user_id || '');
    if (asId && req.user!.role === 'admin' && asId !== req.user!.id) {
      if (!(await users.get(asId))) throw Object.assign(new Error('That agent no longer exists.'), { status: 404 });
      return asId;
    }
    return req.user!.id;
  };
  const validLead = (lead: unknown): lead is Lead =>
    !!lead && typeof lead === 'object' && LEAD_ID.test(String((lead as Lead).id ?? ''));

  app.get('/api/leads', auth, wrap(async (req, res) => {
    const uid = await targetUserId(req);
    const rows = (await leads.where('userId', uid)).sort((a, b) => b.updatedAt - a.updatedAt);
    res.json({ leads: rows.map(r => r.data), targetUserId: uid });
  }));

  const saveLead = async (uid: string, lead: Lead) => {
    const id = leadDocId(uid, lead.id);
    const existing = await leads.get(id);
    const merged = mergeLead(existing?.data ?? null, lead) as Lead;
    merged.created = merged.created || existing?.createdAt || Date.now();
    await leads.set(id, toLeadDoc(uid, merged));
    return merged;
  };

  app.post('/api/leads', auth, wrap(async (req, res) => {
    const uid = await targetUserId(req);
    if (!validLead(req.body.lead)) return res.status(400).json({ error: 'A lead with a valid id is required.' });
    res.json({ success: true, lead: await saveLead(uid, req.body.lead) });
  }));

  app.put('/api/leads/:id', auth, wrap(async (req, res) => {
    const uid = await targetUserId(req);
    const lead = { ...(req.body.lead || {}), id: req.params.id };
    if (!validLead(lead)) return res.status(400).json({ error: 'Lead data is required.' });
    res.json({ success: true, lead: await saveLead(uid, lead) });
  }));

  app.delete('/api/leads/:id', auth, wrap(async (req, res) => {
    const uid = await targetUserId(req);
    await leads.delete(leadDocId(uid, req.params.id));
    res.json({ success: true, leadId: req.params.id });
  }));

  app.post('/api/leads/bulk', auth, wrap(async (req, res) => {
    const uid = await targetUserId(req);
    const list = Array.isArray(req.body.leads) ? req.body.leads.filter(validLead) : [];
    if (!list.length) return res.status(400).json({ error: 'No valid leads to import.' });
    if (list.length > 5000) return res.status(400).json({ error: 'Import 5,000 leads or fewer at a time.' });
    const now = Date.now();
    await leads.setMany(list.map((l: Lead) => ({ id: leadDocId(uid, l.id), data: toLeadDoc(uid, { ...l, created: l.created || now }, now) })));
    res.json({ success: true, count: list.length });
  }));

  // ---------------- Team (admin) ----------------
  app.get('/api/admin/users', auth, requireAdmin, wrap(async (_req, res) => {
    const [all, allLeads] = await Promise.all([users.all(), leads.all()]);
    const byUser = new Map<string, LeadDoc[]>();
    for (const l of allLeads) byUser.set(l.userId, [...(byUser.get(l.userId) || []), l]);
    const list = all
      .map(u => {
        const mine = byUser.get(u.id) || [];
        return {
          id: u.id, email: u.email, name: u.name, role: u.role, isVerified: u.isVerified, phone: u.phone, npn: u.npn,
          createdAt: u.createdAt, lastLoginAt: u.lastLoginAt,
          stats: {
            totalLeads: mine.length,
            dialsCount: mine.reduce((s, l) => s + (Number(l.data.dials) || 0), 0),
            apptsCount: mine.filter(l => l.status === 'appt').length,
            appsCount: mine.filter(l => l.status === 'app' || l.status === 'inforce').length,
          },
        };
      })
      .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'admin' ? -1 : 1));
    res.json({ users: list });
  }));

  app.post('/api/admin/users', auth, requireAdmin, wrap(async (req, res) => {
    const { email, name, phone, npn, role, initialStates } = req.body;
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail) || !String(name || '').trim()) {
      return res.status(400).json({ error: 'A valid email and a name are required.' });
    }
    if ((await users.where('email', cleanEmail)).length) {
      return res.status(409).json({ error: 'Someone with this email is already on the team.' });
    }
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const profile = { ...blankProfile(String(name).trim(), cleanEmail, phone || '', npn || ''), states: Array.isArray(initialStates) ? initialStates : [] };
    const doc: UserDoc = {
      id, email: cleanEmail, name: String(name).trim(), role: role === 'admin' ? 'admin' : 'agent', isVerified: true,
      phone: phone || null, npn: npn || null, profile, settings: { timeA: '5:15 pm', timeB: '6:45 pm' },
      invitedBy: req.user!.id, authUid: null, createdAt: new Date().toISOString(), lastLoginAt: null,
    };
    await users.set(id, doc);
    res.json({ success: true, user: { id, email: cleanEmail, name: doc.name, role: doc.role, isVerified: true, phone, npn, createdAt: doc.createdAt } });
  }));

  app.patch('/api/admin/users/:id', auth, requireAdmin, wrap(async (req, res) => {
    const target = await users.get(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    const { isVerified, role, name, phone, npn } = req.body;
    if (req.user!.id === target.id && (isVerified === false || role === 'agent')) {
      return res.status(400).json({ error: 'You cannot remove your own admin access.' });
    }
    await users.update(target.id, {
      isVerified: isVerified === undefined ? target.isVerified : Boolean(isVerified),
      role: role === undefined ? target.role : role === 'admin' ? 'admin' : 'agent',
      name: name ?? target.name,
      phone: phone ?? target.phone,
      npn: npn ?? target.npn,
    });
    res.json({ success: true, updatedId: target.id });
  }));

  app.delete('/api/admin/users/:id', auth, requireAdmin, wrap(async (req, res) => {
    if (req.user!.id === req.params.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
    const theirLeads = await leads.where('userId', req.params.id);
    for (const l of theirLeads) await leads.delete(l._id);
    // Their Twilio numbers keep billing, so hand them to the admin instead of orphaning them.
    const numbers = store.col<{ userId: string; isPrimary: boolean }>(C.numbers);
    for (const n of await numbers.where('userId', req.params.id)) await numbers.update(n._id, { userId: req.user!.id, isPrimary: false });
    await users.delete(req.params.id);
    res.json({ success: true, deletedId: req.params.id });
  }));

  // ---------------- Profile & settings ----------------
  app.put('/api/profile', auth, wrap(async (req, res) => {
    const profile = req.body.profile;
    if (!profile || typeof profile !== 'object') return res.status(400).json({ error: 'Profile data is required.' });
    const u = req.user!;
    await users.update(u.id, { profile, name: profile.name || u.name, phone: profile.phone || u.phone, npn: profile.npn || u.npn });
    res.json({ success: true, profile });
  }));

  app.put('/api/settings', auth, wrap(async (req, res) => {
    const settings = req.body.settings;
    if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'Settings data is required.' });
    await users.update(req.user!.id, { settings });
    res.json({ success: true, settings });
  }));

  app.use('/api/telephony', createTelephonyRouter({ store, auth, twilioClient }));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    console.error('[EST8 CallDesk] Server error:', err);
    res.status(500).json({ error: 'Something went wrong on the server. Try again.' });
  });

  return app;
}
