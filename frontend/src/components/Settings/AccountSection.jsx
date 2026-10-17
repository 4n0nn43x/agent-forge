import React, { useState } from 'react';
import * as api from '../../services/api';
import Alert from '../Common/Alert';

const AccountSection = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const run = async (action, success) => {
    setBusy(true);
    setFeedback(null);
    try {
      const response = await action();
      setFeedback({ type: 'success', message: success(response.data) });
      return true;
    } catch (err) {
      setFeedback({ type: 'error', message: err.response?.data?.detail || 'Something went wrong.' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const ok = await run(
      () => api.changePassword(current, next),
      (data) => `Password changed. ${data.ended} other session(s) signed out.`
    );
    if (ok) {
      setCurrent('');
      setNext('');
    }
  };

  const signOutOthers = () =>
    run(api.logoutOthers, (data) => `${data.ended} other session(s) signed out.`);

  return (
    <section className="card space-y-4">
      <h2 className="text-lg font-semibold text-ink">Account</h2>

      {feedback && (
        <Alert type={feedback.type} message={feedback.message} onClose={() => setFeedback(null)} />
      )}

      <form onSubmit={changePassword} className="space-y-3">
        <div>
          <label className="label" htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="input w-full"
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="new-password">New password</label>
          <input
            id="new-password"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="input w-full"
            autoComplete="new-password"
            minLength={8}
            maxLength={256}
            required
          />
          <p className="text-xs text-muted mt-1">
            At least 8 characters. Every other session is signed out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="btn btn-primary">
            Change password
          </button>
          <button type="button" disabled={busy} onClick={signOutOthers} className="btn btn-secondary">
            Sign out other sessions
          </button>
        </div>
      </form>
    </section>
  );
};

export default AccountSection;
