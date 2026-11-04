// Run: npm test
// Exercises the real API routes with an in-memory database, fake Google sign-ins and a fake Twilio.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import twilio from 'twilio';
import { createApp } from '../server/app.ts';
import { memoryStore, C } from '../server/store.ts';
import { checkLeadCall, inCallingHours } from '../server/compliance.ts';

const AUTH_TOKEN = 'test_auth_token_0123456789abcdef0123';
Object.assign(process.env, {
  ADMIN_EMAILS: 'owner@est8.test',
  TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(32),
  TWILIO_AUTH_TOKEN: AUTH_TOKEN,
  TWILIO_API_KEY: 'SK' + '2'.repeat(32),
  TWILIO_API_SECRET: 'secret_secret_secret',
  TWILIO_TWIML_APP_SID: 'AP' + '3'.repeat(32),
  TWILIO_MESSAGING_SERVICE_SID: '',
  APP_URL: '',
});

// Fake Google sign-in: "tok:<uid>:<email>"
const verifyToken = async (t: string) => {
  const [p, uid, email] = t.split(':');
  if (p !== 'tok') throw new Error('bad token');
  return { uid, email, email_verified: true, name: email.split('@')[0] };
};

// Fake Twilio REST client: records what CallDesk asks it to do.
const sent: Record<string, unknown>[] = [];
const fakeTwilio = {
  availablePhoneNumbers: () => ({ local: { list: async () => [{ phoneNumber: '+12145550111', friendlyName: '(214) 555-0111', locality: 'Dallas', region: 'TX', postalCode: '75201', rateCenter: 'DALLAS', capabilities: { voice: true, sms: true, mms: true } }] } }),
  incomingPhoneNumbers: Object.assign((sid: string) => ({ remove: async () => sent.push({ released: sid }) }), {
    create: async (o: { phoneNumber: string }) => ({ sid: 'PN' + o.phoneNumber.slice(-10), phoneNumber: o.phoneNumber, friendlyName: '(214) 555-0111' }),
  }),
  messages: { create: async (o: Record<string, unknown>) => { sent.push(o); if (String(o.to).endsWith('0000')) throw Object.assign(new Error('unverified'), { code: 21608 }); return { sid: 'SM123', status: 'queued', from: o.from }; } },
  calls: { create: async (o: Record<string, unknown>) => { sent.push(o); return { sid: 'CA999' }; } },
  messaging: { v1: { services: () => ({ phoneNumbers: { create: async () => ({}) }, usAppToPerson: { list: async () => [] } }) } },
};

const store = memoryStore();
let server: Server;
let base = '';
before(async () => {
  const app = createApp({ store, verifyToken, twilioClient: fakeTwilio as never });
  server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const call = async (method: string, path: string, opts: { token?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}), ...opts.headers },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* xml */ }
  return { status: res.status, json, text };
};
/** POST a Twilio webhook, signed like Twilio does (or not). */
const hook = async (path: string, params: Record<string, string>, sign = true) => {
  const url = base + path;
  const sig = sign ? twilio.getExpectedTwilioSignature(AUTH_TOKEN, url, params) : 'nope';
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': sig }, body: new URLSearchParams(params) });
  return { status: res.status, text: await res.text() };
};

const OWNER = 'tok:uid-owner:owner@est8.test';
const AGENT = 'tok:uid-agent:agent@est8.test';
const STRANGER = 'tok:uid-x:stranger@gmail.com';
const daytimeState = () => ['TX', 'MI', 'OH', 'SC', 'VA', 'CA', 'HI', 'AK'].find(s => inCallingHours(s)) || 'HI';
let ownerId = '';
let agentId = '';

test('no sign-in, or a forged email header, gets nothing', async () => {
  assert.equal((await call('GET', '/api/leads')).status, 401);
  assert.equal((await call('GET', '/api/leads', { headers: { 'x-user-email': 'owner@est8.test' } })).status, 401);
  assert.equal((await call('GET', '/api/leads?auth_email=owner@est8.test')).status, 401);
  assert.equal((await call('GET', '/api/leads', { token: 'forged' })).status, 401);
});

test('owner in ADMIN_EMAILS becomes admin on first sign-in; strangers are refused', async () => {
  const me = await call('GET', '/api/auth/me', { token: OWNER });
  assert.equal(me.json.authenticated, true);
  assert.equal(me.json.user.role, 'admin');
  ownerId = me.json.user.id;
  const s = await call('GET', '/api/auth/me', { token: STRANGER });
  assert.equal(s.json.authenticated, false);
  assert.equal(s.json.error, 'unregistered');
  assert.equal((await call('GET', '/api/leads', { token: STRANGER })).status, 403);
});

test('admin invites an agent; agent can sign in; agents cannot use admin routes', async () => {
  const inv = await call('POST', '/api/admin/users', { token: OWNER, body: { email: 'Agent@est8.test', name: 'Test Agent' } });
  assert.equal(inv.status, 200);
  agentId = inv.json.user.id;
  const me = await call('GET', '/api/auth/me', { token: AGENT });
  assert.equal(me.json.user.id, agentId);
  assert.equal((await call('GET', '/api/admin/users', { token: AGENT })).status, 403);
  assert.equal((await call('POST', '/api/admin/users', { token: AGENT, body: { email: 'x@y.z', name: 'X' } })).status, 403);
});

test('each agent sees only their own leads; agents cannot borrow another book', async () => {
  const st = daytimeState();
  await call('PUT', '/api/profile', { token: AGENT, body: { profile: { name: 'Test Agent', states: [{ st }] } } });
  await call('POST', '/api/leads', { token: AGENT, body: { lead: { id: 'L1', firstName: 'Gloria', phone: '(419) 555-0176', state: st, status: 'new', log: [] } } });
  await call('POST', '/api/leads', { token: OWNER, body: { lead: { id: 'L1', firstName: 'Owner lead', phone: '(832) 555-0147', state: 'TX', status: 'new', log: [] } } });
  const a = await call('GET', '/api/leads', { token: AGENT });
  assert.deepEqual(a.json.leads.map((l: any) => l.firstName), ['Gloria']);
  const peek = await call('GET', `/api/leads?as_user_id=${ownerId}`, { token: AGENT });
  assert.deepEqual(peek.json.leads.map((l: any) => l.firstName), ['Gloria'], 'as_user_id is ignored for agents');
  const adminView = await call('GET', `/api/leads?as_user_id=${agentId}`, { token: OWNER });
  assert.deepEqual(adminView.json.leads.map((l: any) => l.firstName), ['Gloria'], 'admins can open an agent book');
});

test('a stale save from the browser keeps activity the server logged', async () => {
  await hookCall(); // logs a dial on L1 via Twilio
  const stale = { id: 'L1', firstName: 'Gloria', phone: '(419) 555-0176', state: daytimeState(), status: 'contacted', log: [{ t: 1, k: 'note', x: 'typed in browser' }] };
  await call('PUT', '/api/leads/L1', { token: AGENT, body: { lead: stale } });
  const lead = (await call('GET', '/api/leads', { token: AGENT })).json.leads[0];
  assert.equal(lead.status, 'contacted');
  assert.ok(lead.log.some((e: any) => e.x === 'typed in browser'));
  assert.ok(lead.log.some((e: any) => e.k === 'call' && e.x.startsWith('Called from')), 'server-logged call survives');
  assert.equal(lead.dials, 1);
});

async function hookCall() {
  // Agent needs a caller ID: buying requires admin by default.
  assert.equal((await call('POST', '/api/telephony/numbers/buy', { token: AGENT, body: { phoneNumber: '+12145550111' } })).status, 403);
  await store.col(C.numbers).set('PN2145550111', { id: 'PN2145550111', userId: agentId, phoneNumber: '+12145550111', friendlyName: '(214) 555-0111', twilioSid: 'PN2145550111', region: daytimeState(), capabilitiesVoice: true, capabilitiesSms: true, purchasedAt: '', isPrimary: true });
  const r = await hook('/api/telephony/voice/outbound', { From: `client:agent_${agentId}`, To: '(419) 555-0176', leadId: 'L1', CallSid: 'CAbrowser1', AccountSid: process.env.TWILIO_ACCOUNT_SID! });
  assert.equal(r.status, 200);
  assert.match(r.text, /<Dial[^>]*callerId="\+12145550111"[^>]*>.*<Number>\+14195550176<\/Number>/);
}

test('Twilio webhooks without a valid signature are rejected', async () => {
  const r = await hook('/api/telephony/voice/outbound', { From: `client:agent_${agentId}`, To: '+14195550176', leadId: 'L1' }, false);
  assert.equal(r.status, 403);
  assert.equal((await hook('/api/telephony/sms/inbound', { From: '+14195550176', To: '+12145550111', Body: 'hi' }, false)).status, 403);
});

test('server blocks calls: unlicensed state, Do not call, no state, after hours, foreign numbers', () => {
  const profile = { states: [{ st: 'TX' }, { st: 'MI' }] };
  const noon = new Date('2026-11-04T18:00:00Z'); // noon in Texas
  const night = new Date('2026-11-05T04:30:00Z'); // 10:30 p.m. in Texas
  assert.equal(checkLeadCall({ phone: '8325550147', state: 'Texas' }, profile, noon).ok, true);
  assert.match(checkLeadCall({ phone: '8325550147', state: 'CA' }, profile, noon).reason, /not one of your licensed states/);
  assert.match(checkLeadCall({ phone: '8325550147', state: 'TX', status: 'dnc' }, profile, noon).reason, /Do not call/);
  assert.match(checkLeadCall({ phone: '8325550147', state: '' }, profile, noon).reason, /no state/);
  assert.match(checkLeadCall({ phone: '8325550147', state: 'TX' }, profile, night).reason, /outside 8 a\.m\. to 9 p\.m\./);
  assert.match(checkLeadCall({ phone: '+44 20 7946 0000', state: 'TX' }, profile, noon).reason, /valid U\.S\./);
  assert.match(checkLeadCall({ phone: '8325550147', state: 'TX' }, { states: [] }, noon).reason, /Add your licensed states/);
});

test('blocked lead call speaks the reason instead of dialing', async () => {
  await call('POST', '/api/leads', { token: AGENT, body: { lead: { id: 'DNC1', firstName: 'No', phone: '(419) 555-0199', state: daytimeState(), status: 'dnc', log: [] } } });
  const r = await hook('/api/telephony/voice/outbound', { From: `client:agent_${agentId}`, To: '+14195550199', leadId: 'DNC1', CallSid: 'CAx' });
  assert.match(r.text, /<Say>This lead is marked Do not call\.<\/Say>/);
  assert.doesNotMatch(r.text, /<Dial/);
});

test('call result is logged once even if Twilio retries', async () => {
  const q = `?u=${agentId}&l=L1`;
  const p = { DialCallSid: 'CAleg1', DialCallStatus: 'completed', DialCallDuration: '133', CallSid: 'CAbrowser1' };
  await hook('/api/telephony/voice/dial-complete' + q, p);
  await hook('/api/telephony/voice/dial-complete' + q, p);
  const lead = (await call('GET', '/api/leads', { token: AGENT })).json.leads.find((l: any) => l.id === 'L1');
  assert.equal(lead.log.filter((e: any) => e.x === 'Call result: answered · 2:13').length, 1);
});

test('inbound STOP opts the lead out, and texting is then blocked', async () => {
  await hook('/api/telephony/sms/inbound', { From: '+14195550176', To: '+12145550111', Body: 'Stop', MessageSid: 'SMin1' });
  const lead = (await call('GET', '/api/leads', { token: AGENT })).json.leads.find((l: any) => l.id === 'L1');
  assert.equal(lead.smsOptOut, true);
  const r = await call('POST', '/api/telephony/sms', { token: AGENT, body: { leadId: 'L1', body: 'hi' } });
  assert.equal(r.status, 409);
  assert.match(r.json.error, /replied STOP/);
  const msgs = await call('GET', '/api/telephony/sms/messages?leadId=L1', { token: AGENT });
  assert.equal(msgs.json.messages[0].body, 'Stop');
  assert.equal((await call('GET', '/api/telephony/sms/messages?leadId=L1', { token: OWNER })).json.messages.length, 0, "owner's own L1 has no texts");
});

test('texts go to the lead on file from the agent number, and Twilio errors are reported, not faked', async () => {
  await call('POST', '/api/leads', { token: AGENT, body: { lead: { id: 'T1', phone: '(419) 555-0177', state: daytimeState(), status: 'new', log: [] } } });
  const ok = await call('POST', '/api/telephony/sms', { token: AGENT, body: { leadId: 'T1', to: '+19995551234', body: 'Hello' } });
  assert.equal(ok.status, 200);
  const last = sent.at(-1)!;
  assert.equal(last.to, '+14195550177', 'ignores the "to" the browser sent');
  assert.equal(last.from, '+12145550111');
  await call('POST', '/api/leads', { token: AGENT, body: { lead: { id: 'T2', phone: '(419) 555-0000', state: daytimeState(), status: 'new', log: [] } } });
  const bad = await call('POST', '/api/telephony/sms', { token: AGENT, body: { leadId: 'T2', body: 'Hello' } });
  assert.equal(bad.status, 502);
  assert.match(bad.json.error, /trial mode/);
});

test('admin can search and buy real numbers; agents cannot', async () => {
  assert.equal((await call('GET', '/api/telephony/numbers/search?state=TX', { token: AGENT })).status, 403);
  const s = await call('GET', '/api/telephony/numbers/search?state=TX', { token: OWNER });
  assert.equal(s.json.numbers[0].phoneNumber, '+12145550111');
  const b = await call('POST', '/api/telephony/numbers/buy', { token: OWNER, body: { phoneNumber: '+18325550100', region: 'TX' } });
  assert.equal(b.status, 200);
  assert.equal(b.json.number.isPrimary, true);
  const del = await call('DELETE', `/api/telephony/numbers/${b.json.number.id}`, { token: OWNER });
  assert.equal(del.status, 200);
  assert.deepEqual(sent.at(-1), { released: 'PN8325550100' }, 'released in Twilio so it stops billing');
});

test('calling token only for signed-in users', async () => {
  assert.equal((await call('GET', '/api/telephony/token')).status, 401);
  const t = await call('GET', '/api/telephony/token', { token: AGENT });
  assert.equal(t.json.identity, `agent_${agentId}`);
  assert.equal(t.json.token.split('.').length, 3);
});

test('inbound call rings the agent browser, then falls back', async () => {
  const r = await hook('/api/telephony/voice/inbound', { From: '+14195550176', To: '+12145550111', CallSid: 'CAin' });
  assert.match(r.text, new RegExp(`<Client>agent_${agentId}</Client>`));
  const fb = await hook(`/api/telephony/voice/inbound-fallback?u=${agentId}`, { DialCallStatus: 'no-answer' });
  assert.match(fb.text, /<Redirect|<Dial/);
});

test('removing an agent deletes their leads', async () => {
  assert.equal((await call('DELETE', `/api/admin/users/${agentId}`, { token: OWNER })).status, 200);
  assert.equal((await store.col<any>(C.leads).where('userId', agentId)).length, 0);
  assert.equal((await call('GET', '/api/leads', { token: AGENT })).status, 403);
});
