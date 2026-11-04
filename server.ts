import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDb } from './server/db.ts';
import { telephonyRouter } from './server/twilio.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Initialize SQLite database
initDb();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Helper to authenticate request
function getAuthUser(req: Request) {
  const email = (req.headers['x-user-email'] as string || req.query.auth_email as string || '').toLowerCase().trim();
  if (!email) return null;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'admin' | 'agent',
    isVerified: Boolean(user.is_verified),
    phone: user.phone,
    npn: user.npn,
    profile: user.profile_json ? JSON.parse(user.profile_json) : null,
    settings: user.settings_json ? JSON.parse(user.settings_json) : null,
  };
}

// Auth Middleware: enforces verified account
function requireVerified(req: Request, res: Response, next: NextFunction) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      error: 'unauthenticated',
      message: 'Sign-in required to access EST8 CallDesk.'
    });
  }

  if (!user.isVerified) {
    return res.status(403).json({
      error: 'access_restricted',
      message: 'Your account is not verified. Please contact Admin Andrew Chavis (aurek97@gmail.com) for authorization.',
      email: user.email
    });
  }

  (req as any).user = user;
  next();
}

// Admin Middleware: enforces role === 'admin'
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      error: 'forbidden',
      message: 'This operation requires Super Admin privileges.'
    });
  }
  next();
}

// ----------------- AUTH ROUTES ----------------- //

// Check current user status (used by frontend on boot / login)
app.get('/api/auth/me', (req: Request, res: Response) => {
  const rawEmail = (req.headers['x-user-email'] as string || req.query.email as string || '').toLowerCase().trim();
  if (!rawEmail) {
    return res.json({ authenticated: false, user: null });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(rawEmail) as any;
  if (!user) {
    return res.json({
      authenticated: false,
      isVerified: false,
      email: rawEmail,
      error: 'unregistered',
      message: 'EST8 CallDesk is a private CRM. You must be pre-authorized by an administrator to access this system.'
    });
  }

  if (!user.is_verified) {
    return res.json({
      authenticated: false,
      isVerified: false,
      email: rawEmail,
      name: user.name,
      error: 'pending_verification',
      message: 'Your account is pending verification by Super Admin Andrew Chavis.'
    });
  }

  // Update last login timestamp
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);

  return res.json({
    authenticated: true,
    isVerified: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: true,
      phone: user.phone,
      npn: user.npn,
      profile: user.profile_json ? JSON.parse(user.profile_json) : null,
      settings: user.settings_json ? JSON.parse(user.settings_json) : null,
    }
  });
});

// Explicit login check
app.post('/api/auth/login', (req: Request, res: Response) => {
  const email = (req.body.email || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  if (!user) {
    return res.status(403).json({
      isVerified: false,
      error: 'unregistered',
      message: 'Access Denied: This Google Account is not registered on EST8 CallDesk. Please request an invite from Andrew Chavis (aurek97@gmail.com).'
    });
  }

  if (!user.is_verified) {
    return res.status(403).json({
      isVerified: false,
      error: 'pending_verification',
      message: 'Access Restricted: Your account has been suspended or is awaiting verification by Andrew Chavis.'
    });
  }

  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), user.id);

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: true,
      phone: user.phone,
      npn: user.npn,
      profile: user.profile_json ? JSON.parse(user.profile_json) : null,
      settings: user.settings_json ? JSON.parse(user.settings_json) : null,
    }
  });
});

// ----------------- LEADS ROUTES (DATA ISOLATION) ----------------- //

// Helper to determine target user ID for lead queries
function resolveTargetUserId(req: Request): string {
  const authUser = (req as any).user;
  const requestedUserId = (req.query.as_user_id || req.body.as_user_id) as string;

  // Only admins can inspect or operate on another user's book
  if (authUser.role === 'admin' && requestedUserId) {
    return requestedUserId;
  }
  return authUser.id;
}

// Get leads for target user
app.get('/api/leads', requireVerified, (req: Request, res: Response) => {
  const targetUserId = resolveTargetUserId(req);
  const rows = db.prepare('SELECT data_json FROM leads WHERE user_id = ? ORDER BY updated_at DESC').all(targetUserId) as { data_json: string }[];
  const leads = rows.map(r => JSON.parse(r.data_json));
  res.json({ leads, targetUserId });
});

// Upsert a lead
app.post('/api/leads', requireVerified, (req: Request, res: Response) => {
  const targetUserId = resolveTargetUserId(req);
  const lead = req.body.lead;
  if (!lead || !lead.id) {
    return res.status(400).json({ error: 'Valid lead object with ID is required' });
  }

  const now = Date.now();
  lead.created = lead.created || now;

  const stmt = db.prepare(`
    INSERT INTO leads (id, user_id, type, status, first_name, last_name, phone, state, dials, last_dial, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      status = excluded.status,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      state = excluded.state,
      dials = excluded.dials,
      last_dial = excluded.last_dial,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    lead.id,
    targetUserId,
    lead.type || 'mp',
    lead.status || 'new',
    lead.firstName || '',
    lead.lastName || '',
    lead.phone || '',
    lead.state || '',
    lead.dials || 0,
    lead.lastDial || null,
    JSON.stringify(lead),
    lead.created,
    now
  );

  res.json({ success: true, lead });
});

// Update an existing lead
app.put('/api/leads/:id', requireVerified, (req: Request, res: Response) => {
  const targetUserId = resolveTargetUserId(req);
  const leadId = req.params.id;
  const lead = req.body.lead;
  if (!lead) {
    return res.status(400).json({ error: 'Lead data required' });
  }

  lead.id = leadId;
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO leads (id, user_id, type, status, first_name, last_name, phone, state, dials, last_dial, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      status = excluded.status,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      state = excluded.state,
      dials = excluded.dials,
      last_dial = excluded.last_dial,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    leadId,
    targetUserId,
    lead.type || 'mp',
    lead.status || 'new',
    lead.firstName || '',
    lead.lastName || '',
    lead.phone || '',
    lead.state || '',
    lead.dials || 0,
    lead.lastDial || null,
    JSON.stringify(lead),
    lead.created || now,
    now
  );

  res.json({ success: true, lead });
});

// Delete a lead
app.delete('/api/leads/:id', requireVerified, (req: Request, res: Response) => {
  const targetUserId = resolveTargetUserId(req);
  const leadId = req.params.id;

  db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(leadId, targetUserId);
  res.json({ success: true, leadId });
});

// Bulk import leads
app.post('/api/leads/bulk', requireVerified, (req: Request, res: Response) => {
  const targetUserId = resolveTargetUserId(req);
  const leads = req.body.leads;
  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'Array of leads required' });
  }

  const now = Date.now();
  const insertStmt = db.prepare(`
    INSERT INTO leads (id, user_id, type, status, first_name, last_name, phone, state, dials, last_dial, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      status = excluded.status,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      phone = excluded.phone,
      state = excluded.state,
      dials = excluded.dials,
      last_dial = excluded.last_dial,
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `);

  const runBulk = db.transaction((items: any[]) => {
    for (const lead of items) {
      insertStmt.run(
        lead.id,
        targetUserId,
        lead.type || 'mp',
        lead.status || 'new',
        lead.firstName || '',
        lead.lastName || '',
        lead.phone || '',
        lead.state || '',
        lead.dials || 0,
        lead.lastDial || null,
        JSON.stringify(lead),
        lead.created || now,
        now
      );
    }
  });

  runBulk(leads);
  res.json({ success: true, count: leads.length });
});

// ----------------- ADMIN DOWNLINE MANAGEMENT ----------------- //

// Get team users with metrics (Admin only)
app.get('/api/admin/users', requireVerified, requireAdmin, (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT
      u.id, u.email, u.name, u.role, u.is_verified, u.phone, u.npn, u.created_at, u.last_login_at, u.profile_json,
      (SELECT COUNT(*) FROM leads WHERE user_id = u.id) as total_leads,
      (SELECT COALESCE(SUM(dials), 0) FROM leads WHERE user_id = u.id) as total_dials,
      (SELECT COUNT(*) FROM leads WHERE user_id = u.id AND status = 'appt') as total_appts,
      (SELECT COUNT(*) FROM leads WHERE user_id = u.id AND status IN ('app', 'inforce')) as total_apps
    FROM users u
    ORDER BY u.role DESC, u.name ASC
  `).all() as any[];

  const formattedUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isVerified: Boolean(u.is_verified),
    phone: u.phone,
    npn: u.npn,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    stats: {
      totalLeads: u.total_leads,
      dialsCount: u.total_dials,
      apptsCount: u.total_appts,
      appsCount: u.total_apps,
    }
  }));

  res.json({ users: formattedUsers });
});

// Create / Pre-Register downline agent (Admin only)
app.post('/api/admin/users', requireVerified, requireAdmin, (req: Request, res: Response) => {
  const { email, name, phone, npn, role, initialStates } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and name are required' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'A user with this email address already exists' });
  }

  const adminUser = (req as any).user;
  const id = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const defaultProfile = {
    name,
    role: 'Agent',
    phone: phone || '',
    email: cleanEmail,
    booking: '',
    imo: 'EST8 Financial',
    callAgency: 'EST8 Financial Group',
    callPhone: phone || '',
    quoteUrl: 'https://quoteplicity.com/run',
    qpMp: 'EST8MP',
    qpFe: 'EST8FE',
    qpContact: 'yes',
    photo: '',
    photoX: 50,
    photoY: 50,
    npn: npn || '',
    dob: '',
    dl: '',
    dlState: '',
    aml: '',
    amlDate: '',
    eo: '',
    eoPolicy: '',
    eoCert: '',
    eoExp: '',
    states: initialStates || [],
    writing: []
  };

  const defaultSettings = {
    timeA: '10:00',
    timeB: '14:00'
  };

  db.prepare(`
    INSERT INTO users (id, email, name, role, is_verified, phone, npn, profile_json, settings_json, invited_by, created_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    cleanEmail,
    name,
    role === 'admin' ? 'admin' : 'agent',
    phone || null,
    npn || null,
    JSON.stringify(defaultProfile),
    JSON.stringify(defaultSettings),
    adminUser.id,
    new Date().toISOString()
  );

  res.json({
    success: true,
    user: {
      id,
      email: cleanEmail,
      name,
      role: role === 'admin' ? 'admin' : 'agent',
      isVerified: true,
      phone,
      npn,
      createdAt: new Date().toISOString()
    }
  });
});

// Update user / downline (Admin only)
app.patch('/api/admin/users/:id', requireVerified, requireAdmin, (req: Request, res: Response) => {
  const userId = req.params.id;
  const { isVerified, role, name, phone, npn } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent admin from de-verifying or demoting themselves
  const authUser = (req as any).user;
  if (authUser.id === userId && (isVerified === false || role === 'agent')) {
    return res.status(400).json({ error: 'Cannot revoke your own Super Admin access' });
  }

  const newVerified = isVerified !== undefined ? (isVerified ? 1 : 0) : user.is_verified;
  const newRole = role !== undefined ? role : user.role;
  const newName = name !== undefined ? name : user.name;
  const newPhone = phone !== undefined ? phone : user.phone;
  const newNpn = npn !== undefined ? npn : user.npn;

  db.prepare(`
    UPDATE users
    SET is_verified = ?, role = ?, name = ?, phone = ?, npn = ?
    WHERE id = ?
  `).run(newVerified, newRole, newName, newPhone, newNpn, userId);

  res.json({ success: true, updatedId: userId });
});

// Delete user / downline (Admin only)
app.delete('/api/admin/users/:id', requireVerified, requireAdmin, (req: Request, res: Response) => {
  const userId = req.params.id;
  const authUser = (req as any).user;

  if (authUser.id === userId) {
    return res.status(400).json({ error: 'Cannot delete your own admin account' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ success: true, deletedId: userId });
});

// Update personal agent profile
app.put('/api/profile', requireVerified, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const profile = req.body.profile;
  if (!profile) return res.status(400).json({ error: 'Profile data required' });

  db.prepare('UPDATE users SET profile_json = ?, name = ?, phone = ?, npn = ? WHERE id = ?').run(
    JSON.stringify(profile),
    profile.name || authUser.name,
    profile.phone || authUser.phone,
    profile.npn || authUser.npn,
    authUser.id
  );

  res.json({ success: true, profile });
});

// Update settings
app.put('/api/settings', requireVerified, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const settings = req.body.settings;
  if (!settings) return res.status(400).json({ error: 'Settings data required' });

  db.prepare('UPDATE users SET settings_json = ? WHERE id = ?').run(
    JSON.stringify(settings),
    authUser.id
  );

  res.json({ success: true, settings });
});

// Telephony, Softphone & A2P 10DLC routes
app.use('/api/telephony', telephonyRouter);

// ----------------- VITE MIDDLEWARE & STATIC SERVING ----------------- //

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EST8 CallDesk] Multi-Tenant CRM running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
