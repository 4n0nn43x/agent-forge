import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Cloud,
  HardDrive,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import Mark from '../Common/Mark';
import * as api from '../../services/api';

/**
 * First run.
 *
 * Settings is a flat list of every knob, which is the wrong shape for someone who
 * has never seen the product: it doesn't say which knobs matter, in what order, or
 * that document search needs Ollama no matter which chat provider you pick. This
 * walks the two decisions that actually gate a working install, checks them live,
 * and gets out of the way.
 *
 * No model is chosen here — that belongs to each agent. The catalogue is shown so
 * you can see what a key unlocks before committing to it.
 */

const STEPS = ['Providers', 'Connect', 'Models'];

const Step = ({ index, current, label }) => {
  const state = index === current ? 'current' : index < current ? 'done' : 'todo';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`flex items-center justify-center w-5 h-5 rounded-full border text-2xs font-medium
          transition-colors duration-300 flex-shrink-0 ${
            state === 'done'
              ? 'bg-primary-600 border-primary-600 text-paper'
              : state === 'current'
                ? 'border-primary-600 text-primary-600'
                : 'border-rule text-faint'
          }`}
      >
        {state === 'done' ? <Check className="w-3 h-3" /> : index + 1}
      </span>
      <span
        className={`text-xs truncate transition-colors duration-300 ${
          state === 'todo' ? 'text-faint' : 'text-ink-soft'
        }`}
      >
        {label}
      </span>
    </div>
  );
};

/** A live check: idle, spinning, or settled with a reason. */
const Probe = ({ label, status, detail, hint }) => (
  <div className="flex items-start gap-2.5">
    <span className="flex-shrink-0 mt-0.5">
      {status === 'checking' ? (
        <Loader2 className="w-4 h-4 text-muted animate-spin" />
      ) : status === 'ok' ? (
        <Check className="w-4 h-4 text-ready" />
      ) : (
        <X className="w-4 h-4 text-danger" />
      )}
    </span>
    <div className="min-w-0">
      <p className="text-sm text-ink">{label}</p>
      {detail && <p className="text-xs text-muted mt-0.5">{detail}</p>}
      {hint && <p className="text-xs text-warn mt-0.5">{hint}</p>}
    </div>
  </div>
);

const Onboarding = ({ state, onDone }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [entering, setEntering] = useState(false);
  const [picked, setPicked] = useState(() => {
    const initial = new Set();
    if (state.openrouter?.configured) initial.add('openrouter');
    if (state.ollama?.ok) initial.add('ollama');
    return initial.size ? initial : new Set(['openrouter']);
  });

  const [key, setKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState(state.ollama_base_url || 'http://localhost:11434');
  const [saving, setSaving] = useState(false);
  const [probe, setProbe] = useState(state);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const firstFieldRef = useRef(null);

  // The step change is the motion: content slides in once, and nothing else on
  // the page moves. Scattered effects are what make a flow feel machine-made.
  const goTo = useCallback((next) => {
    setEntering(true);
    setStep(next);
    requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
  }, []);

  useEffect(() => {
    if (step === 1) firstFieldRef.current?.focus();
  }, [step]);

  const wantsOpenRouter = picked.has('openrouter');
  const wantsOllama = picked.has('ollama');

  const toggle = (provider) =>
    setPicked((previous) => {
      const next = new Set(previous);
      next.has(provider) ? next.delete(provider) : next.add(provider);
      return next;
    });

  const saveAndCheck = async () => {
    setSaving(true);
    setError(null);
    try {
      const values = {};
      // An empty secret is ignored by the API, so an untouched field can't wipe
      // a key that is already stored.
      if (wantsOpenRouter && key.trim()) values.openrouter_api_key = key.trim();
      if (ollamaUrl.trim()) values.ollama_base_url = ollamaUrl.trim();
      if (Object.keys(values).length) await api.updateSettings(values);

      setChecking(true);
      const response = await api.getOnboarding();
      setProbe(response.data);
      goTo(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save that. Check the values and retry.');
    } finally {
      setSaving(false);
      setChecking(false);
    }
  };

  const recheck = async () => {
    setChecking(true);
    try {
      const response = await api.getOnboarding();
      setProbe(response.data);
    } catch (err) {
      setError('Could not reach the server.');
    } finally {
      setChecking(false);
    }
  };

  const finish = async () => {
    try {
      await api.completeOnboarding();
    } catch (err) {
      /* Not worth blocking on: the flow also stops once an agent exists. */
    }
    onDone();
    navigate('/create');
  };

  const openrouterModels = probe.providers?.openrouter?.models ?? [];
  const ollamaModels = probe.providers?.ollama?.models ?? [];
  const liveCatalogue = probe.providers?.openrouter?.live;

  const installedOllama = ollamaModels.filter((model) => model.installed !== false);
  const suggestedOllama = ollamaModels.filter((model) => model.installed === false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return openrouterModels;
    return openrouterModels.filter(
      (model) =>
        model.value.toLowerCase().includes(needle) ||
        model.label?.toLowerCase().includes(needle)
    );
  }, [openrouterModels, query]);

  const recommended = filtered.filter((model) => model.recommended);
  const rest = filtered.filter((model) => !model.recommended);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="shell w-full max-w-2xl py-12 sm:py-16 flex-1 flex flex-col">
        <div className="flex items-center gap-2.5">
          <Mark className="w-6 h-6 text-primary-600" />
          <span className="text-base font-semibold tracking-tight text-ink">AgentForge</span>
        </div>

        <div className="mt-8 flex items-center gap-4 sm:gap-6">
          {STEPS.map((label, index) => (
            <Step key={label} index={index} current={step} label={label} />
          ))}
        </div>

        <div
          className={`mt-8 flex-1 transition-all duration-300 ease-out ${
            entering ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* ---------------------------------------------------- 1. providers */}
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-semibold text-ink">
                Where should your agents run?
              </h1>
              <p className="mt-2 text-muted max-w-prose">
                Pick either or both. You choose the model later, per agent — this only
                decides what will be available to choose from.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    id: 'openrouter',
                    Icon: Cloud,
                    title: 'OpenRouter',
                    lead: 'Hundreds of hosted models behind one key.',
                    points: [
                      'GPT, Claude, Gemini, Llama, and more',
                      'Nothing to install, pay per token',
                      'Needs an API key',
                    ],
                  },
                  {
                    id: 'ollama',
                    Icon: HardDrive,
                    title: 'Ollama',
                    lead: 'Models running on your own machine.',
                    points: [
                      'No key, no per-token cost',
                      'Nothing leaves the machine',
                      'Needs Ollama installed and running',
                    ],
                  },
                ].map(({ id, Icon, title, lead, points }) => {
                  const on = picked.has(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggle(id)}
                      aria-pressed={on}
                      className={`text-left p-4 rounded-md border transition-colors ${
                        on
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-rule hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon
                          className={`w-5 h-5 ${on ? 'text-primary-600' : 'text-muted'}`}
                        />
                        <span
                          className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
                            on ? 'bg-primary-600 border-primary-600' : 'border-rule'
                          }`}
                        >
                          {on && <Check className="w-3 h-3 text-paper" />}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
                      <p className="mt-0.5 text-xs text-muted">{lead}</p>
                      <ul className="mt-2.5 flex flex-col gap-1">
                        {points.map((point) => (
                          <li key={point} className="text-xs text-muted flex gap-1.5">
                            <span className="text-faint">·</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              {/* The one thing about this setup that catches everyone out. */}
              <div className="mt-5 p-3.5 rounded-md bg-subtle border border-rule">
                <p className="text-sm text-ink-soft">
                  Either way, document search needs Ollama.
                </p>
                <p className="mt-1 text-xs text-muted">
                  OpenRouter has no embeddings endpoint, so the index behind your documents
                  is always built locally with{' '}
                  <span className="val">{probe.embedding_model}</span>. Chat works without
                  it; answering <em>from your documents</em> does not.
                </p>
              </div>

              <div className="mt-7 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  disabled={picked.size === 0}
                  className="btn btn-primary btn-lg"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={finish} className="btn btn-ghost">
                  Skip setup
                </button>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------- 2. connect */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-semibold text-ink">Connect them</h1>
              <p className="mt-2 text-muted max-w-prose">
                Saved to the database, not a file. The key is encrypted before it is
                stored and never returned by the API.
              </p>

              <div className="mt-7 flex flex-col gap-6">
                {wantsOpenRouter && (
                  <div>
                    <label className="label" htmlFor="ob-key">
                      OpenRouter API key
                    </label>
                    <input
                      id="ob-key"
                      ref={firstFieldRef}
                      type="password"
                      value={key}
                      onChange={(event) => setKey(event.target.value)}
                      placeholder={
                        probe.openrouter?.configured
                          ? 'Already stored — leave blank to keep it'
                          : 'sk-or-v1-…'
                      }
                      className="input font-mono text-xs"
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <p className="hint">
                      Create one at{' '}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        openrouter.ai/keys
                      </a>
                      . Set a spend limit there while you are at it.
                    </p>
                  </div>
                )}

                {wantsOllama && (
                  <div>
                    <label className="label" htmlFor="ob-ollama">
                      Ollama endpoint
                    </label>
                    <input
                      id="ob-ollama"
                      ref={wantsOpenRouter ? undefined : firstFieldRef}
                      type="text"
                      value={ollamaUrl}
                      onChange={(event) => setOllamaUrl(event.target.value)}
                      className="input font-mono text-xs"
                      spellCheck="false"
                    />
                    <p className="hint">
                      Running AgentForge in Docker? Use{' '}
                      <span className="val">http://host.docker.internal:11434</span> to reach
                      the daemon on your host.
                    </p>
                  </div>
                )}

                {!wantsOllama && (
                  <div className="p-3.5 rounded-md bg-warn-bg border border-warn/30">
                    <p className="text-sm text-warn">Ollama is not selected</p>
                    <p className="mt-1 text-xs text-warn">
                      Your agents will chat fine, but uploading documents will fail: the
                      embeddings that make them searchable can only be produced locally.
                      You can add it later in Settings.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 rounded-md bg-danger-bg border border-danger/30">
                    <p className="text-sm text-danger">{error}</p>
                  </div>
                )}
              </div>

              <div className="mt-7 flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveAndCheck}
                  disabled={saving}
                  className="btn btn-primary btn-lg"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Checking' : 'Save and check'}
                </button>
                <button type="button" onClick={() => goTo(0)} className="btn btn-secondary">
                  Back
                </button>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------ 3. models */}
          {step === 2 && (
            <div>
              <h1 className="text-2xl font-semibold text-ink">What you can use</h1>
              <p className="mt-2 text-muted max-w-prose">
                You pick a model when you create an agent, not here. This is what will be
                on offer.
              </p>

              <div className="mt-6 panel p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Connection</p>
                  <button
                    type="button"
                    onClick={recheck}
                    disabled={checking}
                    className="btn btn-ghost h-7 px-2 text-xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
                    Re-check
                  </button>
                </div>

                {wantsOpenRouter && (
                  <Probe
                    label="OpenRouter"
                    status={checking ? 'checking' : probe.openrouter?.ok ? 'ok' : 'failed'}
                    detail={probe.openrouter?.detail}
                  />
                )}
                <Probe
                  label="Ollama"
                  status={checking ? 'checking' : probe.ollama?.ok ? 'ok' : 'failed'}
                  detail={probe.ollama?.detail}
                  hint={probe.ollama?.embedding_warning}
                />
                <Probe
                  label="Document search"
                  status={checking ? 'checking' : probe.rag_ready ? 'ok' : 'failed'}
                  detail={
                    probe.rag_ready
                      ? 'Ready — uploads will be indexed.'
                      : `Needs Ollama with ${probe.embedding_model} pulled.`
                  }
                />
              </div>

              {/* Installed and suggested are different claims: listing four models
                  you don't have under "on your machine" reads as a lie. */}
              {installedOllama.length > 0 && (
                <div className="mt-6">
                  <p className="eyebrow">On your machine</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {installedOllama.map((model) => (
                      <span key={model.value} className="val-accent">
                        {model.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {suggestedOllama.length > 0 && (
                <div className="mt-6">
                  <p className="eyebrow">
                    {installedOllama.length > 0 ? 'Worth pulling too' : 'Nothing pulled yet'}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {installedOllama.length > 0
                      ? 'Other local models that work well here.'
                      : 'Good starting points, once Ollama is running.'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {suggestedOllama.map((model) => (
                      <span key={model.value} className="val" title="Not pulled yet">
                        {model.value}
                      </span>
                    ))}
                  </div>
                  <p className="hint">
                    <span className="val">ollama pull {suggestedOllama[0].value}</span>, then
                    Re-check.
                  </p>
                </div>
              )}

              {openrouterModels.length > 0 && (
                <div className="mt-7">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="eyebrow">Through OpenRouter</p>
                      <p className="mt-1 text-xs text-muted">
                        {liveCatalogue
                          ? `${openrouterModels.length} available. Our picks first.`
                          : 'Our picks. The full catalogue appears once a key is accepted.'}
                      </p>
                    </div>
                    {liveCatalogue && (
                      <div className="relative w-full sm:w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint pointer-events-none" />
                        <input
                          type="search"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Filter models"
                          aria-label="Filter models"
                          className="input h-8 pl-8 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  <ul className="mt-3 flex flex-col divide-y divide-rule border-y border-rule max-h-72 overflow-y-auto thin-scroll">
                    {recommended.map((model) => (
                      <li key={model.value} className="py-2.5 flex items-start gap-3">
                        <span className="pill-ready flex-shrink-0 mt-0.5">picked</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-ink truncate">{model.value}</p>
                          {model.note && (
                            <p className="text-xs text-muted mt-0.5">{model.note}</p>
                          )}
                        </div>
                        {model.prompt_price != null && (
                          <span className="val-bare flex-shrink-0 mt-0.5">
                            ${model.prompt_price}/M
                          </span>
                        )}
                      </li>
                    ))}
                    {rest.map((model) => (
                      <li key={model.value} className="py-2 flex items-center gap-3">
                        <p className="font-mono text-xs text-muted truncate flex-1">
                          {model.value}
                        </p>
                        {model.prompt_price != null && (
                          <span className="val-bare flex-shrink-0">
                            ${model.prompt_price}/M
                          </span>
                        )}
                      </li>
                    ))}
                    {filtered.length === 0 && (
                      <li className="py-6 text-xs text-muted">
                        Nothing matches <span className="val">{query}</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="mt-8 flex items-center gap-3">
                <button type="button" onClick={finish} className="btn btn-primary btn-lg">
                  Create your first agent
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => goTo(1)} className="btn btn-secondary">
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-10 text-xs text-muted">
          Everything here lives in Settings too, and can be changed at any time.
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
