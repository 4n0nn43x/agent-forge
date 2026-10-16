import React, { useState, useEffect } from 'react';
import { Copy, Check, Code, ExternalLink } from 'lucide-react';
import * as api from '../../services/api';
import Alert from '../Common/Alert';

const WidgetCode = ({ agentId, agentName }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [copiedSection, setCopiedSection] = useState(null);
  const [activeCodeTab, setActiveCodeTab] = useState('html');
  const [customization, setCustomization] = useState({
    position: 'bottom-right',
    accent: '#0e6f7e',
    theme: 'auto',
    // The launcher label. Defaults to the agent's own name rather than a generic
    // "Chat with us!", which is the line every embedder ships untouched.
    name: agentName || 'Support',
    subtitle: '',
    // Off by default: a visitor has no use for an internal filename, and the
    // server withholds the sources anyway unless enabled in Settings.
    showSources: false,
  });

  useEffect(() => {
    loadAPIKeys();
  }, [agentId]);

  const loadAPIKeys = async () => {
    try {
      const response = await api.getAPIKeys(agentId);
      const activeKeys = response.data.filter(key => key.is_active);
      setApiKeys(activeKeys);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
  };

  const getWidgetCode = () => {
    const apiUrl = window.location.origin;
    const widgetUrl = window.location.origin;

    return `<!-- AgentForge Widget -->
<script src="${widgetUrl}/agentforge-widget.js"></script>
<script>
  AgentForge.init({
    apiKey: '${selectedKey || 'YOUR_API_KEY'}',
    apiUrl: '${apiUrl}/api/v1/public',
    position: '${customization.position}',
    name: '${customization.name}',${customization.subtitle ? `
    subtitle: '${customization.subtitle}',` : ''}
    theme: '${customization.theme}',${customization.showSources ? `
    showSources: true,` : ''}
    tokens: { accent: '${customization.accent}' }
  });
</script>`;
  };

  // Just the two tags. Every option below has a working default.
  const getMinimalCode = () => {
    const origin = window.location.origin;
    return `<!-- before </body> -->
<script src="${origin}/agentforge-widget.js"></script>
<script>
  AgentForge.init({
    apiKey: '${selectedKey || 'YOUR_API_KEY'}',
    apiUrl: '${origin}/api/v1/public'
  });
</script>`;
  };

  const getReactCode = () => {
    const apiUrl = window.location.origin;

    return `import { useEffect } from 'react';

export default function ChatWidget() {
  useEffect(() => {
    // Load widget script
    const script = document.createElement('script');
    script.src = '${window.location.origin}/agentforge-widget.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.AgentForge.init({
        apiKey: '${selectedKey || 'YOUR_API_KEY'}',
        apiUrl: '${apiUrl}/api/v1/public',
        position: '${customization.position}',
        name: '${customization.name}',${customization.subtitle ? `
        subtitle: '${customization.subtitle}',` : ''}
        theme: '${customization.theme}',${customization.showSources ? `
        showSources: true,` : ''}
        tokens: { accent: '${customization.accent}' }
      });
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
}`;
  };

  const getAPIExample = () => {
    const apiUrl = window.location.origin;

    return `// JavaScript/TypeScript
const response = await fetch('${apiUrl}/api/v1/public/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${selectedKey || 'YOUR_API_KEY'}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'Hello, how can you help me?',
    conversation_id: null  // Optional
  })
});

const data = await response.json();
console.log(data.response);`;
  };

  const getPythonExample = () => {
    const apiUrl = window.location.origin;

    return `# Python
import requests

response = requests.post(
    '${apiUrl}/api/v1/public/chat',
    headers={
        'Authorization': 'Bearer ${selectedKey || 'YOUR_API_KEY'}',
        'Content-Type': 'application/json'
    },
    json={
        'message': 'Hello, how can you help me?',
        'conversation_id': None  # Optional
    }
)

data = response.json()
print(data['response'])`;
  };

  const copyToClipboard = (text, section) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CodeBlock = ({ code, section, title }) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-ink">{title}</h3>
        <button
          onClick={() => copyToClipboard(code, section)}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-subtle hover:bg-rule rounded"
        >
          {copiedSection === section ? (
            <>
              <Check className="w-4 h-4 text-ready" />
              <span className="text-ready">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-subtle text-ink-soft border border-rule p-3.5 rounded-md
                      overflow-x-auto thin-scroll font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );

  if (apiKeys.length === 0) {
    return (
      <div className="bg-surface rounded-md border border-rule p-6">
        <Alert
          type="warning"
          message="You need to create an API key first to use the widget or Public API."
        />
        <p className="text-sm text-muted mt-4">
          Go to the "API Keys" tab to generate your first API key.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-ink mb-2">Embed Widget & API Usage</h2>
        <p className="text-sm text-muted">
          Add {agentName} to your website or integrate it via API
        </p>
      </div>

      {/* API Key Selection */}
      <div className="mb-6 p-4 bg-subtle rounded-md border border-rule">
        <label className="block text-sm font-medium text-ink-soft mb-2">
          API key
        </label>
        {/* Keys are stored hashed, so the server cannot hand them back: paste the
            one copied at creation. It stays in this page and is never sent. */}
        <input
          type="text"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value.trim())}
          placeholder="af_… (shown once when the key was created)"
          className="input w-full font-mono"
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-xs text-muted mt-2">
          Active keys: {apiKeys.map((key) => key.name).join(', ')}. Lost it? Create a new
          key in the API Keys tab.
        </p>
      </div>

      {/* Widget Customization */}
      <div className="mb-6 p-4 bg-subtle rounded-md border border-rule">
        <h3 className="font-semibold text-ink mb-3">Widget Customization</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Position
            </label>
            <select
              value={customization.position}
              onChange={(e) =>
                setCustomization({ ...customization, position: e.target.value })
              }
              className="input w-full"
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </div>

          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={customization.showSources}
                onChange={(e) =>
                  setCustomization({ ...customization, showSources: e.target.checked })
                }
                className="mt-0.5 w-3.5 h-3.5 flex-shrink-0"
              />
              <span>
                <span className="block text-sm font-medium text-ink-soft">
                  Cite documents in answers
                </span>
                <span className="block text-xs text-muted mt-0.5">
                  Shows the filenames behind each reply. Off by default — visitors have no
                  use for them, and the public API withholds them unless you also enable it
                  in Settings.
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Colour scheme
            </label>
            <select
              value={customization.theme}
              onChange={(e) => setCustomization({ ...customization, theme: e.target.value })}
              className="input w-full"
            >
              <option value="auto">Auto — follow the visitor's OS</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <p className="hint">
              The widget also accepts CSS custom properties on its element, so your own
              stylesheet can override any of this. See the widget demo page for the full
              token list.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Accent
            </label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={customization.accent}
                onChange={(e) =>
                  setCustomization({ ...customization, accent: e.target.value })
                }
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customization.accent}
                onChange={(e) =>
                  setCustomization({ ...customization, accent: e.target.value })
                }
                className="input flex-1"
                placeholder="#0e6f7e"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Launcher label
            </label>
            <input
              type="text"
              value={customization.name}
              onChange={(e) =>
                setCustomization({ ...customization, name: e.target.value })
              }
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
              Subtitle
            </label>
            <input
              type="text"
              value={customization.subtitle}
              onChange={(e) =>
                setCustomization({ ...customization, subtitle: e.target.value })
              }
              className="input w-full"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-rule mb-6">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveCodeTab('html')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeCodeTab === 'html'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-ink-soft hover:border-rule'
            }`}
          >
            HTML
          </button>
          <button
            onClick={() => setActiveCodeTab('react')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeCodeTab === 'react'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-ink-soft hover:border-rule'
            }`}
          >
            React
          </button>
          <button
            onClick={() => setActiveCodeTab('api-js')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeCodeTab === 'api-js'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-ink-soft hover:border-rule'
            }`}
          >
            API (JavaScript)
          </button>
          <button
            onClick={() => setActiveCodeTab('api-python')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeCodeTab === 'api-python'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-ink-soft hover:border-rule'
            }`}
          >
            API (Python)
          </button>
        </nav>
      </div>

      {/* Code Examples */}
      <div>
        {activeCodeTab === 'html' && (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Code className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-ink">HTML Widget</h3>
            </div>
            <p className="text-sm text-muted mb-4 max-w-prose">
              Add this before the closing <code>&lt;/body&gt;</code> tag of your site. The
              launcher appears in the corner; everything else has a working default.
            </p>

            <CodeBlock
              code={getMinimalCode()}
              section="html-min"
              title="Minimum"
            />

            <p className="text-sm text-muted mb-4 max-w-prose">
              Or with the choices you made above. Appearance can also come entirely from
              your own stylesheet — see the{' '}
              <a
                href="/widget-demo.html"
                target="_blank"
                rel="noreferrer"
                className="text-primary-600 hover:underline"
              >
                token reference
              </a>
              .
            </p>

            <CodeBlock
              code={getWidgetCode()}
              section="html"
              title="With your configuration"
            />
          </div>
        )}

        {activeCodeTab === 'react' && (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Code className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-ink">React Component</h3>
            </div>
            <p className="text-sm text-muted mb-3">
              Create a component and include it in your React application:
            </p>
            <CodeBlock code={getReactCode()} section="react" title="React Integration" />
          </div>
        )}

        {activeCodeTab === 'api-js' && (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Code className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-ink">Public API - JavaScript</h3>
            </div>
            <p className="text-sm text-muted mb-3">
              Use fetch or axios to interact with the API from JavaScript/TypeScript:
            </p>
            <CodeBlock code={getAPIExample()} section="api-js" title="API Usage (JavaScript)" />
          </div>
        )}

        {activeCodeTab === 'api-python' && (
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Code className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-ink">Public API - Python</h3>
            </div>
            <p className="text-sm text-muted mb-3">
              Use the requests library to interact with the API from Python:
            </p>
            <CodeBlock code={getPythonExample()} section="api-python" title="API Usage (Python)" />
          </div>
        )}
      </div>

      {/* Documentation Link */}
      <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-md">
        <div className="flex items-start space-x-2">
          <ExternalLink className="w-5 h-5 text-primary-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-primary-800 mb-1">Full Documentation</h4>
            <p className="text-sm text-primary-800 mb-2">
              For advanced configuration options, security best practices, and more examples:
            </p>
            <a
              href="/widget-demo.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-800 underline"
            >
              View Widget Demo & Full Documentation →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetCode;
