// Calling and texting through Twilio.
// Every Twilio webhook must carry a valid X-Twilio-Signature, and every lead call passes the
// compliance checks in compliance.ts on the server, whatever the browser sends.
import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import twilio from 'twilio';
import { requireAdmin } from './auth.ts';
import { checkLeadCall, smsKeyword, stateCode, toUSE164 } from './compliance.ts';
import {
  appendLeadLog, C, digits, leadDocId, type CallLogDoc, type LeadDoc, type PhoneNumberDoc, type SmsDoc,
  type Store, type TelephonyConfigDoc, type UserDoc,
} from './store.ts';

export type TwilioLike = ReturnType<typeof twilio>;

const env = () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  apiKey: process.env.TWILIO_API_KEY || '',
  apiSecret: process.env.TWILIO_API_SECRET || '',
  twimlAppSid: process.env.TWILIO_TWIML_APP_SID || '',
  messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || '',
  defaultCallerId: toUSE164(process.env.TWILIO_DEFAULT_CALLER_ID || ''),
  appUrl: (process.env.APP_URL || '').replace(/\/$/, ''),
  agentsMayBuyNumbers: process.env.ALLOW_AGENT_NUMBER_PURCHASE === 'true',
});
const isReal = (v: string, prefix: string) => v.startsWith(prefix) && !/X{6}/.test(v);

const fmtDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const pretty = (e164: string) => {
  const d = digits(e164);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
};
const xml = (res: Response, vr: InstanceType<typeof twilio.twiml.VoiceResponse> | string) =>
  res.type('text/xml').send(typeof vr === 'string' ? vr : vr.toString());
const EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

export function createTelephonyRouter({
  store,
  auth,
  twilioClient,
}: {
  store: Store;
  auth: RequestHandler;
  twilioClient: TwilioLike | null;
}) {
  const r = Router();
  const users = store.col<UserDoc>(C.users);
  const leads = store.col<LeadDoc>(C.leads);
  const numbers = store.col<PhoneNumberDoc>(C.numbers);
  const configs = store.col<TelephonyConfigDoc>(C.telephony);
  const sms = store.col<SmsDoc>(C.sms);
  const calls = store.col<CallLogDoc>(C.calls);
  const events = store.col<{ at: number }>(C.events);
  const wrap =
    (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) =>
      fn(req, res).catch(next);
  const fail = (res: Response, status: number, error: string) => res.status(status).json({ error });

  const baseUrl = (req: Request) => {
    const { appUrl } = env();
    if (appUrl) return appUrl;
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0].trim();
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    return `${proto}://${host}`;
  };

  /** Rejects any webhook that Twilio didn't sign with your Auth Token. */
  const fromTwilio: RequestHandler = (req, res, next) => {
    const { authToken, accountSid } = env();
    if (!authToken) {
      res.status(503).type('text/plain').send('Twilio is not configured');
      return;
    }
    const sig = req.header('X-Twilio-Signature') || '';
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
    const candidates = new Set([`${proto}://${host}${req.originalUrl}`, `https://${host}${req.originalUrl}`]);
    if (env().appUrl) candidates.add(`${env().appUrl}${req.originalUrl}`);
    const params = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, string>;
    const valid = [...candidates].some(url => twilio.validateRequest(authToken, sig, url, params));
    if (!valid || (params.AccountSid && accountSid && params.AccountSid !== accountSid)) {
      console.warn('[Twilio] Rejected unsigned or mismatched webhook', req.originalUrl);
      res.status(403).type('text/plain').send('Invalid Twilio signature');
      return;
    }
    next();
  };

  const myNumbers = async (userId: string) =>
    (await numbers.where('userId', userId)).sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  /** Caller ID always comes from the agent's own numbers: same state as the lead first, then primary. */
  const pickCallerId = async (userId: string, state: string) => {
    const mine = (await myNumbers(userId)).filter(n => n.capabilitiesVoice);
    const cfg = await configs.get(userId);
    return (
      mine.find(n => state && n.region === state)?.phoneNumber ||
      mine.find(n => n.phoneNumber === cfg?.primaryCallerId)?.phoneNumber ||
      mine.find(n => n.isPrimary)?.phoneNumber ||
      mine[0]?.phoneNumber ||
      env().defaultCallerId
    );
  };

  const findLeadByPhone = async (userId: string, phone: string) => {
    const d = digits(phone);
    if (d.length !== 10) return null;
    return (await leads.where('phoneDigits', d)).find(l => l.userId === userId) || null;
  };

  const userFromIdentity = async (from: unknown) => {
    const m = String(from || '').match(/^client:agent_(.+)$/);
    return m ? users.get(m[1]) : null;
  };

  /** TwiML that dials a lead, or explains to the agent why it won't. Logs the dial on the lead. */
  const dialLead = async (req: Request, user: UserDoc, lead: LeadDoc | null, manualTo: string) => {
    const vr = new twilio.twiml.VoiceResponse();
    let to = toUSE164(manualTo);
    let state = '';
    if (lead) {
      const check = checkLeadCall(lead.data, user.profile);
      if (!check.ok) {
        vr.say(check.reason);
        return vr;
      }
      to = check.to;
      state = check.state;
    } else if (!to) {
      vr.say('That is not a valid U.S. phone number.');
      return vr;
    }
    const callerId = await pickCallerId(user.id, state);
    if (!callerId) {
      vr.say('You do not have a caller ID number yet. Buy a number in CallDesk, then call again.');
      return vr;
    }
    const cfg = await configs.get(user.id);
    const q = new URLSearchParams({ u: user.id, l: lead?.leadId || '' }).toString();
    const dial = vr.dial({
      callerId,
      answerOnBridge: true,
      timeout: 25,
      action: `${baseUrl(req)}/api/telephony/voice/dial-complete?${q}`,
      method: 'POST',
      ...(cfg?.recordCalls ? { record: 'record-from-answer-dual' as const } : {}),
    });
    dial.number(to);
    if (lead) {
      await appendLeadLog(store, user.id, lead.leadId, { t: Date.now(), k: 'call', x: `Called from ${pretty(callerId)}` }, d => {
        d.dials = (Number(d.dials) || 0) + 1;
        d.lastDial = Date.now();
      });
    }
    return vr;
  };

  // ---------------- Status for the Settings panel (admin) ----------------
  r.get('/diagnostics', auth, requireAdmin, (req, res) => {
    const e = env();
    const base = baseUrl(req);
    res.json({
      variables: {
        accountSid: { name: 'TWILIO_ACCOUNT_SID', configured: isReal(e.accountSid, 'AC'), preview: e.accountSid ? `${e.accountSid.slice(0, 6)}…` : 'Missing' },
        authToken: { name: 'TWILIO_AUTH_TOKEN', configured: e.authToken.length >= 32 && !e.authToken.startsWith('your_'), preview: e.authToken ? 'Set' : 'Missing' },
        apiKey: { name: 'TWILIO_API_KEY', configured: isReal(e.apiKey, 'SK'), preview: e.apiKey ? `${e.apiKey.slice(0, 6)}…` : 'Missing' },
        apiSecret: { name: 'TWILIO_API_SECRET', configured: e.apiSecret.length >= 16 && !e.apiSecret.startsWith('your_'), preview: e.apiSecret ? 'Set' : 'Missing' },
        twimlAppSid: { name: 'TWILIO_TWIML_APP_SID', configured: isReal(e.twimlAppSid, 'AP'), preview: e.twimlAppSid ? `${e.twimlAppSid.slice(0, 6)}…` : 'Missing' },
        messagingServiceSid: { name: 'TWILIO_MESSAGING_SERVICE_SID', configured: isReal(e.messagingServiceSid, 'MG'), preview: e.messagingServiceSid ? `${e.messagingServiceSid.slice(0, 6)}…` : 'Not set (optional until texting)' },
      },
      webhooks: {
        voiceOutboundUrl: `${base}/api/telephony/voice/outbound`,
        voiceInboundUrl: `${base}/api/telephony/voice/inbound`,
        voiceStatusUrl: `${base}/api/telephony/voice/dial-complete`,
        smsInboundUrl: `${base}/api/telephony/sms/inbound`,
        smsStatusUrl: `${base}/api/telephony/sms/status`,
      },
      isLiveConnected: Boolean(twilioClient && isReal(e.accountSid, 'AC')),
    });
  });

  // ---------------- Browser calling token ----------------
  r.get('/token', auth, (req, res) => {
    const e = env();
    if (!e.accountSid || !e.apiKey || !e.apiSecret || !e.twimlAppSid) {
      return fail(res, 503, 'Calling is not set up yet. Add the Twilio secrets (account, API key, TwiML App) and redeploy.');
    }
    const { AccessToken } = twilio.jwt;
    const identity = `agent_${req.user!.id}`;
    const token = new AccessToken(e.accountSid, e.apiKey, e.apiSecret, { identity, ttl: 3600 });
    token.addGrant(new AccessToken.VoiceGrant({ outgoingApplicationSid: e.twimlAppSid, incomingAllow: true }));
    res.json({ token: token.toJwt(), identity, isLive: true, ttl: 3600 });
  });

  // ---------------- Voice webhooks (Twilio → CallDesk) ----------------

  // TwiML App Voice URL: the browser placed a call.
  r.post('/voice/outbound', fromTwilio, wrap(async (req, res) => {
    const user = await userFromIdentity(req.body.From);
    if (!user || !user.isVerified) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say('This CallDesk account cannot place calls.');
      return xml(res, vr);
    }
    const leadId = String(req.body.leadId || '');
    let lead = leadId ? await leads.get(leadDocId(user.id, leadId)) : null;
    if (!lead && req.body.To) lead = await findLeadByPhone(user.id, req.body.To);
    xml(res, await dialLead(req, user, lead, String(req.body.To || '')));
  }));

  // Cell-bridge mode: Twilio called the agent's cell, and they answered.
  r.post('/voice/bridge', fromTwilio, wrap(async (req, res) => {
    const user = await users.get(String(req.query.u || ''));
    const lead = user ? await leads.get(leadDocId(user.id, String(req.query.l || ''))) : null;
    if (!user || !lead) return xml(res, EMPTY);
    xml(res, await dialLead(req, user, lead, ''));
  }));

  // The lead's leg ended: log how it went (once per call).
  r.post('/voice/dial-complete', fromTwilio, wrap(async (req, res) => {
    const userId = String(req.query.u || '');
    const leadId = String(req.query.l || '');
    const sid = String(req.body.DialCallSid || req.body.CallSid || '');
    if (userId && sid && (await events.create(`dial_${sid}`, { at: Date.now() }))) {
      const status = String(req.body.DialCallStatus || 'completed');
      const secs = Number(req.body.DialCallDuration || 0);
      const label: Record<string, string> = { completed: `answered · ${fmtDuration(secs)}`, answered: `answered · ${fmtDuration(secs)}`, 'no-answer': 'no answer', busy: 'busy', failed: 'failed', canceled: 'hung up before it connected' };
      const rec = req.body.RecordingUrl ? ` · recording: ${req.body.RecordingUrl}` : '';
      if (leadId) await appendLeadLog(store, userId, leadId, { t: Date.now(), k: 'note', x: `Call result: ${label[status] || status}${rec}` });
      await calls.set(sid, { id: sid, userId, leadId, callSid: sid, outcome: status, notes: rec.trim(), timestamp: Date.now(), duration: secs });
    }
    xml(res, EMPTY);
  }));

  // A lead called one of your numbers: ring the browser for 20 seconds, then your cell, then voicemail.
  r.post('/voice/inbound', fromTwilio, wrap(async (req, res) => {
    const vr = new twilio.twiml.VoiceResponse();
    const owner = (await numbers.where('phoneNumber', toUSE164(req.body.To)))[0];
    if (!owner) {
      vr.say('Sorry, this number is not in service.');
      vr.hangup();
      return xml(res, vr);
    }
    const lead = await findLeadByPhone(owner.userId, req.body.From);
    if (lead) {
      await appendLeadLog(store, owner.userId, lead.leadId, { t: Date.now(), k: 'call', x: `Incoming call from ${pretty(toUSE164(req.body.From) || String(req.body.From))}` }, d => {
        if (d.status === 'new') {
          d.status = 'contacted';
          d.stageAt = { ...((d.stageAt as object) || {}), contacted: Date.now() };
        }
      });
    }
    const q = new URLSearchParams({ u: owner.userId }).toString();
    const dial = vr.dial({ timeout: 20, action: `${baseUrl(req)}/api/telephony/voice/inbound-fallback?${q}`, method: 'POST' });
    dial.client(`agent_${owner.userId}`);
    xml(res, vr);
  }));

  r.post('/voice/inbound-fallback', fromTwilio, wrap(async (req, res) => {
    const vr = new twilio.twiml.VoiceResponse();
    if (['completed', 'answered'].includes(String(req.body.DialCallStatus))) {
      vr.hangup();
      return xml(res, vr);
    }
    const userId = String(req.query.u || '');
    const [user, cfg] = await Promise.all([users.get(userId), configs.get(userId)]);
    const cell = toUSE164(cfg?.bridgePhone || user?.phone || '');
    const q = new URLSearchParams({ u: userId }).toString();
    if (cell) {
      const dial = vr.dial({ timeout: 25, action: `${baseUrl(req)}/api/telephony/voice/voicemail?${q}`, method: 'POST' });
      dial.number(cell);
    } else {
      vr.redirect({ method: 'POST' }, `${baseUrl(req)}/api/telephony/voice/voicemail?${q}`);
    }
    xml(res, vr);
  }));

  r.post('/voice/voicemail', fromTwilio, (req, res) => {
    const vr = new twilio.twiml.VoiceResponse();
    if (['completed', 'answered'].includes(String(req.body.DialCallStatus))) {
      vr.hangup();
      return xml(res, vr);
    }
    const q = new URLSearchParams({ u: String(req.query.u || '') }).toString();
    vr.say('Thank you for calling EST8 Financial Group. Please leave your name and callback number after the tone.');
    vr.record({ maxLength: 120, playBeep: true, action: `${baseUrl(req)}/api/telephony/voice/voicemail-saved?${q}`, method: 'POST' });
    xml(res, vr);
  });

  r.post('/voice/voicemail-saved', fromTwilio, wrap(async (req, res) => {
    const userId = String(req.query.u || '');
    const lead = userId ? await findLeadByPhone(userId, req.body.From) : null;
    if (lead && req.body.RecordingUrl && (await events.create(`vm_${req.body.RecordingSid || req.body.CallSid}`, { at: Date.now() }))) {
      await appendLeadLog(store, userId, lead.leadId, { t: Date.now(), k: 'vm', x: `Voicemail from lead (${req.body.RecordingDuration || '?'}s): ${req.body.RecordingUrl}` });
    }
    const vr = new twilio.twiml.VoiceResponse();
    vr.hangup();
    xml(res, vr);
  }));

  // ---------------- Text webhooks ----------------
  r.post('/sms/inbound', fromTwilio, wrap(async (req, res) => {
    const from = String(req.body.From || '');
    const body = String(req.body.Body || '').trim();
    const owner = (await numbers.where('phoneNumber', toUSE164(req.body.To)))[0];
    const lead = owner && body ? await findLeadByPhone(owner.userId, from) : null;
    if (owner && lead && (await events.create(`sms_${req.body.MessageSid || `${from}_${Date.now()}`}`, { at: Date.now() }))) {
      const now = Date.now();
      const id = `msg_in_${now}_${Math.random().toString(36).slice(2, 6)}`;
      await sms.set(id, { id, userId: owner.userId, leadId: lead.leadId, direction: 'inbound', fromNumber: from, toNumber: String(req.body.To), body, status: 'received', twilioSid: req.body.MessageSid || null, createdAt: now });
      const kw = smsKeyword(body);
      await appendLeadLog(store, owner.userId, lead.leadId, {
        t: now,
        k: 'text',
        x: kw === 'stop' ? `Replied "${body}": opted out of texts` : kw === 'start' ? `Replied "${body}": opted back in to texts` : `Text from lead: "${body}"`,
      }, d => {
        if (kw === 'stop') d.smsOptOut = true;
        if (kw === 'start') d.smsOptOut = false;
      });
    }
    // Twilio sends the carrier-required STOP/HELP replies itself.
    res.type('text/xml').send('<Response></Response>');
  }));

  r.post('/sms/status', fromTwilio, wrap(async (req, res) => {
    const sid = String(req.body.MessageSid || '');
    const row = sid ? (await sms.where('twilioSid', sid))[0] : null;
    if (row) await sms.update(row._id, { status: String(req.body.MessageStatus || row.status) });
    res.type('text/xml').send('<Response/>');
  }));

  // ---------------- Numbers ----------------
  const canBuy: RequestHandler = (req, res, next) => {
    if (req.user!.role === 'admin' || env().agentsMayBuyNumbers) return next();
    fail(res, 403, 'Ask your administrator to add a phone number for you.');
  };

  r.get('/numbers/search', auth, canBuy, wrap(async (req, res) => {
    if (!twilioClient) return fail(res, 503, 'Twilio is not connected yet, so numbers can’t be searched. Add the Twilio secrets first.');
    const areaCode = String(req.query.areaCode || '').replace(/\D/g, '').slice(0, 3);
    const state = stateCode(req.query.state);
    if (!areaCode && !state) return fail(res, 400, 'Enter an area code or pick a state.');
    const opts: Record<string, unknown> = { voiceEnabled: true, smsEnabled: true, limit: 10 };
    if (areaCode) opts.areaCode = Number(areaCode);
    else opts.inRegion = state;
    try {
      const found = await twilioClient.availablePhoneNumbers('US').local.list(opts);
      res.json({
        areaCode,
        state,
        numbers: found.map(n => ({
          phoneNumber: n.phoneNumber, friendlyName: n.friendlyName, locality: n.locality, region: n.region,
          postalCode: n.postalCode, rateCenter: n.rateCenter,
          capabilities: { voice: Boolean(n.capabilities?.voice), sms: Boolean(n.capabilities?.sms), mms: Boolean(n.capabilities?.mms) },
          monthlyCost: '',
        })),
      });
    } catch (e) {
      const err = e as { message?: string; code?: number };
      fail(res, 502, `Twilio couldn’t search numbers: ${err.message || 'unknown error'}`);
    }
  }));

  r.post('/numbers/buy', auth, canBuy, wrap(async (req, res) => {
    if (!twilioClient) return fail(res, 503, 'Twilio is not connected yet, so numbers can’t be bought.');
    const phoneNumber = toUSE164(req.body.phoneNumber);
    if (!phoneNumber) return fail(res, 400, 'Pick a U.S. number to buy.');
    const base = baseUrl(req);
    const u = req.user!;
    let bought: { sid: string; phoneNumber: string; friendlyName: string };
    try {
      bought = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName: String(req.body.friendlyName || `EST8 · ${u.name}`).slice(0, 64),
        voiceUrl: `${base}/api/telephony/voice/inbound`,
        voiceMethod: 'POST',
        smsUrl: `${base}/api/telephony/sms/inbound`,
        smsMethod: 'POST',
      });
    } catch (e) {
      const err = e as { message?: string };
      return fail(res, 502, `Twilio couldn’t buy that number: ${err.message || 'unknown error'}. Nothing was charged.`);
    }
    let note = '';
    const { messagingServiceSid } = env();
    if (messagingServiceSid) {
      try {
        await twilioClient.messaging.v1.services(messagingServiceSid).phoneNumbers.create({ phoneNumberSid: bought.sid });
      } catch (e) {
        note = `Bought, but it couldn’t be added to your Messaging Service: ${(e as Error).message}. Add it in the Twilio Console before texting from it.`;
      }
    }
    const mine = await myNumbers(u.id);
    const doc: PhoneNumberDoc = {
      id: bought.sid, userId: u.id, phoneNumber: bought.phoneNumber, friendlyName: bought.friendlyName || pretty(bought.phoneNumber),
      twilioSid: bought.sid, region: stateCode(req.body.region), capabilitiesVoice: true, capabilitiesSms: true,
      purchasedAt: new Date().toISOString(), isPrimary: mine.length === 0,
    };
    await numbers.set(doc.id, doc);
    if (doc.isPrimary) await configs.update(u.id, { primaryCallerId: doc.phoneNumber });
    res.json({ success: true, number: doc, note });
  }));

  r.get('/numbers/my', auth, wrap(async (req, res) => {
    res.json({ numbers: (await myNumbers(req.user!.id)).map(({ _id, ...n }) => n) });
  }));

  r.patch('/numbers/:id/primary', auth, wrap(async (req, res) => {
    const mine = await myNumbers(req.user!.id);
    const target = mine.find(n => n.id === req.params.id);
    if (!target) return fail(res, 404, 'Number not found.');
    for (const n of mine) await numbers.update(n._id, { isPrimary: n.id === target.id });
    await configs.update(req.user!.id, { primaryCallerId: target.phoneNumber });
    res.json({ success: true, primaryId: target.id, primaryNumber: target.phoneNumber });
  }));

  // Releases the number in Twilio too, so it stops billing.
  r.delete('/numbers/:id', auth, wrap(async (req, res) => {
    const n = await numbers.get(req.params.id);
    if (!n || (n.userId !== req.user!.id && req.user!.role !== 'admin')) return fail(res, 404, 'Number not found.');
    if (twilioClient && n.twilioSid.startsWith('PN')) {
      try {
        await twilioClient.incomingPhoneNumbers(n.twilioSid).remove();
      } catch (e) {
        const err = e as { status?: number; message?: string };
        if (err.status !== 404) return fail(res, 502, `Twilio couldn’t release the number: ${err.message}. It is still on your account.`);
      }
    }
    await numbers.delete(n.id);
    res.json({ success: true, deletedId: n.id });
  }));

  // ---------------- Calling settings ----------------
  r.get('/config', auth, wrap(async (req, res) => {
    const u = req.user!;
    const cfg = await configs.get(u.id);
    const primary = (await myNumbers(u.id)).find(n => n.isPrimary);
    res.json({
      config: {
        callingMode: cfg?.callingMode || 'webrtc',
        bridgePhone: cfg?.bridgePhone || u.phone || '',
        primaryCallerId: cfg?.primaryCallerId || primary?.phoneNumber || '',
        autoLogCall: cfg?.autoLogCall ?? true,
        recordCalls: cfg?.recordCalls ?? false,
      },
    });
  }));

  r.put('/config', auth, wrap(async (req, res) => {
    const u = req.user!;
    const { callingMode, bridgePhone, primaryCallerId, autoLogCall, recordCalls } = req.body;
    const mine = await myNumbers(u.id);
    await configs.set(u.id, {
      callingMode: callingMode === 'bridge' ? 'bridge' : 'webrtc',
      bridgePhone: String(bridgePhone || ''),
      primaryCallerId: mine.some(n => n.phoneNumber === primaryCallerId) ? primaryCallerId : mine.find(n => n.isPrimary)?.phoneNumber || '',
      autoLogCall: autoLogCall !== false,
      recordCalls: Boolean(recordCalls),
    });
    res.json({ success: true });
  }));

  // ---------------- Cell-bridge call (Twilio rings your cell, then the lead) ----------------
  r.post('/call', auth, wrap(async (req, res) => {
    const u = req.user!;
    if (!twilioClient) return fail(res, 503, 'Twilio is not connected yet, so calls can’t be placed.');
    const lead = await leads.get(leadDocId(u.id, String(req.body.leadId || '')));
    if (!lead) return fail(res, 404, 'Lead not found.');
    const check = checkLeadCall(lead.data, u.profile);
    if (!check.ok) return fail(res, 409, check.reason);
    const cfg = await configs.get(u.id);
    const cell = toUSE164(cfg?.bridgePhone || u.phone || '');
    if (!cell) return fail(res, 400, 'Add your cell number in calling settings to use Cell Bridge.');
    const callerId = await pickCallerId(u.id, check.state);
    if (!callerId) return fail(res, 400, 'Buy a caller ID number first.');
    const q = new URLSearchParams({ u: u.id, l: lead.leadId }).toString();
    try {
      const call = await twilioClient.calls.create({ to: cell, from: callerId, url: `${baseUrl(req)}/api/telephony/voice/bridge?${q}`, method: 'POST' });
      res.json({ success: true, callId: call.sid, mode: 'bridge', callerId, message: `Calling your cell (${pretty(cell)}). Answer it and you’ll be connected to the lead.` });
    } catch (e) {
      fail(res, 502, `Twilio couldn’t start the call: ${(e as Error).message}`);
    }
  }));

  // ---------------- Texts ----------------
  r.get('/sms/messages', auth, wrap(async (req, res) => {
    const u = req.user!;
    const asId = String(req.query.as_user_id || '');
    const ownerId = asId && u.role === 'admin' ? asId : u.id;
    const leadId = String(req.query.leadId || '');
    if (!leadId) return fail(res, 400, 'leadId is required');
    const rows = (await sms.where('leadId', leadId)).filter(m => m.userId === ownerId).sort((a, b) => a.createdAt - b.createdAt);
    res.json({ messages: rows.map(({ _id, userId, twilioSid, ...m }) => m) });
  }));

  r.post('/sms', auth, wrap(async (req, res) => {
    const u = req.user!;
    const body = String(req.body.body || '').trim();
    const lead = await leads.get(leadDocId(u.id, String(req.body.leadId || '')));
    if (!lead) return fail(res, 404, 'Lead not found.');
    if (!body) return fail(res, 400, 'Write a message first.');
    if (body.length > 1500) return fail(res, 400, 'Keep texts under 1,500 characters.');
    if (lead.data.status === 'dnc') return fail(res, 409, 'This lead is marked Do not call, so texting is blocked.');
    if (lead.data.smsOptOut) return fail(res, 409, 'This lead replied STOP, so texting is blocked.');
    const to = toUSE164(lead.data.phone);
    if (!to) return fail(res, 400, 'This lead does not have a valid U.S. phone number.');
    if (!twilioClient) return fail(res, 503, 'Twilio is not connected yet, so texts can’t be sent.');
    const { messagingServiceSid } = env();
    const from = await pickCallerId(u.id, stateCode(lead.data.state));
    if (!messagingServiceSid && !from) return fail(res, 400, 'Buy a number first so texts have a number to come from.');

    const now = Date.now();
    const id = `msg_${now}_${Math.random().toString(36).slice(2, 6)}`;
    const record: SmsDoc = { id, userId: u.id, leadId: lead.leadId, direction: 'outbound', fromNumber: from, toNumber: to, body, status: 'queued', twilioSid: null, createdAt: now };
    try {
      const sent = await twilioClient.messages.create({
        to,
        body,
        statusCallback: `${baseUrl(req)}/api/telephony/sms/status`,
        ...(messagingServiceSid ? { messagingServiceSid } : { from }),
      });
      record.twilioSid = sent.sid;
      record.status = sent.status || 'queued';
      record.fromNumber = sent.from || from;
    } catch (e) {
      const err = e as { code?: number; message?: string };
      record.status = 'failed';
      await sms.set(id, record);
      const why =
        err.code === 21608 ? 'Your Twilio account is in trial mode, so it can only text numbers verified in Twilio. Upgrade Twilio or verify this number.'
        : err.code === 21610 ? 'This number has opted out of texts from you (they replied STOP).'
        : err.code === 30034 || err.code === 30032 ? 'Carriers blocked it because your A2P 10DLC registration isn’t approved yet.'
        : `Twilio couldn’t send it: ${err.message || 'unknown error'}${err.code ? ` (error ${err.code})` : ''}.`;
      return fail(res, 502, why);
    }
    await sms.set(id, record);
    await appendLeadLog(store, u.id, lead.leadId, { t: now, k: 'text', x: `Text sent: "${body.length > 70 ? body.slice(0, 67) + '…' : body}"` });
    res.json({ success: true, messageId: id, messageSid: record.twilioSid, status: record.status, sentAt: new Date(now).toISOString() });
  }));

  // Outcome the agent picks after a call.
  r.post('/call/disposition', auth, wrap(async (req, res) => {
    const u = req.user!;
    const { leadId, outcome, notes, appointmentDate, appointmentTime, durationSeconds } = req.body;
    const labels: Record<string, string> = { na: 'No answer', vm: 'Left voicemail', talk: 'Talked with them', appt: 'Appointment set', quoted: 'Quoted', dnc: 'Do not call', notint: 'Not interested' };
    if (!labels[outcome]) return fail(res, 400, 'Pick an outcome.');
    const nextStatus: Record<string, string> = { appt: 'appt', quoted: 'quoted', talk: 'contacted', dnc: 'dnc', notint: 'notint' };
    const now = Date.now();
    const updated = await appendLeadLog(store, u.id, String(leadId), { t: now, k: 'note', x: `Call outcome: ${labels[outcome]}${notes ? ` · ${notes}` : ''}` }, d => {
      const ns = nextStatus[outcome];
      if (outcome === 'talk' && d.status !== 'new') return; // don't move an advanced lead back to Contacted
      if (ns && ns !== d.status) {
        d.status = ns;
        d.stageAt = { ...((d.stageAt as object) || {}), [ns]: now };
      }
      if (outcome === 'appt') {
        if (appointmentDate) d.apptDay = appointmentDate;
        if (appointmentTime) d.apptTime = appointmentTime;
      }
    });
    if (!updated) return fail(res, 404, 'Lead not found.');
    const logId = `CL_${now}_${Math.random().toString(36).slice(2, 6)}`;
    await calls.set(logId, { id: logId, userId: u.id, leadId: String(leadId), callSid: null, outcome, notes: notes || '', timestamp: now, duration: Number(durationSeconds) || 0 });
    res.json({ success: true, updatedStatus: updated.status, updatedLead: updated });
  }));

  // ---------------- A2P 10DLC status, read from Twilio ----------------
  r.get('/a2p', auth, wrap(async (_req, res) => {
    const { messagingServiceSid } = env();
    if (!twilioClient || !messagingServiceSid) return res.json({ registered: false, registration: null, configured: false });
    try {
      const list = await twilioClient.messaging.v1.services(messagingServiceSid).usAppToPerson.list({ limit: 5 });
      const c = list[0];
      if (!c) return res.json({ registered: false, registration: null, configured: true });
      const map: Record<string, string> = { VERIFIED: 'approved', PENDING: 'in_review', IN_PROGRESS: 'in_review', FAILED: 'rejected' };
      res.json({
        registered: true,
        configured: true,
        registration: {
          id: c.sid, userId: '', brandSid: c.brandRegistrationSid, campaignSid: c.sid, businessName: '', ein: '',
          businessType: 'llc', brandType: 'STANDARD', campaignUseCase: c.usAppToPersonUsecase || '',
          status: map[String(c.campaignStatus)] || 'pending', carrierFeedback: (c.errors || []).map(x => JSON.stringify(x)).join('; '),
          submittedAt: c.dateCreated ? new Date(c.dateCreated).toISOString() : '', updatedAt: c.dateUpdated ? new Date(c.dateUpdated).toISOString() : '',
        },
      });
    } catch (e) {
      res.json({ registered: false, registration: null, configured: true, error: `Couldn’t read A2P status from Twilio: ${(e as Error).message}` });
    }
  }));

  return r;
}
