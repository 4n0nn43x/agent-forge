import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, RotateCcw, FileText, Upload, MessageSquare, Key, Code2, Webhook } from 'lucide-react';
import useAgentStore from '../../store/agentStore';
import * as api from '../../services/api';
import LoadingSpinner from '../Common/LoadingSpinner';
import Alert from '../Common/Alert';
import ChatMessage from './ChatMessage';
import DocumentPanel from './DocumentPanel';
import ConversationList from './ConversationList';
import APIKeyManager from './APIKeyManager';
import WidgetCode from './WidgetCode';
import WebhookManager from './WebhookManager';

const ChatInterface = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { fetchAgent, currentAgent, loading } = useAgentStore();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // chat, docs, api-keys, webhooks, widget
  const [showConversations, setShowConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationListKey, setConversationListKey] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (agentId) {
      fetchAgent(parseInt(agentId));
    }
  }, [agentId, fetchAgent]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversationMessages = async (convId) => {
    try {
      setLoadingMessages(true);
      setError(null);
      const response = await api.getConversationMessages(convId);
      setMessages(response.data);
      setConversationId(convId);
    } catch (err) {
      setError('Failed to load conversation history');
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = (convId) => {
    loadConversationMessages(convId);
  };

  const handleNewChat = () => {
    if (
      messages.length > 0 &&
      window.confirm('Start a new conversation? Current chat will be saved.')
    ) {
      setMessages([]);
      setConversationId(null);
      setError(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    // Add user message to UI immediately
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, timestamp: new Date() },
    ]);

    setSending(true);

    try {
      const response = await api.sendMessage(
        parseInt(agentId),
        userMessage,
        conversationId
      );

      // Set conversation ID if this is the first message
      if (!conversationId) {
        setConversationId(response.data.conversation_id);
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.data.response,
          timestamp: new Date(),
          sources: response.data.sources,
        },
      ]);

      // Refresh conversation list
      setConversationListKey((prev) => prev + 1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading || !currentAgent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading agent..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col p-4">
      {/* Header - Fixed */}
      <div className="bg-surface rounded-md border border-rule p-4 mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-subtle rounded-md"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-ink">
                {currentAgent.name}
              </h1>
              <p className="text-sm text-muted">
                {currentAgent.description || `Chat with ${currentAgent.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {activeTab === 'chat' && (
              <button
                onClick={() => setShowConversations(!showConversations)}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>History</span>
              </button>
            )}
            {activeTab === 'chat' && (
              <button
                onClick={handleNewChat}
                className="btn btn-secondary flex items-center space-x-2"
                disabled={messages.length === 0}
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface rounded-md border border-rule mb-4 flex-shrink-0">
        <div className="flex border-b border-rule">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'chat'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-muted hover:text-ink hover:border-rule'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'docs'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-muted hover:text-ink hover:border-rule'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documents ({currentAgent.document_count})</span>
          </button>
          <button
            onClick={() => setActiveTab('api-keys')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'api-keys'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-muted hover:text-ink hover:border-rule'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>API Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'webhooks'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-muted hover:text-ink hover:border-rule'
            }`}
          >
            <Webhook className="w-4 h-4" />
            <span>Webhooks</span>
          </button>
          <button
            onClick={() => setActiveTab('widget')}
            className={`flex items-center space-x-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'widget'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-muted hover:text-ink hover:border-rule'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Widget & API</span>
          </button>
        </div>
      </div>

      {/* Main Content - Flexible */}
      <div className="flex space-x-4 flex-1 min-h-0">
        {/* Conversation History - Only show on chat tab */}
        {activeTab === 'chat' && showConversations && (
          <div className="w-80 flex-shrink-0">
            <ConversationList
              key={conversationListKey}
              agentId={parseInt(agentId)}
              currentConversationId={conversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <>
              {/* Error Alert */}
              {error && (
                <div className="mb-4 flex-shrink-0">
                  <Alert type="error" message={error} onClose={() => setError(null)} />
                </div>
              )}

              {/* Messages Container */}
              <div className="bg-surface rounded-md border border-rule flex-1 flex flex-col min-h-0">
                {/* Messages - Scrollable */}
                <div className="flex-1 overflow-y-auto thin-scroll p-6 space-y-6">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <LoadingSpinner size="lg" text="Loading conversation..." />
                    </div>
                  ) : messages.length === 0 ? (
                    // An empty screen is an invitation to act, so it states what
                    // this agent can actually do right now rather than greeting.
                    <div className="h-full flex items-center px-1">
                      <div className="max-w-prose">
                        <h3 className="text-base font-semibold text-ink">
                          {currentAgent.document_count > 0
                            ? 'Ask about your documents'
                            : 'No documents indexed yet'}
                        </h3>
                        <p className="mt-1.5 text-sm text-muted">
                          {currentAgent.document_count > 0 ? (
                            <>
                              Answers are drawn from{' '}
                              <span className="tnum">{currentAgent.document_count}</span>{' '}
                              indexed{' '}
                              {currentAgent.document_count === 1 ? 'document' : 'documents'},
                              and each one shows the passages it used.
                            </>
                          ) : (
                            <>
                              This agent will answer from its own knowledge until you add
                              documents. Upload some under Documents to ground its answers
                              in your material.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <ChatMessage key={idx} message={msg} />
                      ))}
                      {sending && (
                        <div className="flex justify-start">
                          <div className="bg-subtle rounded-md px-4 py-3">
                            <LoadingSpinner size="sm" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area - Fixed */}
                <div className="border-t border-rule p-4 flex-shrink-0">
                  <div className="flex space-x-3">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      maxLength={8000}
                      className="flex-1 resize-none input"
                      rows={2}
                      disabled={sending}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      className="btn btn-primary px-6"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-muted mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Documents Tab */}
          {activeTab === 'docs' && (
            <div className="flex-1 overflow-y-auto thin-scroll min-h-0 p-4">
              <DocumentPanel agentId={parseInt(agentId)} />
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <div className="flex-1 overflow-y-auto thin-scroll min-h-0 p-4">
              <APIKeyManager agentId={parseInt(agentId)} />
            </div>
          )}

          {/* Webhooks Tab */}
          {activeTab === 'webhooks' && (
            <div className="flex-1 overflow-y-auto thin-scroll min-h-0 p-4">
              <WebhookManager agentId={parseInt(agentId)} />
            </div>
          )}

          {/* Widget Tab */}
          {activeTab === 'widget' && (
            <div className="flex-1 overflow-y-auto thin-scroll min-h-0 p-4">
              <WidgetCode agentId={parseInt(agentId)} agentName={currentAgent.name} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
