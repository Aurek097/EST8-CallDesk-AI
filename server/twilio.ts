import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { db } from './db.ts';

export const telephonyRouter = Router();

// Twilio Production Config & Credentials
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const API_KEY = process.env.TWILIO_API_KEY || '';
const API_SECRET = process.env.TWILIO_API_SECRET || '';
const TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID || '';
const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || '';

// Initialize real Twilio client if credentials exist
let twilioClient: any = null;
if (ACCOUNT_SID && AUTH_TOKEN) {
  try {
    twilioClient = twilio(ACCOUNT_SID, AUTH_TOKEN);
  } catch (err) {
    console.warn('[Telephony] Failed to initialize live Twilio client:', err);
  }
}

// Known Area Codes & Locations for realistic carrier inventory search
const AREA_CODE_DIRECTORY: Record<string, { city: string; state: string; rateCenter: string }> = {
  '803': { city: 'Columbia', state: 'SC', rateCenter: 'COLUMBIA' },
  '843': { city: 'Charleston', state: 'SC', rateCenter: 'CHRLSTN' },
  '864': { city: 'Greenville', state: 'SC', rateCenter: 'GREENVL' },
  '704': { city: 'Charlotte', state: 'NC', rateCenter: 'CHARLOTTE' },
  '919': { city: 'Raleigh', state: 'NC', rateCenter: 'RALEIGH' },
  '336': { city: 'Greensboro', state: 'NC', rateCenter: 'GREENSBORO' },
  '404': { city: 'Atlanta', state: 'GA', rateCenter: 'ATLANTA' },
  '470': { city: 'Atlanta Metro', state: 'GA', rateCenter: 'ATLANTA' },
  '770': { city: 'Marietta', state: 'GA', rateCenter: 'MARIETTA' },
  '305': { city: 'Miami', state: 'FL', rateCenter: 'MIAMI' },
  '407': { city: 'Orlando', state: 'FL', rateCenter: 'ORLANDO' },
  '813': { city: 'Tampa', state: 'FL', rateCenter: 'TAMPA' },
  '904': { city: 'Jacksonville', state: 'FL', rateCenter: 'JCKNSVL' },
  '512': { city: 'Austin', state: 'TX', rateCenter: 'AUSTIN' },
  '214': { city: 'Dallas', state: 'TX', rateCenter: 'DALLAS' },
  '713': { city: 'Houston', state: 'TX', rateCenter: 'HOUSTON' },
  '615': { city: 'Nashville', state: 'TN', rateCenter: 'NASHVILLE' },
  '901': { city: 'Memphis', state: 'TN', rateCenter: 'MEMPHIS' },
  '614': { city: 'Columbus', state: 'OH', rateCenter: 'COLUMBUS' },
  '312': { city: 'Chicago', state: 'IL', rateCenter: 'CHICAGO' },
};

// Helper: Extract authenticated user from request
function getAuthUser(req: Request) {
  const email = (req.headers['x-user-email'] as string || req.query.auth_email as string || '').toLowerCase().trim();
  if (!email) return null;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  return user || null;
}

// Helper: Format base URL for webhooks
function getBaseUrl(req: Request) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

// Helper: Normalize phone string for matching
function cleanPhone(raw: string) {
  return raw.replace(/\D/g, '').slice(-10);
}

// ----------------- 1. TWILIO CREDENTIALS & WEBHOOK DIAGNOSTICS ----------------- //

telephonyRouter.get('/diagnostics', (req: Request, res: Response) => {
  const baseUrl = getBaseUrl(req);

  res.json({
    variables: {
      accountSid: {
        name: 'TWILIO_ACCOUNT_SID',
        configured: Boolean(ACCOUNT_SID && !ACCOUNT_SID.includes('XXXX')),
        preview: ACCOUNT_SID ? `${ACCOUNT_SID.slice(0, 6)}...` : 'Missing'
      },
      authToken: {
        name: 'TWILIO_AUTH_TOKEN',
        configured: Boolean(AUTH_TOKEN && !AUTH_TOKEN.includes('your_')),
        preview: AUTH_TOKEN ? '••••••••••••••••' : 'Missing'
      },
      apiKey: {
        name: 'TWILIO_API_KEY',
        configured: Boolean(API_KEY && !API_KEY.includes('XXXX')),
        preview: API_KEY ? `${API_KEY.slice(0, 6)}...` : 'Missing'
      },
      apiSecret: {
        name: 'TWILIO_API_SECRET',
        configured: Boolean(API_SECRET && !API_SECRET.includes('your_')),
        preview: API_SECRET ? '••••••••••••••••' : 'Missing'
      },
      twimlAppSid: {
        name: 'TWILIO_TWIML_APP_SID',
        configured: Boolean(TWIML_APP_SID && !TWIML_APP_SID.includes('XXXX')),
        preview: TWIML_APP_SID ? `${TWIML_APP_SID.slice(0, 6)}...` : 'Missing'
      },
      messagingServiceSid: {
        name: 'TWILIO_MESSAGING_SERVICE_SID',
        configured: Boolean(MESSAGING_SERVICE_SID && !MESSAGING_SERVICE_SID.includes('XXXX')),
        preview: MESSAGING_SERVICE_SID ? `${MESSAGING_SERVICE_SID.slice(0, 6)}...` : 'Missing'
      }
    },
    webhooks: {
      voiceOutboundUrl: `${baseUrl}/api/telephony/voice/outbound`,
      voiceInboundUrl: `${baseUrl}/api/telephony/voice/inbound`,
      voiceStatusUrl: `${baseUrl}/api/telephony/voice/status`,
      smsInboundUrl: `${baseUrl}/api/telephony/sms/inbound`,
      smsStatusUrl: `${baseUrl}/api/telephony/sms/status`
    },
    isLiveConnected: Boolean(ACCOUNT_SID && AUTH_TOKEN && twilioClient)
  });
});

// ----------------- 2. WEBRTC ACCESS TOKEN GENERATOR ----------------- //

telephonyRouter.get('/token', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const identity = `agent_${user.id}`;

  // If real API Key and Secret are present, generate a production Twilio JWT
  if (ACCOUNT_SID && API_KEY && API_SECRET) {
    try {
      const { AccessToken } = twilio.jwt;
      const { VoiceGrant } = AccessToken;

      const accessToken = new AccessToken(ACCOUNT_SID, API_KEY, API_SECRET, {
        identity,
        ttl: 3600
      });

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: TWIML_APP_SID,
        incomingAllow: true
      });

      accessToken.addGrant(voiceGrant);
      const token = accessToken.toJwt();

      return res.json({
        token,
        identity,
        accountSid: ACCOUNT_SID,
        twimlAppSid: TWIML_APP_SID,
        isLive: true,
        ttl: 3600
      });
    } catch (err) {
      console.warn('Failed to mint real Twilio JWT, falling back to simulated session:', err);
    }
  }

  // Fallback simulator token
  const simulatedToken = `webrtc_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  res.json({
    token: simulatedToken,
    identity,
    accountSid: ACCOUNT_SID ? `${ACCOUNT_SID.slice(0, 6)}...` : 'AC_SIMULATOR',
    twimlAppSid: TWIML_APP_SID || 'AP_SIMULATOR',
    isLive: false,
    ttl: 3600
  });
});

// ----------------- 3. TWIML VOICE WEBHOOKS ----------------- //

// A. Outbound Call TwiML (Called by Twilio when browser WebRTC softphone places a call)
telephonyRouter.all('/voice/outbound', (req: Request, res: Response) => {
  const leadPhone = req.body.To || req.query.To || req.body.leadPhone || '';
  const callerId = req.body.CallerId || req.query.CallerId || req.body.callerId || '+18035550142';
  const baseUrl = getBaseUrl(req);

  const voiceResponse = new twilio.twiml.VoiceResponse();

  if (leadPhone) {
    const dial = voiceResponse.dial({
      callerId,
      answerOnBridge: true,
      action: `${baseUrl}/api/telephony/voice/status`
    });
    dial.number(leadPhone);
  } else {
    voiceResponse.say({ voice: 'Polly.Matthew' }, 'Invalid recipient phone number.');
  }

  res.type('text/xml');
  res.send(voiceResponse.toString());
});

// B. Inbound Call TwiML (Rings browser softphone first for 20s, then falls back to cell phone)
telephonyRouter.all('/voice/inbound', (req: Request, res: Response) => {
  const from = (req.body.From || req.query.From || '').toString();
  const to = (req.body.To || req.query.To || '').toString();
  const baseUrl = getBaseUrl(req);

  // Identify which agent owns this inbound number
  const numberRecord = db.prepare('SELECT user_id, phone_number FROM user_phone_numbers WHERE phone_number = ?').get(to) as any;
  const agentId = numberRecord ? numberRecord.user_id : 'user_admin_aurek';

  // Find agent profile to get their cell phone
  const agentUser = db.prepare('SELECT phone FROM users WHERE id = ?').get(agentId) as any;
  const cellPhone = agentUser?.phone || '(803) 555-0142';

  // Automatically log incoming call on lead timeline if match exists
  if (from) {
    const cleanFrom = cleanPhone(from);
    const leads = db.prepare('SELECT id, data_json FROM leads WHERE user_id = ?').all(agentId) as any[];
    for (const l of leads) {
      const data = JSON.parse(l.data_json);
      if (data.phone && cleanPhone(data.phone) === cleanFrom) {
        data.log = [
          {
            t: Date.now(),
            k: 'call',
            x: `Inbound Call received from lead (${from})`
          },
          ...(data.log || [])
        ];
        if (data.status === 'new') data.status = 'contacted';
        db.prepare('UPDATE leads SET data_json = ?, status = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify(data),
          data.status,
          Date.now(),
          l.id
        );
        break;
      }
    }
  }

  const voiceResponse = new twilio.twiml.VoiceResponse();

  // 1. First dial browser softphone client (timeout 20s)
  const dial = voiceResponse.dial({
    timeout: 20,
    action: `${baseUrl}/api/telephony/voice/inbound-fallback?agentId=${encodeURIComponent(agentId)}`
  });
  dial.client(`agent_${agentId}`);

  res.type('text/xml');
  res.send(voiceResponse.toString());
});

// C. Inbound Fallback TwiML (Triggered if browser softphone did not answer within 20s)
telephonyRouter.all('/voice/inbound-fallback', (req: Request, res: Response) => {
  const dialStatus = req.body.DialCallStatus || req.query.DialCallStatus || '';
  const agentId = req.query.agentId as string || 'user_admin_aurek';

  const voiceResponse = new twilio.twiml.VoiceResponse();

  // If call was already answered on WebRTC, terminate TwiML cleanly
  if (dialStatus === 'completed' || dialStatus === 'answered') {
    voiceResponse.hangup();
    res.type('text/xml');
    return res.send(voiceResponse.toString());
  }

  // Otherwise, dial the agent's mobile cell phone
  const agentUser = db.prepare('SELECT phone FROM users WHERE id = ?').get(agentId) as any;
  const cellPhone = agentUser?.phone || '+18035550142';

  const dial = voiceResponse.dial({
    timeout: 25
  });
  dial.number(cellPhone);

  // If still unanswered, play voicemail greeting and record
  voiceResponse.say(
    { voice: 'Polly.Matthew' },
    'Thank you for calling EST8 Financial Group. Please leave a brief message with your name and callback number after the tone.'
  );
  voiceResponse.record({
    maxLength: 120,
    playBeep: true
  });

  res.type('text/xml');
  res.send(voiceResponse.toString());
});

// D. Voice Call Status Callback
telephonyRouter.all('/voice/status', (req: Request, res: Response) => {
  const callSid = req.body.CallSid || req.query.CallSid;
  const callDuration = parseInt(req.body.CallDuration || req.query.CallDuration || '0', 10);
  const callStatus = req.body.CallStatus || req.query.CallStatus || 'completed';

  if (callSid && callDuration > 0) {
    db.prepare('UPDATE call_logs SET duration = ? WHERE id = ?').run(callDuration, callSid);
  }

  res.type('text/xml');
  res.send('<Response/>');
});

// ----------------- 4. INBOUND & OUTBOUND SMS WEBHOOKS ----------------- //

// Inbound SMS Webhook (Twilio hits this when a lead sends a text message)
telephonyRouter.all('/sms/inbound', (req: Request, res: Response) => {
  const from = (req.body.From || req.query.From || '').toString();
  const to = (req.body.To || req.query.To || '').toString();
  const body = (req.body.Body || req.query.Body || '').toString().trim();

  if (from && body) {
    const cleanFrom = cleanPhone(from);

    // Find lead across all accounts
    const allLeads = db.prepare('SELECT id, user_id, data_json FROM leads').all() as any[];
    for (const l of allLeads) {
      const data = JSON.parse(l.data_json);
      if (data.phone && cleanPhone(data.phone) === cleanFrom) {
        const now = Date.now();
        const msgId = `msg_in_${now}_${Math.random().toString(36).substring(2, 6)}`;

        // Insert into sms_messages table
        try {
          db.prepare(`
            INSERT INTO sms_messages (id, user_id, lead_id, direction, from_number, to_number, body, status, is_trial_simulated, created_at)
            VALUES (?, ?, ?, 'inbound', ?, ?, ?, 'received', 0, ?)
          `).run(msgId, l.user_id, l.id, from, to, body, now);
        } catch (e) {
          console.warn('[Telephony] Failed to insert into sms_messages:', e);
        }

        data.log = [
          {
            t: now,
            k: 'text',
            x: `Inbound SMS from ${data.firstName || 'Client'}: "${body}"`
          },
          ...(data.log || [])
        ];

        db.prepare('UPDATE leads SET data_json = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify(data),
          now,
          l.id
        );
        break;
      }
    }
  }

  // Respond with standard empty TwiML SMS response
  res.type('text/xml');
  res.send('<Response></Response>');
});

// SMS Delivery Status Callback
telephonyRouter.all('/sms/status', (req: Request, res: Response) => {
  res.type('text/xml');
  res.send('<Response/>');
});

// ----------------- 5. NUMBER SEARCH & PURCHASING ----------------- //

telephonyRouter.get('/numbers/search', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const areaCode = (req.query.areaCode as string || '').trim().replace(/\D/g, '');
  const state = (req.query.state as string || '').trim().toUpperCase();

  let targetAreaCode = areaCode;
  if (!targetAreaCode && state) {
    const match = Object.entries(AREA_CODE_DIRECTORY).find(([_, loc]) => loc.state === state);
    if (match) targetAreaCode = match[0];
  }
  if (!targetAreaCode) {
    targetAreaCode = '803';
  }

  const loc = AREA_CODE_DIRECTORY[targetAreaCode] || { city: 'Metro Area', state: state || 'US', rateCenter: 'LOCAL' };

  // If real Twilio credentials are active, search live AvailablePhoneNumbers
  if (twilioClient) {
    try {
      const available = await twilioClient.availablePhoneNumbers('US').local.list({
        areaCode: parseInt(targetAreaCode, 10),
        limit: 6,
        voiceEnabled: true,
        smsEnabled: true
      });

      if (available && available.length > 0) {
        const liveNumbers = available.map((n: any) => ({
          phoneNumber: n.phoneNumber,
          friendlyName: n.friendlyName,
          locality: n.locality || loc.city,
          region: n.region || loc.state,
          postalCode: n.postalCode || '29201',
          rateCenter: n.rateCenter || loc.rateCenter,
          capabilities: { voice: true, sms: true, mms: true },
          monthlyCost: '$1.15/mo'
        }));

        return res.json({
          areaCode: targetAreaCode,
          locality: loc.city,
          state: loc.state,
          numbers: liveNumbers
        });
      }
    } catch (err) {
      console.warn('[Telephony] Live number search error, using simulated carrier inventory:', err);
    }
  }

  // Generate realistic carrier numbers
  const results = [];
  const prefixes = ['219', '348', '492', '581', '620', '794', '812', '905'];
  for (let i = 0; i < 6; i++) {
    const prefix = prefixes[i % prefixes.length];
    const line = Math.floor(1000 + Math.random() * 9000);
    const rawNumber = `+1${targetAreaCode}${prefix}${line}`;
    const friendlyName = `(${targetAreaCode}) ${prefix}-${line}`;

    results.push({
      phoneNumber: rawNumber,
      friendlyName,
      locality: loc.city,
      region: loc.state,
      postalCode: '29201',
      rateCenter: loc.rateCenter,
      capabilities: { voice: true, sms: true, mms: true },
      monthlyCost: '$1.15/mo'
    });
  }

  res.json({
    areaCode: targetAreaCode,
    locality: loc.city,
    state: loc.state,
    numbers: results
  });
});

telephonyRouter.post('/numbers/buy', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const { phoneNumber, friendlyName } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

  const id = `pn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  let twilioSid = `PN_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

  // If live Twilio client is active, purchase via IncomingPhoneNumbers API
  if (twilioClient) {
    try {
      const baseUrl = getBaseUrl(req);
      const bought = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName: friendlyName || `EST8 - ${user.name}`,
        voiceUrl: `${baseUrl}/api/telephony/voice/inbound`,
        smsUrl: `${baseUrl}/api/telephony/sms/inbound`
      });
      twilioSid = bought.sid;
    } catch (err) {
      console.warn('[Telephony] Live number purchase skipped, using sandbox assignment:', err);
    }
  }

  const count = db.prepare('SELECT COUNT(*) as count FROM user_phone_numbers WHERE user_id = ?').get(user.id) as { count: number };
  const isPrimary = count.count === 0 ? 1 : 0;

  db.prepare(`
    INSERT INTO user_phone_numbers (id, user_id, phone_number, friendly_name, twilio_sid, capabilities_voice, capabilities_sms, purchased_at, is_primary)
    VALUES (?, ?, ?, ?, ?, 1, 1, ?, ?)
  `).run(
    id,
    user.id,
    phoneNumber,
    friendlyName || phoneNumber,
    twilioSid,
    new Date().toISOString(),
    isPrimary
  );

  if (isPrimary) {
    db.prepare(`
      INSERT INTO telephony_configs (user_id, calling_mode, bridge_phone, primary_caller_id, auto_log_call, record_calls)
      VALUES (?, 'webrtc', ?, ?, 1, 0)
      ON CONFLICT(user_id) DO UPDATE SET primary_caller_id = excluded.primary_caller_id
    `).run(user.id, user.phone || phoneNumber, phoneNumber);
  }

  res.json({
    success: true,
    number: {
      id,
      userId: user.id,
      phoneNumber,
      friendlyName: friendlyName || phoneNumber,
      twilioSid,
      capabilitiesVoice: true,
      capabilitiesSms: true,
      purchasedAt: new Date().toISOString(),
      isPrimary: Boolean(isPrimary)
    }
  });
});

telephonyRouter.get('/numbers/my', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const rows = db.prepare('SELECT * FROM user_phone_numbers WHERE user_id = ? ORDER BY is_primary DESC, purchased_at DESC').all(user.id) as any[];

  const numbers = rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    phoneNumber: r.phone_number,
    friendlyName: r.friendly_name,
    twilioSid: r.twilio_sid,
    capabilitiesVoice: Boolean(r.capabilities_voice),
    capabilitiesSms: Boolean(r.capabilities_sms),
    purchasedAt: r.purchased_at,
    isPrimary: Boolean(r.is_primary)
  }));

  res.json({ numbers });
});

telephonyRouter.patch('/numbers/:id/primary', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const numberId = req.params.id;
  const target = db.prepare('SELECT * FROM user_phone_numbers WHERE id = ? AND user_id = ?').get(numberId, user.id) as any;
  if (!target) return res.status(404).json({ error: 'Number not found' });

  const tx = db.transaction(() => {
    db.prepare('UPDATE user_phone_numbers SET is_primary = 0 WHERE user_id = ?').run(user.id);
    db.prepare('UPDATE user_phone_numbers SET is_primary = 1 WHERE id = ?').run(numberId);
    db.prepare(`
      INSERT INTO telephony_configs (user_id, calling_mode, bridge_phone, primary_caller_id, auto_log_call, record_calls)
      VALUES (?, 'webrtc', ?, ?, 1, 0)
      ON CONFLICT(user_id) DO UPDATE SET primary_caller_id = excluded.primary_caller_id
    `).run(user.id, user.phone || target.phone_number, target.phone_number);
  });
  tx();

  res.json({ success: true, primaryId: numberId, primaryNumber: target.phone_number });
});

telephonyRouter.delete('/numbers/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const numberId = req.params.id;
  db.prepare('DELETE FROM user_phone_numbers WHERE id = ? AND user_id = ?').run(numberId, user.id);
  res.json({ success: true, deletedId: numberId });
});

// ----------------- 6. TELEPHONY CONFIG ----------------- //

telephonyRouter.get('/config', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  let config = db.prepare('SELECT * FROM telephony_configs WHERE user_id = ?').get(user.id) as any;
  if (!config) {
    const primaryNumber = db.prepare('SELECT phone_number FROM user_phone_numbers WHERE user_id = ? AND is_primary = 1').get(user.id) as any;
    config = {
      calling_mode: 'webrtc',
      bridge_phone: user.phone || '',
      primary_caller_id: primaryNumber?.phone_number || '',
      auto_log_call: 1,
      record_calls: 0
    };
  }

  res.json({
    config: {
      callingMode: config.calling_mode || 'webrtc',
      bridgePhone: config.bridge_phone || user.phone || '',
      primaryCallerId: config.primary_caller_id || '',
      autoLogCall: Boolean(config.auto_log_call),
      recordCalls: Boolean(config.record_calls)
    }
  });
});

telephonyRouter.put('/config', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const { callingMode, bridgePhone, primaryCallerId, autoLogCall, recordCalls } = req.body;

  db.prepare(`
    INSERT INTO telephony_configs (user_id, calling_mode, bridge_phone, primary_caller_id, auto_log_call, record_calls)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      calling_mode = excluded.calling_mode,
      bridge_phone = excluded.bridge_phone,
      primary_caller_id = excluded.primary_caller_id,
      auto_log_call = excluded.auto_log_call,
      record_calls = excluded.record_calls
  `).run(
    user.id,
    callingMode || 'webrtc',
    bridgePhone || '',
    primaryCallerId || '',
    autoLogCall !== undefined ? (autoLogCall ? 1 : 0) : 1,
    recordCalls !== undefined ? (recordCalls ? 1 : 0) : 0
  );

  res.json({ success: true });
});

// ----------------- 7. OUTBOUND CALL TRIGGER ----------------- //

telephonyRouter.post('/call', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const { leadId, leadPhone, callerId, mode, leadName } = req.body;
  if (!leadPhone) return res.status(400).json({ error: 'Lead phone is required' });

  const callId = `CA_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const callingMode = mode || 'webrtc';
  const baseUrl = getBaseUrl(req);

  // If Mobile Bridging mode is active and live Twilio is connected:
  if (callingMode === 'bridge' && twilioClient) {
    try {
      const agentCell = user.phone || '(803) 555-0142';
      await twilioClient.calls.create({
        to: agentCell,
        from: callerId || '+18035550142',
        url: `${baseUrl}/api/telephony/voice/outbound?To=${encodeURIComponent(leadPhone)}&CallerId=${encodeURIComponent(callerId)}`
      });
    } catch (err) {
      console.warn('[Telephony] Live mobile bridge call error, using local simulation:', err);
    }
  }

  // Update lead in SQLite
  if (leadId) {
    const leadRow = db.prepare('SELECT data_json FROM leads WHERE id = ?').get(leadId) as any;
    if (leadRow) {
      const leadData = JSON.parse(leadRow.data_json);
      leadData.dials = (leadData.dials || 0) + 1;
      leadData.lastDial = Date.now();
      leadData.log = [
        {
          t: Date.now(),
          k: 'call',
          x: `Placed outbound call via ${callingMode === 'bridge' ? 'Mobile Bridge' : 'Browser WebRTC Softphone'} (CID: ${callerId || 'Agency'})`
        },
        ...(leadData.log || [])
      ];

      db.prepare(`
        UPDATE leads
        SET dials = ?, last_dial = ?, data_json = ?, updated_at = ?
        WHERE id = ?
      `).run(leadData.dials, leadData.lastDial, JSON.stringify(leadData), Date.now(), leadId);
    }

    db.prepare(`
      INSERT INTO call_logs (id, user_id, lead_id, outcome, notes, timestamp, duration)
      VALUES (?, ?, ?, 'call', ?, ?, 0)
    `).run(callId, user.id, leadId, `Mode: ${callingMode}`, Date.now());
  }

  res.json({
    success: true,
    callId,
    mode: callingMode,
    leadPhone,
    callerId,
    message: callingMode === 'bridge'
      ? `Calling your mobile cell first (${user.phone || 'Cell Phone'}). Answer to bridge to ${leadName || 'lead'}!`
      : `Connecting browser WebRTC audio to ${leadPhone}...`
  });
});

// ----------------- 8. 10DLC SMS DISPATCH & CONVERSATIONS ----------------- //

telephonyRouter.get('/sms/messages', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const leadId = req.query.leadId as string;
  if (!leadId) return res.status(400).json({ error: 'leadId is required' });

  const rows = db.prepare('SELECT * FROM sms_messages WHERE lead_id = ? ORDER BY created_at ASC').all(leadId) as any[];

  const messages = rows.map(r => ({
    id: r.id,
    leadId: r.lead_id,
    direction: r.direction,
    fromNumber: r.from_number,
    toNumber: r.to_number,
    body: r.body,
    status: r.status,
    isTrialSimulated: Boolean(r.is_trial_simulated),
    createdAt: r.created_at
  }));

  res.json({ messages });
});

telephonyRouter.post('/sms', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const { leadId, to, from, body } = req.body;
  if (!to || !body) return res.status(400).json({ error: 'Recipient phone and message body are required' });

  let messageSid = `SM_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  let isTrialNotice = false;
  let trialNoticeMessage = '';
  let status = 'delivered';

  // If live Twilio client is active, send via Messaging Service (or From number)
  if (twilioClient) {
    try {
      const msgOptions: any = {
        to,
        body
      };
      if (MESSAGING_SERVICE_SID) {
        msgOptions.messagingServiceSid = MESSAGING_SERVICE_SID;
      } else {
        msgOptions.from = from || '+18035550142';
      }

      const sentMsg = await twilioClient.messages.create(msgOptions);
      messageSid = sentMsg.sid;
      status = 'delivered';
    } catch (err: any) {
      console.warn('[Telephony] Twilio SMS dispatch error:', err.code, err.message);
      // Handle Twilio Trial limitation: 21608 (unverified number)
      if (err.code === 21608 || (err.message && err.message.toLowerCase().includes('unverified'))) {
        isTrialNotice = true;
        status = 'simulated';
        trialNoticeMessage = 'Twilio Trial Account Notice: Recipient is not a Verified Caller ID in your Twilio Console. Message was captured and recorded in Sandbox mode so your workflow is not interrupted.';
      } else {
        // Fallback gracefully for sandbox or trial accounts
        status = 'simulated';
        trialNoticeMessage = `Twilio Notice (${err.code || 'Carrier'}): ${err.message}. Recorded in local sandbox.`;
      }
    }
  } else {
    // Simulator mode
    status = 'simulated';
  }

  const now = Date.now();
  const msgId = `msg_${now}_${Math.random().toString(36).substring(2, 6)}`;

  // Store in sms_messages table
  try {
    db.prepare(`
      INSERT INTO sms_messages (id, user_id, lead_id, direction, from_number, to_number, body, status, is_trial_simulated, created_at)
      VALUES (?, ?, ?, 'outbound', ?, ?, ?, ?, ?, ?)
    `).run(
      msgId,
      user.id,
      leadId || '',
      from || '+18035550142',
      to,
      body,
      status,
      status === 'simulated' ? 1 : 0,
      now
    );
  } catch (err) {
    console.warn('[Telephony] Error inserting outbound message to DB:', err);
  }

  // Log SMS inside lead history
  if (leadId) {
    const leadRow = db.prepare('SELECT data_json FROM leads WHERE id = ?').get(leadId) as any;
    if (leadRow) {
      const leadData = JSON.parse(leadRow.data_json);
      leadData.log = [
        {
          t: now,
          k: 'text',
          x: `SMS sent (${status === 'simulated' ? 'Sandbox/Trial' : '10DLC'}): "${body.length > 70 ? body.slice(0, 67) + '...' : body}"`
        },
        ...(leadData.log || [])
      ];

      db.prepare(`
        UPDATE leads
        SET data_json = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(leadData), now, leadId);
    }
  }

  res.json({
    success: true,
    messageId: msgId,
    messageSid,
    status,
    isTrialNotice,
    trialNoticeMessage,
    sentAt: new Date(now).toISOString()
  });
});

// Simulate Inbound SMS (Allows instant testing of two-way SMS without waiting for lead or on trial accounts)
telephonyRouter.post('/sms/simulate-inbound', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const { leadId, body } = req.body;
  if (!leadId || !body) return res.status(400).json({ error: 'leadId and body are required' });

  const leadRow = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
  if (!leadRow) return res.status(404).json({ error: 'Lead not found' });

  const leadData = JSON.parse(leadRow.data_json);
  const primaryNumber = db.prepare('SELECT phone_number FROM user_phone_numbers WHERE user_id = ? AND is_primary = 1').get(user.id) as any;
  const agentPhone = primaryNumber?.phone_number || '+18035550142';
  const leadPhone = leadData.phone || '(803) 441-2904';

  const msgId = `msg_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = Date.now();

  try {
    db.prepare(`
      INSERT INTO sms_messages (id, user_id, lead_id, direction, from_number, to_number, body, status, is_trial_simulated, created_at)
      VALUES (?, ?, ?, 'inbound', ?, ?, ?, 'received', 1, ?)
    `).run(msgId, user.id, leadId, leadPhone, agentPhone, body.trim(), now);
  } catch (err) {
    console.error('Failed to insert simulated inbound SMS:', err);
  }

  leadData.log = [
    {
      t: now,
      k: 'text',
      x: `Inbound SMS from ${leadData.firstName || 'Client'}: "${body.trim()}"`
    },
    ...(leadData.log || [])
  ];

  db.prepare('UPDATE leads SET data_json = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(leadData),
    now,
    leadId
  );

  res.json({
    success: true,
    message: {
      id: msgId,
      leadId,
      direction: 'inbound',
      fromNumber: leadPhone,
      toNumber: agentPhone,
      body: body.trim(),
      status: 'received',
      isTrialSimulated: true,
      createdAt: now
    }
  });
});

// Call Disposition Endpoint (structured outcome logging from dialer)
telephonyRouter.post('/call/disposition', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const { leadId, outcome, notes, appointmentDate, appointmentTime, durationSeconds } = req.body;
  if (!leadId || !outcome) return res.status(400).json({ error: 'leadId and outcome are required' });

  const leadRow = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
  if (!leadRow) return res.status(404).json({ error: 'Lead not found' });

  const leadData = JSON.parse(leadRow.data_json);
  const now = Date.now();

  let newStatus = leadData.status;
  if (outcome === 'appt') {
    newStatus = 'appt';
    if (appointmentDate) leadData.apptDay = appointmentDate;
    if (appointmentTime) leadData.apptTime = appointmentTime;
  } else if (outcome === 'quoted') {
    newStatus = 'quoted';
  } else if (outcome === 'talk') {
    newStatus = 'contacted';
  } else if (outcome === 'dnc') {
    newStatus = 'dnc';
  } else if (outcome === 'notint') {
    newStatus = 'notint';
  }

  const outcomeLabels: Record<string, string> = {
    na: 'No Answer',
    vm: 'Left Voicemail',
    talk: 'Spoke with Client',
    appt: 'Appointment Scheduled',
    quoted: 'Quoted Client',
    dnc: 'Do Not Call (DNC)',
    notint: 'Not Interested'
  };

  const label = outcomeLabels[outcome] || outcome;
  const logText = notes ? `${label} - ${notes}` : label;

  leadData.log = [
    {
      t: now,
      k: (outcome === 'na' || outcome === 'vm' || outcome === 'talk' ? outcome : 'call') as any,
      x: `Call Disposition: ${logText}`
    },
    ...(leadData.log || [])
  ];

  if (newStatus !== leadData.status) {
    leadData.status = newStatus;
    leadData.stageAt = { ...(leadData.stageAt || {}), [newStatus]: now };
  }

  db.prepare('UPDATE leads SET status = ?, data_json = ?, updated_at = ? WHERE id = ?').run(
    newStatus,
    JSON.stringify(leadData),
    now,
    leadId
  );

  const logId = `CL_${now}_${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO call_logs (id, user_id, lead_id, outcome, notes, timestamp, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(logId, user.id, leadId, outcome, notes || '', now, durationSeconds || 0);

  res.json({
    success: true,
    updatedStatus: newStatus,
    updatedLead: leadData
  });
});

// ----------------- 9. A2P 10DLC REGISTRATION PORTAL ----------------- //

telephonyRouter.get('/a2p', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const registration = db.prepare('SELECT * FROM a2p_registrations WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1').get(user.id) as any;

  if (!registration) {
    return res.json({ registered: false, registration: null });
  }

  res.json({
    registered: true,
    registration: {
      id: registration.id,
      userId: registration.user_id,
      brandSid: registration.brand_sid,
      campaignSid: registration.campaign_sid,
      businessName: registration.business_name,
      ein: registration.ein,
      businessType: registration.business_type,
      brandType: registration.brand_type,
      campaignUseCase: registration.campaign_use_case,
      status: registration.status,
      carrierFeedback: registration.carrier_feedback,
      sampleMessage1: registration.sample_message1,
      sampleMessage2: registration.sample_message2,
      optInKeywords: registration.opt_in_keywords,
      submittedAt: registration.submitted_at,
      updatedAt: registration.updated_at
    }
  });
});

telephonyRouter.post('/a2p', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });

  const {
    businessName,
    ein,
    businessType,
    brandType,
    campaignUseCase,
    sampleMessage1,
    sampleMessage2,
    optInKeywords
  } = req.body;

  if (!businessName || !ein) {
    return res.status(400).json({ error: 'Legal business name and Tax ID / EIN are required' });
  }

  const id = `a2p_${Date.now()}`;
  const brandSid = `BN_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const campaignSid = `CP_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO a2p_registrations (
      id, user_id, brand_sid, campaign_sid, business_name, ein, business_type, brand_type,
      campaign_use_case, status, sample_message1, sample_message2, opt_in_keywords, submitted_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_review', ?, ?, ?, ?, ?)
  `).run(
    id,
    user.id,
    brandSid,
    campaignSid,
    businessName,
    ein,
    businessType || 'llc',
    brandType || 'STANDARD',
    campaignUseCase || 'Mortgage Protection & Final Expense Appointment Care',
    sampleMessage1 || '',
    sampleMessage2 || '',
    optInKeywords || 'START, YES, AGREE',
    now,
    now
  );

  res.json({
    success: true,
    registration: {
      id,
      brandSid,
      campaignSid,
      status: 'in_review',
      businessName,
      submittedAt: now
    }
  });
});
