// EST8 CallDesk server: API + the built React app.
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import twilio from 'twilio';
import { createApp } from './server/app.ts';
import { firestoreStore } from './server/store.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Database login. In the same Google Cloud project as Firebase, Cloud Run's own service account works with
// nothing set. Anywhere else, paste a Firebase service-account key (the whole JSON) into FIREBASE_SERVICE_ACCOUNT.
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
function credential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return applicationDefault();
  try {
    return cert(JSON.parse(raw));
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the whole service-account key file.');
  }
}
if (!getApps().length) initializeApp({ credential: credential(), projectId });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const sid = process.env.TWILIO_ACCOUNT_SID || '';
const token = process.env.TWILIO_AUTH_TOKEN || '';
const twilioClient = sid.startsWith('AC') && token ? twilio(sid, token) : null;
if (!twilioClient) console.warn('[EST8 CallDesk] Twilio secrets not set: calling and texting are off.');
if (!process.env.ADMIN_EMAILS) console.warn('[EST8 CallDesk] ADMIN_EMAILS is not set: nobody can sign in as the first admin.');

const app = createApp({
  store: firestoreStore(db),
  verifyToken: idToken => getAuth().verifyIdToken(idToken),
  twilioClient,
});

async function start() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(__dirname, 'dist');
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`[EST8 CallDesk] Listening on port ${PORT}`));
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
