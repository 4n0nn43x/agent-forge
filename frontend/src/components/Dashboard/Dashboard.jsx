import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAgentStore from '../../store/agentStore';
import LoadingSpinner from '../Common/LoadingSpinner';
import Alert from '../Common/Alert';
import AgentCard from './AgentCard';
import { Bot, Search } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { agents, loading, error, fetchAgents, clearError } = useAgentStore();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading agents..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Agents</h1>
        <p className="mt-2 text-gray-600">
          Manage and interact with your AI agents
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert type="error" message={error} onClose={clearError} />
      )}

      {/* Search */}
      {agents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      )}

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <div className="text-center py-12">
          <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No agents yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first AI agent to get started
          </p>
          <button
            onClick={() => navigate('/create')}
            className="btn btn-primary"
          >
            Create Your First Agent
          </button>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No agents match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
