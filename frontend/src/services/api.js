import axios from 'axios';

// Trailing slashes only belong on paths the backend actually declares with one
// (the collection routes, "/"). Anywhere else FastAPI answers 307 to the
// slash-less form, which costs a round trip and — behind a proxy that drops the
// port from the Host header — sends the browser somewhere that isn't listening.

// In production (Docker), VITE_API_URL will be undefined/empty
// This makes axios use relative paths (e.g., /api/agents/)
// which nginx will proxy to the backend
const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  // Only set baseURL if VITE_API_URL is explicitly provided (dev mode)
  // In production, omit baseURL entirely to use relative URLs
  ...(API_BASE_URL && { baseURL: API_BASE_URL }),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Templates
export const getTemplates = () => api.get('/api/agents/templates');

export const createAgentFromTemplate = (templateName, agentName, llmModel) =>
  api.post('/api/agents/from-template', null, {
    params: {
      template_name: templateName,
      agent_name: agentName,
      ...(llmModel && { llm_model: llmModel }),
    },
  });

// Models (OpenRouter recommendations + locally installed Ollama tags)
export const getModels = () => api.get('/api/agents/models');

// Agents
export const getAgents = () => api.get('/api/agents/');

export const getAgent = (agentId) => api.get(`/api/agents/${agentId}`);

export const createAgent = (agentData) => api.post('/api/agents/', agentData);

export const updateAgent = (agentId, agentData) => api.put(`/api/agents/${agentId}`, agentData);

export const deleteAgent = (agentId) => api.delete(`/api/agents/${agentId}`);

export const duplicateAgent = (agentId, newName) =>
  api.post(`/api/agents/${agentId}/duplicate`, null, { params: { new_name: newName } });

// Documents
export const uploadDocument = (agentId, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(`/api/agents/${agentId}/documents`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
};

export const getDocuments = (agentId) => api.get(`/api/agents/${agentId}/documents`);

// Chat
export const sendMessage = (agentId, message, conversationId = null) =>
  api.post(`/api/agents/${agentId}/chat`, {
    message,
    conversation_id: conversationId,
  });

export const getConversations = (agentId) => api.get(`/api/agents/${agentId}/conversations`);

export const getConversationMessages = (conversationId) =>
  api.get(`/api/agents/conversations/${conversationId}/messages`);

// API Keys
export const createAPIKey = (agentId, keyData) =>
  api.post(`/api/agents/${agentId}/api-keys/`, keyData);

export const getAPIKeys = (agentId) => api.get(`/api/agents/${agentId}/api-keys/`);

export const deleteAPIKey = (agentId, keyId) =>
  api.delete(`/api/agents/${agentId}/api-keys/${keyId}`);

export const toggleAPIKey = (agentId, keyId) =>
  api.patch(`/api/agents/${agentId}/api-keys/${keyId}/toggle`);

// Webhooks
export const getWebhooks = (agentId) => api.get(`/api/agents/${agentId}/webhooks/`);

export const createWebhook = (agentId, webhookData) =>
  api.post(`/api/agents/${agentId}/webhooks/`, webhookData);

export const updateWebhook = (agentId, webhookId, webhookData) =>
  api.put(`/api/agents/${agentId}/webhooks/${webhookId}`, webhookData);

export const deleteWebhook = (agentId, webhookId) =>
  api.delete(`/api/agents/${agentId}/webhooks/${webhookId}`);

export const toggleWebhook = (agentId, webhookId) =>
  api.patch(`/api/agents/${agentId}/webhooks/${webhookId}/toggle`);

export const testWebhook = (agentId, webhookId) =>
  api.post(`/api/agents/${agentId}/webhooks/${webhookId}/test`);

export const getWebhookLogs = (agentId, webhookId) =>
  api.get(`/api/agents/${agentId}/webhooks/${webhookId}/logs`);

// Re-sends a past delivery with its original payload, for when the endpoint was
// broken at the time and has since been fixed.
export const replayWebhookLog = (agentId, webhookId, logId) =>
  api.post(`/api/agents/${agentId}/webhooks/${webhookId}/logs/${logId}/replay`);

// The subscribable events, each with the exact envelope it is delivered in,
// plus the signature contract.
export const getWebhookEvents = (agentId) =>
  api.get(`/api/agents/${agentId}/webhooks/events/supported`);

// Settings (stored in the database, edited in the UI)
export const getSettings = () => api.get('/api/settings/');

export const updateSettings = (values) => api.put('/api/settings/', { values });

export const testSettings = () => api.post('/api/settings/test');

// First-run state: provider reachability, the model catalogue and whether any
// agent exists, in one round trip so the first screen doesn't flicker.
export const getOnboarding = () => api.get('/api/settings/onboarding');

export const completeOnboarding = () => api.post('/api/settings/onboarding/complete');

// Health check
export const healthCheck = () => api.get('/health');

export default api;
