# Implementation Plan: Twilio Production Credentials, Inbound Call Routing & Messaging Service Architecture

## 1. Executive Summary & Required Twilio Variables
To enable live outbound/inbound phone calls and carrier-delivered 10DLC SMS messages directly to leads, the app requires specific Twilio configuration variables and dedicated TwiML webhook endpoints.

### Complete List of Required Twilio Variables:
| Variable Name | Format | Purpose | Where to Find in Twilio |
| :--- | :--- | :--- | :--- |
| **`TWILIO_ACCOUNT_SID`** | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Main Twilio Account Identifier | Twilio Console Dashboard (Account Info) |
| **`TWILIO_AUTH_TOKEN`** | `32-character hex token` | Account API Secret for REST requests | Twilio Console Dashboard (Account Info) |
| **`TWILIO_API_KEY`** | `SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Standard API Key for minting Voice WebRTC tokens | Account &rarr; API Keys & Tokens |
| **`TWILIO_API_SECRET`** | `32-character secret` | Secret used to sign WebRTC client JWTs | Generated once when creating the API Key |
| **`TWILIO_TWIML_APP_SID`** | `APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Bridges browser WebRTC to PSTN carrier lines | Voice &rarr; Manage &rarr; TwiML Apps |
| **`TWILIO_MESSAGING_SERVICE_SID`** | `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Binds numbers to the approved A2P 10DLC Campaign | Messaging &rarr; Services |
| **`APP_URL`** | `https://ais-...run.app` | Public URL for Twilio to call your webhook routes | Injected automatically or your custom domain |

---

## 2. Core TwiML Webhooks & Inbound Routing Architecture

### A. Inbound Call Routing (Browser Softphone &rarr; Mobile Cell Fallback)
- **Endpoint**: `POST /api/telephony/voice/inbound`
- **Routing Logic**:
  1. Identifies the dialed number to find which agent owns it in SQLite.
  2. Generates TwiML instructing Twilio to dial the agent's browser softphone client (`<Client>agent_${userId}</Client>`) for **20 seconds**.
  3. **Fallback Condition**: If the browser client is offline or not answered within 20 seconds, Twilio immediately dials the agent's verified mobile cell phone (`<Number>${agentCellPhone}</Number>`).
  4. Automatically matches caller's number to an existing lead in SQLite, creates an inbound call log entry, and updates stage.

### B. Outbound Call Routing (Browser WebRTC &rarr; Lead Phone)
- **Endpoint**: `POST /api/telephony/voice/outbound`
- **TwiML Generation**:
  - Responds with `<Response><Dial callerId="${callerId}"><Number>${leadPhone}</Number></Dial></Response>`.
  - Attaches `statusCallback` to track call duration and connection status.

### C. Inbound SMS Webhook
- **Endpoint**: `POST /api/telephony/sms/inbound`
- **Processing Logic**:
  - Receives incoming message payload (`From`, `To`, `Body`, `MessageSid`).
  - Finds lead by phone number and appends client response to the lead's real-time activity log.
  - Generates instant notification badge in the UI.

### D. A2P 10DLC Messaging Service Integration
- **Endpoint**: Updated `/api/telephony/sms`
- If `TWILIO_MESSAGING_SERVICE_SID` is provided, sends via Messaging Service SID instead of raw phone number to ensure automatic carrier 10DLC throughput pooling and opt-out handling.

---

## 3. Telephony Diagnostics & Settings Panel in CallDesk
- Add a **"Twilio & Carrier Diagnostics"** card inside `SettingsModal.tsx`:
  - **Live Status Indicators**: Displays green checkmarks for detected environment variables and amber warnings for missing credentials.
  - **Copy-Paste Webhook URLs**: Provides the exact webhook URLs with one-click copy buttons ready to paste into the Twilio Console:
    - *Voice Request URL* (for TwiML App): `https://<APP_URL>/api/telephony/voice/outbound`
    - *Phone Number Inbound Voice URL*: `https://<APP_URL>/api/telephony/voice/inbound`
    - *Phone Number / Messaging Service Inbound SMS URL*: `https://<APP_URL>/api/telephony/sms/inbound`
    - *Status Callback URL*: `https://<APP_URL>/api/telephony/voice/status`

---

## 4. Implementation Steps
1. Update `server/twilio.ts` with complete TwiML XML endpoints (`/voice/inbound`, `/voice/outbound`, `/voice/status`, `/sms/inbound`, `/sms/status`) and real Twilio SDK client integration using API Key & Secret.
2. Update `.env.example` with `TWILIO_MESSAGING_SERVICE_SID` and usage documentation.
3. Add Twilio Diagnostics & Webhook Copy-Paste section to `SettingsModal.tsx`.
4. Compile, lint, and test webhook responses.
