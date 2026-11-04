export type LeadType = 'mp' | 'fe';

export type Stage =
  | 'new'
  | 'contacted'
  | 'appt'
  | 'quoted'
  | 'app'
  | 'inforce'
  | 'callback'
  | 'notint'
  | 'dnc';

export type DialOutcome = 'na' | 'vm' | 'text' | 'talk';

export interface ActivityEntry {
  t: number;
  k: 'na' | 'vm' | 'text' | 'talk' | 'note' | 'call' | 'stage';
  x: string;
}

export interface StateLicense {
  id: string;
  st: string;
  num: string;
  home: boolean;
  exp: string;
}

export interface CarrierWritingNumber {
  id: string;
  carrier: string;
  num: string;
  status: 'Appointed' | 'Pending' | 'Inactive';
}

export interface AgentProfile {
  name: string;
  role: string;
  phone: string;
  email: string;
  booking: string;
  imo: string;
  callAgency: string;
  callPhone: string;
  quoteUrl?: string;
  qpMp: string;
  qpFe: string;
  qpContact: 'no' | 'yes';
  photo: string;
  photoX: number;
  photoY: number;
  npn: string;
  states: StateLicense[];
  writing: CarrierWritingNumber[];
  dob: string;
  dl: string;
  dlState: string;
  aml: string;
  amlDate: string;
  eo: string;
  eoPolicy: string;
  eoCert: string;
  eoExp: string;
}

export interface Lead {
  id: string;
  sample?: boolean;
  type: LeadType;
  status: Stage;
  step?: number; // 1 or 2 for mortgage
  opener?: 'A' | 'B'; // for final expense
  dials: number;
  lastDial?: number;
  v: Record<string, 'ok' | 'fixed'>; // verification status
  orig: Record<string, string>; // original unverified values
  extra: Record<string, string>;
  log: ActivityEntry[];
  stageAt: Record<string, number>;
  created: number;

  // Vendor / Core info
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  dob?: string;
  age?: string | number;
  ageOverride?: boolean;
  gender?: string;

  // Mortgage specific
  loanAmount?: string;
  lender?: string;
  loanTerm?: string;
  monthlyPayment?: string;
  homeValue?: string;
  otherBills?: string;
  debtTotal?: string;
  retirement?: string;
  spouseName?: string;
  spouseDob?: string;
  spouseAge?: string | number;
  spouseAgeOverride?: boolean;
  spouseHealth?: string;
  spouseMeds?: string;
  spouseTobacco?: 'yes' | 'no';
  spouseOccupation?: string;
  spouseSchedule?: string;
  married?: 'yes' | 'no';
  purchaseType?: 'bought' | 'refi';
  mainConcern?: string;
  goal?: string;
  coverageFor?: 'self' | 'both';
  stayNow?: 'yes' | 'no';
  apptDay?: string;
  apptTime?: string;
  incomeA?: string;
  incomeB?: string;
  otherIncome?: string;
  lossA?: string;
  lossB?: string;
  inPlaceA?: string;
  lifeA?: string;
  lifeAType?: 'employer' | 'personal' | 'none';
  inPlaceB?: string;
  lifeB?: string;
  lifeBType?: 'employer' | 'personal' | 'none';
  program?: 'full' | 'partial' | 'cp';
  monthsNeeded?: string;
  children?: string;
  schedule?: string;
  hwB?: string;

  // Shared call answers
  health?: string;
  tobacco?: 'yes' | 'no';
  meds?: string;
  hospital?: string;
  history?: string;
  hwA?: string;
  occupation?: string;
  beneficiary?: string;
  benRel?: string;
  benFull?: string;
  benDob?: string;
  chosen?: '1' | '2' | '3';
  optCov1?: string;
  optPrem1?: string;
  optCov2?: string;
  optPrem2?: string;
  optCov3?: string;
  optPrem3?: string;
  carrier?: string;
  planType?: 'level' | 'graded' | 'gi';
  waitYears?: string;
  amBest?: string;
  carrierYears?: string;
  referrals?: string;
  surveyNotes?: string;
  followUp?: string;
  notes?: string;

  // Final expense specific
  amountRequested?: string;
  hasLife?: string;
  heartStrokeCancer?: string;
  hobby?: string;
  platform?: string;
  ad?: string;
  leadDate?: string;
  leadSource?: string;
  interestedIn?: string;
  trustedForm?: string;
  dncChecked?: 'yes' | 'no';
  remembers?: 'yes' | 'no';
  agedBranch?: 'never' | 'got' | 'forgot';
  existingCarrier?: string;
  existingPays?: 'wait' | 'dayone';
  healthChanged?: 'no' | 'yes';
  family?: string;
  handler?: string;
  pastFuneral?: string;
  why?: string;
  burialPref?: 'burial' | 'cremation' | 'unsure';
  incomeSource?: 'ss' | 'pension' | 'work' | 'other';
  payday?: string;
  budget?: string;
  draftDate?: string;
  lowerAmt?: string;
  lowerPrem?: string;

  // Health questions for FE (HQ)
  hqHeart?: 'yes' | 'no';
  hqCancer?: 'yes' | 'no';
  hqCopd?: 'yes' | 'no';
  hqDiab?: 'yes' | 'no';
  hqKidney?: 'yes' | 'no';
  hqHosp?: 'yes' | 'no';
  hqMemory?: 'yes' | 'no';
  hqTerminal?: 'yes' | 'no';

  // Quoting params
  qpHealth?: 'PP' | 'P' | 'R';
  qpNic?: 'never' | 'currently' | 'recently';
  qpTerm?: '10' | '20' | '30';

  // Policy / Sold fields
  polCov?: string;
  polPrem?: string;
  appDate?: string;
  policyNo?: string;
  effDate?: string;

  // CRM fields
  followAt?: string;
  followWhat?: string;
}

export interface WeeklyStats {
  week: string;
  dials: number;
  appts: number;
  apps: number;
}

export interface Settings {
  timeA: string;
  timeB: string;
}

export type UserRole = 'admin' | 'agent';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  isVerified: boolean;
  phone?: string;
  npn?: string;
}

export interface CRMUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  phone?: string;
  npn?: string;
  createdAt: string;
  lastLoginAt?: string;
  stats?: {
    totalLeads: number;
    dialsCount: number;
    apptsCount: number;
    appsCount: number;
  };
}

export type CallingMode = 'webrtc' | 'bridge';
export type CallStatus = 'idle' | 'initiating' | 'ringing' | 'connected' | 'completed' | 'failed';

export interface UserPhoneNumber {
  id: string;
  userId: string;
  phoneNumber: string;
  friendlyName: string;
  twilioSid: string;
  capabilitiesVoice: boolean;
  capabilitiesSms: boolean;
  purchasedAt: string;
  isPrimary: boolean;
}

export interface A2PRegistration {
  id: string;
  userId: string;
  brandSid?: string;
  campaignSid?: string;
  businessName: string;
  ein: string;
  businessType: 'sole_proprietorship' | 'llc' | 'corporation';
  brandType: 'STANDARD' | 'SOLE_PROPRIETOR';
  campaignUseCase: string;
  status: 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected';
  carrierFeedback?: string;
  sampleMessage1?: string;
  sampleMessage2?: string;
  optInKeywords?: string;
  submittedAt?: string;
  updatedAt?: string;
}

export interface TelephonyConfig {
  callingMode: CallingMode;
  bridgePhone: string;
  primaryCallerId: string;
  autoLogCall: boolean;
  recordCalls: boolean;
}

export interface ActiveCall {
  callId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  callerId: string;
  mode: CallingMode;
  status: CallStatus;
  startTime: number;
  durationSeconds: number;
  isMuted: boolean;
  isOnHold: boolean;
}

export interface SMSMessage {
  id: string;
  leadId: string;
  direction: 'outbound' | 'inbound';
  fromNumber: string;
  toNumber: string;
  body: string;
  status: 'delivered' | 'received' | 'simulated' | 'failed';
  isTrialSimulated?: boolean;
  createdAt: number;
}

export interface CallDispositionPayload {
  leadId: string;
  outcome: 'na' | 'vm' | 'talk' | 'appt' | 'quoted' | 'dnc' | 'notint';
  notes?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  durationSeconds?: number;
}
