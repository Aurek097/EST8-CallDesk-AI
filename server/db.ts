import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'calldesk.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent',
      is_verified INTEGER NOT NULL DEFAULT 0,
      phone TEXT,
      npn TEXT,
      profile_json TEXT,
      settings_json TEXT,
      invited_by TEXT,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'mp',
      status TEXT NOT NULL DEFAULT 'new',
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      state TEXT,
      dials INTEGER NOT NULL DEFAULT 0,
      last_dial INTEGER,
      data_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(user_id, status);

    CREATE TABLE IF NOT EXISTS call_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      notes TEXT,
      timestamp INTEGER NOT NULL,
      duration INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_call_logs_user ON call_logs(user_id);

    CREATE TABLE IF NOT EXISTS user_phone_numbers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      friendly_name TEXT NOT NULL,
      twilio_sid TEXT NOT NULL,
      capabilities_voice INTEGER NOT NULL DEFAULT 1,
      capabilities_sms INTEGER NOT NULL DEFAULT 1,
      purchased_at TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_phone_numbers_user ON user_phone_numbers(user_id);

    CREATE TABLE IF NOT EXISTS a2p_registrations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      brand_sid TEXT,
      campaign_sid TEXT,
      business_name TEXT NOT NULL,
      ein TEXT NOT NULL,
      business_type TEXT NOT NULL DEFAULT 'llc',
      brand_type TEXT NOT NULL DEFAULT 'STANDARD',
      campaign_use_case TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      carrier_feedback TEXT,
      sample_message1 TEXT,
      sample_message2 TEXT,
      opt_in_keywords TEXT,
      submitted_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_a2p_user ON a2p_registrations(user_id);

    CREATE TABLE IF NOT EXISTS telephony_configs (
      user_id TEXT PRIMARY KEY,
      calling_mode TEXT NOT NULL DEFAULT 'webrtc',
      bridge_phone TEXT,
      primary_caller_id TEXT,
      auto_log_call INTEGER NOT NULL DEFAULT 1,
      record_calls INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sms_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      direction TEXT NOT NULL, -- 'outbound' | 'inbound'
      from_number TEXT NOT NULL,
      to_number TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'delivered', -- 'delivered' | 'received' | 'simulated' | 'failed'
      is_trial_simulated INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sms_lead ON sms_messages(lead_id);
    CREATE INDEX IF NOT EXISTS idx_sms_user ON sms_messages(user_id);
  `);

  // Seed default Super Admin: aurek97@gmail.com (Andrew Chavis)
  const defaultAdminEmail = 'aurek97@gmail.com';
  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(defaultAdminEmail);

  const defaultProfile = {
    name: 'Andrew Chavis',
    role: 'Managing Partner',
    phone: '(803) 555-0142',
    email: defaultAdminEmail,
    booking: 'https://calendly.com/andrew-chavis',
    imo: 'EST8 Financial',
    callAgency: 'EST8 Financial Group',
    callPhone: '(803) 555-0100',
    quoteUrl: 'https://quoteplicity.com/run',
    qpMp: 'EST8MP',
    qpFe: 'EST8FE',
    qpContact: 'yes',
    photo: '',
    photoX: 50,
    photoY: 50,
    npn: '19482015',
    dob: '1990-05-14',
    dl: 'SC-8492019',
    dlState: 'SC',
    aml: 'WebCE',
    amlDate: '2024-03-10',
    eo: 'NAPA',
    eoPolicy: 'EO-9842104-24',
    eoCert: '',
    eoExp: '2026-08-31',
    states: [
      { id: '1', st: 'SC', num: '19482015', home: true, exp: '2027-05-31' },
      { id: '2', st: 'NC', num: '19482015', home: false, exp: '2026-11-30' },
      { id: '3', st: 'GA', num: '3049102', home: false, exp: '2026-04-15' },
      { id: '4', st: 'FL', num: 'W920194', home: false, exp: '2026-09-30' },
      { id: '5', st: 'TX', num: '2940192', home: false, exp: '2026-10-15' }
    ],
    writing: [
      { id: '1', carrier: 'Americo', num: 'AC-84920', status: 'Appointed' },
      { id: '2', carrier: 'Mutual of Omaha', num: 'MO-102948', status: 'Appointed' },
      { id: '3', carrier: 'Transamerica', num: 'TA-938201', status: 'Appointed' },
      { id: '4', carrier: 'Aetna', num: 'AE-48201', status: 'Appointed' },
      { id: '5', carrier: 'Forestors Financial', num: 'FF-59201', status: 'Appointed' }
    ]
  };

  const defaultSettings = {
    timeA: '10:00',
    timeB: '14:00'
  };

  let adminId = 'user_admin_aurek';
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (id, email, name, role, is_verified, phone, npn, profile_json, settings_json, created_at)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      defaultAdminEmail,
      'Andrew Chavis',
      'admin',
      '(803) 555-0142',
      '19482015',
      JSON.stringify(defaultProfile),
      JSON.stringify(defaultSettings),
      new Date().toISOString()
    );
  } else {
    // Ensure always verified and admin
    adminId = (existingAdmin as any).id;
    db.prepare(`UPDATE users SET role = 'admin', is_verified = 1 WHERE email = ?`).run(defaultAdminEmail);
  }

  // Pre-seed sample leads for admin if empty
  const leadCount = db.prepare('SELECT COUNT(*) as count FROM leads WHERE user_id = ?').get(adminId) as { count: number };
  if (leadCount.count === 0) {
    seedAdminLeads(adminId);
  }

  // Seed default phone number, A2P registration, and telephony config for admin if none exist
  const existingNumbers = db.prepare('SELECT COUNT(*) as count FROM user_phone_numbers WHERE user_id = ?').get(adminId) as { count: number };
  if (existingNumbers.count === 0) {
    db.prepare(`
      INSERT INTO user_phone_numbers (id, user_id, phone_number, friendly_name, twilio_sid, capabilities_voice, capabilities_sms, purchased_at, is_primary)
      VALUES (?, ?, ?, ?, ?, 1, 1, ?, 1)
    `).run(
      'pn_admin_initial',
      adminId,
      '+18035550142',
      '(803) 555-0142 (Columbia, SC)',
      'PN_SIM_8035550142',
      new Date().toISOString()
    );

    db.prepare(`
      INSERT INTO telephony_configs (user_id, calling_mode, bridge_phone, primary_caller_id, auto_log_call, record_calls)
      VALUES (?, 'webrtc', '(803) 555-0142', '+18035550142', 1, 0)
      ON CONFLICT(user_id) DO NOTHING
    `).run(adminId);

    db.prepare(`
      INSERT INTO a2p_registrations (id, user_id, brand_sid, campaign_sid, business_name, ein, business_type, brand_type, campaign_use_case, status, sample_message1, sample_message2, opt_in_keywords, submitted_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'a2p_admin_initial',
      adminId,
      'BN_EST8_984102',
      'CP_EST8_748192',
      'EST8 Financial Group LLC',
      '84-9201948',
      'llc',
      'STANDARD',
      'Mortgage Protection & Final Expense Customer Care & Appointment Follow-up',
      'approved',
      'Hi Marcus, this is Andrew Chavis with EST8 Financial Group following up on your mortgage protection request for your home in Columbia. When is a good time for a brief 5-min review? Reply STOP to cancel.',
      'Hi David, Andrew Chavis here with EST8 Financial. I have the updated carrier rate comparisons ready for your review. Let me know if you are free around 2pm or 4pm today.',
      'START, YES, AGREE',
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  // Seed default sample SMS conversation for lead-mp-1 if none exist
  const msgCount = db.prepare('SELECT COUNT(*) as count FROM sms_messages WHERE user_id = ?').get(adminId) as { count: number };
  if (msgCount.count === 0) {
    const now = Date.now();
    const insertSms = db.prepare(`
      INSERT OR IGNORE INTO sms_messages (id, user_id, lead_id, direction, from_number, to_number, body, status, is_trial_simulated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSms.run(
      'msg_sample_1',
      adminId,
      'lead-mp-1',
      'outbound',
      '+18035550142',
      '(803) 492-1049',
      'Hi Marcus, this is Andrew Chavis with EST8 Financial Group following up on the mortgage protection request for your home in Columbia. When is a good time today for a quick 5-min review?',
      'delivered',
      0,
      now - 86400000
    );

    insertSms.run(
      'msg_sample_2',
      adminId,
      'lead-mp-1',
      'inbound',
      '(803) 492-1049',
      '+18035550142',
      "Hey Andrew, thanks for reaching out. I'm on site until 4:30. Can you call me after 5:00 PM?",
      'received',
      0,
      now - 3600000 * 5
    );

    insertSms.run(
      'msg_sample_3',
      adminId,
      'lead-mp-1',
      'outbound',
      '+18035550142',
      '(803) 492-1049',
      'Sounds great Marcus! I have you on my calendar for 5:15 PM today. Talk soon.',
      'delivered',
      0,
      now - 3600000 * 4
    );
  }
}

function seedAdminLeads(userId: string) {
  const insertLead = db.prepare(`
    INSERT INTO leads (id, user_id, type, status, first_name, last_name, phone, state, dials, last_dial, data_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const sampleLeads = [
    {
      id: 'lead-mp-1',
      type: 'mp',
      status: 'new',
      firstName: 'Marcus',
      lastName: 'Holloway',
      phone: '(803) 492-1049',
      email: 'm.holloway@gmail.com',
      address: '742 Evergreen Terrace',
      city: 'Columbia',
      state: 'SC',
      zip: '29201',
      dob: '1979-04-12',
      age: 47,
      loanAmount: '325000',
      lender: 'Rocket Mortgage',
      homeValue: '410000',
      monthlyPayment: '2150',
      loanTerm: '30',
      married: 'yes',
      spouseName: 'Elena Holloway',
      spouseDob: '1982-08-20',
      spouseAge: 44,
      spouseHealth: 'Excellent',
      health: 'Good, high cholesterol managed with low dose statin',
      tobacco: 'no',
      occupation: 'Senior Logistics Specialist',
      dials: 0,
      v: {},
      orig: {},
      extra: {},
      log: [
        { t: now - 86400000, k: 'stage', x: 'Created new mortgage protection inquiry' }
      ],
      stageAt: { new: now - 86400000 },
      created: now - 86400000
    },
    {
      id: 'lead-mp-2',
      type: 'mp',
      status: 'contacted',
      firstName: 'David',
      lastName: 'Vance',
      phone: '(704) 819-2044',
      email: 'dvance99@yahoo.com',
      address: '1402 Oakridge Lane',
      city: 'Charlotte',
      state: 'NC',
      zip: '28205',
      dob: '1968-11-03',
      age: 57,
      loanAmount: '240000',
      lender: 'Wells Fargo',
      homeValue: '350000',
      monthlyPayment: '1680',
      loanTerm: '30',
      married: 'no',
      health: 'Clean bill of health, no daily meds',
      tobacco: 'no',
      occupation: 'General Contractor',
      dials: 2,
      lastDial: now - 3600000 * 4,
      v: { phone: 'ok', address: 'ok' },
      orig: {},
      extra: {},
      log: [
        { t: now - 86400000 * 2, k: 'stage', x: 'Lead received' },
        { t: now - 86400000, k: 'vm', x: 'Left Voicemail #1' },
        { t: now - 3600000 * 4, k: 'talk', x: 'Connected briefly on lunch break. Asked for quote comparison later tonight.' }
      ],
      stageAt: { new: now - 86400000 * 2, contacted: now - 3600000 * 4 },
      created: now - 86400000 * 2
    },
    {
      id: 'lead-fe-1',
      type: 'fe',
      status: 'new',
      firstName: 'Brenda',
      lastName: 'Washington',
      phone: '(404) 772-9103',
      email: 'brendawash49@gmail.com',
      address: '382 Peachtree Dr',
      city: 'Atlanta',
      state: 'GA',
      zip: '30308',
      dob: '1955-09-18',
      age: 70,
      opener: 'A',
      amountRequested: '15000',
      beneficiary: 'Tasha Washington (Daughter)',
      burialPref: 'burial',
      incomeSource: 'ss',
      budget: '75',
      health: 'Blood pressure medicine, otherwise doing fine',
      tobacco: 'no',
      dials: 0,
      v: {},
      orig: {},
      extra: {},
      log: [
        { t: now - 3600000 * 12, k: 'stage', x: 'Final Expense Form Submitted' }
      ],
      stageAt: { new: now - 3600000 * 12 },
      created: now - 3600000 * 12
    }
  ];

  const transaction = db.transaction(() => {
    for (const lead of sampleLeads) {
      insertLead.run(
        lead.id,
        userId,
        lead.type,
        lead.status,
        lead.firstName,
        lead.lastName,
        lead.phone,
        lead.state,
        lead.dials,
        lead.lastDial || null,
        JSON.stringify(lead),
        lead.created,
        now
      );
    }

    // Seed sample conversation thread for lead-mp-1
    const insertSms = db.prepare(`
      INSERT OR IGNORE INTO sms_messages (id, user_id, lead_id, direction, from_number, to_number, body, status, is_trial_simulated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSms.run(
      'msg_sample_1',
      userId,
      'lead-mp-1',
      'outbound',
      '+18035550142',
      '(803) 441-2904',
      'Hi Marcus, this is Andrew Chavis with EST8 Financial Group following up on the mortgage protection request for your home in Columbia. When is a good time today for a quick 5-min review?',
      'delivered',
      0,
      now - 86400000
    );

    insertSms.run(
      'msg_sample_2',
      userId,
      'lead-mp-1',
      'inbound',
      '(803) 441-2904',
      '+18035550142',
      "Hey Andrew, thanks for reaching out. I'm on site until 4:30. Can you call me after 5:00 PM?",
      'received',
      0,
      now - 3600000 * 5
    );

    insertSms.run(
      'msg_sample_3',
      userId,
      'lead-mp-1',
      'outbound',
      '+18035550142',
      '(803) 441-2904',
      'Sounds great Marcus! I have you on my calendar for 5:15 PM today. Talk soon.',
      'delivered',
      0,
      now - 3600000 * 4
    );
  });

  transaction();
}
