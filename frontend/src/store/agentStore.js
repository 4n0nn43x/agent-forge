import { create } from 'zustand';
import * as api from '../services/api';

const useAgentStore = create((set, get) => ({
  // State
  agents: [],
  currentAgent: null,
  templates: {},
  loading: false,
  error: null,

  // Actions
  fetchTemplates: async () => {
    try {
      const response = await api.getTemplates();
      set({ templates: response.data.templates });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      set({ error: error.message });
    }
  },

  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAgents();
      set({ agents: response.data, loading: false });
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      set({ error: error.message, loading: false });
    }
  },

  fetchAgent: async (agentId) => {
    set({ loading: true, error: null });
    try {
      const response = await api.getAgent(agentId);
      set({ currentAgent: response.data, loading: false });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch agent:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createAgent: async (agentData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.createAgent(agentData);
      set((state) => ({
        agents: [response.data, ...state.agents],
        loading: false,
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to create agent:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createAgentFromTemplate: async (templateName, agentName, llmModel) => {
    set({ loading: true, error: null });
    try {
      const response = await api.createAgentFromTemplate(templateName, agentName, llmModel);
      set((state) => ({
        agents: [response.data, ...state.agents],
        loading: false,
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to create agent from template:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateAgent: async (agentId, agentData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.updateAgent(agentId, agentData);
      set((state) => ({
        agents: state.agents.map((a) => (a.id === agentId ? response.data : a)),
        currentAgent: state.currentAgent?.id === agentId ? response.data : state.currentAgent,
        loading: false,
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to update agent:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  deleteAgent: async (agentId) => {
    set({ loading: true, error: null });
    try {
      await api.deleteAgent(agentId);
      set((state) => ({
        agents: state.agents.filter((a) => a.id !== agentId),
        loading: false,
      }));
    } catch (error) {
      console.error('Failed to delete agent:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  duplicateAgent: async (agentId, newName) => {
    set({ loading: true, error: null });
    try {
      const response = await api.duplicateAgent(agentId, newName);
      set((state) => ({
        agents: [response.data, ...state.agents],
        loading: false,
      }));
      return response.data;
    } catch (error) {
      console.error('Failed to duplicate agent:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAgentStore;
