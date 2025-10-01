import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

const TemplateSelector = ({ templates, selectedTemplate, onSelect, onSkip }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose a Template
        </h2>
        <p className="text-gray-600">
          Start with a pre-configured template or build from scratch
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(templates).map(([key, template]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`text-left p-6 rounded-lg border-2 transition-all ${
              selectedTemplate === key
                ? 'border-primary-600 bg-primary-50'
                : 'border-gray-200 hover:border-primary-300 bg-white'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {template.name}
              </h3>
              <Sparkles className={`w-5 h-5 ${
                selectedTemplate === key ? 'text-primary-600' : 'text-gray-400'
              }`} />
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {template.description}
            </p>
            <div className="text-xs text-gray-500">
              <span className="font-medium">Use case:</span> {template.use_case}
            </div>
          </button>
        ))}
      </div>

      {/* Custom Option */}
      <div className="pt-6 border-t border-gray-200">
        <button
          onClick={onSkip}
          className="w-full p-6 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50 transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Build from Scratch
              </h3>
              <p className="text-sm text-gray-600">
                Create a custom agent with your own configuration
              </p>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
          </div>
        </button>
      </div>
    </div>
  );
};

export default TemplateSelector;
