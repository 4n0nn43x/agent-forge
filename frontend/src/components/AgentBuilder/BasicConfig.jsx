import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, AlertTriangle } from 'lucide-react';
import { getModels } from '../../services/api';

// Shown until /api/agents/models answers, and if it fails.
const FALLBACK_PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    configured: false,
    models: [
      { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
      { value: 'openai/gpt-4o', label: 'GPT-4o' },
      { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    ],
  },
  ollama: { label: 'Ollama (local)', configured: false, models: [] },
};

const BasicConfig = ({ formData, updateFormData, selectedTemplate, templateData }) => {
  const personalities = [
    { value: 'professional', label: 'Professional', desc: 'Formal and business-like' },
    { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { value: 'technical', label: 'Technical', desc: 'Precise and detailed' },
  ];

  const [providers, setProviders] = useState(FALLBACK_PROVIDERS);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getModels()
      .then((response) => {
        if (!cancelled && response.data?.providers) {
          setProviders(response.data.providers);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch models:', error);
      })
      .finally(() => {
        if (!cancelled) setModelsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const openrouter = providers.openrouter ?? FALLBACK_PROVIDERS.openrouter;
  const ollama = providers.ollama ?? FALLBACK_PROVIDERS.ollama;
  const noProviderReady = modelsLoaded && !openrouter.configured && !ollama.configured;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Basic Configuration
        </h2>
        <p className="text-gray-600">
          Configure your agent's basic settings
        </p>
        {selectedTemplate && templateData && (
          <div className="mt-3 p-3 bg-primary-50 rounded-lg flex items-start space-x-2">
            <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-primary-900">
              Using template: <strong>{templateData.name}</strong>. You can customize it below.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Agent Name */}
        <div>
          <label className="label">
            Agent Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            placeholder="e.g., Customer Support Bot"
            className="input"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="label">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Brief description of what this agent does..."
            className="input resize-none"
            rows={3}
          />
        </div>

        {/* LLM Model */}
        <div>
          <label className="label">
            LLM Model <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.llm_model}
            onChange={(e) => updateFormData('llm_model', e.target.value)}
            className="input"
          >
            <optgroup label={`${openrouter.label}${openrouter.configured ? '' : ' — no API key'}`}>
              {openrouter.models.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </optgroup>
            <optgroup label={ollama.label}>
              {ollama.models.length === 0 && (
                <option value="" disabled>
                  No local model detected
                </option>
              )}
              {ollama.models.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                  {model.installed === false ? ' (not pulled)' : ''}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            OpenRouter models need an API key (set it in Settings). Ollama models must be
            pulled locally first (<code>ollama pull &lt;model&gt;</code>).
          </p>
          {noProviderReady && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">
                No provider is ready. Add an OpenRouter key or point at a running Ollama in{' '}
                <Link to="/settings" className="underline font-medium">
                  Settings
                </Link>
                . Document search needs Ollama either way
                (<code>ollama pull nomic-embed-text</code>).
              </p>
            </div>
          )}
        </div>

        {/* Personality */}
        <div>
          <label className="label">Personality</label>
          <div className="grid grid-cols-3 gap-3">
            {personalities.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => updateFormData('personality', p.value)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.personality === p.value
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{p.label}</div>
                <div className="text-xs text-gray-600 mt-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* System Prompt (if not using template or want to customize) */}
        {!selectedTemplate && (
          <div>
            <label className="label">System Prompt</label>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => updateFormData('system_prompt', e.target.value)}
              placeholder="You are a helpful assistant that..."
              className="input resize-none"
              rows={6}
            />
            <p className="mt-1 text-xs text-gray-500">
              Instructions that define how your agent behaves
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicConfig;
