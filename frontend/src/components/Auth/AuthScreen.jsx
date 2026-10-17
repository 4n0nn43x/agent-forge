import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Terminal } from 'lucide-react';
import * as api from '../../services/api';
import Alert from '../Common/Alert';
import Mark from '../Common/Mark';

// The setup link printed in the server logs is /setup?token=...
const tokenFromUrl = () => new URLSearchParams(window.location.search).get('token') || '';

const AuthScreen = ({ mode, onSignedIn }) => {
  const isSetup = mode === 'setup';
  const navigate = useNavigate();
  const [token, setToken] = useState(tokenFromUrl);
  const [username, setUsername] = useState(isSetup ? 'admin' : '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (isSetup && password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const response = isSetup
        ? await api.setupAdmin(token.trim(), username.trim(), password)
        : await api.login(username.trim(), password);
      // Drop the one-time token from the address bar and the history.
      if (isSetup) navigate('/', { replace: true });
      onSignedIn(response.data.username);
    } catch (err) {
      // Setup was completed elsewhere meanwhile: reload into the sign-in screen.
      if (isSetup && err.response?.status === 409) {
        window.location.assign('/');
        return;
      }
      setError(err.response?.data?.detail || 'Could not reach the server.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="shell w-full max-w-md py-12 sm:py-16 flex-1 flex flex-col">
        <div className="flex items-center gap-2.5">
          <Mark className="w-6 h-6 text-primary-600" />
          <span className="text-base font-semibold tracking-tight text-ink">AgentForge</span>
        </div>

        <h1 className="mt-10 text-2xl font-semibold text-ink">
          {isSetup ? 'Create the admin account' : 'Sign in'}
        </h1>
        <p className="mt-2 text-muted">
          {isSetup
            ? 'This instance has no admin yet. Only someone who can read its server logs can create one, so a stranger who finds it first cannot claim it.'
            : 'This AgentForge instance is private.'}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {isSetup && (
            <div>
              <label className="label" htmlFor="setup-token">Setup token</label>
              <input
                id="setup-token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="input w-full font-mono"
                autoComplete="off"
                spellCheck={false}
                required
              />
              {!tokenFromUrl() && (
                <div className="mt-2 p-3 bg-subtle border border-rule rounded-md text-sm text-ink-soft flex items-start gap-2">
                  <Terminal className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted" />
                  <span>
                    The setup link is printed when the server starts. Find it with{' '}
                    <code className="font-mono">docker compose logs agentforge</code> and open
                    it, or paste its token here.
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="label" htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input w-full"
              autoComplete="username"
              autoFocus={!isSetup}
              maxLength={64}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              autoComplete={isSetup ? 'new-password' : 'current-password'}
              minLength={isSetup ? 8 : undefined}
              maxLength={256}
              required
            />
            {isSetup && <p className="text-xs text-muted mt-1">At least 8 characters.</p>}
          </div>

          {isSetup && (
            <div>
              <label className="label" htmlFor="auth-confirm">Repeat the password</label>
              <input
                id="auth-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="input w-full"
                autoComplete="new-password"
                required
              />
            </div>
          )}

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <button type="submit" disabled={busy} className="btn btn-primary w-full justify-center">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            <span>{isSetup ? 'Create account and continue' : 'Sign in'}</span>
          </button>
        </form>

        {!isSetup && (
          <p className="mt-6 text-xs text-muted">
            Locked out? On the server, run{' '}
            <code className="font-mono">docker exec -it agentforge python -m app.cli reset-password</code>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
