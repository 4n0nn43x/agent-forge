import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  Plus,
  Power,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import * as api from '../../services/api';
import Alert from '../Common/Alert';
import LoadingSpinner from '../Common/LoadingSpinner';

const RETRY_CHOICES = [0, 1, 3, 5];

// Sign the raw body, never a re-serialised object: key order would differ and the
// digest would never match.
const VERIFY_SNIPPET = `# Python / FastAPI
import hmac, hashlib

async def verify(request, secret: str) -> bool:
    raw = await request.body()
    sent = request.headers.get("X-Webhook-Signature", "")
    expected = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(sent, expected)

// Node / Express — needs express.raw({ type: 'application/json' })
const crypto = require('crypto');

function verify(req, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');
  const sent = req.get('X-Webhook-Signature') || '';
  return sent.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
}`;

const prettyJson = (raw) => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch (error) {
    return raw;
  }
};

const relativeTime = (value) => {
  if (!value) return null;
  // Timestamps are stored naive UTC, so they need the marker to parse correctly.
  const stamp = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`).getTime();
  if (Number.isNaN(stamp)) return null;
  const seconds = Math.max(0, Math.round((Date.now() - stamp) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
};

/** One delivery, expandable to what we sent and what came back. */
const DeliveryRow = ({ log, onReplay, replaying }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-rule last:border-0">
      <div className="flex items-center gap-3 py-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left group"
        >
          <ChevronRight
            className={`w-3 h-3 text-faint flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className={log.success ? 'pill-ready' : 'pill-danger'}>
            {log.success ? 'ok' : 'failed'}
          </span>
          <span className="val-bare flex-shrink-0">{log.status_code ?? '—'}</span>
          <span className="text-xs text-ink-soft truncate group-hover:text-ink">
            {log.event_type}
          </span>
        </button>

        <span className="val-bare flex-shrink-0">{relativeTime(log.created_at)}</span>

        {!log.success && (
          <button
            type="button"
            onClick={() => onReplay(log)}
            disabled={replaying}
            className="btn btn-ghost h-7 px-2 text-xs flex-shrink-0"
            title="Send this payload again"
          >
            <RotateCcw className="w-3 h-3" />
            {replaying ? 'Sending' : 'Replay'}
          </button>
        )}
      </div>

      {open && (
        <div className="pb-3 pl-5 flex flex-col gap-3">
          {log.error_message && <p className="text-xs text-danger">{log.error_message}</p>}

          <div>
            <p className="eyebrow mb-1">Request body</p>
            <pre className="text-2xs font-mono bg-subtle border border-rule rounded p-2.5 overflow-x-auto max-h-56">
              {prettyJson(log.payload) || '—'}
            </pre>
          </div>

          <div>
            <p className="eyebrow mb-1">Response</p>
            <pre className="text-2xs font-mono bg-subtle border border-rule rounded p-2.5 overflow-x-auto max-h-40">
              {log.response_body || '(empty)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const WebhookManager = ({ agentId }) => {
  const [webhooks, setWebhooks] = useState([]);
  const [catalogue, setCatalogue] = useState({ events: [], signature: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [replayingId, setReplayingId] = useState(null);
  const [copied, setCopied] = useState(null);
  const [sampleEvent, setSampleEvent] = useState(null);

  const [draft, setDraft] = useState({ name: '', url: '', events: [], secret: '', retry_count: 3 });

  const loadWebhooks = useCallback(async () => {
    try {
      const response = await api.getWebhooks(agentId);
      setWebhooks(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load webhooks');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadWebhooks();
    // The event list and its payload shapes come from the server, so the UI can
    // never offer an event the backend does not actually deliver.
    api
      .getWebhookEvents(agentId)
      .then((response) => setCatalogue(response.data))
      .catch(() => setCatalogue({ events: [], signature: null }));
  }, [agentId, loadWebhooks]);

  const events = catalogue.events ?? [];
  const sample = useMemo(
    () => events.find((entry) => entry.event === sampleEvent),
    [events, sampleEvent]
  );

  const flash = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3000);
  };

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      /* clipboard unavailable */
    }
  };

  // Which webhook the loaded logs belong to. Without it, opening one webhook's
  // deliveries and then another's races: whichever request resolves last wins,
  // and you can end up reading webhook A's log under webhook B's heading.
  const logsOwner = useRef(null);

  const loadLogs = useCallback(
    async (webhookId) => {
      logsOwner.current = webhookId;
      setLoadingLogs(true);
      setLogs([]);
      try {
        const response = await api.getWebhookLogs(agentId, webhookId);
        if (logsOwner.current !== webhookId) return; // superseded
        setLogs(response.data);
      } catch (err) {
        if (logsOwner.current === webhookId) setError('Could not load the delivery log');
      } finally {
        if (logsOwner.current === webhookId) setLoadingLogs(false);
      }
    },
    [agentId]
  );

  const create = async () => {
    if (!draft.name || !draft.url || draft.events.length === 0) {
      setError('A name, a URL and at least one event are required.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await api.createWebhook(agentId, { ...draft, secret: draft.secret || undefined });
      setDraft({ name: '', url: '', events: [], secret: '', retry_count: 3 });
      setShowForm(false);
      flash('Webhook created. A signing secret was generated for it.');
      loadWebhooks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create the webhook');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (webhook) => {
    setBusyId(webhook.id);
    try {
      await api.toggleWebhook(agentId, webhook.id);
      loadWebhooks();
    } catch (err) {
      setError('Could not change the webhook state');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (webhook) => {
    if (!window.confirm(`Delete "${webhook.name}"? Its delivery history goes with it.`)) return;
    setBusyId(webhook.id);
    try {
      await api.deleteWebhook(agentId, webhook.id);
      if (expandedId === webhook.id) setExpandedId(null);
      loadWebhooks();
    } catch (err) {
      setError('Could not delete the webhook');
    } finally {
      setBusyId(null);
    }
  };

  const test = async (webhook) => {
    setBusyId(webhook.id);
    setError(null);
    try {
      await api.testWebhook(agentId, webhook.id);
      flash('Test delivered.');
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Test delivery failed — open the log to see the response.'
      );
    } finally {
      setBusyId(null);
      loadWebhooks();
      if (expandedId === webhook.id) loadLogs(webhook.id);
    }
  };

  const openLogs = (webhook) => {
    if (expandedId === webhook.id) {
      setExpandedId(null);
      logsOwner.current = null;
      setLogs([]);
      return;
    }
    setExpandedId(webhook.id);
    loadLogs(webhook.id);
  };

  const replay = async (webhook, log) => {
    setReplayingId(log.id);
    try {
      const response = await api.replayWebhookLog(agentId, webhook.id, log.id);
      flash(response.data.detail || 'Replayed.');
      loadLogs(webhook.id);
      loadWebhooks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Replay failed');
    } finally {
      setReplayingId(null);
    }
  };

  const toggleEvent = (value) =>
    setDraft((previous) => ({
      ...previous,
      events: previous.events.includes(value)
        ? previous.events.filter((event) => event !== value)
        : [...previous.events, value],
    }));

  if (loading) return <LoadingSpinner text="Loading webhooks" />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">Webhooks</h3>
          <p className="mt-1 text-sm text-muted max-w-prose">
            AgentForge posts a signed JSON body to your URL when something happens. Failed
            deliveries are retried, kept, and can be sent again.
          </p>
        </div>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Add webhook
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {notice && <Alert type="success" message={notice} onClose={() => setNotice(null)} />}

      {showForm && (
        <div className="card flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Ops channel"
              />
            </div>
            <div>
              <label className="label">Endpoint URL</label>
              <input
                className="input font-mono text-xs"
                value={draft.url}
                onChange={(event) => setDraft({ ...draft, url: event.target.value })}
                placeholder="https://example.com/hooks/agentforge"
              />
              <p className="hint">
                Must be publicly resolvable. Private and loopback addresses are refused unless
                you allow them in Settings.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Events</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {events.map((entry) => (
                <label
                  key={entry.event}
                  className={`flex gap-2.5 p-2.5 rounded border cursor-pointer transition-colors ${
                    draft.events.includes(entry.event)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-rule hover:border-primary-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={draft.events.includes(entry.event)}
                    onChange={() => toggleEvent(entry.event)}
                    className="mt-0.5 w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-xs text-ink">{entry.event}</span>
                    <span className="block text-xs text-muted mt-0.5">{entry.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Signing secret</label>
              <input
                className="input font-mono text-xs"
                value={draft.secret}
                onChange={(event) => setDraft({ ...draft, secret: event.target.value })}
                placeholder="Generated for you if left blank"
              />
            </div>
            <div>
              <label className="label">Retries on failure</label>
              <div className="flex gap-1.5">
                {RETRY_CHOICES.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setDraft({ ...draft, retry_count: count })}
                    className={`btn h-9 px-3 ${
                      draft.retry_count === count ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="hint">Backoff doubles each attempt: 1s, 2s, 4s…</p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={create} disabled={creating} className="btn btn-primary">
              {creating ? 'Creating…' : 'Create webhook'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {webhooks.length === 0 ? (
        <div className="panel px-5 py-10">
          <p className="text-sm font-medium text-ink">No webhooks yet</p>
          <p className="mt-1 text-sm text-muted max-w-prose">
            Add one to forward conversations into your own systems — a ticketing queue, a Slack
            relay, an analytics pipeline.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {webhooks.map((webhook) => {
            const health = webhook.health ?? {};
            const expanded = expandedId === webhook.id;

            return (
              <div key={webhook.id} className="panel">
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-ink">{webhook.name}</span>
                        <span className="pill-neutral">
                          {webhook.is_active ? 'active' : 'paused'}
                        </span>
                        {/* A webhook broken for days should not look like one that works. */}
                        {health.failing && (
                          <span className="pill-danger">
                            <AlertCircle className="w-3 h-3" />
                            failing
                          </span>
                        )}
                        {webhook.has_secret && <span className="pill-neutral">signed</span>}
                      </div>
                      <p className="mt-1.5 font-mono text-xs text-muted break-all">{webhook.url}</p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => test(webhook)}
                        disabled={busyId === webhook.id}
                        className="btn btn-ghost h-8 px-2 text-xs"
                        title="Send a test delivery"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Test
                      </button>
                      <button
                        type="button"
                        onClick={() => toggle(webhook)}
                        disabled={busyId === webhook.id}
                        className="btn btn-ghost h-8 w-8 px-0"
                        title={webhook.is_active ? 'Pause deliveries' : 'Resume deliveries'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(webhook)}
                        disabled={busyId === webhook.id}
                        className="btn btn-ghost h-8 w-8 px-0 hover:text-danger"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {webhook.events.map((event) => (
                      <span key={event} className="val">
                        {event}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
                    {health.total > 0 ? (
                      <>
                        <span className="tnum">
                          {health.total - health.failures}/{health.total} delivered
                        </span>
                        {health.consecutive_failures > 0 && (
                          <span className="text-danger tnum">
                            {health.consecutive_failures} failing in a row
                          </span>
                        )}
                        {health.last_delivery_at && (
                          <span>last {relativeTime(health.last_delivery_at)}</span>
                        )}
                      </>
                    ) : (
                      <span>No deliveries yet</span>
                    )}
                    <button
                      type="button"
                      onClick={() => openLogs(webhook)}
                      className="text-primary-600 hover:underline"
                    >
                      {expanded ? 'Hide deliveries' : 'View deliveries'}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-rule px-4 py-2">
                    {loadingLogs ? (
                      <div className="py-6">
                        <LoadingSpinner size="sm" text="Loading deliveries" />
                      </div>
                    ) : logs.length === 0 ? (
                      <p className="py-6 text-sm text-muted">
                        Nothing delivered yet. Use <strong>Test</strong> to send one.
                      </p>
                    ) : (
                      logs.map((log) => (
                        <DeliveryRow
                          key={log.id}
                          log={log}
                          replaying={replayingId === log.id}
                          onReplay={(entry) => replay(webhook, entry)}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* The payload contract, straight from the server, so integrators don't have
          to guess the JSON shape or how to check the signature. */}
      {events.length > 0 && (
        <div className="panel p-4 flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-ink">What we send</h4>

          <div className="flex flex-wrap gap-1.5">
            {events.map((entry) => (
              <button
                key={entry.event}
                type="button"
                onClick={() => setSampleEvent(sampleEvent === entry.event ? null : entry.event)}
                className={sampleEvent === entry.event ? 'val-accent' : 'val'}
              >
                {entry.event}
              </button>
            ))}
          </div>

          {sample && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="eyebrow">{sample.label}</p>
                <button
                  type="button"
                  onClick={() => copy(JSON.stringify(sample.sample, null, 2), 'sample')}
                  className="btn btn-ghost h-7 px-2 text-xs"
                >
                  {copied === 'sample' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied === 'sample' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-2xs font-mono bg-subtle border border-rule rounded p-2.5 overflow-x-auto">
                {JSON.stringify(sample.sample, null, 2)}
              </pre>
            </div>
          )}

          {catalogue.signature && (
            <div className="text-xs text-muted">
              <p>
                Every delivery carries <span className="val">{catalogue.signature.header}</span> in
                the form <span className="val">{catalogue.signature.format}</span> —{' '}
                {catalogue.signature.algorithm} over {catalogue.signature.signed_value}, keyed with
                the webhook's secret. Compare it with a constant-time function.
              </p>
              <div className="flex items-center justify-between mt-2 mb-1">
                <p className="eyebrow">Verify it</p>
                <button
                  type="button"
                  onClick={() => copy(VERIFY_SNIPPET, 'verify')}
                  className="btn btn-ghost h-7 px-2 text-xs"
                >
                  {copied === 'verify' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied === 'verify' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-2xs font-mono bg-subtle border border-rule rounded p-2.5 overflow-x-auto">
                {VERIFY_SNIPPET}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WebhookManager;
