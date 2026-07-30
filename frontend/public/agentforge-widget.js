/**
 * AgentForge Widget — embeddable chat.
 *
 * Renders into a shadow root, so the host page's CSS cannot reach in and the
 * widget's CSS cannot leak out. Previously every node carried inline styles: a
 * `button { }` rule on the host could break the launcher, and the host had no way
 * to restyle anything.
 *
 * Theming is a CSS custom property contract on the host element. Set the
 * properties from your own stylesheet, or pass `theme` / `tokens` to init():
 *
 *   agentforge-widget { --af-accent: #6d28d9; --af-radius: 2px; }
 *
 * Usage:
 *   <script src="https://your-domain.com/agentforge-widget.js"></script>
 *   <script>
 *     AgentForge.init({
 *       apiKey: 'af_xxxxxxxxxxxxx',
 *       apiUrl: 'https://your-api.com/api/v1/public',
 *       name: 'Support',
 *       position: 'bottom-right',
 *       theme: 'auto',                  // 'auto' | 'light' | 'dark'
 *       showSources: false,             // cite the documents behind each answer
 *       tokens: { accent: '#0E6F7E' }   // any token below, without the --af- prefix
 *     });
 *   </script>
 */

(function (window, document) {
  'use strict';

  var TAG = 'agentforge-widget';
  var STORE_CONVERSATION = 'agentforge_conversation_id';
  var STORE_MESSAGES = 'agentforge_messages';

  /**
   * The theming contract. Anything here can be overridden by the host, either in
   * CSS on the <agentforge-widget> element or via init({ tokens }).
   *
   * --af-font defaults to `inherit`: on someone else's site, adopting their type
   * stack reads as part of the page rather than bolted onto it.
   */
  var TOKENS = {
    light: {
      accent: '#0E6F7E',
      'accent-fg': '#ffffff',
      surface: '#ffffff',
      ground: '#fcfcfb',
      text: '#1a1817',
      muted: '#75706b',
      border: '#e6e4e0',
      'user-bg': '#f5f4f2',
      shadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.08)'
    },
    dark: {
      accent: '#74b7c3',
      'accent-fg': '#0c0b0a',
      surface: '#171614',
      ground: '#0c0b0a',
      text: '#faf9f7',
      muted: '#a29d96',
      border: '#2e2b28',
      'user-bg': '#211f1d',
      shadow: '0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.5)'
    },
    shared: {
      radius: '10px',
      'radius-sm': '6px',
      font: 'inherit',
      'font-mono': 'ui-monospace, SFMono-Regular, Menlo, monospace',
      width: '380px',
      height: '560px'
    }
  };

  var AgentForge = {
    config: {
      apiKey: '',
      apiUrl: '',
      name: 'Support',
      position: 'bottom-right',
      theme: 'auto',
      tokens: {},
      subtitle: '',
      placeholder: 'Ask a question',
      // No emoji, and not "Chat with us!". This is the line every embedder ships
      // untouched, so the default should be something worth leaving alone.
      welcomeMessage: '',
      avatar: null,
      zIndex: 2147483000,
      openOnLoad: false,
      // Off by default, and the server withholds them too unless you enable
      // "Return source citations on the public API" in Settings. A visitor has no
      // use for an internal filename or a retrieval score.
      showSources: false
    },

    host: null,
    root: null,
    conversationId: null,
    messages: [],
    isOpen: false,
    isSending: false,

    init: function (userConfig) {
      var cfg = Object.assign({}, userConfig || {});

      // `primaryColor` was the only theming knob in the previous version.
      // Kept as an alias so existing embeds keep working.
      if (cfg.primaryColor && !(cfg.tokens && cfg.tokens.accent)) {
        cfg.tokens = Object.assign({ accent: cfg.primaryColor }, cfg.tokens || {});
      }
      // `title` used to name the header; `name` says what it actually is.
      if (cfg.title && !cfg.name) cfg.name = cfg.title;

      this.config = Object.assign({}, this.config, cfg);

      if (!this.config.apiKey) {
        console.error('AgentForge: apiKey is required');
        return;
      }
      if (!this.config.apiUrl) {
        console.error('AgentForge: apiUrl is required');
        return;
      }

      this.restore();
      this.mount();

      if (this.config.openOnLoad) this.open();
      return this;
    },

    // ---------------------------------------------------------------- storage

    restore: function () {
      try {
        this.conversationId = window.localStorage.getItem(STORE_CONVERSATION);
        var saved = window.localStorage.getItem(STORE_MESSAGES);
        this.messages = saved ? JSON.parse(saved) : [];
        if (!Array.isArray(this.messages)) this.messages = [];
      } catch (e) {
        this.messages = [];
      }
    },

    persist: function () {
      try {
        window.localStorage.setItem(STORE_MESSAGES, JSON.stringify(this.messages.slice(-50)));
        if (this.conversationId) {
          window.localStorage.setItem(STORE_CONVERSATION, this.conversationId);
        }
      } catch (e) {
        /* quota or private mode: the thread just won't survive a reload */
      }
    },

    resetConversation: function () {
      this.conversationId = null;
      this.messages = [];
      try {
        window.localStorage.removeItem(STORE_CONVERSATION);
        window.localStorage.removeItem(STORE_MESSAGES);
      } catch (e) {}
      this.renderMessages();
      this.sizeComposer();
      this.focusInput();
    },

    // ------------------------------------------------------------------ mount

    mount: function () {
      var existing = document.querySelector(TAG);
      if (existing) existing.remove();

      this.host = document.createElement(TAG);
      this.host.setAttribute('data-position', this.config.position);
      this.host.style.cssText =
        'position:fixed;z-index:' + this.config.zIndex + ';' +
        (this.config.position === 'bottom-left' ? 'left:20px;' : 'right:20px;') +
        'bottom:20px;';

      // Tokens from init() land on the host element, so host CSS can still win.
      this.setTokens(this.config.tokens);

      this.root = this.host.attachShadow({ mode: 'open' });
      this.root.appendChild(this.styleNode());
      this.root.appendChild(this.markup());

      document.body.appendChild(this.host);
      this.bind();
      this.renderMessages();
      this.applyTheme();
    },

    /** Resolve 'auto' against the host page's colour scheme, and keep following it. */
    applyTheme: function () {
      var self = this;
      var query = window.matchMedia('(prefers-color-scheme: dark)');
      var resolve = function () {
        var theme = self.config.theme;
        if (theme === 'auto') theme = query.matches ? 'dark' : 'light';
        self.host.setAttribute('data-theme', theme);
      };
      resolve();
      if (query.addEventListener) query.addEventListener('change', resolve);
      else if (query.addListener) query.addListener(resolve);
    },

    styleNode: function () {
      var vars = function (map) {
        return Object.keys(map).map(function (k) {
          return '--af-' + k + ':' + map[k] + ';';
        }).join('');
      };

      var style = document.createElement('style');
      style.textContent = [
        /* Defaults on :host, so anything set on the element itself wins. */
        ':host{' + vars(TOKENS.shared) + vars(TOKENS.light) + '}',
        ':host([data-theme="dark"]){' + vars(TOKENS.dark) + '}',

        '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}',
        '.wrap{font-family:var(--af-font);font-size:14px;line-height:1.5;color:var(--af-text);' +
          '-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;align-items:flex-end;gap:12px;}',
        ':host([data-position="bottom-left"]) .wrap{align-items:flex-start;}',

        /* Launcher */
        '.launcher{display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 18px;' +
          'border:none;border-radius:999px;background:var(--af-accent);color:var(--af-accent-fg);' +
          'font:inherit;font-weight:500;cursor:pointer;box-shadow:var(--af-shadow);' +
          'transition:transform .15s ease,filter .15s ease;}',
        '.launcher:hover{filter:brightness(1.08);}',
        '.launcher:active{transform:scale(.97);}',
        '.launcher:focus-visible{outline:2px solid var(--af-accent);outline-offset:3px;}',
        '.launcher svg{width:18px;height:18px;flex:0 0 auto;}',

        /* Panel */
        '.panel{width:min(var(--af-width),calc(100vw - 32px));height:min(var(--af-height),calc(100vh - 120px));' +
          'display:none;flex-direction:column;overflow:hidden;background:var(--af-surface);' +
          'border:1px solid var(--af-border);border-radius:var(--af-radius);box-shadow:var(--af-shadow);' +
          'opacity:0;transform:translateY(8px) scale(.98);' +
          'transition:opacity .18s ease,transform .18s ease;}',
        '.panel[data-open="true"]{display:flex;}',
        '.panel[data-shown="true"]{opacity:1;transform:none;}',

        '.head{display:flex;align-items:center;gap:10px;padding:14px 14px 14px 16px;' +
          'border-bottom:1px solid var(--af-border);background:var(--af-surface);}',
        '.avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;flex:0 0 auto;' +
          'background:var(--af-accent);}',
        '.who{min-width:0;flex:1;}',
        '.name{font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.sub{font-size:12px;color:var(--af-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.icon-btn{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;' +
          'border:none;border-radius:var(--af-radius-sm);background:transparent;color:var(--af-muted);' +
          'cursor:pointer;transition:background .15s ease,color .15s ease;}',
        '.icon-btn:hover{background:var(--af-user-bg);color:var(--af-text);}',
        '.icon-btn:focus-visible{outline:2px solid var(--af-accent);outline-offset:1px;}',
        '.icon-btn svg{width:16px;height:16px;}',

        '.log{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:16px;' +
          'display:flex;flex-direction:column;gap:12px;background:var(--af-ground);}',
        '.empty{margin:auto 0;color:var(--af-muted);font-size:13px;}',
        '.empty strong{display:block;color:var(--af-text);font-size:14px;margin-bottom:4px;}',

        '.msg{max-width:86%;padding:9px 12px;border-radius:var(--af-radius-sm);' +
          'white-space:pre-wrap;overflow-wrap:anywhere;animation:af-in .2s ease both;}',
        '.msg.user{align-self:flex-end;background:var(--af-user-bg);border:1px solid var(--af-border);}',
        '.msg.agent{align-self:flex-start;background:var(--af-surface);border:1px solid var(--af-border);}',
        '.msg.error{align-self:stretch;max-width:100%;background:transparent;' +
          'border:1px dashed var(--af-border);color:var(--af-muted);font-size:13px;}',
        '@keyframes af-in{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}',

        '.sources{margin-top:6px;padding-top:6px;border-top:1px solid var(--af-border);' +
          'font-family:var(--af-font-mono);font-size:11px;color:var(--af-muted);' +
          'display:flex;flex-direction:column;gap:2px;}',

        '.typing{align-self:flex-start;display:flex;gap:4px;padding:12px;}',
        '.typing i{width:6px;height:6px;border-radius:50%;background:var(--af-muted);' +
          'animation:af-bounce 1.2s infinite ease-in-out;}',
        '.typing i:nth-child(2){animation-delay:.15s;}',
        '.typing i:nth-child(3){animation-delay:.3s;}',
        '@keyframes af-bounce{0%,60%,100%{opacity:.3;transform:translateY(0);}' +
          '30%{opacity:1;transform:translateY(-3px);}}',

        '.compose{display:flex;gap:8px;align-items:flex-end;padding:12px;' +
          'border-top:1px solid var(--af-border);background:var(--af-surface);}',
        'textarea{flex:1;resize:none;max-height:96px;overflow-y:hidden;padding:9px 11px;' +
          'font:inherit;line-height:1.45;color:var(--af-text);background:var(--af-ground);' +
          'border:1px solid var(--af-border);border-radius:var(--af-radius-sm);}',
        'textarea::placeholder{color:var(--af-muted);}',
        'textarea:focus{outline:none;border-color:var(--af-accent);}',
        '.send{width:36px;height:36px;flex:0 0 auto;display:inline-flex;align-items:center;' +
          'justify-content:center;border:none;border-radius:var(--af-radius-sm);' +
          'background:var(--af-accent);color:var(--af-accent-fg);cursor:pointer;' +
          'transition:filter .15s ease;}',
        '.send:hover:not(:disabled){filter:brightness(1.08);}',
        '.send:disabled{opacity:.4;cursor:not-allowed;}',
        '.send:focus-visible{outline:2px solid var(--af-accent);outline-offset:2px;}',
        '.send svg{width:16px;height:16px;}',

        '.foot{padding:0 12px 10px;font-size:11px;color:var(--af-muted);background:var(--af-surface);}',

        /* The platform scrollbar ships stepper arrows and a wide track, which read
           as a broken control inside a 380px panel. */
        '.log,textarea{scrollbar-width:thin;scrollbar-color:var(--af-border) transparent;}',
        '.log::-webkit-scrollbar,textarea::-webkit-scrollbar{width:8px;height:8px;}',
        '.log::-webkit-scrollbar-track,textarea::-webkit-scrollbar-track{background:transparent;}',
        '.log::-webkit-scrollbar-thumb,textarea::-webkit-scrollbar-thumb{' +
          'background:var(--af-border);border-radius:99px;border:2px solid transparent;' +
          'background-clip:content-box;}',
        '.log:hover::-webkit-scrollbar-thumb,textarea:hover::-webkit-scrollbar-thumb{' +
          'background:var(--af-muted);background-clip:content-box;}',
        '.log::-webkit-scrollbar-button,textarea::-webkit-scrollbar-button{display:none;width:0;height:0;}',
        '.log::-webkit-scrollbar-corner,textarea::-webkit-scrollbar-corner{background:transparent;}',

        /* It is the visitor's page, so honour their motion preference. */
        '@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}'
      ].join('\n');
      return style;
    },

    markup: function () {
      var c = this.config;
      var wrap = document.createElement('div');
      wrap.className = 'wrap';
      wrap.innerHTML =
        '<div class="panel" part="panel" role="dialog" aria-label="' + this.attr(c.name) + ' chat">' +
          '<div class="head">' +
            (c.avatar ? '<img class="avatar" src="' + this.attr(c.avatar) + '" alt="">' : '') +
            '<div class="who">' +
              '<div class="name">' + this.esc(c.name) + '</div>' +
              (c.subtitle ? '<div class="sub">' + this.esc(c.subtitle) + '</div>' : '') +
            '</div>' +
            '<button class="icon-btn" data-act="reset" title="Start over" aria-label="Start over">' +
              this.svg('reset') + '</button>' +
            '<button class="icon-btn" data-act="close" title="Close" aria-label="Close">' +
              this.svg('close') + '</button>' +
          '</div>' +
          '<div class="log" part="log" role="log" aria-live="polite"></div>' +
          '<div class="compose">' +
            '<textarea rows="1" placeholder="' + this.attr(c.placeholder) + '" aria-label="Message"></textarea>' +
            '<button class="send" data-act="send" aria-label="Send">' + this.svg('send') + '</button>' +
          '</div>' +
          '<div class="foot">Enter sends · Shift+Enter for a new line</div>' +
        '</div>' +
        '<button class="launcher" part="launcher" aria-expanded="false">' +
          this.svg('chat') + '<span>' + this.esc(c.name) + '</span>' +
        '</button>';
      return wrap;
    },

    svg: function (name) {
      var paths = {
        chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9 8.4 8.4 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
        close: '<path d="M18 6 6 18M6 6l12 12"/>',
        reset: '<path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8"/><path d="M3 3v5h5"/>',
        send: '<path d="m22 2-7 20-4-9-9-4 20-7Z"/>'
      };
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
    },

    // ------------------------------------------------------------------- bind

    bind: function () {
      var self = this;

      this.root.addEventListener('click', function (event) {
        var target = event.target.closest('[data-act], .launcher');
        if (!target) return;
        if (target.classList.contains('launcher')) return self.toggle();
        var act = target.getAttribute('data-act');
        if (act === 'close') self.close();
        if (act === 'reset') self.resetConversation();
        if (act === 'send') self.send();
      });

      var input = this.root.querySelector('textarea');
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          self.send();
        }
        if (event.key === 'Escape') self.close();
      });
      // Grow with the content instead of scrolling inside a one-line box.
      input.addEventListener('input', function () { self.sizeComposer(); });
    },

    // ------------------------------------------------------------------ state

    toggle: function () { return this.isOpen ? this.close() : this.open(); },

    open: function () {
      var panel = this.root.querySelector('.panel');
      panel.setAttribute('data-open', 'true');
      // Two frames: `display` has to land before the transition can run.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { panel.setAttribute('data-shown', 'true'); });
      });
      this.root.querySelector('.launcher').setAttribute('aria-expanded', 'true');
      this.isOpen = true;
      this.scrollToEnd();
      this.focusInput();
    },

    close: function () {
      var panel = this.root.querySelector('.panel');
      panel.removeAttribute('data-shown');
      window.setTimeout(function () { panel.removeAttribute('data-open'); }, 180);
      this.root.querySelector('.launcher').setAttribute('aria-expanded', 'false');
      this.isOpen = false;
    },

    /** Fit the composer to its content, and only show a scrollbar at the cap. */
    sizeComposer: function () {
      var input = this.root && this.root.querySelector('textarea');
      if (!input) return;
      input.style.height = 'auto';
      var natural = input.scrollHeight;
      input.style.height = Math.min(natural, 96) + 'px';
      input.style.overflowY = natural > 96 ? 'auto' : 'hidden';
    },

    focusInput: function () {
      var input = this.root && this.root.querySelector('textarea');
      if (input && this.isOpen) input.focus();
    },

    // --------------------------------------------------------------- messages

    renderMessages: function () {
      var log = this.root.querySelector('.log');
      log.innerHTML = '';

      if (!this.messages.length) {
        var empty = document.createElement('div');
        empty.className = 'empty';
        if (this.config.welcomeMessage) {
          empty.textContent = this.config.welcomeMessage;
        } else {
          var lead = document.createElement('strong');
          lead.textContent = 'Ask ' + this.config.name + ' a question';
          empty.appendChild(lead);
          empty.appendChild(document.createTextNode('Answers come from this site’s own documents.'));
        }
        log.appendChild(empty);
        return;
      }

      this.messages.forEach(function (message) {
        log.appendChild(this.messageNode(message));
      }, this);
      this.scrollToEnd();
    },

    messageNode: function (message) {
      var kind = message.role === 'user' ? 'user' : message.role === 'error' ? 'error' : 'agent';
      var node = document.createElement('div');
      node.className = 'msg ' + kind;
      // textContent, not innerHTML: the reply is model output on a third-party page.
      node.textContent = message.content;

      if (this.config.showSources && message.sources && message.sources.length) {
        var sources = document.createElement('div');
        sources.className = 'sources';
        // Filenames only. A relevance percentage is an implementation detail that
        // means nothing to the person reading the answer.
        message.sources.slice(0, 4).forEach(function (source) {
          var line = document.createElement('span');
          line.textContent = source.filename;
          sources.appendChild(line);
        });
        node.appendChild(sources);
      }
      return node;
    },

    addMessage: function (role, content, sources) {
      var message = { role: role, content: content, sources: sources || null, at: Date.now() };
      this.messages.push(message);
      var log = this.root.querySelector('.log');
      // Clear the empty state on the first real message.
      if (this.messages.length === 1) log.innerHTML = '';
      log.appendChild(this.messageNode(message));
      this.persist();
      this.scrollToEnd();
    },

    scrollToEnd: function () {
      var log = this.root && this.root.querySelector('.log');
      if (log) log.scrollTop = log.scrollHeight;
    },

    typing: function (on) {
      var existing = this.root.querySelector('.typing');
      if (!on) {
        if (existing) existing.remove();
        return;
      }
      if (existing) return;
      var node = document.createElement('div');
      node.className = 'typing';
      node.innerHTML = '<i></i><i></i><i></i>';
      this.root.querySelector('.log').appendChild(node);
      this.scrollToEnd();
    },

    send: function () {
      var self = this;
      var input = this.root.querySelector('textarea');
      var button = this.root.querySelector('.send');
      var text = input.value.trim();
      if (!text || this.isSending) return;

      input.value = '';
      this.sizeComposer();
      this.addMessage('user', text);

      this.isSending = true;
      button.disabled = true;
      this.typing(true);

      var endpoint = this.config.apiUrl.replace(/\/$/, '') + '/chat';

      window.fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.config.apiKey
        },
        body: JSON.stringify({ message: text, conversation_id: this.conversationId })
      })
        .then(function (response) {
          return response.json().then(function (data) {
            // Say what actually went wrong rather than "please try again".
            if (!response.ok) {
              throw new Error(data.detail || 'Request failed (' + response.status + ')');
            }
            return data;
          });
        })
        .then(function (data) {
          if (data.conversation_id) self.conversationId = data.conversation_id;
          self.addMessage('assistant', data.response, data.sources);
        })
        .catch(function (error) {
          // "Failed to fetch" is all the browser gives for a network-level
          // failure, which says nothing about which URL failed. Name it: a wrong
          // apiUrl or a server that isn't running is the common cause, and the
          // visitor's own console is the only other clue.
          var message = error instanceof TypeError
            ? 'Could not reach ' + endpoint + ' — check the apiUrl and that the server is running.'
            : error.message || 'Could not reach the assistant.';
          self.addMessage('error', message);
          console.error('AgentForge:', message, error);
        })
        .then(function () {
          self.typing(false);
          self.isSending = false;
          button.disabled = false;
          self.focusInput();
        });
    },

    // ------------------------------------------------------------------ utils

    esc: function (text) {
      var div = document.createElement('div');
      div.textContent = text == null ? '' : String(text);
      return div.innerHTML;
    },

    attr: function (text) {
      return this.esc(text).replace(/"/g, '&quot;');
    },

    /** Change tokens after init — e.g. from a live theme picker. */
    setTokens: function (tokens) {
      if (!this.host) return this;
      Object.keys(tokens || {}).forEach(function (key) {
        this.host.style.setProperty('--af-' + key, tokens[key]);
      }, this);
      return this;
    },

    setTheme: function (theme) {
      this.config.theme = theme;
      if (this.host) this.applyTheme();
      return this;
    },

    destroy: function () {
      if (this.host) this.host.remove();
      this.host = null;
      this.root = null;
      this.isOpen = false;
    }
  };

  // Aliases for the previous method names.
  AgentForge.toggleChat = function () { return AgentForge.toggle(); };
  AgentForge.loadConversationHistory = function () { return AgentForge.renderMessages(); };

  window.AgentForge = AgentForge;
})(window, document);
