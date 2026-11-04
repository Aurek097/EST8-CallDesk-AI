import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Lead,
  AgentProfile,
  WeeklyStats,
  Settings,
  AuthUser,
  Stage,
  DialOutcome,
  CRMUser,
  UserPhoneNumber,
  A2PRegistration,
  TelephonyConfig,
  ActiveCall,
  CallingMode,
  SMSMessage,
  CallDispositionPayload
} from '../types';
import { DEF_SET, blankProfile, STATUS_L } from '../constants/data';
import { weekKey } from '../utils/calculations';
import { authHeaders as apiHeaders, getIdToken, signInWithGoogle, signOut, watchAuth, firebaseConfigError } from '../lib/firebase';
import { connectToLead, destroyDevice, getDevice, onIncomingCall, type Call } from '../lib/voice';

/** Monday 00:00 local time, for the weekly goals. */
function weekStart(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}
const DIAL_KINDS = new Set(['call', 'na', 'vm', 'talk']);

export interface IncomingCallInfo {
  from: string;
  leadId: string | null;
  leadName: string;
}

interface AppContextType {
  user: AuthUser | null;
  isVerified: boolean;
  verificationError: string | null;
  isLoadingAuth: boolean;
  leads: Lead[];
  activeLead: Lead | null;
  activeId: string | null;
  view: 'dialer' | 'pipeline' | 'profile' | 'team';
  profile: AgentProfile;
  stats: WeeklyStats;
  settings: Settings;
  theme: 'light' | 'dark';
  mobilePane: 'leads' | 'script' | 'card';

  // Modals
  isImportOpen: boolean;
  isSettingsOpen: boolean;
  isLoginOpen: boolean;
  isNumberMarketplaceOpen: boolean;
  isA2POpen: boolean;

  // Multi-user & Downlines
  viewingUserId: string | null;
  viewingUserName: string | null;
  teamUsers: CRMUser[];

  // Telephony & Softphone State
  phoneNumbers: UserPhoneNumber[];
  telephonyConfig: TelephonyConfig;
  activeCall: ActiveCall | null;
  callError: string | null;
  incomingCall: IncomingCallInfo | null;
  a2pRegistration: A2PRegistration | null;

  // Actions
  loginWithGoogle: (customUser?: Partial<AuthUser>) => void;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
  switchUserView: (userId: string | null) => void;
  inviteDownline: (data: { email: string; name: string; phone?: string; npn?: string; role?: 'admin' | 'agent'; initialStates?: any[] }) => Promise<void>;
  toggleUserVerification: (userId: string, isVerified: boolean) => Promise<void>;
  deleteDownline: (userId: string) => Promise<void>;
  setActiveLead: (id: string | null) => void;
  setView: (view: 'dialer' | 'pipeline' | 'profile' | 'team') => void;
  setMobilePane: (pane: 'leads' | 'script' | 'card') => void;
  toggleTheme: () => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addLead: (leadData?: Partial<Lead>) => Lead;
  deleteLead: (id: string) => void;
  setLeadStage: (id: string, stage: Stage) => void;
  logLeadDial: (id: string, outcome: DialOutcome) => void;
  addLeadNote: (id: string, kind: 'note' | 'call' | 'vm' | 'text', text: string) => void;
  toggleVerification: (id: string, field: string) => void;
  fixVerification: (id: string, field: string, newValue: string) => void;
  updateProfile: (updates: Partial<AgentProfile>) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  clearSampleLeads: () => void;
  importLeads: (newLeads: Lead[]) => void;
  setIsImportOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsLoginOpen: (open: boolean) => void;
  setIsNumberMarketplaceOpen: (open: boolean) => void;
  setIsA2POpen: (open: boolean) => void;
  isCommDrawerOpen: boolean;
  commDrawerTab: 'sms' | 'dialer';
  openCommDrawer: (lead?: Lead, tab?: 'sms' | 'dialer') => void;
  closeCommDrawer: () => void;
  setCommDrawerTab: (tab: 'sms' | 'dialer') => void;
  leadMessages: SMSMessage[];
  trialNotice: string | null;
  dismissTrialNotice: () => void;

  // Telephony Actions
  fetchTelephonyData: () => Promise<void>;
  buyPhoneNumber: (phoneNumber: string, friendlyName: string) => Promise<void>;
  setPrimaryNumber: (id: string) => Promise<void>;
  releasePhoneNumber: (id: string) => Promise<void>;
  updateTelephonyConfig: (updates: Partial<TelephonyConfig>) => Promise<void>;
  startCall: (lead: Lead) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  sendDigits: (digits: string) => void;
  answerIncoming: () => void;
  declineIncoming: () => void;
  dismissCallError: () => void;
  sendSms: (leadId: string, to: string, text: string) => Promise<void>;
  sendLeadSms: (leadId: string, to: string, text: string) => Promise<{ success: boolean; isTrialNotice?: boolean; trialNoticeMessage?: string }>;
  fetchLeadMessages: (leadId: string) => Promise<SMSMessage[]>;
  logCallDisposition: (payload: CallDispositionPayload) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<AuthUser | null>(null);

  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Multi-user & Downline view state
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [teamUsers, setTeamUsers] = useState<CRMUser[]>([]);

  // Telephony state
  const [phoneNumbers, setPhoneNumbers] = useState<UserPhoneNumber[]>([]);
  const [telephonyConfig, setTelephonyConfig] = useState<TelephonyConfig>({
    callingMode: 'webrtc',
    bridgePhone: '',
    primaryCallerId: '',
    autoLogCall: true,
    recordCalls: false
  });
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const liveCallRef = React.useRef<Call | null>(null);
  const incomingRef = React.useRef<Call | null>(null);
  const [a2pRegistration, setA2pRegistration] = useState<A2PRegistration | null>(null);

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // App settings & profile
  const [settings, setSettings] = useState<Settings>(DEF_SET);
  const [profile, setProfile] = useState<AgentProfile>(blankProfile());

  // Leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);

  // Weekly goals, counted from real activity (resets every Monday).
  const stats = React.useMemo<WeeklyStats>(() => {
    const since = weekStart();
    let dials = 0, appts = 0, apps = 0;
    for (const l of leads) {
      for (const e of l.log || []) if (e.t >= since && DIAL_KINDS.has(e.k)) dials++;
      if ((l.stageAt?.appt || 0) >= since) appts++;
      if ((l.stageAt?.app || 0) >= since) apps++;
    }
    return { week: weekKey(), dials, appts, apps };
  }, [leads]);
  const [view, setViewState] = useState<'dialer' | 'pipeline' | 'profile' | 'team'>('dialer');
  const [mobilePane, setMobilePane] = useState<'leads' | 'script' | 'card'>('script');

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isNumberMarketplaceOpen, setIsNumberMarketplaceOpen] = useState(false);
  const [isA2POpen, setIsA2POpen] = useState(false);
  const [isCommDrawerOpen, setIsCommDrawerOpen] = useState(false);
  const [commDrawerTab, setCommDrawerTab] = useState<'sms' | 'dialer'>('sms');
  const [leadMessages, setLeadMessages] = useState<SMSMessage[]>([]);
  const [trialNotice, setTrialNotice] = useState<string | null>(null);

  // Helper for authenticated API calls
  const authHeaders = useCallback(() => apiHeaders(), [user]);

  // Telephony data fetcher (numbers, config, A2P status)
  const fetchTelephonyData = useCallback(async () => {
    if (!user || !isVerified) return;
    try {
      const [numRes, cfgRes, a2pRes] = await Promise.all([
        fetch('/api/telephony/numbers/my', { headers: authHeaders() }),
        fetch('/api/telephony/config', { headers: authHeaders() }),
        fetch('/api/telephony/a2p', { headers: authHeaders() })
      ]);

      if (numRes.ok) {
        const numData = await numRes.json();
        if (Array.isArray(numData.numbers)) setPhoneNumbers(numData.numbers);
      }
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (cfgData.config) setTelephonyConfig(cfgData.config);
      }
      if (a2pRes.ok) {
        const a2pData = await a2pRes.json();
        if (a2pData.registration) setA2pRegistration(a2pData.registration);
      }
    } catch (err) {
      console.warn('Failed to load telephony data:', err);
    }
  }, [user, isVerified, authHeaders]);

  // Ask the server who this Google account is (invite-only).
  const checkAuthStatus = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const token = await getIdToken();
      if (!token) {
        setUser(null);
        setIsVerified(false);
        setVerificationError(firebaseConfigError() || null);
        return;
      }
      const res = await fetch('/api/auth/me', { headers: apiHeaders(false) });
      const data = await res.json();
      if (data.authenticated && data.isVerified && data.user) {
        setIsVerified(true);
        setVerificationError(null);
        setUser({ ...data.user, isVerified: true });
        setProfile({ ...blankProfile(), ...(data.user.profile || {}) });
        if (data.user.settings) setSettings(prev => ({ ...prev, ...data.user.settings }));
      } else {
        setIsVerified(false);
        setVerificationError(data.message || 'This account doesn’t have access to EST8 CallDesk.');
      }
    } catch (e) {
      setIsVerified(false);
      setVerificationError('Couldn’t reach the CallDesk server. Check your connection and try again.');
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  // Load team users if Admin
  const fetchTeamUsers = useCallback(async () => {
    if (!user || user.role !== 'admin' || !isVerified) return;
    try {
      const res = await fetch('/api/admin/users', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setTeamUsers(data.users);
        }
      }
    } catch (e) {
      console.error('Failed to load downlines:', e);
    }
  }, [user, isVerified, authHeaders]);

  // Load leads from backend for active target user
  const fetchLeads = useCallback(async () => {
    if (!user || !isVerified) return;
    try {
      const url = viewingUserId ? `/api/leads?as_user_id=${viewingUserId}` : '/api/leads';
      const res = await fetch(url, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.leads)) {
          setLeads(data.leads);
          if (data.leads.length > 0 && (!activeId || !data.leads.some((l: Lead) => l.id === activeId))) {
            setActiveIdState(data.leads[0].id);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch leads from backend:', e);
    }
  }, [user, isVerified, viewingUserId, activeId, authHeaders]);

  // Follow the Google sign-in state.
  useEffect(() => {
    let unsub: () => void = () => {};
    watchAuth(u => {
      if (!u) {
        setUser(null);
        setIsVerified(false);
        setLeads([]);
        setVerificationError(firebaseConfigError() || null);
        setIsLoadingAuth(false);
        return;
      }
      setUser(prev => prev && prev.email === (u.email || '').toLowerCase() ? prev : {
        id: '', email: (u.email || '').toLowerCase(), name: u.displayName || '', picture: u.photoURL || '', role: 'agent', isVerified: false
      });
      checkAuthStatus();
    }).then(fn => { unsub = fn; });
    return () => unsub();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (isVerified && user?.id) {
      fetchLeads();
      fetchTelephonyData();
      if (user.role === 'admin') {
        fetchTeamUsers();
      }
    }
  }, [isVerified, user?.id, user?.role, viewingUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Active call duration timer ticker
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;
    const interval = setInterval(() => {
      setActiveCall(prev => (prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.callId, activeCall?.status]);

  // Theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const loginWithGoogle = useCallback(async (_customUser?: Partial<AuthUser>) => {
    setVerificationError(null);
    try {
      await signInWithGoogle();
      setIsLoginOpen(false);
    } catch (e) {
      const code = (e as { code?: string }).code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setVerificationError(
        code === 'auth/popup-blocked' ? 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.'
        : code === 'auth/unauthorized-domain' ? 'This web address isn’t on the Firebase sign-in list yet. Add it under Firebase → Authentication → Settings → Authorized domains.'
        : (e as Error).message || 'Google sign-in failed. Try again.'
      );
    }
  }, []);

  const logout = useCallback(() => {
    liveCallRef.current?.disconnect();
    destroyDevice();
    setActiveCall(null);
    setViewingUserId(null);
    setLeads([]);
    setProfile(blankProfile());
    signOut().catch(() => {});
  }, []);

  const switchUserView = useCallback((userId: string | null) => {
    setViewingUserId(userId);
  }, []);

  const inviteDownline = useCallback(
    async (data: { email: string; name: string; phone?: string; npn?: string; role?: 'admin' | 'agent'; initialStates?: any[] }) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to register downline');
      }
      await fetchTeamUsers();
    },
    [authHeaders, fetchTeamUsers]
  );

  const toggleUserVerification = useCallback(
    async (userId: string, targetVerified: boolean) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isVerified: targetVerified })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user status');
      }
      await fetchTeamUsers();
    },
    [authHeaders, fetchTeamUsers]
  );

  const deleteDownline = useCallback(
    async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete user');
      }
      if (viewingUserId === userId) {
        setViewingUserId(null);
      }
      await fetchTeamUsers();
    },
    [authHeaders, fetchTeamUsers, viewingUserId]
  );

  // Telephony: Purchase Number
  const buyPhoneNumber = useCallback(
    async (phoneNumber: string, friendlyName: string) => {
      const res = await fetch('/api/telephony/numbers/buy', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ phoneNumber, friendlyName })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to purchase number');
      }
      await fetchTelephonyData();
    },
    [authHeaders, fetchTelephonyData]
  );

  // Telephony: Set Primary Number
  const setPrimaryNumber = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/telephony/numbers/${id}/primary`, {
        method: 'PATCH',
        headers: authHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to set primary number');
      }
      await fetchTelephonyData();
    },
    [authHeaders, fetchTelephonyData]
  );

  // Telephony: Release Number
  const releasePhoneNumber = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/telephony/numbers/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to release number');
      }
      await fetchTelephonyData();
    },
    [authHeaders, fetchTelephonyData]
  );

  // Telephony: Update Config
  const updateTelephonyConfig = useCallback(
    async (updates: Partial<TelephonyConfig>) => {
      const nextConfig = { ...telephonyConfig, ...updates };
      setTelephonyConfig(nextConfig);
      await fetch('/api/telephony/config', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(nextConfig)
      });
    },
    [telephonyConfig, authHeaders]
  );

  // Telephony: Start Outbound Call (browser) or Cell Bridge (Twilio rings your cell first)
  const startCall = useCallback(
    async (lead: Lead) => {
      if (activeCall || liveCallRef.current) return;
      if (!lead.phone) {
        setCallError('This lead doesn’t have a phone number.');
        return;
      }
      setCallError(null);
      const mode = telephonyConfig.callingMode;
      const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Client';
      const callerId = phoneNumbers.find(p => p.isPrimary)?.phoneNumber || telephonyConfig.primaryCallerId || '';
      const base: ActiveCall = {
        callId: `pending_${Date.now()}`, leadId: lead.id, leadName, leadPhone: lead.phone, callerId, mode,
        status: 'initiating', startTime: Date.now(), durationSeconds: 0, isMuted: false, isOnHold: false
      };
      setActiveCall(base);

      if (mode === 'bridge') {
        try {
          const res = await fetch('/api/telephony/call', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ leadId: lead.id }) });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Couldn’t start the call.');
          setCallError(data.message || null);
          setActiveCall(null);
          setTimeout(() => fetchLeads(), 4000);
        } catch (err) {
          setCallError((err as Error).message);
          setActiveCall(null);
        }
        return;
      }

      try {
        const call = await connectToLead(lead.id, lead.phone);
        liveCallRef.current = call;
        call.on('ringing', () => setActiveCall(prev => (prev ? { ...prev, status: 'ringing' } : prev)));
        // answerOnBridge: "accept" fires when the lead actually picks up.
        call.on('accept', (c: Call) =>
          setActiveCall(prev => (prev ? { ...prev, status: 'connected', callId: c.parameters?.CallSid || prev.callId, startTime: Date.now(), durationSeconds: 0 } : prev))
        );
        const finish = () => {
          liveCallRef.current = null;
          setActiveCall(prev => (prev ? { ...prev, status: 'completed' } : prev));
          setTimeout(() => setActiveCall(null), 1200);
          setTimeout(() => fetchLeads(), 2500); // the server logs the call result
        };
        call.on('disconnect', finish);
        call.on('cancel', finish);
        call.on('reject', finish);
        call.on('error', (e: { message?: string }) => {
          setCallError(e?.message || 'The call failed.');
          finish();
        });
      } catch (err) {
        const msg = (err as Error).message || 'Couldn’t start the call.';
        setCallError(/permission|NotAllowed/i.test(msg) ? 'Microphone is blocked. Allow it in your browser, then call again.' : msg);
        setActiveCall(null);
      }
    },
    [activeCall, phoneNumbers, telephonyConfig, authHeaders, fetchLeads]
  );

  const endCall = useCallback(() => {
    const call = liveCallRef.current;
    if (call) {
      call.disconnect();
      return;
    }
    setActiveCall(null);
  }, []);

  const toggleMute = useCallback(() => {
    const call = liveCallRef.current;
    if (!call) return;
    call.mute(!call.isMuted());
    setActiveCall(prev => (prev ? { ...prev, isMuted: call.isMuted() } : null));
  }, []);

  // Hold needs a conference bridge; mute is the supported way to pause audio for now.
  const toggleHold = useCallback(() => {}, []);

  const sendDigits = useCallback((d: string) => {
    liveCallRef.current?.sendDigits(d);
  }, []);

  // Incoming calls to your numbers ring here while CallDesk is open.
  useEffect(() => {
    if (!isVerified || !user?.id || phoneNumbers.length === 0) return;
    onIncomingCall(call => {
      if (liveCallRef.current || incomingRef.current) {
        call.reject();
        return;
      }
      incomingRef.current = call;
      const from = call.parameters?.From || '';
      const d = from.replace(/\D/g, '').slice(-10);
      const match = leads.find(l => (l.phone || '').replace(/\D/g, '').slice(-10) === d);
      setIncomingCall({ from, leadId: match?.id || null, leadName: match ? `${match.firstName || ''} ${match.lastName || ''}`.trim() : '' });
      const clear = () => {
        if (incomingRef.current === call) incomingRef.current = null;
        setIncomingCall(null);
      };
      call.on('cancel', clear);
      call.on('disconnect', clear);
      call.on('reject', clear);
    });
    getDevice(true).catch(err => console.warn('[Voice] incoming calls unavailable:', (err as Error).message));
    return () => onIncomingCall(null);
  }, [isVerified, user?.id, phoneNumbers.length, leads]);

  const answerIncoming = useCallback(() => {
    const call = incomingRef.current;
    if (!call) return;
    incomingRef.current = null;
    const info = incomingCall;
    setIncomingCall(null);
    liveCallRef.current = call;
    call.accept();
    if (info?.leadId) setActiveIdState(info.leadId);
    setActiveCall({
      callId: call.parameters?.CallSid || `in_${Date.now()}`, leadId: info?.leadId || '', leadName: info?.leadName || 'Incoming caller',
      leadPhone: info?.from || '', callerId: 'Incoming', mode: 'webrtc', status: 'connected', startTime: Date.now(),
      durationSeconds: 0, isMuted: false, isOnHold: false
    });
    const finish = () => {
      liveCallRef.current = null;
      setActiveCall(null);
      setTimeout(() => fetchLeads(), 2000);
    };
    call.on('disconnect', finish);
    call.on('error', finish);
  }, [incomingCall, fetchLeads]);

  const declineIncoming = useCallback(() => {
    incomingRef.current?.reject();
    incomingRef.current = null;
    setIncomingCall(null);
  }, []);

  const dismissCallError = useCallback(() => setCallError(null), []);

  // Telephony: Fetch lead messages
  const fetchLeadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return [];
    try {
      const asUser = viewingUserId ? `&as_user_id=${encodeURIComponent(viewingUserId)}` : '';
      const res = await fetch(`/api/telephony/sms/messages?leadId=${encodeURIComponent(leadId)}${asUser}`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setLeadMessages(data.messages || []);
        return data.messages || [];
      }
    } catch (e) {
      console.error('Failed to load lead SMS messages:', e);
    }
    return [];
  }, [authHeaders, viewingUserId]);

  // Telephony: Send 10DLC SMS with Twilio Trial handling
  const sendLeadSms = useCallback(
    async (leadId: string, to: string, text: string) => {
      const res = await fetch('/api/telephony/sms', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ leadId, body: text })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send SMS');
      }
      if (data.isTrialNotice && data.trialNoticeMessage) {
        setTrialNotice(data.trialNoticeMessage);
      }
      await fetchLeadMessages(leadId);
      await fetchLeads();
      return data;
    },
    [authHeaders, fetchLeads, fetchLeadMessages]
  );

  const sendSms = useCallback(
    async (leadId: string, to: string, text: string) => {
      await sendLeadSms(leadId, to, text);
    },
    [sendLeadSms]
  );

  // Telephony: Call Disposition Logging
  const logCallDisposition = useCallback(
    async (payload: CallDispositionPayload) => {
      const res = await fetch('/api/telephony/call/disposition', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchLeads();
      }
    },
    [authHeaders, fetchLeads]
  );

  const dismissTrialNotice = useCallback(() => {
    setTrialNotice(null);
  }, []);

  const setActiveLead = useCallback((id: string | null) => {
    setActiveIdState(id);
    if (window.innerWidth <= 1080) {
      setMobilePane('script');
    }
  }, []);

  const openCommDrawer = useCallback(
    (lead?: Lead, tab: 'sms' | 'dialer' = 'sms') => {
      if (lead) {
        setActiveLead(lead.id);
        fetchLeadMessages(lead.id);
      } else if (activeId) {
        fetchLeadMessages(activeId);
      }
      setCommDrawerTab(tab);
      setIsCommDrawerOpen(true);
    },
    [setActiveLead, activeId, fetchLeadMessages]
  );

  const closeCommDrawer = useCallback(() => {
    setIsCommDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (activeId) {
      fetchLeadMessages(activeId);
    }
  }, [activeId, fetchLeadMessages]);

  const setView = useCallback((v: 'dialer' | 'pipeline' | 'profile' | 'team') => {
    setViewState(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const updateLead = useCallback(
    (id: string, updates: Partial<Lead>) => {
      setLeads(prev => {
        const updated = prev.map(l => (l.id === id ? { ...l, ...updates } : l));
        const leadObj = updated.find(l => l.id === id);
        if (leadObj) {
          fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ lead: leadObj, as_user_id: viewingUserId })
          }).catch(err => console.error('Failed to sync lead update:', err));
        }
        return updated;
      });
    },
    [authHeaders, viewingUserId]
  );

  const addLead = useCallback(
    (leadData?: Partial<Lead>): Lead => {
      const newL: Lead = {
        id: 'lead_' + Math.random().toString(36).slice(2, 9),
        type: 'mp',
        status: 'new',
        step: 1,
        dials: 0,
        v: {},
        orig: {},
        extra: {},
        log: [{ t: Date.now(), k: 'stage', x: 'Created new lead' }],
        stageAt: { new: Date.now() },
        created: Date.now(),
        ...leadData
      };

      setLeads(prev => [newL, ...prev]);
      setActiveIdState(newL.id);
      setView('dialer');
      if (window.innerWidth <= 1080) {
        setMobilePane('card');
      }

      fetch('/api/leads', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ lead: newL, as_user_id: viewingUserId })
      }).catch(err => console.error('Failed to save new lead:', err));

      return newL;
    },
    [setView, authHeaders, viewingUserId]
  );

  const deleteLead = useCallback(
    (id: string) => {
      setLeads(prev => {
        const next = prev.filter(l => l.id !== id);
        if (activeId === id) {
          setActiveIdState(next[0]?.id || null);
        }
        return next;
      });

      fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ as_user_id: viewingUserId })
      }).catch(err => console.error('Failed to delete lead on backend:', err));
    },
    [activeId, authHeaders, viewingUserId]
  );

  const setLeadStage = useCallback(
    (id: string, nextStage: Stage) => {
      setLeads(prev => {
        const next = prev.map(l => {
          if (l.id !== id || l.status === nextStage) return l;
          const prevStageName = STATUS_L[l.status] || l.status;
          const nextStageName = STATUS_L[nextStage] || nextStage;
          const newLog = [
            { t: Date.now(), k: 'stage' as const, x: `${prevStageName} → ${nextStageName}` },
            ...l.log
          ];
          const updated = {
            ...l,
            status: nextStage,
            stageAt: { ...l.stageAt, [nextStage]: Date.now() },
            log: newLog
          };

          fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ lead: updated, as_user_id: viewingUserId })
          }).catch(err => console.error('Stage sync failed:', err));

          return updated;
        });
        return next;
      });

    },
    [authHeaders, viewingUserId]
  );

  const logLeadDial = useCallback(
    (id: string, outcome: DialOutcome) => {
      const textMap: Record<DialOutcome, string> = {
        na: 'Called, no answer',
        vm: 'Left a voicemail',
        text: 'Sent a text',
        talk: 'Talked with them'
      };

      setLeads(prev => {
        const next = prev.map(l => {
          if (l.id !== id) return l;
          const isDial = outcome !== 'text';
          const newDials = isDial ? (l.dials || 0) + 1 : l.dials;
          const newStatus = outcome === 'talk' && l.status === 'new' ? 'contacted' : l.status;
          const updated = {
            ...l,
            dials: newDials,
            lastDial: Date.now(),
            status: newStatus,
            log: [{ t: Date.now(), k: outcome, x: textMap[outcome] }, ...l.log]
          };

          fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ lead: updated, as_user_id: viewingUserId })
          }).catch(err => console.error('Dial sync failed:', err));

          return updated;
        });
        return next;
      });

    },
    [authHeaders, viewingUserId]
  );

  const addLeadNote = useCallback(
    (id: string, kind: 'note' | 'call' | 'vm' | 'text', text: string) => {
      if (!text.trim()) return;
      setLeads(prev => {
        const next = prev.map(l => {
          if (l.id !== id) return l;
          const updated = {
            ...l,
            log: [{ t: Date.now(), k: kind, x: text.trim() }, ...l.log]
          };
          fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ lead: updated, as_user_id: viewingUserId })
          }).catch(err => console.error('Note sync failed:', err));
          return updated;
        });
        return next;
      });
    },
    [authHeaders, viewingUserId]
  );

  const toggleVerification = useCallback(
    (id: string, field: string) => {
      setLeads(prev => {
        const next = prev.map(l => {
          if (l.id !== id) return l;
          const nextV = { ...l.v };
          if (nextV[field]) {
            delete nextV[field];
          } else {
            nextV[field] = 'ok';
          }
          const updated = { ...l, v: nextV };
          fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ lead: updated, as_user_id: viewingUserId })
          }).catch(err => console.error('Verify sync failed:', err));
          return updated;
        });
        return next;
      });
    },
    [authHeaders, viewingUserId]
  );

  const fixVerification = useCallback(
    (id: string, field: string, newValue: string) => {
      setLeads(prev => {
        const next = prev.map(l => {
          if (l.id !== id) return l;
          const currentVal = String((l as unknown as Record<string, unknown>)[field] ?? '');
          const nextOrig = { ...l.orig };
          if (!(field in nextOrig)) {
            nextOrig[field] = currentVal || '(blank)';
          }
          const updated = {
            ...l,
            [field]: newValue,
            v: { ...l.v, [field]: 'fixed' as const },
            orig: nextOrig
          };
          fetch(`/api/leads/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ lead: updated, as_user_id: viewingUserId })
          }).catch(err => console.error('Fix sync failed:', err));
          return updated;
        });
        return next;
      });
    },
    [authHeaders, viewingUserId]
  );

  const updateProfile = useCallback(
    (updates: Partial<AgentProfile>) => {
      setProfile(prev => {
        const updated = { ...prev, ...updates };
        fetch('/api/profile', {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ profile: updated })
        }).catch(err => console.error('Profile sync failed:', err));
        return updated;
      });
    },
    [authHeaders]
  );

  const updateSettings = useCallback(
    (updates: Partial<Settings>) => {
      setSettings(prev => {
        const updated = { ...prev, ...updates };
        fetch('/api/settings', {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ settings: updated })
        }).catch(err => console.error('Settings sync failed:', err));
        return updated;
      });
    },
    [authHeaders]
  );

  const clearSampleLeads = useCallback(() => {
    setLeads(prev => {
      const filtered = prev.filter(l => !l.sample);
      if (activeId && !filtered.some(l => l.id === activeId)) {
        setActiveIdState(filtered[0]?.id || null);
      }
      return filtered;
    });
  }, [activeId]);

  const importLeads = useCallback(
    (newLeads: Lead[]) => {
      setLeads(prev => [...newLeads, ...prev]);
      if (newLeads[0]) {
        setActiveIdState(newLeads[0].id);
      }
      setView('dialer');

      fetch('/api/leads/bulk', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ leads: newLeads, as_user_id: viewingUserId })
      }).catch(err => console.error('Bulk import sync failed:', err));
    },
    [setView, authHeaders, viewingUserId]
  );

  const activeLead = leads.find(l => l.id === activeId) || leads[0] || null;
  const viewingUserObj = teamUsers.find(u => u.id === viewingUserId);
  const viewingUserName = viewingUserObj ? viewingUserObj.name : null;

  return (
    <AppContext.Provider
      value={{
        user,
        isVerified,
        verificationError,
        isLoadingAuth,
        leads,
        activeLead,
        activeId: activeLead ? activeLead.id : null,
        view,
        profile,
        stats,
        settings,
        theme,
        mobilePane,
        isImportOpen,
        isSettingsOpen,
        isLoginOpen,
        isNumberMarketplaceOpen,
        isA2POpen,
        viewingUserId,
        viewingUserName,
        teamUsers,
        phoneNumbers,
        telephonyConfig,
        activeCall,
        callError,
        incomingCall,
        a2pRegistration,
        loginWithGoogle,
        logout,
        checkAuthStatus,
        switchUserView,
        inviteDownline,
        toggleUserVerification,
        deleteDownline,
        setActiveLead,
        setView,
        setMobilePane,
        toggleTheme,
        updateLead,
        addLead,
        deleteLead,
        setLeadStage,
        logLeadDial,
        addLeadNote,
        toggleVerification,
        fixVerification,
        updateProfile,
        updateSettings,
        clearSampleLeads,
        importLeads,
        setIsImportOpen,
        setIsSettingsOpen,
        setIsLoginOpen,
        setIsNumberMarketplaceOpen,
        setIsA2POpen,
        isCommDrawerOpen,
        commDrawerTab,
        openCommDrawer,
        closeCommDrawer,
        setCommDrawerTab,
        leadMessages,
        trialNotice,
        dismissTrialNotice,
        fetchTelephonyData,
        buyPhoneNumber,
        setPrimaryNumber,
        releasePhoneNumber,
        updateTelephonyConfig,
        startCall,
        endCall,
        toggleMute,
        toggleHold,
        sendDigits,
        answerIncoming,
        declineIncoming,
        dismissCallError,
        sendSms,
        sendLeadSms,
        fetchLeadMessages,
        logCallDisposition
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
