import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAgentStore from '../../store/agentStore';
import LoadingSpinner from '../Common/LoadingSpinner';
import Alert from '../Common/Alert';
import AgentCard from './AgentCard';
import Mark from '../Common/Mark';
import { Search } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { agents, loading, error, fetchAgents, clearError } = useAgentStore();
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return agents;
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(needle) ||
        agent.description?.toLowerCase().includes(needle) ||
        agent.llm_model?.toLowerCase().includes(needle)
    );
  }, [agents, query]);

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" text="Loading agents" />
      </div>
    );
  }

  // The empty state is the first screen every new install shows, so it names the
  // three steps rather than just pointing at a button.
  if (agents.length === 0) {
    return (
      <div className="max-w-prose">
        {error && <Alert type="error" message={error} onClose={clearError} />}

        <div className="mt-2 flex items-center gap-3">
          <Mark className="w-7 h-7 text-primary-600" />
          <h1 className="text-2xl font-semibold text-ink">Build your first agent</h1>
        </div>

        <p className="mt-3 text-muted">
          An agent is a chat model with your documents behind it. Pick a starting point,
          upload what it should know, and talk to it.
        </p>

        <ol className="mt-7 flex flex-col gap-4">
          {[
            ['Start from a template', 'Support, documentation, lead qualification, or blank.'],
            ['Add your documents', 'PDF, DOCX, Markdown or text. They are chunked and indexed.'],
            ['Chat, then embed it', 'Use it here, call the API, or drop the widget on your site.'],
          ].map(([title, detail], index) => (
            <li key={title} className="flex gap-3.5">
              {/* Numbered because these really are sequential steps. */}
              <span className="val flex-shrink-0 w-6 h-6 justify-center">{index + 1}</span>
              <div>
                <p className="text-sm font-medium text-ink">{title}</p>
                <p className="text-sm text-muted">{detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => navigate('/create')}
          className="btn btn-primary btn-lg mt-8"
        >
          Create an agent
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Agents</h1>
          <p className="mt-1.5 text-sm text-muted">
            <span className="tnum">{agents.length}</span>{' '}
            {agents.length === 1 ? 'agent' : 'agents'} configured
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
          <input
            type="search"
            placeholder="Search name or model"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="input pl-9"
            aria-label="Search agents"
          />
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={clearError} />}

      {filtered.length === 0 ? (
        <div className="panel px-5 py-12 text-center">
          <p className="text-sm text-muted">
            Nothing matches <span className="val">{query}</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
