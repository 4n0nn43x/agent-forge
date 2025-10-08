import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Power, Eye, EyeOff, Check, Copy, AlertCircle } from 'lucide-react';
import * as api from '../../services/api';
import Alert from '../Common/Alert';
import LoadingSpinner from '../Common/LoadingSpinner';

const WebhookManager = ({ agentId }) => {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showNewWebhookForm, setShowNewWebhookForm] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState({});
  const [copiedSecret, setCopiedSecret] = useState(null);

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [],
    secret: '',
    retry_count: 3,
  });

  const availableEvents = [
    { value: 'message.sent', label: 'Message Sent', description: 'Triggered when a message is sent' },
    { value: 'conversation.started', label: 'Conversation Started', description: 'Triggered when a conversation starts' },
    { value: 'conversation.ended', label: 'Conversation Ended', description: 'Triggered when a conversation ends' },
    { value: 'document.uploaded', label: 'Document Uploaded', description: 'Triggered when a document is uploaded' },
    { value: 'agent.updated', label: 'Agent Updated', description: 'Triggered when agent config is updated' },
  ];

  useEffect(() => {
    loadWebhooks();
  }, [agentId]);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const response = await api.getWebhooks(agentId);
      setWebhooks(response.data);
    } catch (err) {
      console.error('Failed to load webhooks:', err);
      setError('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      await api.createWebhook(agentId, newWebhook);
      setSuccess('Webhook created successfully!');
      setShowNewWebhookForm(false);
      setNewWebhook({ name: '', url: '', events: [], secret: '', retry_count: 3 });
      await loadWebhooks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create webhook');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWebhook = async (webhookId, webhookName) => {
    if (!window.confirm(`Are you sure you want to delete "${webhookName}"?`)) {
      return;
    }

    try {
      await api.deleteWebhook(agentId, webhookId);
      setSuccess('Webhook deleted successfully');
      await loadWebhooks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete webhook');
    }
  };

  const handleToggleWebhook = async (webhookId) => {
    try {
      await api.toggleWebhook(agentId, webhookId);
      await loadWebhooks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to toggle webhook');
    }
  };

  const handleTestWebhook = async (webhookId, webhookName) => {
    try {
      await api.testWebhook(agentId, webhookId);
      setSuccess(`Test webhook sent to "${webhookName}" successfully!`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send test webhook');
    }
  };

  const loadWebhookLogs = async (webhookId) => {
    try {
      setLoadingLogs(true);
      const response = await api.getWebhookLogs(agentId, webhookId);
      setLogs(response.data);
      setSelectedWebhook(webhookId);
    } catch (err) {
      setError('Failed to load webhook logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const toggleEventSelection = (event) => {
    setNewWebhook((prev) => {
      const events = prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event];
      return { ...prev, events };
    });
  };

  const toggleSecretVisibility = (webhookId) => {
    setVisibleSecrets((prev) => ({
      ...prev,
      [webhookId]: !prev[webhookId],
    }));
  };

  const copySecret = (secret, webhookId) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(webhookId);
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" text="Loading webhooks..." />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Webhooks</h2>
            <p className="text-sm text-gray-600 mt-1">
              Integrate with external services and receive real-time notifications
            </p>
          </div>
          <button
            onClick={() => setShowNewWebhookForm(!showNewWebhookForm)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Webhook</span>
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

        {/* New Webhook Form */}
        {showNewWebhookForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Create New Webhook</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                  placeholder="Production Slack Notifications"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL <span className="text-red-600">*</span>
                </label>
                <input
                  type="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Events <span className="text-red-600">*</span>
                </label>
                <div className="space-y-2">
                  {availableEvents.map((event) => (
                    <label key={event.value} className="flex items-start space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event.value)}
                        onChange={() => toggleEventSelection(event.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{event.label}</div>
                        <div className="text-xs text-gray-500">{event.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret (Optional)
                </label>
                <input
                  type="text"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                  className="input w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used to sign webhook payloads for security verification
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retry Count
                </label>
                <input
                  type="number"
                  value={newWebhook.retry_count}
                  onChange={(e) => setNewWebhook({ ...newWebhook, retry_count: parseInt(e.target.value) })}
                  min="0"
                  max="10"
                  className="input w-32"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleCreateWebhook}
                  disabled={creating || !newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
                  className="btn btn-primary"
                >
                  {creating ? 'Creating...' : 'Create Webhook'}
                </button>
                <button
                  onClick={() => {
                    setShowNewWebhookForm(false);
                    setNewWebhook({ name: '', url: '', events: [], secret: '', retry_count: 3 });
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-1">No webhooks yet</p>
          <p className="text-sm text-gray-500">
            Create your first webhook to receive real-time notifications
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={`border rounded-lg p-4 ${
                webhook.is_active ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{webhook.name}</h4>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        webhook.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {webhook.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{webhook.url}</span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Created: {formatDate(webhook.created_at)}</div>
                    {webhook.last_triggered_at && (
                      <div>Last triggered: {formatDate(webhook.last_triggered_at)}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleTestWebhook(webhook.id, webhook.name)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Test Webhook"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => loadWebhookLogs(webhook.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    title="View Logs"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleWebhook(webhook.id)}
                    className={`px-3 py-1 text-sm rounded ${
                      webhook.is_active
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                    }`}
                  >
                    {webhook.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id, webhook.name)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Webhook Logs */}
              {selectedWebhook === webhook.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-semibold text-gray-900 mb-2">Recent Deliveries</h5>
                  {loadingLogs ? (
                    <LoadingSpinner size="sm" />
                  ) : logs.length === 0 ? (
                    <p className="text-sm text-gray-500">No deliveries yet</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-2 rounded text-sm ${
                            log.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{log.event_type}</span>
                            <span className="text-xs text-gray-600">{formatDate(log.created_at)}</span>
                          </div>
                          {log.status_code && (
                            <div className="text-xs mt-1">Status: {log.status_code}</div>
                          )}
                          {log.error_message && (
                            <div className="text-xs text-red-700 mt-1">{log.error_message}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedWebhook(null)}
                    className="mt-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Hide Logs
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Integration Help */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Integration Examples</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Slack:</strong> Use Slack Incoming Webhooks URL</p>
          <p>• <strong>Discord:</strong> Create a webhook in Server Settings → Integrations</p>
          <p>• <strong>Zapier/Make:</strong> Use their webhook trigger URL</p>
          <p>• <strong>Custom:</strong> Any endpoint that accepts POST requests with JSON</p>
        </div>
      </div>
    </div>
  );
};

export default WebhookManager;
