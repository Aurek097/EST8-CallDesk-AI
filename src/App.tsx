import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { LeadQueue } from './components/LeadQueue';
import { ScriptView } from './components/ScriptView';
import { LeadCard } from './components/LeadCard';
import { PipelineBoard } from './components/PipelineBoard';
import { ProfileView } from './components/ProfileView';
import { AdminTeamView } from './components/AdminTeamView';
import { BlockedScreen } from './components/BlockedScreen';
import { ImportModal } from './components/ImportModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginModal } from './components/LoginModal';
import { SoftphoneBar } from './components/SoftphoneBar';
import { NumberMarketplaceModal } from './components/NumberMarketplaceModal';
import { A2PRegistrationModal } from './components/A2PRegistrationModal';
import { LeadCommunicationsDrawer } from './components/LeadCommunicationsDrawer';
import { Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    user,
    isVerified,
    verificationError,
    isLoadingAuth,
    view,
    mobilePane,
    checkAuthStatus,
    loginWithGoogle,
    logout
  } = useApp();

  // Loading state
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <p className="text-sm font-medium tracking-wide">Validating CRM Authorization...</p>
        <span className="text-xs text-slate-500 mt-1">Checking EST8 multi-tenant credentials</span>
      </div>
    );
  }

  // Access Restricted Gate: completely blocks app if user is not verified
  if (!user || !isVerified) {
    return (
      <>
        <BlockedScreen
          email={user?.email || ''}
          errorMessage={verificationError || undefined}
          onRetry={checkAuthStatus}
          onLoginAsAdmin={() =>
            loginWithGoogle({
              email: 'aurek97@gmail.com',
              name: 'Andrew Chavis',
              role: 'admin'
            })
          }
          onSignOut={logout}
        />
        <LoginModal />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-body">
      <Header />

      <main className="flex-1 w-full max-w-[1720px] mx-auto p-3 sm:p-4">
        {view === 'dialer' && (
          <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
            {/* Desktop: 3 columns side-by-side. Mobile: active pane */}
            <div className={`w-full lg:w-auto ${mobilePane === 'leads' ? 'block' : 'hidden lg:block'}`}>
              <LeadQueue />
            </div>

            <div className={`w-full flex-1 max-w-[780px] ${mobilePane === 'script' ? 'block' : 'hidden lg:block'}`}>
              <ScriptView />
            </div>

            <div className={`w-full lg:w-auto ${mobilePane === 'card' ? 'block' : 'hidden lg:block'}`}>
              <LeadCard />
            </div>
          </div>
        )}

        {view === 'pipeline' && <PipelineBoard />}

        {view === 'profile' && <ProfileView />}

        {view === 'team' && <AdminTeamView />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--rule)] bg-[var(--surface)] py-4 px-6 text-center text-xs text-[var(--muted)] space-y-1">
        <div className="font-medium text-[var(--ink)]">
          EST8 CallDesk by <span className="font-semibold">EST8 Financial Group</span> · in partnership with <span className="font-semibold">Symmetry Financial Group</span>
        </div>
        <div className="text-[11px] text-[var(--muted)]">
          Multi-tenant sales desk & CRM. Data isolated per verified agent. Super Admin: Andrew Chavis.
        </div>
      </footer>

      {/* Modals & Softphone Bar */}
      <ImportModal />
      <SettingsModal />
      <LoginModal />
      <NumberMarketplaceModal />
      <A2PRegistrationModal />
      <SoftphoneBar />
      <LeadCommunicationsDrawer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
