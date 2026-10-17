import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import AgentBuilder from './components/AgentBuilder/AgentBuilder';
import ChatInterface from './components/ChatInterface/ChatInterface';
import SettingsPage from './components/Settings/SettingsPage';
import ThemeToggle from './components/Common/ThemeToggle';
import Mark from './components/Common/Mark';
import Onboarding from './components/Onboarding/Onboarding';
import AuthScreen from './components/Auth/AuthScreen';
import useAgentStore from './store/agentStore';
import * as api from './services/api';
import { LogOut, Plus } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Agents' },
  { to: '/settings', label: 'Settings' },
];

function App() {
  const location = useLocation();
  const { fetchTemplates } = useAgentStore();

  // Who is signed in, and whether the instance still needs its admin account.
  // null while unknown, like `onboarding` below.
  const [auth, setAuth] = useState(null);
  const signedIn = Boolean(auth?.authenticated);

  // null while we don't know yet, so the app doesn't flash the empty dashboard
  // before the first-run flow takes over.
  const [onboarding, setOnboarding] = useState(null);

  useEffect(() => {
    api
      .getAuthState()
      .then((response) => setAuth(response.data))
      .catch(() => setAuth({ needs_setup: false, authenticated: false }));

    // Any 401 from the API: the session is gone, back to the sign-in screen.
    const onSignedOut = () => {
      setAuth({ needs_setup: false, authenticated: false });
      setOnboarding(null);
    };
    window.addEventListener('agentforge:signed-out', onSignedOut);
    return () => window.removeEventListener('agentforge:signed-out', onSignedOut);
  }, []);

  useEffect(() => {
    if (signedIn) fetchTemplates();
  }, [signedIn, fetchTemplates]);

  useEffect(() => {
    if (!signedIn) return;
    api
      .getOnboarding()
      .then((response) => setOnboarding(response.data))
      .catch((error) => {
        // Never block the app on this. But say so loudly: a bare catch here
        // silently reported "already onboarded" and hid a proxy misconfiguration
        // that was breaking every redirecting endpoint, not just this one.
        console.error(
          'Could not read first-run state, skipping the setup flow:',
          error.response?.status ?? error.message
        );
        setOnboarding({ completed: true, unavailable: true });
      });
  }, [signedIn]);

  const dismissOnboarding = useCallback(
    () => setOnboarding((previous) => ({ ...previous, completed: true })),
    []
  );

  const signOut = async () => {
    try {
      await api.logout();
    } finally {
      setAuth({ needs_setup: false, authenticated: false });
      setOnboarding(null);
    }
  };

  if (auth === null) {
    return <div className="min-h-screen bg-paper" />;
  }

  if (!signedIn) {
    return (
      <AuthScreen
        key={auth.needs_setup ? 'setup' : 'login'}
        mode={auth.needs_setup ? 'setup' : 'login'}
        onSignedIn={(username) => setAuth({ needs_setup: false, authenticated: true, username })}
      />
    );
  }

  if (onboarding === null) {
    return <div className="min-h-screen bg-paper" />;
  }

  if (!onboarding.completed) {
    return <Onboarding state={onboarding} onDone={dismissOnboarding} />;
  }

  const isChatPage = location.pathname.startsWith('/agent/');

  return (
    <div className={isChatPage ? 'h-screen bg-paper flex flex-col' : 'min-h-screen bg-paper flex flex-col'}>
      <header className="bg-surface border-b border-rule sticky top-0 z-20 flex-shrink-0">
        <div className="shell">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-7">
              <Link to="/" className="flex items-center gap-2.5 group">
                <Mark className="w-6 h-6 text-primary-600" />
                <span className="text-base font-semibold tracking-tight text-ink">
                  AgentForge
                </span>
              </Link>

              {/* Text-only nav with an underline on the active item: the label is
                  the affordance, no pill needed. */}
              <nav className="hidden sm:flex items-center gap-1">
                {NAV.map(({ to, label }) => {
                  const active = location.pathname === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-current={active ? 'page' : undefined}
                      className={`relative px-2.5 py-1.5 text-sm rounded transition-colors ${
                        active
                          ? 'text-ink font-medium'
                          : 'text-muted hover:text-ink hover:bg-subtle'
                      }`}
                    >
                      {label}
                      {active && (
                        <span className="absolute left-2.5 right-2.5 -bottom-[13px] h-px bg-primary-600" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={signOut}
                className="p-2 rounded text-muted hover:text-ink hover:bg-subtle transition-colors"
                title={`Sign out (${auth.username})`}
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <Link to="/create" className="btn btn-primary">
                <Plus className="w-4 h-4" />
                <span>New agent</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className={isChatPage ? 'flex-1 overflow-hidden' : 'flex-1 shell py-10'}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<AgentBuilder />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/agent/:agentId" element={<ChatInterface />} />
        </Routes>
      </main>

      {!isChatPage && (
        <footer className="border-t border-rule mt-16">
          <div className="shell py-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              AgentForge — build a retrieval-grounded chat agent from your own documents.
            </p>
            <a
              href="https://github.com/4n0nn43x/agent-forge"
              className="text-xs text-muted hover:text-ink transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              Source on GitHub
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
