import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Grid,
  Volume2,
  Headphones,
  Smartphone,
  ChevronDown,
  X,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { playDtmfTone } from '../utils/dtmfAudio';

export const SoftphoneBar: React.FC = () => {
  const {
    activeCall,
    endCall,
    toggleMute,
    toggleHold,
    telephonyConfig,
    updateTelephonyConfig,
    phoneNumbers,
    activeLead,
    startCall,
    setIsNumberMarketplaceOpen,
    setIsA2POpen,
    a2pRegistration,
    openCommDrawer
  } = useApp();

  const [keypadOpen, setKeypadOpen] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDtmf = (key: string) => {
    playDtmfTone(key);
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 150);
  };

  // If no active call, render a compact dialer dock at bottom right
  if (!activeCall) {
    return (
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
        {/* Quick dial active lead button */}
        {activeLead && activeLead.phone && (
          <>
            <button
              onClick={() => openCommDrawer(activeLead, 'dialer')}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xl shadow-emerald-950/40 border border-emerald-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={`Open Softphone & Dialpad for ${activeLead.firstName || 'Lead'}`}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call {activeLead.firstName}</span>
              <span className="text-[11px] opacity-80 font-mono">({activeLead.phone})</span>
            </button>

            <button
              onClick={() => openCommDrawer(activeLead, 'sms')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[var(--accent)] hover:brightness-110 text-white font-medium text-xs shadow-xl shadow-blue-950/40 border border-blue-400/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={`Open 2-Way SMS Messenger with ${activeLead.firstName || 'Lead'}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">SMS</span>
            </button>
          </>
        )}

        {/* Telephony settings quick menu */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-xl text-xs">
          <button
            onClick={() =>
              updateTelephonyConfig({
                callingMode: telephonyConfig.callingMode === 'webrtc' ? 'bridge' : 'webrtc'
              })
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition ${
              telephonyConfig.callingMode === 'webrtc'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle between Browser WebRTC Softphone and Cell Bridge"
          >
            {telephonyConfig.callingMode === 'webrtc' ? (
              <>
                <Headphones className="w-3.5 h-3.5 text-blue-400" />
                <span>WebRTC</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Cell Bridge</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsNumberMarketplaceOpen(true)}
            className="px-2.5 py-1.5 text-slate-400 hover:text-slate-200 font-medium hover:bg-slate-800 rounded-lg transition"
            title="Buy or manage local caller ID phone numbers"
          >
            {phoneNumbers.length > 0 ? (
              <span className="font-mono text-[11px] text-slate-300">
                {phoneNumbers.find(p => p.isPrimary)?.phoneNumber.replace('+1', '') || 'Numbers'}
              </span>
            ) : (
              '+ Buy Number'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Active Call Dock
  const isConnecting = activeCall.status === 'initiating' || activeCall.status === 'ringing';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/90 p-3 sm:p-4 text-white backdrop-blur-xl">
        {/* Top Call Info */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                activeCall.status === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-bounce'
              }`}
            >
              <Phone className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-sm truncate">{activeCall.leadName}</span>
                <span className="text-xs text-slate-400 font-mono">{activeCall.leadPhone}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span className="capitalize text-emerald-400 font-semibold">
                  {isConnecting ? 'Ringing...' : activeCall.isOnHold ? 'On Hold' : 'Connected'}
                </span>
                <span>&bull;</span>
                <span className="font-mono font-medium text-slate-300">{formatTimer(activeCall.durationSeconds)}</span>
                <span>&bull;</span>
                <span className="text-[10px] uppercase font-mono px-1 rounded bg-slate-800 text-slate-300">
                  {activeCall.mode === 'webrtc' ? 'Browser WebRTC' : 'Mobile Bridge'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block">Outbound Caller ID</span>
            <span className="text-xs font-mono font-semibold text-slate-200">{activeCall.callerId}</span>
          </div>
        </div>

        {/* DTMF Keypad Drawer */}
        {keypadOpen && (
          <div className="py-3 px-6 grid grid-cols-3 gap-2 border-b border-slate-800 animate-in fade-in duration-150">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
              <button
                key={digit}
                onClick={() => handleDtmf(digit)}
                className={`py-2 rounded-xl text-center text-sm font-mono font-bold border transition ${
                  pressedKey === digit
                    ? 'bg-amber-500 text-slate-950 border-amber-400 scale-95'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {digit}
              </button>
            ))}
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="pt-3 flex items-center justify-between gap-2">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
              activeCall.isMuted
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {activeCall.isMuted ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4" />}
            <span>{activeCall.isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* Hold */}
          <button
            onClick={toggleHold}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
              activeCall.isOnHold
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            {activeCall.isOnHold ? <Play className="w-4 h-4 text-blue-400" /> : <Pause className="w-4 h-4" />}
            <span>{activeCall.isOnHold ? 'Unhold' : 'Hold'}</span>
          </button>

          {/* Keypad */}
          <button
            onClick={() => setKeypadOpen(!keypadOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition ${
              keypadOpen
                ? 'bg-slate-700 text-white border-slate-600'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Keypad</span>
          </button>

          {/* Hang Up Button */}
          <button
            onClick={endCall}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-950/60 border border-red-500/40 transition hover:scale-105 active:scale-95"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Hang Up</span>
          </button>
        </div>
      </div>
    </div>
  );
};
