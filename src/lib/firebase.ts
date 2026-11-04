// Google sign-in through Firebase Auth. The server verifies the ID token on every request.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, onIdTokenChanged, signInWithPopup, signOut as fbSignOut, type Auth, type User,
} from 'firebase/auth';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let idToken = '';
let configError = '';

/** Loads the Firebase web config from the server, so it can change without a rebuild. */
export async function initFirebase(): Promise<Auth | null> {
  if (auth) return auth;
  try {
    const res = await fetch('/api/public-config');
    const { firebase } = await res.json();
    if (!firebase?.apiKey) {
      configError = 'Sign-in isn’t set up yet. Add the Firebase settings (FIREBASE_API_KEY, FIREBASE_PROJECT_ID) to the server and redeploy.';
      return null;
    }
    app = initializeApp(firebase);
    auth = getAuth(app);
    return auth;
  } catch {
    configError = 'Couldn’t reach the CallDesk server. Check your connection and reload.';
    return null;
  }
}

export const firebaseConfigError = () => configError;

/** Calls back with the signed-in Google user (or null) and keeps the ID token fresh. */
export async function watchAuth(cb: (user: User | null) => void) {
  const a = await initFirebase();
  if (!a) {
    cb(null);
    return () => {};
  }
  return onIdTokenChanged(a, async u => {
    idToken = u ? await u.getIdToken() : '';
    cb(u);
  });
}

export async function signInWithGoogle() {
  const a = await initFirebase();
  if (!a) throw new Error(configError || 'Sign-in isn’t set up yet.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(a, provider);
}

export async function signOut() {
  idToken = '';
  if (auth) await fbSignOut(auth);
}

/** Fresh token for requests that can't wait for the background refresh. */
export async function getIdToken(force = false) {
  if (auth?.currentUser) idToken = await auth.currentUser.getIdToken(force);
  return idToken;
}

/** Headers for every CallDesk API request. */
export function authHeaders(json = true): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  if (idToken) h.Authorization = `Bearer ${idToken}`;
  return h;
}
