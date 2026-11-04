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
import {
  DEF_SET,
  blankProfile,
  ANDREW_PROFILE,
  sampleFELead,
  sampleMortgageLeads,
  STATUS_L,
  STAGE_I,
  STAGES
} from '../constants/data';
import { weekKey } from '../utils/calculations';

const STORAGE_KEY = 'mpCallDesk.v1';
const AUTH_KEY = 'est8_calldesk_user';

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
  sendSms: (leadId: string, to: string, text: string) => Promise<void>;
  sendLeadSms: (leadId: string, to: string, text: string) => Promise<{ success: boolean; isTrialNotice?: boolean; trialNoticeMessage?: string }>;
  fetchLeadMessages: (leadId: string) => Promise<SMSMessage[]>;
  simulateInboundSms: (leadId: string, body: string) => Promise<void>;
  logCallDisposition: (payload: CallDispositionPayload) => Promise<void>;
  submitA2PRegistration: (data: any) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      id: 'user_admin_aurek',
      email: 'aurek97@gmail.com',
      name: 'Andrew Chavis',
      picture: '',
      role: 'admin',
      isVerified: true,
      phone: '(803) 555-0142',
      npn: '19482015'
    };
  });

  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Multi-user & Downline view state
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [teamUsers, setTeamUsers] = useState<CRMUser[]>([]);

  // Telephony state
  const [phoneNumbers, setPhoneNumbers] = useState<UserPhoneNumber[]>([]);
  const [telephonyConfig, setTelephonyConfig] = useState<TelephonyConfig>({
    callingMode: 'webrtc',
    bridgePhone: '(803) 555-0142',
    primaryCallerId: '+18035550142',
    autoLogCall: true,
    recordCalls: false
  });
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
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
  const [profile, setProfile] = useState<AgentProfile>(ANDREW_PROFILE);
  const [stats, setStats] = useState<WeeklyStats>({
    week: weekKey(),
    dials: 137,
    appts: 6,
    apps: 2
  });

  // Leads
  const [leads, setLeads] = useState<Lead[]>(() => [sampleFELead(), ...sampleMortgageLeads()]);
  const [activeId, setActiveIdState] = useState<string | null>('s4');
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
  const authHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (user?.email) {
      headers['x-user-email'] = user.email.toLowerCase().trim();
    }
    return headers;
  }, [user]);

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

  // Check auth and load isolated data from SQLite backend
  const checkAuthStatus = useCallback(async () => {
    if (!user?.email) {
      setIsVerified(false);
      setIsLoadingAuth(false);
      return;
    }

    setIsLoadingAuth(true);
    try {
      const res = await fetch(`/api/auth/me?email=${encodeURIComponent(user.email.toLowerCase().trim())}`);
      const data = await res.json();

      if (data.authenticated && data.isVerified) {
        setIsVerified(true);
        setVerificationError(null);
        if (data.user) {
          setUser(prev => ({
            ...prev,
            ...data.user,
            isVerified: true
          }));
          if (data.user.profile) {
            setProfile(prev => ({ ...prev, ...data.user.profile }));
          }
          if (data.user.settings) {
            setSettings(prev => ({ ...prev, ...data.user.settings }));
          }
        }
      } else {
        setIsVerified(false);
        setVerificationError(data.message || 'Access restricted: User is not authorized.');
      }
    } catch (e) {
      if (user.email.toLowerCase() === 'aurek97@gmail.com') {
        setIsVerified(true);
      }
    } finally {
      setIsLoadingAuth(false);
    }
  }, [user?.email]);

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

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (isVerified && user) {
      fetchLeads();
      fetchTelephonyData();
      if (user.role === 'admin') {
        fetchTeamUsers();
      }
    }
  }, [isVerified, user, viewingUserId, fetchLeads, fetchTelephonyData, fetchTeamUsers]);

  // Active call duration timer ticker
  useEffect(() => {
    if (!activeCall || activeCall.status === 'completed' || activeCall.status === 'failed') return;
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

  const loginWithGoogle = useCallback(async (customUser?: Partial<AuthUser>) => {
    const targetEmail = (customUser?.email || 'aurek97@gmail.com').toLowerCase().trim();
    setIsLoadingAuth(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        setIsVerified(true);
        setVerificationError(null);
        setViewingUserId(null);
        try {
          localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
        } catch (e) {}
        setIsLoginOpen(false);
      } else {
        const unverifiedUser: AuthUser = {
          id: 'unverified_' + Math.random().toString(36).slice(2, 8),
          email: targetEmail,
          name: customUser?.name || targetEmail.split('@')[0],
          role: 'agent',
          isVerified: false
        };
        setUser(unverifiedUser);
        setIsVerified(false);
        setVerificationError(data.message || 'Access Denied: You are not an authorized CRM user.');
        setIsLoginOpen(false);
      }
    } catch (e) {
      setIsVerified(false);
      setVerificationError('Unable to connect to CRM verification server.');
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsVerified(false);
    setVerificationError(null);
    setViewingUserId(null);
    setActiveCall(null);
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch (e) {}
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

  // Telephony: Start Outbound Call
  const startCall = useCallback(
    async (lead: Lead) => {
      const leadPhone = lead.phone || '';
      if (!leadPhone) {
        alert('This lead does not have a valid phone number to dial.');
        return;
      }

      const primaryNum = phoneNumbers.find(p => p.isPrimary)?.phoneNumber || telephonyConfig.primaryCallerId || '+18035550142';
      const mode = telephonyConfig.callingMode;

      const callId = `CA_${Date.now()}`;
      setActiveCall({
        callId,
        leadId: lead.id,
        leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Client',
        leadPhone,
        callerId: primaryNum,
        mode,
        status: 'initiating',
        startTime: Date.now(),
        durationSeconds: 0,
        isMuted: false,
        isOnHold: false
      });

      // Increment stats
      setStats(prev => ({ ...prev, dials: prev.dials + 1 }));

      try {
        const res = await fetch('/api/telephony/call', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            leadId: lead.id,
            leadPhone,
            callerId: primaryNum,
            mode,
            leadName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
          })
        });

        if (res.ok) {
          // Transition to connected after brief ring
          setTimeout(() => {
            setActiveCall(prev => (prev ? { ...prev, status: 'connected' } : null));
          }, 1500);
          fetchLeads();
        } else {
          setActiveCall(prev => (prev ? { ...prev, status: 'failed' } : null));
        }
      } catch (err) {
        console.error('Failed to initiate call:', err);
        setActiveCall(prev => (prev ? { ...prev, status: 'failed' } : null));
      }
    },
    [phoneNumbers, telephonyConfig, authHeaders, fetchLeads]
  );

  const endCall = useCallback(() => {
    if (activeCall) {
      setActiveCall(prev => (prev ? { ...prev, status: 'completed' } : null));
      setTimeout(() => {
        setActiveCall(null);
      }, 1200);
    }
  }, [activeCall]);

  const toggleMute = useCallback(() => {
    setActiveCall(prev => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  }, []);

  const toggleHold = useCallback(() => {
    setActiveCall(prev => (prev ? { ...prev, isOnHold: !prev.isOnHold } : null));
  }, []);

  // Telephony: Fetch lead messages
  const fetchLeadMessages = useCallback(async (leadId: string) => {
    if (!leadId) return [];
    try {
      const res = await fetch(`/api/telephony/sms/messages?leadId=${encodeURIComponent(leadId)}`, {
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
  }, [authHeaders]);

  // Telephony: Send 10DLC SMS with Twilio Trial handling
  const sendLeadSms = useCallback(
    async (leadId: string, to: string, text: string) => {
      const primaryNum = phoneNumbers.find(p => p.isPrimary)?.phoneNumber || telephonyConfig.primaryCallerId || '+18035550142';
      const res = await fetch('/api/telephony/sms', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          leadId,
          to,
          from: primaryNum,
          body: text
        })
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
    [phoneNumbers, telephonyConfig, authHeaders, fetchLeads, fetchLeadMessages]
  );

  const sendSms = useCallback(
    async (leadId: string, to: string, text: string) => {
      await sendLeadSms(leadId, to, text);
    },
    [sendLeadSms]
  );

  // Telephony: Simulate Inbound SMS
  const simulateInboundSms = useCallback(
    async (leadId: string, body: string) => {
      const res = await fetch('/api/telephony/sms/simulate-inbound', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ leadId, body })
      });
      if (res.ok) {
        await fetchLeadMessages(leadId);
        await fetchLeads();
      }
    },
    [authHeaders, fetchLeadMessages, fetchLeads]
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

  // Telephony: A2P Submission
  const submitA2PRegistration = useCallback(
    async (data: any) => {
      const res = await fetch('/api/telephony/a2p', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit A2P application');
      }
      await fetchTelephonyData();
    },
    [authHeaders, fetchTelephonyData]
  );

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

      if (nextStage === 'appt') {
        setStats(prev => ({ ...prev, appts: prev.appts + 1 }));
      } else if (nextStage === 'app') {
        setStats(prev => ({ ...prev, apps: prev.apps + 1 }));
      }
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

      if (outcome !== 'text') {
        setStats(prev => ({ ...prev, dials: prev.dials + 1 }));
      }
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
        sendSms,
        sendLeadSms,
        fetchLeadMessages,
        simulateInboundSms,
        logCallDisposition,
        submitA2PRegistration
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
