import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { isFE, autoOpener } from '../utils/calculations';
import { credAlerts } from '../utils/profileAlerts';
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  LogIn,
  LogOut,
  CheckCircle2,
  Users,
  ShieldAlert,
  ChevronDown,
  UserCheck,
  X,
  PhoneCall,
  ShieldCheck
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    user,
    activeLead,
    updateLead,
    view,
    setView,
    profile,
    stats,
    theme,
    toggleTheme,
    mobilePane,
    setMobilePane,
    setIsSettingsOpen,
    setIsLoginOpen,
    logout,
    viewingUserId,
    viewingUserName,
    switchUserView,
    teamUsers,
    phoneNumbers,
    setIsNumberMarketplaceOpen,
    setIsA2POpen
  } = useApp();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const alerts = credAlerts(profile);
  const hasAlerts = alerts.length > 0;

  const fe = activeLead ? isFE(activeLead) : false;
  const currentStep = activeLead ? activeLead.step || 1 : 1;
  const currentOpener = activeLead ? activeLead.opener || autoOpener(activeLead) : 'A';

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AC';

  const isAdmin = user?.role === 'admin';

  return (
    <>
      {/* Downline Supervision Banner (Active when Admin switched into an agent's book) */}
      {viewingUserId && (
        <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-md">
          <div className="max-w-[1720px] mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-400 text-[10px] uppercase font-bold tracking-wider">
                Admin Supervisor Mode
              </span>
              <span>
                Viewing Downline Desk: <strong className="underline">{viewingUserName || 'Agent'}</strong> (Leads & Dial logs are isolated to this agent)
              </span>
            </div>
            <button
              onClick={() => switchUserView(null)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-950 hover:bg-slate-900 text-white text-[11px] font-bold transition shadow-sm"
            >
              <X className="w-3.5 h-3.5" /> Return to My Desk
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--rule)] px-4 py-2.5 transition-colors">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand / Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              onClick={() => setView('profile')}
              className="w-8 h-8 rounded-full overflow-hidden bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-bold text-xs cursor-pointer border border-[var(--rule)] hover:ring-2 hover:ring-[var(--accent)] transition-all flex-shrink-0"
              title="Agent Profile"
            >
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${profile.photoX || 50}% ${profile.photoY || 35}%`
                  }}
                />
              ) : (
                userInitials
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-base md:text-lg text-[var(--ink)] tracking-tight">
                  EST8 CallDesk
                </span>
                {isAdmin ? (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                    SUPER ADMIN
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-semibold">
                    AGENT
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[var(--muted)] truncate hidden sm:block">
                Mortgage protection · Final expense
              </div>
            </div>
          </div>

          {/* View Switcher (Dialer / Pipeline / Profile / Team) */}
          <div className="flex items-center bg-[var(--surface-2)] border border-[var(--rule)] rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setView('dialer')}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                view === 'dialer'
                  ? 'bg-[var(--accent)] text-white font-bold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Dialer
            </button>
            <button
              type="button"
              onClick={() => setView('pipeline')}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                view === 'pipeline'
                  ? 'bg-[var(--accent)] text-white font-bold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Pipeline
            </button>
            <button
              type="button"
              onClick={() => setView('profile')}
              className={`relative px-3 py-1 text-xs rounded-full font-medium transition-all flex items-center gap-1 ${
                view === 'profile'
                  ? 'bg-[var(--accent)] text-white font-bold shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              Profile
              {hasAlerts && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setView('team')}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-all flex items-center gap-1 ${
                  view === 'team'
                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                    : 'text-amber-600 dark:text-amber-400 hover:text-[var(--ink)]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team & Downlines</span>
              </button>
            )}
          </div>

          {/* Admin Downline Agent Switcher */}
          {isAdmin && (
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={() => setSwitcherOpen(!switcherOpen)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${
                  viewingUserId
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold'
                    : 'bg-[var(--surface-2)] border-[var(--rule)] text-[var(--ink)] hover:border-[var(--accent)]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {viewingUserId ? `Desk: ${viewingUserName}` : 'Desk: My Personal Leads'}
                </span>
                <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
              </button>

              {switcherOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-[var(--surface)] border border-[var(--rule)] rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--rule)]">
                    Switch Active Lead Book
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      switchUserView(null);
                      setSwitcherOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[var(--surface-2)] ${
                      !viewingUserId ? 'font-bold text-[var(--accent)] bg-[var(--accent-soft)]' : 'text-[var(--ink)]'
                    }`}
                  >
                    <span>My Desk (Andrew Chavis)</span>
                    {!viewingUserId && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" />}
                  </button>

                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-t border-[var(--rule)] mt-1">
                    Downline Agents ({teamUsers.filter(u => u.role === 'agent').length})
                  </div>

                  {teamUsers
                    .filter(u => u.role === 'agent')
                    .map(downline => {
                      const isSelected = viewingUserId === downline.id;
                      return (
                        <button
                          key={downline.id}
                          type="button"
                          onClick={() => {
                            switchUserView(downline.id);
                            setSwitcherOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[var(--surface-2)] ${
                            isSelected ? 'font-bold text-amber-600 bg-amber-500/10' : 'text-[var(--ink)]'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{downline.name}</div>
                            <div className="text-[10px] text-[var(--muted)]">{downline.email}</div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                        </button>
                      );
                    })}

                  {teamUsers.filter(u => u.role === 'agent').length === 0 && (
                    <div className="px-3 py-2 text-slate-500 text-[11px] italic">
                      No downlines pre-registered yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Script step switch (visible in dialer view) */}
          {view === 'dialer' && activeLead && (
            <div className="hidden lg:flex items-center bg-[var(--surface-2)] border border-[var(--rule)] rounded-full p-0.5">
              {fe ? (
                <>
                  <button
                    type="button"
                    onClick={() => updateLead(activeLead.id, { opener: 'A' })}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                      currentOpener === 'A'
                        ? 'bg-[var(--fe)] text-white font-bold shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <b className="font-mono mr-1.5">A</b> Fresh lead
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLead(activeLead.id, { opener: 'B' })}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                      currentOpener === 'B'
                        ? 'bg-[var(--fe)] text-white font-bold shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <b className="font-mono mr-1.5">B</b> Aged lead
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => updateLead(activeLead.id, { step: 1 })}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                      currentStep === 1
                        ? 'bg-[var(--accent)] text-white font-bold shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <b className="font-mono mr-1.5">1</b> Set appt · B.E.S.T.
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLead(activeLead.id, { step: 2 })}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                      currentStep === 2
                        ? 'bg-[var(--accent)] text-white font-bold shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    <b className="font-mono mr-1.5">2</b> Presentation · R.E.A.L.
                  </button>
                </>
              )}
            </div>
          )}

          {/* Action Controls & Google User Profile */}
          <div className="flex items-center gap-2">
            {/* Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-[var(--rule)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Phone Numbers Marketplace Button */}
            <button
              type="button"
              onClick={() => setIsNumberMarketplaceOpen(true)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--rule)] text-xs text-[var(--ink)] hover:border-emerald-500 hover:text-emerald-500 hover:bg-[var(--surface-2)] transition-colors flex items-center gap-1.5"
              title="Search and buy local caller ID phone numbers"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">Numbers</span>
              {phoneNumbers.length > 0 && (
                <span className="font-mono text-[10px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  {phoneNumbers.length}
                </span>
              )}
            </button>

            {/* A2P 10DLC Status Button */}
            <button
              type="button"
              onClick={() => setIsA2POpen(true)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--rule)] text-xs text-[var(--ink)] hover:border-blue-500 hover:text-blue-500 hover:bg-[var(--surface-2)] transition-colors flex items-center gap-1.5"
              title="A2P 10DLC Brand & Campaign Verification"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden md:inline">A2P 10DLC</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>

            {/* Settings Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--rule)] text-xs text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-colors flex items-center gap-1.5"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* User / Google Sign-in Menu */}
            <div className="relative">
              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border border-[var(--rule)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition-all"
                  >
                    <div className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold flex items-center justify-center">
                      {user.name[0] || 'U'}
                    </div>
                    <span className="text-xs font-medium text-[var(--ink)] max-w-[90px] sm:max-w-[130px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 bg-[var(--surface)] border border-[var(--rule)] rounded-xl shadow-xl py-2 z-50 text-xs">
                      <div className="px-3.5 py-2 border-b border-[var(--rule)]">
                        <div className="font-bold text-[var(--ink)] truncate flex items-center justify-between">
                          <span>{user.name}</span>
                          {isAdmin && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 text-[9px] font-mono font-bold">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-[var(--muted)] truncate">{user.email}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Signed in with Google (Verified)
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            setView('team');
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[var(--surface-2)] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5" /> Team & Downline Roster
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setView('profile');
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[var(--surface-2)] text-[var(--ink)]"
                      >
                        View Agent Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          setIsLoginOpen(true);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[var(--surface-2)] text-[var(--ink)]"
                      >
                        Switch Account / Re-auth
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-[var(--accent)] text-white text-xs font-bold hover:brightness-110 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Google Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Responsive Pane Switcher (under 1080px wide) */}
          {view === 'dialer' && (
            <div className="w-full flex lg:hidden items-center gap-1 pt-1 border-t border-[var(--rule)] mt-1">
              <button
                type="button"
                onClick={() => setMobilePane('leads')}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium border text-center transition-all ${
                  mobilePane === 'leads'
                    ? 'border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--accent-soft)]'
                    : 'border-[var(--rule)] text-[var(--muted)] bg-[var(--surface-2)]'
                }`}
              >
                Leads
              </button>
              <button
                type="button"
                onClick={() => setMobilePane('script')}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium border text-center transition-all ${
                  mobilePane === 'script'
                    ? 'border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--accent-soft)]'
                    : 'border-[var(--rule)] text-[var(--muted)] bg-[var(--surface-2)]'
                }`}
              >
                Script
              </button>
              <button
                type="button"
                onClick={() => setMobilePane('card')}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium border text-center transition-all ${
                  mobilePane === 'card'
                    ? 'border-[var(--accent)] text-[var(--accent)] font-bold bg-[var(--accent-soft)]'
                    : 'border-[var(--rule)] text-[var(--muted)] bg-[var(--surface-2)]'
                }`}
              >
                Lead card
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
};
