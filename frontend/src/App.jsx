import React, { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import AgentBuilder from './components/AgentBuilder/AgentBuilder';
import ChatInterface from './components/ChatInterface/ChatInterface';
import useAgentStore from './store/agentStore';
import { Bot, Plus, Home } from 'lucide-react';

function App() {
  const location = useLocation();
  const { fetchTemplates } = useAgentStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Bot className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">AgentForge</span>
            </Link>

            <nav className="flex items-center space-x-4">
              <Link
                to="/"
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/'
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/create"
                className="flex items-center space-x-2 btn btn-primary"
              >
                <Plus className="w-5 h-5" />
                <span>Create Agent</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<AgentBuilder />} />
          <Route path="/agent/:agentId" element={<ChatInterface />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-500 text-sm">
            <p>AgentForge - No-Code AI Agent Builder</p>
            <p className="mt-1">Built for NodeOps Hackathon 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
