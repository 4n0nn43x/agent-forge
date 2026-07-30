import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import * as api from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';

const ConversationList = ({ agentId, currentConversationId, onSelectConversation, onNewChat }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [agentId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await api.getConversations(agentId);
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-md border border-rule h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-rule flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">Conversations</h3>
          <button
            onClick={onNewChat}
            className="p-2 hover:bg-subtle rounded-md transition-colors"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto thin-scroll min-h-0">
        {conversations.length === 0 ? (
          <div className="p-4">
            <p className="text-sm text-ink-soft">No conversations yet</p>
            <p className="text-xs text-muted mt-1">
              Each thread you start is saved here and can be reopened.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {conversations.map((conv) => (
              <button
                key={conv.conversation_id}
                onClick={() => onSelectConversation(conv.conversation_id)}
                aria-current={currentConversationId === conv.conversation_id ? 'true' : undefined}
                className={`w-full px-4 py-3 text-left transition-colors ${
                  currentConversationId === conv.conversation_id
                    ? 'bg-subtle'
                    : 'hover:bg-subtle'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${
                        currentConversationId === conv.conversation_id
                          ? 'font-medium text-ink'
                          : 'text-ink-soft'
                      }`}
                    >
                      {conv.title || `Conversation ${conv.id}`}
                    </p>
                    <p className="text-xs text-muted mt-0.5 tnum">
                      {conv.message_count} {conv.message_count === 1 ? 'message' : 'messages'}
                    </p>
                  </div>
                  <span className="val-bare ml-2 whitespace-nowrap flex-shrink-0">
                    {formatDate(conv.updated_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
