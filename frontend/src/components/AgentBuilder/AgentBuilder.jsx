import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAgentStore from '../../store/agentStore';
import LoadingSpinner from '../Common/LoadingSpinner';
import Alert from '../Common/Alert';
import TemplateSelector from './TemplateSelector';
import BasicConfig from './BasicConfig';
import DocumentUpload from './DocumentUpload';
import AdvancedConfig from './AdvancedConfig';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const AgentBuilder = () => {
  const navigate = useNavigate();
  const { templates, createAgent, createAgentFromTemplate, loading } = useAgentStore();

  const [step, setStep] = useState(0); // 0: Template, 1: Basic Config, 2: Documents, 3: Advanced
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    llm_model: 'gpt-4',
    personality: 'professional',
    system_prompt: '',
    temperature: 0.7,
    max_tokens: 1000,
    guardrails: '',
  });

  const [createdAgentId, setCreatedAgentId] = useState(null);

  const steps = [
    { name: 'Template', component: TemplateSelector },
    { name: 'Basic Config', component: BasicConfig },
    { name: 'Documents', component: DocumentUpload },
    { name: 'Advanced', component: AdvancedConfig },
  ];

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTemplateSelect = (templateKey) => {
    setSelectedTemplate(templateKey);
    setUseTemplate(true);

    // Pre-fill form with template data
    const template = templates[templateKey];
    if (template) {
      setFormData((prev) => ({
        ...prev,
        system_prompt: template.system_prompt,
        personality: template.personality,
        temperature: template.temperature,
        description: template.description,
      }));
    }
  };

  const handleSkipTemplate = () => {
    setUseTemplate(false);
    setSelectedTemplate(null);
    setStep(1);
  };

  const handleNext = () => {
    // Validate current step
    if (step === 1) {
      if (!formData.name.trim()) {
        setError('Agent name is required');
        return;
      }
      if (!formData.llm_model) {
        setError('Please select an LLM model');
        return;
      }
    }

    setError(null);

    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);

      let agent;
      if (useTemplate && selectedTemplate) {
        // Create from template
        agent = await createAgentFromTemplate(
          selectedTemplate,
          formData.name,
          formData.llm_model
        );
      } else {
        // Create custom agent
        const agentData = {
          ...formData,
          template_name: selectedTemplate || undefined,
        };
        agent = await createAgent(agentData);
      }

      setCreatedAgentId(agent.id);

      // Move to document upload step if not there yet
      if (step < 2) {
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create agent');
    }
  };

  const handleFinish = () => {
    if (createdAgentId) {
      navigate(`/agent/${createdAgentId}`);
    } else {
      navigate('/');
    }
  };

  const CurrentStepComponent = steps[step]?.component;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={idx} className="flex items-center flex-1">
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    idx < step
                      ? 'bg-primary-600 text-white'
                      : idx === step
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {idx < step ? <Check className="w-5 h-5" /> : idx + 1}
                </div>
                <span
                  className={`ml-2 text-sm font-medium ${
                    idx <= step ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {s.name}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    idx < step ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6">
          <Alert type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {/* Step Content */}
      <div className="card min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-[400px]">
            <LoadingSpinner size="lg" text="Creating agent..." />
          </div>
        ) : (
          <>
            {step === 0 && (
              <TemplateSelector
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelect={handleTemplateSelect}
                onSkip={handleSkipTemplate}
              />
            )}

            {step === 1 && (
              <BasicConfig
                formData={formData}
                updateFormData={updateFormData}
                selectedTemplate={selectedTemplate}
                templateData={selectedTemplate ? templates[selectedTemplate] : null}
              />
            )}

            {step === 2 && (
              <DocumentUpload
                agentId={createdAgentId}
                onSkip={() => setStep(3)}
              />
            )}

            {step === 3 && (
              <AdvancedConfig
                formData={formData}
                updateFormData={updateFormData}
              />
            )}
          </>
        )}
      </div>

      {/* Navigation Buttons */}
      {!loading && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={step === 0 ? () => navigate('/') : handleBack}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{step === 0 ? 'Cancel' : 'Back'}</span>
          </button>

          <div className="flex items-center space-x-3">
            {step === 2 && createdAgentId && (
              <button
                onClick={() => setStep(3)}
                className="btn btn-secondary"
              >
                Skip Documents
              </button>
            )}

            {step < 2 ? (
              step === 1 ? (
                <button
                  onClick={handleCreate}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <span>Create Agent</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )
            ) : step === 3 || createdAgentId ? (
              <button
                onClick={handleFinish}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Finish & Start Chatting</span>
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentBuilder;
