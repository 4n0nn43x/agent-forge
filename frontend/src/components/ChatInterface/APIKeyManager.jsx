import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Check } from 'lucide-react';
import * as api from '../../services/api';
import Alert from '../Common/Alert';
import LoadingSpinner from '../Common/LoadingSpinner';

const APIKeyManager = ({ agentId }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState(null);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    loadAPIKeys();
  }, [agentId]);

  const loadAPIKeys = async () => {
    try {
      setLoading(true);
      const response = await api.getAPIKeys(agentId);
      setApiKeys(response.data);
    } catch (err) {
      console.error('Failed to load API keys:', err);
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const response = await api.createAPIKey(agentId, {
        name: newKeyName.trim(),
        rate_limit: 100,
      });

      setNewKeyData(response.data);
      setSuccess('API key created successfully!');
      await loadAPIKeys();
      setNewKeyName('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKey = async (keyId, keyName) => {
    if (!window.confirm(`Are you sure you want to delete "${keyName}"?`)) {
      return;
    }

    try {
      await api.deleteAPIKey(agentId, keyId);
      setSuccess('API key deleted successfully');
      await loadAPIKeys();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete API key');
    }
  };

  const handleToggleKey = async (keyId) => {
    try {
      await api.toggleAPIKey(agentId, keyId);
      await loadAPIKeys();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to toggle API key');
    }
  };

  const copyToClipboard = (text, keyId) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleKeyVisibility = (keyId) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const maskKey = (key) => {
    return key.substring(0, 10) + '•••••••••••••••••••' + key.substring(key.length - 4);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" text="Loading API keys..." />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">API Keys</h2>
            <p className="text-sm text-gray-600 mt-1">
              Generate API keys to use your agent via the Public API or embed it on websites
            </p>
          </div>
          <button
            onClick={() => setShowNewKeyModal(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New API Key</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}
        {success && (
          <div className="mb-4">
            <Alert type="success" message={success} onClose={() => setSuccess(null)} />
          </div>
        )}

        {/* New Key Created Modal */}
        {newKeyData && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="text-yellow-600 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-2">
                  Save your API key now!
                </p>
                <p className="text-sm text-gray-700 mb-3">
                  This is the only time you'll be able to see this key. Copy it and store it securely.
                </p>
                <div className="flex items-center space-x-2 bg-white p-3 rounded border border-gray-300">
                  <code className="flex-1 font-mono text-sm break-all">
                    {newKeyData.key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKeyData.key, 'new')}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Copy to clipboard"
                  >
                    {copiedKey === 'new' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => setNewKeyData(null)}
                  className="mt-3 text-sm text-gray-600 hover:text-gray-900"
                >
                  I've saved my API key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create New Key Modal */}
      {showNewKeyModal && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Create New API Key</h3>
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="API key name (e.g., Production Website)"
            className="input w-full mb-3"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateKey()}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleCreateKey}
              disabled={creating || !newKeyName.trim()}
              className="btn btn-primary"
            >
              {creating ? 'Creating...' : 'Create API Key'}
            </button>
            <button
              onClick={() => {
                setShowNewKeyModal(false);
                setNewKeyName('');
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-1">No API keys yet</p>
          <p className="text-sm text-gray-500">
            Create your first API key to start using the Public API
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className={`border rounded-lg p-4 ${
                key.is_active ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{key.name}</h4>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        key.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {key.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 mb-2">
                    <code className="text-sm font-mono text-gray-700 break-all">
                      {visibleKeys[key.id] ? key.key : maskKey(key.key)}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(key.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title={visibleKeys[key.id] ? 'Hide' : 'Show'}
                    >
                      {visibleKeys[key.id] ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={() => copyToClipboard(key.key, key.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Copy to clipboard"
                    >
                      {copiedKey === key.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Created: {formatDate(key.created_at)}</span>
                    {key.last_used_at && (
                      <span>Last used: {formatDate(key.last_used_at)}</span>
                    )}
                    <span>Rate limit: {key.rate_limit}/hour</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleToggleKey(key.id)}
                    className={`px-3 py-1 text-sm rounded ${
                      key.is_active
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {key.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(key.id, key.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage Instructions */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How to use your API key</h3>
        <p className="text-sm text-blue-800 mb-2">
          Use your API key to authenticate requests to the Public API:
        </p>
        <pre className="text-xs bg-blue-100 p-3 rounded overflow-x-auto">
          <code>
{`Authorization: Bearer YOUR_API_KEY

curl -X POST "http://localhost:8000/api/v1/public/chat" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Hello!"}'`}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default APIKeyManager;
