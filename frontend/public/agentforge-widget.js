/**
 * AgentForge Widget - Embeddable Chat Widget
 *
 * Usage:
 * <script src="https://your-domain.com/agentforge-widget.js"></script>
 * <script>
 *   AgentForge.init({
 *     apiKey: 'af_xxxxxxxxxxxxx',
 *     apiUrl: 'https://your-api.com/api/v1/public',
 *     position: 'bottom-right', // or 'bottom-left'
 *     primaryColor: '#3B82F6',
 *     title: 'Chat with us!',
 *     subtitle: 'We typically reply in a few minutes',
 *     placeholder: 'Type your message...',
 *     avatar: 'https://example.com/avatar.png' // optional
 *   });
 * </script>
 */

(function(window, document) {
  'use strict';

  const AgentForge = {
    config: {
      apiKey: '',
      apiUrl: '',
      position: 'bottom-right',
      primaryColor: '#3B82F6',
      title: 'Chat with us!',
      subtitle: 'We typically reply in a few minutes',
      placeholder: 'Type your message...',
      avatar: null,
      zIndex: 9999,
      welcomeMessage: 'Hi! 👋 How can I help you today?'
    },

    conversationId: null,
    isOpen: false,
    messages: [],

    init: function(userConfig) {
      // Merge user config with defaults
      this.config = { ...this.config, ...userConfig };

      if (!this.config.apiKey) {
        console.error('AgentForge: API key is required');
        return;
      }

      if (!this.config.apiUrl) {
        console.error('AgentForge: API URL is required');
        return;
      }

      // Load conversation ID and messages from localStorage
      this.conversationId = localStorage.getItem('agentforge_conversation_id');
      const savedMessages = localStorage.getItem('agentforge_messages');
      if (savedMessages) {
        try {
          this.messages = JSON.parse(savedMessages);
        } catch (e) {
          console.error('Failed to load messages from localStorage', e);
          this.messages = [];
        }
      }

      // Create widget HTML
      this.createWidget();

      // Attach event listeners
      this.attachEventListeners();

      // Load conversation history or show welcome message
      this.loadConversationHistory();
    },

    createWidget: function() {
      const position = this.config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;';

      const widgetHTML = `
        <div id="agentforge-widget" style="
          position: fixed;
          bottom: 20px;
          ${position}
          z-index: ${this.config.zIndex};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        ">
          <!-- Chat Button -->
          <button id="agentforge-button" style="
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${this.config.primaryColor};
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>

          <!-- Chat Window -->
          <div id="agentforge-chat" style="
            display: none;
            position: absolute;
            bottom: 80px;
            ${this.config.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
            width: 380px;
            height: 600px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            flex-direction: column;
            overflow: hidden;
          ">
            <!-- Header -->
            <div style="
              background: ${this.config.primaryColor};
              color: white;
              padding: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <div style="display: flex; align-items: center; gap: 12px;">
                ${this.config.avatar ? `<img src="${this.config.avatar}" style="width: 40px; height: 40px; border-radius: 50%;" />` : ''}
                <div>
                  <div style="font-weight: 600; font-size: 16px;">${this.config.title}</div>
                  <div style="font-size: 12px; opacity: 0.9;">${this.config.subtitle}</div>
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="agentforge-reset" style="
                  background: transparent;
                  border: none;
                  color: white;
                  cursor: pointer;
                  padding: 4px;
                  opacity: 0.7;
                  transition: opacity 0.2s;
                " title="New conversation">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <polyline points="23 20 23 14 17 14"></polyline>
                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                  </svg>
                </button>
                <button id="agentforge-close" style="
                  background: transparent;
                  border: none;
                  color: white;
                  cursor: pointer;
                  padding: 4px;
                ">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Messages -->
            <div id="agentforge-messages" style="
              flex: 1;
              overflow-y: auto;
              padding: 20px;
              display: flex;
              flex-direction: column;
              gap: 12px;
              background: #F9FAFB;
            ">
            </div>

            <!-- Input -->
            <div style="
              border-top: 1px solid #E5E7EB;
              padding: 16px;
              background: white;
            ">
              <div style="display: flex; gap: 8px;">
                <input
                  id="agentforge-input"
                  type="text"
                  placeholder="${this.config.placeholder}"
                  style="
                    flex: 1;
                    padding: 12px;
                    border: 1px solid #E5E7EB;
                    border-radius: 8px;
                    font-size: 14px;
                    outline: none;
                    font-family: inherit;
                    color: #1F2937;
                    background: white;
                    box-sizing: border-box;
                  "
                />
                <button id="agentforge-send" style="
                  background: ${this.config.primaryColor};
                  color: white;
                  border: none;
                  border-radius: 8px;
                  padding: 12px 16px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', widgetHTML);
    },

    attachEventListeners: function() {
      const button = document.getElementById('agentforge-button');
      const closeBtn = document.getElementById('agentforge-close');
      const resetBtn = document.getElementById('agentforge-reset');
      const sendBtn = document.getElementById('agentforge-send');
      const input = document.getElementById('agentforge-input');

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleChat();
      });

      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleChat();
      });

      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.resetConversation();
      });

      resetBtn.addEventListener('mouseenter', function() {
        this.style.opacity = '1';
      });

      resetBtn.addEventListener('mouseleave', function() {
        this.style.opacity = '0.7';
      });

      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.sendMessage();
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Hover effect
      button.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
      });
      button.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
      });
    },

    resetConversation: function() {
      if (confirm('Start a new conversation? Current chat history will be cleared.')) {
        // Clear localStorage
        localStorage.removeItem('agentforge_conversation_id');
        localStorage.removeItem('agentforge_messages');

        // Reset state
        this.conversationId = null;
        this.messages = [];

        // Reload UI
        this.loadConversationHistory();
      }
    },

    loadConversationHistory: function() {
      const messagesContainer = document.getElementById('agentforge-messages');

      if (this.messages.length === 0) {
        // Show welcome message for first-time users
        const welcomeHTML = `
          <div style="
            display: flex;
            justify-content: flex-start;
          ">
            <div style="
              max-width: 70%;
              padding: 12px 16px;
              border-radius: 12px;
              background: #FFFFFF;
              color: #1F2937;
              font-size: 14px;
              line-height: 1.5;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            ">
              ${this.config.welcomeMessage}
            </div>
          </div>
        `;
        messagesContainer.innerHTML = welcomeHTML;
      } else {
        // Load existing messages
        messagesContainer.innerHTML = '';
        this.messages.forEach(msg => {
          const isUser = msg.role === 'user';
          const messageHTML = `
            <div style="
              display: flex;
              justify-content: ${isUser ? 'flex-end' : 'flex-start'};
            ">
              <div style="
                max-width: 70%;
                padding: 12px 16px;
                border-radius: 12px;
                background: ${isUser ? this.config.primaryColor : '#FFFFFF'};
                color: ${isUser ? 'white' : '#1F2937'};
                font-size: 14px;
                line-height: 1.5;
                box-shadow: ${isUser ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'};
                word-wrap: break-word;
              ">
                ${this.escapeHtml(msg.content)}
              </div>
            </div>
          `;
          messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    },

    toggleChat: function() {
      const chat = document.getElementById('agentforge-chat');
      const button = document.getElementById('agentforge-button');

      this.isOpen = !this.isOpen;

      if (this.isOpen) {
        chat.style.display = 'flex';
        button.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
      } else {
        chat.style.display = 'none';
        button.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `;
      }
    },

    addMessage: function(role, content) {
      const messagesContainer = document.getElementById('agentforge-messages');

      // Remove welcome message if present and this is the first real message
      if (this.messages.length === 0) {
        messagesContainer.innerHTML = '';
      }

      const isUser = role === 'user';
      const messageHTML = `
        <div style="
          display: flex;
          justify-content: ${isUser ? 'flex-end' : 'flex-start'};
        ">
          <div style="
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 12px;
            background: ${isUser ? this.config.primaryColor : '#FFFFFF'};
            color: ${isUser ? 'white' : '#1F2937'};
            font-size: 14px;
            line-height: 1.5;
            box-shadow: ${isUser ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'};
            word-wrap: break-word;
          ">
            ${this.escapeHtml(content)}
          </div>
        </div>
      `;

      messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Save message to array and localStorage
      this.messages.push({ role, content });
      this.saveMessages();
    },

    saveMessages: function() {
      try {
        localStorage.setItem('agentforge_messages', JSON.stringify(this.messages));
      } catch (e) {
        console.error('Failed to save messages to localStorage', e);
      }
    },

    escapeHtml: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    addTypingIndicator: function() {
      const messagesContainer = document.getElementById('agentforge-messages');
      const typingHTML = `
        <div id="agentforge-typing" style="
          display: flex;
          justify-content: flex-start;
        ">
          <div style="
            padding: 12px 16px;
            border-radius: 12px;
            background: #FFFFFF;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          ">
            <div style="display: flex; gap: 4px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: #9CA3AF; animation: agentforge-bounce 1.4s infinite ease-in-out both; animation-delay: -0.32s;"></div>
              <div style="width: 8px; height: 8px; border-radius: 50%; background: #9CA3AF; animation: agentforge-bounce 1.4s infinite ease-in-out both; animation-delay: -0.16s;"></div>
              <div style="width: 8px; height: 8px; border-radius: 50%; background: #9CA3AF; animation: agentforge-bounce 1.4s infinite ease-in-out both;"></div>
            </div>
          </div>
        </div>
      `;
      messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Add keyframe animation
      if (!document.getElementById('agentforge-styles')) {
        const style = document.createElement('style');
        style.id = 'agentforge-styles';
        style.textContent = `
          @keyframes agentforge-bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `;
        document.head.appendChild(style);
      }
    },

    removeTypingIndicator: function() {
      const typing = document.getElementById('agentforge-typing');
      if (typing) {
        typing.remove();
      }
    },

    sendMessage: async function() {
      const input = document.getElementById('agentforge-input');
      if (!input) {
        console.error('Input element not found');
        return;
      }

      const message = input.value.trim();

      if (!message) return;

      // Add user message to UI
      this.addMessage('user', message);
      input.value = '';

      // Focus back to input
      input.focus();

      // Show typing indicator
      this.addTypingIndicator();

      try {
        const response = await fetch(`${this.config.apiUrl}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            message: message,
            conversation_id: this.conversationId
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Failed to send message');
        }

        // Save conversation ID
        if (data.conversation_id) {
          this.conversationId = data.conversation_id;
          localStorage.setItem('agentforge_conversation_id', this.conversationId);
        }

        // Remove typing indicator
        this.removeTypingIndicator();

        // Add assistant message
        this.addMessage('assistant', data.response);

      } catch (error) {
        this.removeTypingIndicator();
        this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        console.error('AgentForge error:', error);
      }
    }
  };

  // Expose to global scope
  window.AgentForge = AgentForge;

})(window, document);
