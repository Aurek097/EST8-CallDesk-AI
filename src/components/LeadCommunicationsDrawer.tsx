import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Lead, SMSMessage } from '../types';
import { fullName, isFE } from '../utils/calculations';
import { playDtmfTone } from '../utils/dtmfAudio';
import {
  X,
  Phone,
  PhoneOff,
  PhoneCall,
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Check,
  CheckCheck,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Calendar,
  Clock,
  ChevronRight,
  Info,
  ExternalLink,
  Smartphone,
  Headphones,
  FileText,
  Volume2
} from 'lucide-react';

export const LeadCommunicationsDrawer: React.FC = () => {
  const {
    activeLead,
    isCommDrawerOpen,
    closeCommDrawer,
    commDrawerTab,
    setCommDrawerTab,
    leadMessages,
    sendLeadSms,
    simulateInboundSms,
    logCallDisposition,
    phoneNumbers,
    telephonyConfig,
    activeCall,
    startCall,
    endCall,
    toggleMute,
    toggleHold,
    profile,
    trialNotice,
    dismissTrialNotice
  } = useApp();

  const [activeTab, setActiveTab] = useState<'sms' | 'dialer' | 'trial'>(commDrawerTab);
  const [smsInput, setSmsInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTrialGuide, setShowTrialGuide] = useState(false);
  const [simulatedReplyText, setSimulatedReplyText] = useState('Sounds good, can you call me after 5:00 PM today?');
  const [isSimulating, setIsSimulating] = useState(false);

  // Softphone state
  const [dialedDigits, setDialedDigits] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [selectedDisposition, setSelectedDisposition] = useState<'na' | 'vm' | 'talk' | 'appt' | 'quoted' | 'dnc' | 'notint' | null>(null);
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [isSavingDisposition, setIsSavingDisposition] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync tab with context
  useEffect(() => {
    setActiveTab(commDrawerTab);
  }, [commDrawerTab]);

  // Sync dialed digits with active lead phone
  useEffect(() => {
    if (activeLead?.phone) {
      setDialedDigits(activeLead.phone);
    }
  }, [activeLead]);

  // Scroll messages to bottom on update
  useEffect(() => {
    if (activeTab === 'sms') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [leadMessages, activeTab]);

  if (!isCommDrawerOpen || !activeLead) {
    return null;
  }

  const L = activeLead;
  const leadName = fullName(L);
  const fe = isFE(L);
  const primaryNumber = phoneNumbers.find(p => p.isPrimary)?.phoneNumber || telephonyConfig.primaryCallerId || '+18035550142';

  // Quick SMS Script Templates dynamically tailored to lead
  const quickTemplates = [
    {
      title: 'MP Intro',
      text: `Hi ${L.firstName || 'there'}, this is ${profile.name || 'Andrew Chavis'} with EST8 Financial Group following up on the mortgage protection request for your home in ${L.city || L.state || 'the area'}. When is a good time today for a quick 5-min review?`
    },
    {
      title: 'Voicemail Follow-Up',
      text: `Hi ${L.firstName || 'there'}, I just left you a brief voicemail regarding your mortgage protection file. Give me a call back at ${primaryNumber} or reply to this text!`
    },
    {
      title: 'Appointment Confirm',
      text: `Hi ${L.firstName || 'there'}, confirming our quick call tomorrow at 5:00 PM to review your protection options. Talk soon! - ${profile.name || 'EST8 Financial'}`
    },
    {
      title: 'Final Expense',
      text: `Hello ${L.firstName || 'there'}, this is ${profile.name || 'Andrew'} regarding the state-regulated final expense coverage information for ${L.state || 'your state'}. Wanted to confirm your eligibility.`
    },
    {
      title: 'Compliance Opt-Out',
      text: `Reply STOP to cancel, HELP for help. Msg & data rates may apply.`
    }
  ];

  const handleSendSms = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smsInput.trim() || !L.phone) return;

    setIsSending(true);
    try {
      await sendLeadSms(L.id, L.phone, smsInput.trim());
      setSmsInput('');
    } catch (err: any) {
      console.error('Send SMS failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateReply = async () => {
    if (!simulatedReplyText.trim()) return;
    setIsSimulating(true);
    try {
      await simulateInboundSms(L.id, simulatedReplyText.trim());
      setSimulatedReplyText('Sounds good! Talk to you then.');
    } catch (err) {
      console.error('Failed to simulate reply:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // DTMF Keypad click
  const handleDialpadPress = (char: string) => {
    playDtmfTone(char);
    setDialedDigits(prev => prev + char);
  };

  const handleBackspace = () => {
    setDialedDigits(prev => prev.slice(0, -1));
  };

  const handleStartCall = () => {
    if (activeLead) {
      startCall(activeLead);
    }
  };

  const handleSaveDisposition = async (outcome: 'na' | 'vm' | 'talk' | 'appt' | 'quoted' | 'dnc' | 'notint') => {
    setSelectedDisposition(outcome);
    setIsSavingDisposition(true);
    try {
      await logCallDisposition({
        leadId: L.id,
        outcome,
        notes: callNotes.trim(),
        appointmentDate: apptDate || undefined,
        appointmentTime: apptTime || undefined,
        durationSeconds: activeCall?.durationSeconds || 0
      });
      setCallNotes('');
    } catch (err) {
      console.error('Failed to log disposition:', err);
    } finally {
      setIsSavingDisposition(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Drawer Container */}
      <div className="w-full max-w-xl h-full bg-[var(--surface)] text-[var(--ink)] shadow-2xl flex flex-col border-l border-[var(--rule)] animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 bg-[var(--surface-2)] border-b border-[var(--rule)] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-[var(--ink)]">
                {leadName}
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-semibold uppercase">
                {L.status}
              </span>
              {fe ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                  Final Expense
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                  Mortgage Protection
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
              <span className="font-mono font-medium text-[var(--ink)] flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                {L.phone || 'No phone'}
              </span>
              <span>·</span>
              <span>Calling from: <strong className="font-mono text-[var(--ink)]">{primaryNumber}</strong></span>
              <span>·</span>
              <span>{L.city ? `${L.city}, ` : ''}{L.state || 'US'}</span>
            </div>
          </div>

          <button
            onClick={closeCommDrawer}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--rule)]/50 transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Twilio Trial Banner / Notice Alert */}
        {trialNotice && (
          <div className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{trialNotice}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('trial')}
                  className="underline font-bold hover:text-amber-700 mt-0.5 inline-block"
                >
                  Learn how Twilio Trial & Verified Caller IDs work &rarr;
                </button>
              </div>
            </div>
            <button
              onClick={dismissTrialNotice}
              className="text-amber-700 hover:text-amber-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Top Tab Bar */}
        <div className="flex border-b border-[var(--rule)] bg-[var(--surface)] text-xs font-semibold px-4 pt-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('sms');
              setCommDrawerTab('sms');
            }}
            className={`pb-2.5 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'sms'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>2-Way SMS Thread</span>
            {leadMessages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[10px]">
                {leadMessages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab('dialer');
              setCommDrawerTab('dialer');
            }}
            className={`pb-2.5 px-3 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'dialer'
                ? 'border-[var(--accent)] text-[var(--accent)] font-bold'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Softphone Dialpad</span>
            {activeCall && activeCall.status === 'connected' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('trial')}
            className={`ml-auto pb-2.5 px-2.5 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              activeTab === 'trial'
                ? 'border-amber-500 text-amber-600 font-bold'
                : 'border-transparent text-[var(--muted)] hover:text-amber-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Twilio Trial Mode</span>
          </button>
        </div>

        {/* TAB 1: 2-WAY SMS MESSENGER */}
        {activeTab === 'sms' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)]">
            
            {/* SMS Conversation Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {leadMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--muted)]">
                  <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-[var(--ink)] mb-1">No Messages Yet</h4>
                  <p className="text-xs max-w-xs">
                    Start a conversation with {leadName}. Use the quick insurance script templates below to introduce mortgage protection or follow up on a call.
                  </p>
                </div>
              ) : (
                leadMessages.map(msg => {
                  const isOutbound = msg.direction === 'outbound';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs space-y-1 ${
                          isOutbound
                            ? 'bg-[var(--accent)] text-white rounded-br-xs'
                            : 'bg-[var(--surface)] text-[var(--ink)] border border-[var(--rule)] rounded-bl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        
                        <div
                          className={`flex items-center gap-1.5 text-[10px] ${
                            isOutbound ? 'text-blue-100 justify-end' : 'text-[var(--muted)] justify-start'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isOutbound && (
                            <span className="flex items-center gap-0.5">
                              {msg.status === 'delivered' ? (
                                <span title="Delivered via Twilio 10DLC">
                                  <CheckCheck className="w-3 h-3 text-emerald-300" />
                                </span>
                              ) : (
                                <span className="font-mono text-[9px] bg-white/20 px-1 rounded">Sandbox</span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Insurance Script Templates */}
            <div className="px-4 py-2 bg-[var(--surface)] border-t border-[var(--rule)]">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)] mb-1.5">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Quick Script Templates
                </span>
                <span className="text-[10px]">Click to insert</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {quickTemplates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSmsInput(tpl.text)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] border border-[var(--rule)] transition-all cursor-pointer"
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Trial Simulator Bar */}
            <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-medium truncate">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Twilio Trial Simulator: Test inbound client replies</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={simulatedReplyText}
                  onChange={e => setSimulatedReplyText(e.target.value)}
                  className="text-[11px] py-1 px-2 rounded border border-amber-500/30 bg-[var(--surface)] text-[var(--ink)] max-w-[200px]"
                >
                  <option value="Sounds good, can you call me after 5:00 PM today?">
                    "Call me after 5:00 PM"
                  </option>
                  <option value="Yes I got your voicemail, let's talk tomorrow morning.">
                    "Got VM, let's talk tomorrow"
                  </option>
                  <option value="What are the rates for a 30-year mortgage protection plan?">
                    "What are the 30-year rates?"
                  </option>
                  <option value="Thank you Andrew, please email me the quote options.">
                    "Please email quote options"
                  </option>
                </select>
                <button
                  type="button"
                  onClick={handleSimulateReply}
                  disabled={isSimulating}
                  className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-all cursor-pointer"
                >
                  {isSimulating ? 'Simulating...' : 'Simulate Reply'}
                </button>
              </div>
            </div>

            {/* SMS Composer */}
            <form onSubmit={handleSendSms} className="p-4 bg-[var(--surface)] border-t border-[var(--rule)] space-y-2">
              <div className="relative">
                <textarea
                  rows={3}
                  value={smsInput}
                  onChange={e => setSmsInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleSendSms();
                    }
                  }}
                  placeholder={`Send SMS to ${L.firstName || 'lead'} (${L.phone || 'No phone'})...`}
                  className="w-full p-2.5 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)] placeholder-[var(--muted)] resize-none focus:outline-hidden focus:border-[var(--accent)] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="text-[11px] text-[var(--muted)] font-mono">
                  {smsInput.length} / 160 characters · {Math.ceil(smsInput.length / 160) || 1} segment{Math.ceil(smsInput.length / 160) > 1 ? 's' : ''}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--muted)] hidden sm:inline">
                    Press ⌘+Enter to send
                  </span>
                  <button
                    type="submit"
                    disabled={!smsInput.trim() || isSending || !L.phone}
                    className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'Sending...' : 'Send 10DLC SMS'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: INTERACTIVE SOFTPHONE DIALPAD */}
        {activeTab === 'dialer' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg)]">
            
            {/* Softphone Mode & Caller ID Banner */}
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--rule)] flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  {telephonyConfig.callingMode === 'bridge' ? (
                    <>
                      <Smartphone className="w-4 h-4 text-amber-500" />
                      <span>Mobile Cell Bridging Mode</span>
                    </>
                  ) : (
                    <>
                      <Headphones className="w-4 h-4 text-emerald-500" />
                      <span>Browser WebRTC Softphone</span>
                    </>
                  )}
                </div>
                <div className="text-[var(--muted)] text-[11px]">
                  Caller ID: <strong className="font-mono text-[var(--ink)]">{primaryNumber}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('trial')}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--rule)]"
              >
                Config
              </button>
            </div>

            {/* In-Call Active State Banner */}
            {activeCall && (
              <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center space-y-2 transition-all ${
                activeCall.status === 'connected'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${activeCall.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
                  <span className="font-bold text-sm text-[var(--ink)] uppercase tracking-wider font-mono">
                    {activeCall.status === 'connected' ? 'Call In Progress' : 'Dialing / Connecting...'}
                  </span>
                </div>

                <div className="font-mono text-2xl font-bold text-[var(--ink)] tracking-wider">
                  {formatTimer(activeCall.durationSeconds)}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      activeCall.isMuted
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--rule)]'
                    }`}
                  >
                    {activeCall.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{activeCall.isMuted ? 'Muted' : 'Mute'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleHold}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      activeCall.isOnHold
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--rule)]'
                    }`}
                  >
                    {activeCall.isOnHold ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{activeCall.isOnHold ? 'Resume' : 'Hold'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={endCall}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>End Call</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dialpad Screen */}
            <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--rule)] flex items-center justify-between">
              <input
                type="text"
                value={dialedDigits}
                onChange={e => setDialedDigits(e.target.value)}
                placeholder="Enter phone number..."
                className="w-full bg-transparent font-mono text-xl font-bold text-[var(--ink)] outline-hidden tracking-wider"
              />
              {dialedDigits && (
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="px-2 py-1 text-xs text-[var(--muted)] hover:text-rose-600 font-mono transition-colors"
                >
                  ⌫
                </button>
              )}
            </div>

            {/* 12-Key DTMF Dialpad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
              {[
                { digit: '1', sub: ' ' },
                { digit: '2', sub: 'ABC' },
                { digit: '3', sub: 'DEF' },
                { digit: '4', sub: 'GHI' },
                { digit: '5', sub: 'JKL' },
                { digit: '6', sub: 'MNO' },
                { digit: '7', sub: 'PQRS' },
                { digit: '8', sub: 'TUV' },
                { digit: '9', sub: 'WXYZ' },
                { digit: '*', sub: ' ' },
                { digit: '0', sub: '+' },
                { digit: '#', sub: ' ' }
              ].map(k => (
                <button
                  key={k.digit}
                  type="button"
                  onClick={() => handleDialpadPress(k.digit)}
                  className="h-14 rounded-xl bg-[var(--surface)] hover:bg-[var(--accent-soft)] hover:border-[var(--accent)] border border-[var(--rule)] flex flex-col items-center justify-center transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  <span className="font-display text-lg font-bold text-[var(--ink)] leading-none">
                    {k.digit}
                  </span>
                  <span className="text-[9px] text-[var(--muted)] font-semibold tracking-wider">
                    {k.sub}
                  </span>
                </button>
              ))}
            </div>

            {/* Dial / Action Button */}
            <div className="flex justify-center">
              {!activeCall ? (
                <button
                  type="button"
                  onClick={handleStartCall}
                  disabled={!dialedDigits.trim()}
                  className="w-full max-w-xs py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Phone className="w-5 h-5" />
                  <span>Call {L.firstName || 'Lead'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={endCall}
                  className="w-full max-w-xs py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>Hang Up Now</span>
                </button>
              )}
            </div>

            {/* Post-Call Dispositions */}
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--rule)] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Call Disposition & Outcome
                </span>
                <span className="text-[10px] text-[var(--muted)]">1-Click CRM sync</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSaveDisposition('na')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedDisposition === 'na'
                      ? 'bg-amber-600 text-white border-amber-600 font-bold'
                      : 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="font-bold">No Answer (NA)</div>
                  <div className="text-[10px] opacity-80">+1 Dial, Keep New</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveDisposition('vm')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedDisposition === 'vm'
                      ? 'bg-purple-600 text-white border-purple-600 font-bold'
                      : 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="font-bold">Left Voicemail</div>
                  <div className="text-[10px] opacity-80">+1 VM, Prompt SMS</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveDisposition('talk')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedDisposition === 'talk'
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="font-bold">Spoke / Contacted</div>
                  <div className="text-[10px] opacity-80">Stage &rarr; Contacted</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveDisposition('appt')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedDisposition === 'appt'
                      ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                      : 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="font-bold">Appointment Set</div>
                  <div className="text-[10px] opacity-80">Stage &rarr; Appt</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveDisposition('quoted')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedDisposition === 'quoted'
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--rule)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="font-bold">Quoted Client</div>
                  <div className="text-[10px] opacity-80">Stage &rarr; Quoted</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveDisposition('dnc')}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    selectedDisposition === 'dnc'
                      ? 'bg-rose-600 text-white border-rose-600 font-bold'
                      : 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--rule)] hover:border-rose-400'
                  }`}
                >
                  <div className="font-bold">Do Not Call (DNC)</div>
                  <div className="text-[10px] opacity-80">Stage &rarr; DNC</div>
                </button>
              </div>

              {/* Optional Appointment Date & Time if Appointment Booked */}
              {selectedDisposition === 'appt' && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Appointment Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={apptDate}
                      onChange={e => setApptDate(e.target.value)}
                      className="p-1.5 rounded bg-[var(--surface)] border border-[var(--rule)] text-xs text-[var(--ink)]"
                    />
                    <input
                      type="time"
                      value={apptTime}
                      onChange={e => setApptTime(e.target.value)}
                      className="p-1.5 rounded bg-[var(--surface)] border border-[var(--rule)] text-xs text-[var(--ink)]"
                    />
                  </div>
                </div>
              )}

              {/* Call Notes */}
              <div>
                <input
                  type="text"
                  value={callNotes}
                  onChange={e => setCallNotes(e.target.value)}
                  placeholder="Call notes (e.g. 'Prefers callback after 6pm', 'Spoke with spouse')..."
                  className="w-full p-2 rounded-lg border border-[var(--rule)] bg-[var(--surface-2)] text-xs text-[var(--ink)]"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TWILIO TRIAL MODE ASSISTANT & CARRIER SETUP */}
        {activeTab === 'trial' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--bg)] text-xs">
            
            {/* Guide Hero */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Twilio Trial Account & Carrier Integration Guide</span>
              </div>
              <p className="text-[var(--ink)] leading-relaxed">
                You are currently running on a <strong>Twilio Trial</strong>. In Trial mode, Twilio enforces strict carrier anti-spam protections:
              </p>
            </div>

            {/* Trial Rules Checklist */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-[var(--ink)]">How Twilio Trial Accounts Work:</h4>

              <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--rule)] space-y-1">
                <div className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>Verified Caller IDs Restriction</span>
                </div>
                <p className="text-[var(--muted)] text-[11px] pl-6 leading-relaxed">
                  During trial, Twilio will only deliver outbound voice calls and SMS to numbers you have added to your <strong>Verified Caller IDs</strong> list in the Twilio Console.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--rule)] space-y-1">
                <div className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>EST8 CallDesk Hybrid Sandbox Mode</span>
                </div>
                <p className="text-[var(--muted)] text-[11px] pl-6 leading-relaxed">
                  When you dial or text an unverified lead number in trial mode, our app catches the Twilio constraint gracefully and logs the message/call in <strong>Sandbox Simulator</strong> mode so your sales workflow is never blocked or crashed.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--rule)] space-y-1">
                <div className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[10px]">3</span>
                  <span>Full Upgrade Path ($20 Twilio Balance)</span>
                </div>
                <p className="text-[var(--muted)] text-[11px] pl-6 leading-relaxed">
                  Upgrading your Twilio account with a $20 balance automatically lifts all trial restrictions, allowing you to dial and text any lead nationwide with full 10DLC carrier registration.
                </p>
              </div>
            </div>

            {/* Step-by-Step Twilio Console Verification */}
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--rule)] space-y-3">
              <h4 className="font-bold text-sm text-[var(--ink)] flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
                <span>How to verify your test mobile number:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-[var(--muted)] leading-relaxed">
                <li>Log in to your <strong>Twilio Console</strong> at <a href="https://console.twilio.com" target="_blank" rel="noreferrer" className="text-[var(--accent)] underline font-medium">console.twilio.com</a>.</li>
                <li>In the left search bar, search for <strong>"Verified Caller IDs"</strong> (under <em>Phone Numbers &rarr; Manage &rarr; Verified Caller IDs</em>).</li>
                <li>Click <strong>"Add a new Caller ID"</strong> and enter your personal mobile cell number.</li>
                <li>Twilio will send a 6-digit verification code to your phone. Enter it to verify.</li>
                <li>Once verified, your test number can receive live calls and texts from EST8 CallDesk!</li>
              </ol>
            </div>

            {/* Quick Live SMS Test to Agent Cell */}
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--rule)] space-y-3">
              <div className="font-bold text-sm text-[var(--ink)]">Test Live SMS to Your Verified Number:</div>
              <p className="text-[var(--muted)] text-[11px]">
                Send a real test text message to your verified cell ({profile.phone || '(803) 555-0142'}):
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await sendLeadSms(L.id, profile.phone || '(803) 555-0142', `EST8 CallDesk Live Test: Telephony & 10DLC SMS system active for ${profile.name}!`);
                    alert(`Test message dispatched to ${profile.phone}! Check your cell phone.`);
                  } catch (e: any) {
                    alert(`Test send notice: ${e.message}`);
                  }
                }}
                className="w-full py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Real Test SMS to My Cell ({profile.phone || 'Cell'})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
