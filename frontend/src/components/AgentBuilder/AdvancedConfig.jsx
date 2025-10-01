import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AdvancedConfig = ({ formData, updateFormData }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Advanced Configuration
        </h2>
        <p className="text-gray-600">
          Fine-tune your agent's behavior (optional)
        </p>
      </div>

      {/* Collapsible Advanced Settings */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
        >
          <span className="font-medium text-gray-900">Advanced Settings</span>
          {showAdvanced ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-4 border-t border-gray-200 space-y-4">
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
              <p className="mt-1 text-xs text-gray-500">
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
              <div className="flex justify-between text-xs text-gray-500 mt-1">
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
                max="4000"
                step="100"
                value={formData.max_tokens}
                onChange={(e) =>
                  updateFormData('max_tokens', parseInt(e.target.value))
                }
                className="input"
              />
              <p className="mt-1 text-xs text-gray-500">
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
              <p className="mt-1 text-xs text-gray-500">
                Additional instructions or restrictions for the agent
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuration Summary
        </h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Agent Name:</dt>
            <dd className="text-sm font-medium text-gray-900">
              {formData.name || 'Not set'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Model:</dt>
            <dd className="text-sm font-medium text-gray-900">
              {formData.llm_model}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Personality:</dt>
            <dd className="text-sm font-medium text-gray-900 capitalize">
              {formData.personality}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Temperature:</dt>
            <dd className="text-sm font-medium text-gray-900">
              {formData.temperature}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Max Tokens:</dt>
            <dd className="text-sm font-medium text-gray-900">
              {formData.max_tokens}
            </dd>
          </div>
        </dl>
      </div>

      <div className="text-center text-sm text-gray-600">
        Click "Finish & Start Chatting" to begin using your agent!
      </div>
    </div>
  );
};

export default AdvancedConfig;
