// Sign-in: the browser signs in with Google through Firebase Auth and sends its ID token.
// The server verifies that token, then checks the invite-only users list.
import type { NextFunction, Request, Response } from 'express';
import { C, type Store, type UserDoc } from './store.ts';

export interface VerifiedToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}
export type VerifyToken = (idToken: string) => Promise<VerifiedToken>;

export interface AuthedUser extends UserDoc {
  picture: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export const adminEmails = () =>
  (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

export function blankProfile(name: string, email: string, phone = '', npn = '') {
  return {
    name, role: 'Agent', phone, email, booking: '', imo: '', callAgency: 'EST8 Financial Group', callPhone: '',
    quoteUrl: '', qpMp: '', qpFe: '', qpContact: 'no', photo: '', photoX: 50, photoY: 35, npn,
    dob: '', dl: '', dlState: '', aml: '', amlDate: '', eo: '', eoPolicy: '', eoCert: '', eoExp: '',
    states: [], writing: [],
  };
}

export const publicUser = (u: UserDoc, picture = '') => ({
  id: u.id,
  email: u.email,
  name: u.name,
  picture,
  role: u.role,
  isVerified: u.isVerified,
  phone: u.phone,
  npn: u.npn,
  profile: u.profile,
  settings: u.settings,
});

type AuthResult =
  | { ok: true; user: AuthedUser }
  | { ok: false; status: number; error: string; message: string; email?: string };

export async function authenticate(req: Request, store: Store, verify: VerifyToken): Promise<AuthResult> {
  const header = req.header('Authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!idToken) return { ok: false, status: 401, error: 'unauthenticated', message: 'Sign in to use EST8 CallDesk.' };

  let tok: VerifiedToken;
  try {
    tok = await verify(idToken);
  } catch {
    return { ok: false, status: 401, error: 'unauthenticated', message: 'Your sign-in expired. Sign in again.' };
  }
  const email = (tok.email || '').toLowerCase().trim();
  if (!email || tok.email_verified === false) {
    return { ok: false, status: 403, error: 'unverified_email', message: 'Sign in with a Google account that has a verified email.' };
  }

  const users = store.col<UserDoc>(C.users);
  let user: UserDoc | null = (await users.where('email', email))[0] ?? null;

  // First sign-in by an owner listed in ADMIN_EMAILS creates their admin account.
  if (!user && adminEmails().includes(email)) {
    const name = tok.name || email.split('@')[0];
    user = {
      id: `user_${tok.uid}`,
      email,
      name,
      role: 'admin',
      isVerified: true,
      phone: null,
      npn: null,
      profile: blankProfile(name, email),
      settings: { timeA: '5:15 pm', timeB: '6:45 pm' },
      invitedBy: null,
      authUid: tok.uid,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    await users.set(user.id, user);
  }

  if (!user) {
    return {
      ok: false, status: 403, error: 'unregistered', email,
      message: 'EST8 CallDesk is invite-only. Ask your administrator to add this Google account.',
    };
  }
  if (adminEmails().includes(email) && (user.role !== 'admin' || !user.isVerified)) {
    user = { ...user, role: 'admin', isVerified: true };
    await users.update(user.id, { role: 'admin', isVerified: true });
  }
  if (!user.isVerified) {
    return {
      ok: false, status: 403, error: 'pending_verification', email,
      message: 'Your account is paused. Ask your administrator to turn it back on.',
    };
  }
  if (user.authUid && user.authUid !== tok.uid) {
    return { ok: false, status: 403, error: 'account_mismatch', email, message: 'This email is linked to a different sign-in. Contact your administrator.' };
  }
  if (!user.authUid) {
    user = { ...user, authUid: tok.uid };
    await users.update(user.id, { authUid: tok.uid });
  }
  return { ok: true, user: { ...user, picture: tok.picture || '' } };
}

export function requireUser(store: Store, verify: VerifyToken) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const r = await authenticate(req, store, verify);
      if (!r.ok) {
        res.status(r.status).json({ error: r.error, message: r.message, email: r.email });
        return;
      }
      req.user = r.user;
      next();
    } catch (e) {
      next(e);
    }
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'forbidden', message: 'Only an administrator can do this.' });
    return;
  }
  next();
}
