import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Templates
export const getTemplates = () => api.get('/api/agents/templates');

export const createAgentFromTemplate = (templateName, agentName, llmModel = 'gpt-4') =>
  api.post('/api/agents/from-template', null, {
    params: { template_name: templateName, agent_name: agentName, llm_model: llmModel },
  });

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

// Health check
export const healthCheck = () => api.get('/health');

export default api;
