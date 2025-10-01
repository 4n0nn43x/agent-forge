import React from 'react';
import { Info } from 'lucide-react';

const BasicConfig = ({ formData, updateFormData, selectedTemplate, templateData }) => {
  const personalities = [
    { value: 'professional', label: 'Professional', desc: 'Formal and business-like' },
    { value: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
    { value: 'technical', label: 'Technical', desc: 'Precise and detailed' },
  ];

  const models = [
    { value: 'gpt-4', label: 'GPT-4', provider: 'OpenAI' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'OpenAI' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'OpenAI' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', provider: 'Anthropic' },
  ];

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
            {models.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label} ({model.provider})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Make sure you have the corresponding API key configured
          </p>
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
