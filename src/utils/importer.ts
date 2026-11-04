import * as XLSX from 'xlsx';
import { Lead, LeadType } from '../types';
import { num, has, uid, fullName } from './calculations';
import { LEAD_FIELDS, STATUS_L } from '../constants/data';

export const SYN: Record<string, string[]> = {
  firstName: [
    'firstname',
    'first',
    'fname',
    'givenname',
    'clientfirstname',
    'borrowerfirstname',
    'insuredfirstname'
  ],
  lastName: [
    'lastname',
    'last',
    'lname',
    'surname',
    'clientlastname',
    'borrowerlastname'
  ],
  fullName: [
    'name',
    'fullname',
    'clientname',
    'borrowername',
    'borrower',
    'insuredname',
    'leadname',
    'contactname'
  ],
  phone: [
    'phone',
    'phonenumber',
    'cell',
    'cellphone',
    'mobile',
    'mobilephone',
    'homephone',
    'primaryphone',
    'phone1',
    'telephone',
    'bestphone'
  ],
  email: ['email', 'emailaddress', 'e-mail'],
  address: [
    'address',
    'streetaddress',
    'street',
    'address1',
    'propertyaddress',
    'mailingaddress',
    'homeaddress'
  ],
  city: ['city', 'town'],
  state: ['state', 'st', 'province'],
  zip: ['zip', 'zipcode', 'postalcode', 'postal'],
  loanAmount: [
    'loanamount',
    'mortgageamount',
    'mortgage',
    'loan',
    'mortgagebalance',
    'loanamt',
    'loanbalance',
    'balance'
  ],
  lender: ['lender', 'mortgagelender', 'bank', 'mortgagecompany'],
  dob: ['dob', 'dateofbirth', 'birthdate', 'birthday', 'borrowerdob'],
  age: ['age', 'borrowerage', 'clientage'],
  gender: ['gender', 'sex'],
  spouseName: [
    'spousename',
    'spouse',
    'spousefirstname',
    'coborrower',
    'coborrowername',
    'coborrowerfirstname',
    'cobfirstname'
  ],
  spouseDob: [
    'spousedob',
    'spousedateofbirth',
    'spousebirthdate',
    'coborrowerdob',
    'cobdob'
  ],
  spouseAge: ['spouseage', 'coborrowerage', 'cobage'],
  leadSource: ['source', 'leadsource', 'vendor', 'campaign'],
  leadDate: [
    'leaddate',
    'date',
    'received',
    'datereceived',
    'createddate',
    'created',
    'datetime',
    'timestamp',
    'submitted',
    'datesubmitted'
  ],
  notes: ['notes', 'comments', 'note'],
  tobacco: ['tobacco', 'smoker', 'nicotine'],
  monthlyPayment: ['monthlypayment', 'payment', 'mortgagepayment'],
  amountRequested: [
    'amtrequested',
    'amountrequested',
    'coveragerequested',
    'faceamount',
    'amount',
    'coverageamount',
    'requestedamount'
  ],
  beneficiary: ['beneficiaryname', 'benname'],
  benRel: [
    'beneficiary',
    'beneficiaryrelationship',
    'relationship',
    'benrelationship'
  ],
  hasLife: [
    'havelifeinsurance',
    'haslifeinsurance',
    'currentlifeinsurance',
    'existingcoverage',
    'currentcoverage'
  ],
  hobby: ['favoritehobby', 'hobby', 'hobbies'],
  platform: ['platform'],
  ad: ['ad', 'adname', 'creative'],
  interestedIn: ['interestedin', 'product', 'interest', 'producttype'],
  trustedForm: [
    'trustedformurl',
    'trustedform',
    'certurl',
    'trustedformcert'
  ]
};

export const MAP_OPTS: [string, string][] = [
  ['', 'Keep as extra'],
  ['fullName', 'Full name (split)'],
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
  ['monthlyPayment', 'Monthly payment'],
  ['amountRequested', 'Amount requested'],
  ['beneficiary', 'Beneficiary name'],
  ['benRel', 'Beneficiary relationship'],
  ['hasLife', 'Has life insurance'],
  ['heartStrokeCancer', 'Heart attack / stroke / cancer'],
  ['hobby', 'Favorite hobby'],
  ['tobacco', 'Tobacco'],
  ['platform', 'Platform'],
  ['ad', 'Ad'],
  ['interestedIn', 'Interested in'],
  ['trustedForm', 'TrustedForm URL'],
  ['leadSource', 'Lead source'],
  ['leadDate', 'Lead date'],
  ['notes', 'Notes'],
  ['__skip', 'Ignore column']
];

export const normH = (h: string): string =>
  String(h).toLowerCase().replace(/[^a-z0-9]/g, '');

export function guessColumn(h: string): string {
  const n = normH(h);
  for (const [k, arr] of Object.entries(SYN)) {
    if (arr.includes(n)) return k;
  }
  if (/heart|stroke|cancer/.test(n)) return 'heartStrokeCancer';
  if (n.includes('lifeinsurance')) return 'hasLife';
  if (n.includes('spouse') || n.includes('coborrower')) {
    if (n.includes('dob') || n.includes('birth')) return 'spouseDob';
    if (n.includes('age')) return 'spouseAge';
    return 'spouseName';
  }
  if (n.includes('beneficiary')) return n.includes('name') ? 'beneficiary' : 'benRel';
  if (n.includes('phone') || n.includes('cell')) return 'phone';
  if (n.includes('email')) return 'email';
  if (n.includes('loan') || n.includes('mortgage')) return 'loanAmount';
  return '';
}

export function parseDelim(text: string): string[][] {
  const first = text.split(/\r?\n/)[0] || '';
  const d =
    (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length
      ? '\t'
      : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let f = '';
  let q = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"') {
      q = true;
    } else if (c === d) {
      row.push(f);
      f = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else {
      f += c;
    }
  }
  if (f !== '' || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter(r => r.some(cell => String(cell).trim() !== ''));
}

export async function parseFile(file: File): Promise<string[][]> {
  if (/\.xlsx?$/i.test(file.name)) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
      header: 1,
      raw: false,
      defval: ''
    });
    return rows.filter(r => r.some(c => String(c).trim() !== ''));
  } else {
    const text = await file.text();
    return parseDelim(text);
  }
}

export const digits = (s?: string): string => String(s || '').replace(/\D/g, '');

const yesNo = (v: string): string =>
  /^(y|yes|true|1)$/i.test(String(v).trim())
    ? 'Yes'
    : /^(n|no|false|0)$/i.test(String(v).trim())
    ? 'No'
    : v;

export function rowToLead(
  head: string[],
  map: string[],
  r: string[],
  typeSel: 'auto' | 'mp' | 'fe'
): Lead {
  const L: Lead = {
    id: uid(),
    type: 'mp',
    status: 'new',
    step: 1,
    dials: 0,
    v: {},
    orig: {},
    extra: {},
    log: [],
    stageAt: { new: Date.now() },
    created: Date.now()
  };

  map.forEach((k, i) => {
    const v = String(r[i] ?? '').trim();
    if (!v || (/^n\/?a$/i.test(v) && k === 'age')) return;
    if (k === '__skip') return;
    if (k === 'fullName') {
      const p = v.split(/\s+/);
      if (!L.firstName) L.firstName = p.shift();
      if (!L.lastName) L.lastName = p.join(' ');
      return;
    }
    if (k === 'spouseName' && /\s/.test(v) && !L.spouseName) {
      L.spouseName = v.split(/\s+/)[0];
      return;
    }
    if (k) {
      if (k === 'loanAmount' || k === 'monthlyPayment') {
        const val = String(num(v) || v);
        (L as unknown as Record<string, string>)[k] = val;
      } else {
        (L as unknown as Record<string, string>)[k] = v;
      }
    } else {
      L.extra[head[i] || 'Column ' + (i + 1)] = v;
    }
  });

  if (L.tobacco) {
    L.tobacco = /^(y|yes|true|1|smoker)/i.test(L.tobacco) ? 'yes' : 'no';
  }
  if (L.hasLife) L.hasLife = yesNo(L.hasLife);
  if (L.heartStrokeCancer) L.heartStrokeCancer = yesNo(L.heartStrokeCancer);
  if (has(L.beneficiary)) L.beneficiary = L.beneficiary!.replace(/\s+/g, ' ').trim();
  if (has(L.hobby)) L.hobby = L.hobby!.trim();

  L.type =
    typeSel !== 'auto'
      ? (typeSel as LeadType)
      : /final expense|burial|funeral/i.test(L.interestedIn || '') ||
        (has(L.amountRequested) && !has(L.loanAmount))
      ? 'fe'
      : 'mp';

  return L;
}

export function exportLeadsToCsv(leads: Lead[]): string {
  const q = (v: unknown) => {
    const str = String(v ?? '');
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  };

  const EXP: [string, string][] = [
    ['type', 'Lead type'],
    ...LEAD_FIELDS,
    ['status', 'Stage'],
    ['dials', 'Dials'],
    ['followAt', 'Next follow-up'],
    ['followWhat', 'Follow-up for'],
    ['apptDay', 'Appt date'],
    ['apptTime', 'Appt time'],
    ['benFull', 'Beneficiary full name'],
    ['married', 'Married'],
    ['health', 'Health'],
    ['tobacco', 'Tobacco'],
    ['meds', 'Medications'],
    ['hospital', 'Hospital stays'],
    ['history', 'Health history'],
    ['hwA', 'Height/weight'],
    ['occupation', 'Occupation'],
    ['loanTerm', 'Loan term'],
    ['monthlyPayment', 'Monthly payment'],
    ['mainConcern', 'Main concern'],
    ['why', 'Why (FE)'],
    ['budget', 'Budget (FE)'],
    ['payday', 'Payday'],
    ['program', 'Program'],
    ['carrier', 'Carrier'],
    ['planType', 'Plan type'],
    ['polCov', 'Coverage'],
    ['polPrem', 'Premium'],
    ['appDate', 'App date'],
    ['draftDate', 'Draft day'],
    ['policyNo', 'Policy number'],
    ['effDate', 'In force date']
  ];

  const headers = EXP.map(x => x[1]).concat([
    'Verified fields',
    'Corrected (lead had)',
    'Activity'
  ]);
  const lines = [headers.map(q).join(',')];

  leads.forEach(L => {
    const row = EXP.map(([k]) => {
      if (k === 'status') return STATUS_L[L.status] || L.status;
      return (L as unknown as Record<string, unknown>)[k] ?? '';
    }).concat([
      Object.keys(L.v)
        .filter(k => L.v[k] === 'ok')
        .join('; '),
      Object.entries(L.orig)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; '),
      (L.log || [])
        .map(e => `${new Date(e.t).toLocaleString()} ${e.k}: ${e.x}`)
        .join(' | ')
    ]);
    lines.push(row.map(q).join(','));
  });

  return lines.join('\n');
}
