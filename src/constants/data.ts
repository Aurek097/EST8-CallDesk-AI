import { Lead, AgentProfile, Settings } from '../types';

export const STAGES: [string, string][] = [
  ['new', 'New lead'],
  ['contacted', 'Contacted'],
  ['appt', 'Appointment set'],
  ['quoted', 'Quoted'],
  ['app', 'Application'],
  ['inforce', 'Policy in force'],
];

export const PARKED: [string, string][] = [
  ['callback', 'Call back'],
  ['notint', 'Not interested'],
  ['dnc', 'Do not call'],
];

export const STATUS: [string, string][] = [...STAGES, ...PARKED];
export const STATUS_L: Record<string, string> = Object.fromEntries(STATUS);
export const STAGE_I: Record<string, number> = Object.fromEntries(STAGES.map(([k], i) => [k, i]));

export const MIGRATE: Record<string, string> = {
  noans: 'new',
  presented: 'quoted',
  sold: 'app',
};

export const YN: [string, string][] = [
  ['no', 'No'],
  ['yes', 'Yes'],
];

export const LOGK: Record<string, string> = {
  na: 'No answer',
  vm: 'Voicemail',
  text: 'Text',
  talk: 'Talked',
  note: 'Note',
  call: 'Call',
  stage: 'Stage',
};

export const FE_TIER = ['Gold', 'Silver', 'Bronze'];

export const ST: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

export const ZONES: Record<string, string> = {
  'America/New_York': 'CT DE DC FL GA IN KY ME MD MA MI NH NJ NY NC OH PA RI SC VT VA WV',
  'America/Chicago': 'AL AR IL IA KS LA MN MS MO NE ND OK SD TN TX WI',
  'America/Denver': 'CO ID MT NM UT WY',
  'America/Phoenix': 'AZ',
  'America/Los_Angeles': 'CA NV OR WA',
  'America/Anchorage': 'AK',
  'Pacific/Honolulu': 'HI'
};

export const TZ_OF: Record<string, string> = {};
Object.entries(ZONES).forEach(([z, l]) => l.split(' ').forEach(a => { TZ_OF[a] = z; }));

export function stAbbr(s?: string): string {
  const str = String(s || '').trim();
  if (!str) return '';
  if (/^[A-Za-z]{2}$/.test(str)) return str.toUpperCase();
  const k = Object.keys(ST).find(a => ST[a].toLowerCase() === str.toLowerCase());
  return k || '';
}

export function stName(s?: string): string {
  const ab = stAbbr(s);
  return ST[ab] || s || '';
}

export const DEF_SET: Settings = {
  timeA: '5:15 pm',
  timeB: '6:45 pm'
};

export const ROLES = ['Agent', 'Agency owner', 'Manager', 'Recruiter', 'Trainee'];
export const WSTAT: ('Appointed' | 'Pending' | 'Inactive')[] = ['Appointed', 'Pending', 'Inactive'];

export function blankProfile(): AgentProfile {
  return {
    name: '',
    role: 'Agent',
    phone: '',
    email: '',
    booking: '',
    imo: '',
    callAgency: 'EST8 Financial',
    callPhone: '',
    quoteUrl: '',
    qpMp: '',
    qpFe: '',
    qpContact: 'no',
    photo: '',
    photoX: 50,
    photoY: 35,
    npn: '',
    states: [],
    writing: [],
    dob: '',
    dl: '',
    dlState: '',
    aml: '',
    amlDate: '',
    eo: '',
    eoPolicy: '',
    eoCert: '',
    eoExp: ''
  };
}

export const ANDREW_PROFILE: AgentProfile = {
  name: 'Andrew Chavis',
  role: 'Agent',
  phone: '(803) 873-4019',
  email: 'andrew.chavissfg@gmail.com',
  booking: '',
  imo: 'Symmetry Financial Group (SFG)',
  callAgency: 'EST8 Financial',
  callPhone: '(361) 761-0910',
  qpMp: 'https://20009a4c1a8eb5e9.quoteplicity.com/quote/no-exam',
  qpFe: '',
  qpContact: 'no',
  photo: '',
  photoX: 50,
  photoY: 35,
  npn: '21644305',
  states: [
    { id: 'st-mi', st: 'MI', num: '21644305', home: false, exp: '' },
    { id: 'st-oh', st: 'OH', num: '1735870', home: false, exp: '' },
    { id: 'st-sc', st: 'SC', num: '21644305', home: false, exp: '' },
    { id: 'st-tx', st: 'TX', num: '3357586', home: true, exp: '' },
    { id: 'st-va', st: 'VA', num: '1580090', home: false, exp: '' }
  ],
  writing: [
    { id: 'w1', carrier: 'American General', num: '1QUPQ', status: 'Appointed' },
    { id: 'w2', carrier: 'Americo', num: 'DPAAW2', status: 'Appointed' },
    { id: 'w3', carrier: 'Banner Life (BeyondTerm)', num: 'ASU12239', status: 'Appointed' },
    { id: 'w4', carrier: 'Fidelity and Guaranty', num: '000784282', status: 'Appointed' },
    { id: 'w5', carrier: 'Legal & General America (Obsolete)', num: 'ASU12239', status: 'Inactive' },
    { id: 'w6', carrier: 'Liberty Bankers', num: 'LBL84766WL', status: 'Appointed' },
    { id: 'w7', carrier: 'Mutual of Omaha', num: '1241690', status: 'Appointed' },
    { id: 'w8', carrier: 'Occidental', num: '0007047433', status: 'Appointed' },
    { id: 'w9', carrier: 'SBLI', num: '132829', status: 'Appointed' },
    { id: 'w10', carrier: 'SBLI', num: '154425', status: 'Appointed' },
    { id: 'w11', carrier: 'Transamerica', num: '0097175119', status: 'Appointed' },
    { id: 'w12', carrier: 'United Home Life', num: 'L000262928', status: 'Appointed' }
  ],
  dob: '',
  dl: '',
  dlState: 'TX',
  aml: 'SuranceBay, LLC.',
  amlDate: '2026-10-05',
  eo: 'Next Insurance US Company',
  eoPolicy: 'NXTPWFKTQ3-00-PL',
  eoCert: '083312270',
  eoExp: '2027-06-08'
};

export function sampleFELead(): Lead {
  const d = new Date(Date.now() - 26 * 3600000);
  const ds = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)} 9:14:02 AM`;
  return {
    id: 's4',
    sample: true,
    type: 'fe',
    status: 'new',
    dials: 0,
    v: {},
    orig: {},
    extra: {},
    log: [],
    stageAt: { new: Date.now() },
    created: Date.now(),
    firstName: 'Gloria',
    lastName: 'Benton',
    dob: '4/9/1955',
    phone: '(419) 555-0176',
    email: 'gloria.b@example.com',
    state: 'Ohio',
    city: 'Toledo',
    zip: '43615',
    amountRequested: '$15,000',
    benRel: 'My Children',
    beneficiary: 'Keisha Benton',
    hasLife: 'No',
    heartStrokeCancer: 'No',
    gender: 'Female',
    hobby: 'Gardening',
    platform: 'fb',
    ad: 'Sample ad',
    leadDate: ds,
    interestedIn: 'Final Expense Insurance'
  };
}

export function sampleMortgageLeads(): Lead[] {
  return [
    {
      id: 's1',
      sample: true,
      type: 'mp',
      status: 'appt',
      step: 1,
      dials: 3,
      v: {},
      orig: {},
      extra: {},
      log: [
        { t: Date.now() - 3600000 * 2, k: 'talk', x: 'Talked with Marcus. Set appointment for presentation.' },
        { t: Date.now() - 3600000 * 3, k: 'stage', x: 'New lead → Appointment set' }
      ],
      stageAt: { new: Date.now() - 86400000, appt: Date.now() - 3600000 * 2 },
      created: Date.now() - 86400000,
      firstName: 'Marcus',
      lastName: 'Reed',
      phone: '(832) 555-0147',
      email: 'marcus.reed@example.com',
      address: '1438 Willow Bend Dr',
      city: 'Pearland',
      state: 'TX',
      zip: '77581',
      loanAmount: '286000',
      lender: 'Gulf Coast Mortgage',
      dob: '06/14/1986',
      spouseName: 'Tanya',
      spouseDob: '02/02/1988',
      leadSource: 'Mail-in (sample)',
      leadDate: '10/28/2026',
      apptDay: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      apptTime: '6:45 pm',
      monthlyPayment: '2150'
    },
    {
      id: 's2',
      sample: true,
      type: 'mp',
      status: 'quoted',
      step: 2,
      dials: 2,
      v: {},
      orig: {},
      extra: {},
      log: [],
      stageAt: { new: Date.now() - 86400000 * 3, quoted: Date.now() - 86400000 },
      created: Date.now() - 86400000 * 3,
      firstName: 'Linda',
      lastName: 'Okafor',
      phone: '(281) 555-0193',
      email: '',
      address: '2207 Briar Glen Ln',
      city: 'Katy',
      state: 'TX',
      zip: '77449',
      loanAmount: '142500',
      dob: '09/30/1958',
      leadSource: 'Digital (sample)',
      leadDate: '10/30/2026'
    },
    {
      id: 's3',
      sample: true,
      type: 'mp',
      status: 'callback',
      step: 1,
      dials: 1,
      v: {},
      orig: {},
      extra: {},
      log: [],
      stageAt: { new: Date.now() - 86400000 * 2 },
      created: Date.now() - 86400000 * 2,
      firstName: 'Daniel',
      lastName: 'Ruiz',
      phone: '(713) 555-0112',
      address: '908 Cypress Point',
      city: 'Spring',
      state: 'TX',
      zip: '77373',
      loanAmount: '318750',
      age: '41',
      spouseName: 'Maria',
      leadSource: 'Mail-in (sample)',
      leadDate: '11/01/2026',
      followAt: new Date(Date.now() + 3600000 * 4).toISOString(),
      followWhat: 'Call back after work'
    }
  ];
}

export const DELIV: Record<string, { s: string; n: string }> = {
  'American Amicable': { s: '"Would you like your policy mailed or emailed to you?"', n: 'Mail delivery: 5–6 days.' },
  'Americo': { s: '"Would you like your policy mailed or emailed to you?"', n: 'Mail delivery: 5–6 days.' },
  'Corebridge/AIG': { s: '"Would you like your policy mailed or emailed to you?"', n: 'Mail delivery: 7–9 days.' },
  'F&G': { s: '"You will receive your policy in the mail in 6 to 9 days."', n: 'Indicate in the special instructions on the application to deliver to PI.' },
  'Foresters': { s: '"You\'ll receive your policy in your email shortly." Or by mail: "Your policy will be delivered in 5 to 7 days."', n: '' },
  'LGA': { s: '"You have the option of downloading the policy now, or you can follow the link they emailed you. It takes you to the policy owner portal, where you register and download your policy."', n: '' },
  'Mutual of Omaha': { s: '"You\'ll receive your policy in your email shortly, and a copy will also be mailed to you."', n: 'Mail delivery: 5–7 days.' },
  'SBLI': { s: '"You\'ll receive an email with a link to my.sbli.com to register your account and download your policy."', n: '' },
  'Transamerica': { s: 'Fast Doc: "You\'ll receive your policy shortly by email." Non-Fast Doc: "You\'ll receive your policy in the mail."', n: 'Non-Fast Doc mail delivery: 6–9 days.' },
  'UHL': { s: '"You\'ll receive your policy in the mail."', n: 'Mail delivery: 5–7 days.' }
};

export const CAR_ALIAS: Record<string, string> = {
  'corebridge/aig': 'american general',
  'corebridge': 'american general',
  'aig': 'american general',
  'f&g': 'fidelity and guaranty',
  'fidelity & guaranty': 'fidelity and guaranty',
  'uhl': 'united home life',
  'lga': 'legal & general america',
  'legal and general america': 'legal & general america',
  'banner life': 'banner life',
  'banner': 'banner life',
  'moo': 'mutual of omaha',
  'amam': 'american amicable'
};

export const HQ: [string, string][] = [
  ['hqHeart', 'Heart attack, stroke, heart surgery or congestive heart failure'],
  ['hqCancer', 'Cancer in the last 2–3 years'],
  ['hqCopd', 'COPD, emphysema or oxygen use'],
  ['hqDiab', 'Diabetes with insulin, neuropathy or amputation'],
  ['hqKidney', 'Kidney failure or dialysis'],
  ['hqHosp', 'Hospital stay, nursing home or home health care now'],
  ['hqMemory', "Alzheimer's, dementia or memory issues"],
  ['hqTerminal', 'Any terminal diagnosis']
];

export const OBJ: [string, string, string, string?][] = [
  ['"I need to think about it."', 'Price, trust, or one detail they didn\'t follow', '"That\'s fair, it\'s an important decision. Usually when someone says that, it\'s either the price or something I didn\'t explain well. Which one is it for you?"'],
  ['"It\'s too expensive."', 'Wrong coverage amount for the budget', '"I understand. Let\'s find a number that works. If you could only do one thing for {{beneficiary}}, what monthly amount would feel comfortable?" Drop to Bronze or lower.'],
  ['"I need to talk to my kids / spouse."', 'Wants approval, or using it as an exit', '"I respect that. Can I ask, if they said \'go ahead,\' would you want to do it? … Then let\'s get them on the phone now, or set a time tonight when all three of us can talk for ten minutes."'],
  ['"Just mail me something."', 'Polite brush-off', '"I can, but the prices I showed you are based on your health today, and nothing gets locked in by mail. What specifically would you want to see on paper? I can answer it right now."'],
  ['"I already have coverage."', 'May have a waiting period or too little coverage', '"Good. Do you know how much it is and whether it pays in full from day one? A lot of people find out their family only gets their premiums back in the first two years." Follow the replacement rules.'],
  ['"I\'m not giving my bank info over the phone."', 'Fear of scams', '"I completely understand, and you should be careful. The payment goes directly to {{carrier}}, not to me, and nothing is drafted until you\'re approved. You can call {{carrier}} at the number on their website to verify I\'m appointed with them. Would that help?"'],
  ['"I\'m on a fixed income."', 'Real budget limit', '"Most of my clients are too, and that\'s exactly why they do this. They don\'t want their family coming out of pocket on a fixed income either. Let\'s find the amount that fits."'],
  ['"Call me back later."', 'Bad timing or brush-off', '"No problem. Is tonight at {{timeA}} or tomorrow at {{timeB}} better?" Book a specific time. Never leave it open.'],
  ['"How did you get my number?"', 'Doesn\'t remember the request (aged)', '"You filled out a request about burial coverage a while back, and it had your name and {{cityOrMonth}} on it. If it\'s not something you want help with anymore, I\'ll take you off my list right now."'],
  ['"Is this a scam?"', 'Has been burned before', '"I\'m glad you asked. My name is {{agent}}, and I\'m licensed in {{state}}. You can look me up on the {{state}} Department of Insurance website right now. I\'ll wait."', 'Have ready: {{state}} license {{licNum}} · NPN {{npn}}']
];

export const TPL: Record<string, [string, string][]> = {
  A: [
    ['Voicemail', 'Hi {{first}}, this is {{agent}}, licensed agent with {{agency}}, getting back to you on the final expense request you just sent in. I have your information pulled up. Call me back at {{agentPhone}}. Again, that\'s {{agentPhone}}. Talk soon.'],
    ['Text · right after first missed call', 'Hi {{first}}, this is {{agent}}, licensed agent with {{agency}}. I just tried calling about the final expense request you sent. Is now a good time, or is later today better? Reply STOP to opt out.'],
    ['Text · day 1 evening', '{{first}}, I have your quote options ready. Takes about 15 minutes. What time works tomorrow?'],
    ['Text · day 3', 'Still want to see your options for burial coverage? I can call whenever works for you.'],
    ['Text · day 7', 'I\'ll close out your request for now. If you\'d still like to see your prices, just reply YES and I\'ll call you.']
  ],
  B: [
    ['Voicemail', 'Hi {{first}}, {{agent}} with {{agency}}. I\'m following up on the burial coverage request you sent in a while back. I just have one quick question for you. Give me a call at {{agentPhone}}. That\'s {{agentPhone}}.'],
    ['Text · day 1', 'Hi {{first}}, this is {{agent}} with {{agency}}. A while back you asked about burial insurance. Did you ever get something in place? Reply STOP to opt out.'],
    ['Text · day 3', 'Just checking back, {{first}}. A lot of folks I talk to got placed in a plan with a 2-year wait when they qualified for day-one coverage. Happy to take a look at yours, no obligation.'],
    ['Text · day 10', 'Last note from me. If you ever want help with burial coverage for you or your family, I\'m at {{agentPhone}}.']
  ]
};

export const LEAD_FIELDS: [string, string][] = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['phone', 'Phone'],
  ['email', 'Email'],
  ['address', 'Street address'],
  ['city', 'City'],
  ['state', 'State'],
  ['zip', 'ZIP'],
  ['dob', 'Date of birth'],
  ['age', 'Age'],
  ['gender', 'Gender'],
  ['loanAmount', 'Loan amount'],
  ['lender', 'Lender'],
  ['spouseName', "Spouse's name"],
  ['spouseDob', "Spouse's DOB"],
  ['spouseAge', "Spouse's age"],
  ['amountRequested', 'Amount requested'],
  ['beneficiary', 'Beneficiary'],
  ['benRel', 'Beneficiary relationship'],
  ['hasLife', 'Has life insurance'],
  ['heartStrokeCancer', 'Heart attack / stroke / cancer'],
  ['hobby', 'Favorite hobby'],
  ['leadSource', 'Lead source'],
  ['ad', 'Ad'],
  ['platform', 'Platform'],
  ['leadDate', 'Lead date'],
  ['interestedIn', 'Interested in']
];
