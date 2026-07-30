import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AdvancedConfig = ({ formData, updateFormData }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-ink mb-2">
          Advanced Configuration
        </h2>
        <p className="text-muted">
          Fine-tune your agent's behavior (optional)
        </p>
      </div>

      {/* Collapsible Advanced Settings */}
      <div className="border border-rule rounded-md">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between hover:bg-subtle"
        >
          <span className="font-medium text-ink">Advanced Settings</span>
          {showAdvanced ? (
            <ChevronUp className="w-5 h-5 text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-4 border-t border-rule space-y-4">
            {/* Custom System Prompt */}
            <div>
              <label className="label">Custom System Prompt</label>
              <textarea
                value={formData.system_prompt}
                onChange={(e) => updateFormData('system_prompt', e.target.value)}
                placeholder="Override the template's system prompt..."
                className="input resize-none"
                rows={8}
              />
              <p className="mt-1 text-xs text-muted">
                Leave empty to use the template's default prompt
              </p>
            </div>

            {/* Temperature */}
            <div>
              <label className="label">
                Temperature: {formData.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) =>
                  updateFormData('temperature', parseFloat(e.target.value))
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>More focused</span>
                <span>More creative</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="label">Max Tokens</label>
              <input
                type="number"
                min="100"
                max="32000"
                step="100"
                value={formData.max_tokens}
                onChange={(e) =>
                  updateFormData('max_tokens', parseInt(e.target.value))
                }
                className="input"
              />
              <p className="mt-1 text-xs text-muted">
                Maximum length of agent responses
              </p>
            </div>

            {/* Guardrails */}
            <div>
              <label className="label">Guardrails / Limitations</label>
              <textarea
                value={formData.guardrails}
                onChange={(e) => updateFormData('guardrails', e.target.value)}
                placeholder="e.g., Do not discuss politics or provide medical advice"
                className="input resize-none"
                rows={3}
              />
              <p className="mt-1 text-xs text-muted">
                Additional instructions or restrictions for the agent
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-subtle rounded-md p-6">
        <h3 className="text-lg font-semibold text-ink mb-4">
          Configuration Summary
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-muted">Agent Name:</dt>
            <dd className="text-sm font-medium text-ink">
              {formData.name || 'Not set'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-muted">Model:</dt>
            <dd className="text-sm font-medium text-ink">
              {formData.llm_model}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-muted">Personality:</dt>
            <dd className="text-sm font-medium text-ink capitalize">
              {formData.personality}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-muted">Temperature:</dt>
            <dd className="text-sm font-medium text-ink">
              {formData.temperature}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-muted">Max Tokens:</dt>
            <dd className="text-sm font-medium text-ink">
              {formData.max_tokens}
            </dd>
          </div>
        </dl>
      </div>

      <div className="text-center text-sm text-muted">
        Click "Finish & Start Chatting" to begin using your agent!
      </div>
    </div>
  );
};

export default AdvancedConfig;
