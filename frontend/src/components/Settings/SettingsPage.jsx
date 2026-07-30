import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Plug,
  Save,
  XCircle,
} from 'lucide-react';
import { getSettings, testSettings, updateSettings } from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';

// Empty-string secrets are dropped by the API (an untouched masked field must not
// wipe the stored value), so clearing one needs this explicit sentinel.
const CLEAR_SENTINEL = '__clear__';

const SettingsPage = () => {
  const [groups, setGroups] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [revealed, setRevealed] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await getSettings();
      setGroups(response.data.groups || []);
      setDrafts({});
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.detail || 'Could not load settings',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allSettings = useMemo(
    () => groups.flatMap((group) => group.settings),
    [groups]
  );

  const dirtyKeys = useMemo(() => Object.keys(drafts), [drafts]);

  const setDraft = (key, value) =>
    setDrafts((previous) => ({ ...previous, [key]: value }));

  const currentValue = (setting) =>
    Object.prototype.hasOwnProperty.call(drafts, setting.key)
      ? drafts[setting.key]
      : setting.kind === 'password'
        ? ''
        : setting.value;

  const handleSave = async () => {
    if (dirtyKeys.length === 0) return;
    setSaving(true);
    setFeedback(null);
    setTestResult(null);

    try {
      const response = await updateSettings(drafts);
      setGroups(response.data.groups || []);
      setDrafts({});
      setRevealed({});
      setFeedback({
        type: 'success',
        message:
          response.data.changed?.length > 0
            ? `Saved: ${response.data.changed.join(', ')}`
            : 'Nothing to save',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.detail || 'Could not save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await testSettings();
      setTestResult(response.data);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.detail || 'Could not reach the providers',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const embeddingDirty = Object.prototype.hasOwnProperty.call(drafts, 'embedding_model');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">Settings</h1>
        <p className="text-muted mt-1">
          Provider credentials and endpoints live here, not in <code>.env</code>. Secrets are
          encrypted before being stored.
        </p>
      </div>

      <div className="p-4 bg-primary-50 border border-primary-200 rounded-md flex items-start space-x-2">
        <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-primary-800">
          AgentForge talks to two providers: <strong>OpenRouter</strong> for hosted models and{' '}
          <strong>Ollama</strong> for local ones. OpenRouter has no embeddings endpoint, so
          document search always runs through Ollama — it is required even for an
          OpenRouter-only setup.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-md border flex items-start space-x-2 ${
            feedback.type === 'success'
              ? 'bg-ready-bg border-ready/30 text-ready'
              : 'bg-danger-bg border-danger/30 text-danger'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-sm">{feedback.message}</p>
        </div>
      )}

      {embeddingDirty && (
        <div className="p-4 bg-warn-bg border border-warn/30 rounded-md flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-warn flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warn">
            You are changing the embedding model. Vector widths differ between models, so every
            already-indexed document becomes unreadable and will have to be re-uploaded.
          </p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.name} className="card space-y-4">
          <h2 className="text-lg font-semibold text-ink">{group.name}</h2>

          {group.settings.map((setting) => (
            <div key={setting.key}>
              <label className="label flex items-center justify-between">
                <span>{setting.label}</span>
                {setting.from_env && (
                  <span className="text-xs font-normal text-muted bg-subtle px-2 py-0.5 rounded">
                    from environment
                  </span>
                )}
              </label>

              {setting.kind === 'bool' ? (
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(currentValue(setting))}
                    onChange={(event) => setDraft(setting.key, event.target.checked)}
                    className="w-4 h-4 rounded border-rule"
                  />
                  <span className="text-sm text-ink-soft">Enabled</span>
                </label>
              ) : setting.kind === 'password' ? (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <input
                      type={revealed[setting.key] ? 'text' : 'password'}
                      value={currentValue(setting)}
                      onChange={(event) => setDraft(setting.key, event.target.value)}
                      placeholder={
                        setting.is_set
                          ? `Stored (${setting.value}) — leave blank to keep`
                          : setting.placeholder
                      }
                      className="input flex-1"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setRevealed((previous) => ({
                          ...previous,
                          [setting.key]: !previous[setting.key],
                        }))
                      }
                      className="p-2 text-muted hover:text-ink-soft"
                      title={revealed[setting.key] ? 'Hide' : 'Show what you typed'}
                    >
                      {revealed[setting.key] ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {setting.is_set && (
                    <button
                      type="button"
                      onClick={() => setDraft(setting.key, CLEAR_SENTINEL)}
                      className="text-xs text-danger hover:text-danger"
                    >
                      {drafts[setting.key] === CLEAR_SENTINEL
                        ? 'Will be removed on save'
                        : 'Remove stored value'}
                    </button>
                  )}
                </div>
              ) : (
                <input
                  type={setting.kind === 'number' ? 'number' : 'text'}
                  value={currentValue(setting) ?? ''}
                  onChange={(event) =>
                    setDraft(
                      setting.key,
                      setting.kind === 'number'
                        ? Number(event.target.value)
                        : event.target.value
                    )
                  }
                  placeholder={setting.placeholder}
                  className="input"
                />
              )}

              {setting.help && (
                <p className="mt-1 text-xs text-muted">{setting.help}</p>
              )}
              {setting.warning && (
                <p className="mt-1 text-xs text-warn">{setting.warning}</p>
              )}
            </div>
          ))}
        </section>
      ))}

      <div className="flex items-center justify-between sticky bottom-4 bg-surface border border-rule rounded-md p-4">
        <div className="text-sm text-muted">
          {dirtyKeys.length > 0
            ? `${dirtyKeys.length} unsaved change${dirtyKeys.length > 1 ? 's' : ''}`
            : `${allSettings.length} settings`}
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || dirtyKeys.length > 0}
            className="btn btn-secondary flex items-center space-x-2 disabled:opacity-50"
            title={
              dirtyKeys.length > 0
                ? 'Save first — the test runs against stored settings'
                : 'Check that the providers answer'
            }
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plug className="w-4 h-4" />
            )}
            <span>Test connection</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || dirtyKeys.length === 0}
            className="btn btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save</span>
          </button>
        </div>
      </div>

      {testResult && (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-ink">Connection test</h2>

          {[
            { key: 'openrouter', label: 'OpenRouter' },
            { key: 'ollama', label: 'Ollama' },
          ].map(({ key, label }) => {
            const result = testResult[key] || {};
            return (
              <div key={key} className="flex items-start space-x-2">
                {result.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-ready flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <span className="font-medium text-ink">{label}</span>
                  <span className="text-muted"> — {result.detail}</span>
                  {result.embedding_warning && (
                    <p className="text-warn mt-0.5">{result.embedding_warning}</p>
                  )}
                  {result.models?.length > 0 && (
                    <p className="text-muted mt-0.5 break-all">
                      {result.models.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <div
            className={`text-sm p-3 rounded-md ${
              testResult.rag_ready
                ? 'bg-ready-bg text-ready'
                : 'bg-warn-bg text-warn'
            }`}
          >
            {testResult.rag_ready
              ? 'Document search is ready.'
              : 'Document search is unavailable until Ollama answers and the embedding model is pulled.'}
          </div>
        </section>
      )}
    </div>
  );
};

export default SettingsPage;
