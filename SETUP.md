# EST8 CallDesk setup

EST8 CallDesk needs three things to run for real:

- **Firebase** for Google sign-in and the database.
- **Twilio** for calling and texting.
- **A host** that runs the server. That's Google AI Studio's Cloud Run deploy, or Cloud Run directly.

Leads, notes and calls are saved in Firestore, so they survive restarts and redeploys. Each agent sees only their own book. Admins can open any agent's book from the Team screen.

## 1. Firebase (sign-in + database)

1. Go to <https://console.firebase.google.com> and create a project, for example `est8-calldesk`. You can turn Google Analytics off.
2. **Build → Firestore Database → Create database.** Choose Production mode and a U.S. location.
3. **Firestore → Rules.** Paste these rules and publish. Only the server reads and writes data, so browsers get no direct access.

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} { allow read, write: if false; }
     }
   }
   ```

4. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
5. **Authentication → Settings → Authorized domains → Add domain.** Add `est8-calldesk.ai.studio`, plus the `…run.app` address if you use one.
6. **Project settings → General → Your apps → Web (`</>`).** Register a web app, then copy `apiKey`, `projectId` and `appId` into the secrets below.
7. **Only if the app is hosted outside this Firebase project:** go to Project settings → Service accounts → Generate new private key. Paste the whole JSON file into the `FIREBASE_SERVICE_ACCOUNT` secret.

## 2. Twilio (calling + texting)

1. **Lock calling to the U.S.:** Voice → Settings → Geo permissions, allow only the United States.
2. **API key:** Account → API keys & tokens → Create API key (Standard). Save the SID (SK…) and the secret, which is shown once.
3. **TwiML App:** Voice → Manage → TwiML Apps → Create. Set the Voice Request URL to `https://est8-calldesk.ai.studio/api/telephony/voice/outbound` with method POST. Save it and copy the SID (AP…).
4. **Upgrade the account.** A trial account can only call and text numbers you've verified in Twilio.
5. **Numbers:** after the app is live, buy numbers from inside CallDesk (the **Numbers** button in the top bar). The app sets each number's call and text webhooks for you. Buy one local number per licensed state, then register them in Trust Hub (SHAKEN/STIR, CNAM) so calls are less likely to show "Spam likely."
6. **Texting (optional):** create a Messaging Service, add your numbers, and register an A2P 10DLC brand and campaign. The **A2P 10DLC** button in the top bar shows the live status. Calls work without this.

## 3. Secrets

Add every secret in `.env.example`, in AI Studio's Settings → Secrets or Cloud Run's variables. The minimum:

| Secret | Example |
| --- | --- |
| `APP_URL` | `https://est8-calldesk.ai.studio` |
| `ADMIN_EMAILS` | your Google email |
| `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID` | from Firebase step 6 |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio Console home |
| `TWILIO_API_KEY`, `TWILIO_API_SECRET` | Twilio step 2 |
| `TWILIO_TWIML_APP_SID` | Twilio step 3 |

After the app is running, **Settings & Integrations → Twilio & Carrier Webhooks** checks each secret and lists the webhook addresses Twilio should use.

## 4. Deploy

**Option A, Google AI Studio:** bring this code into your AI Studio app, add the secrets, and click **Publish**. Twilio can't reach the editor preview, so calls only work on the published app.

**Option B, Cloud Run directly:** use the Google Cloud project linked to your Firebase project. Then the database login is automatic and `FIREBASE_SERVICE_ACCOUNT` isn't needed.

```
gcloud run deploy est8-calldesk --source . --region us-central1 --allow-unauthenticated \
  --set-env-vars APP_URL=https://YOUR-URL,ADMIN_EMAILS=you@example.com,FIREBASE_PROJECT_ID=...,FIREBASE_API_KEY=...
```

Put the Twilio secrets in Secret Manager, or add them with `--set-env-vars`. Then point the TwiML App's Voice Request URL at the new address.

## 5. First run

1. Open the app and sign in with Google using the email in `ADMIN_EMAILS`. You become the admin.
2. **Profile:** add your licensed states and license numbers. Calls to leads outside these states are blocked.
3. **Numbers** (top bar): buy a number for each state you dial.
4. Import leads, open one with your own cell and a licensed state, and press **Call**. Allow the microphone when the browser asks.
5. **Team & Downlines:** invite agents by their Google email. Each agent signs in with Google and sees only their own leads.

The server blocks every call to a non-U.S. number, an unlicensed state, a lead marked Do not call, or a lead outside 8 a.m.–9 p.m. in its state. You'll hear the reason instead of the call. Leads who reply STOP are blocked from texts automatically.

## Developing

```
npm install
cp .env.example .env   # fill it in
npm run dev            # http://localhost:3000
npm test               # API tests with a fake database and fake Twilio
npm run lint           # type check
```
