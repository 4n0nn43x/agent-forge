import React, { useState, useEffect } from 'react';
import { Copy, Check, Code, ExternalLink } from 'lucide-react';
import * as api from '../../services/api';
import Alert from '../Common/Alert';

const WidgetCode = ({ agentId, agentName }) => {
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [copiedSection, setCopiedSection] = useState(null);
  const [customization, setCustomization] = useState({
    position: 'bottom-right',
    primaryColor: '#3B82F6',
    title: 'Chat with us!',
    subtitle: 'We typically reply in a few minutes',
  });

  useEffect(() => {
    loadAPIKeys();
  }, [agentId]);

  const loadAPIKeys = async () => {
    try {
      const response = await api.getAPIKeys(agentId);
      const activeKeys = response.data.filter(key => key.is_active);
      setApiKeys(activeKeys);
      if (activeKeys.length > 0) {
        setSelectedKey(activeKeys[0].key);
      }
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
  };

  const getWidgetCode = () => {
    const apiUrl = window.location.origin.replace('3000', '8000');
    const widgetUrl = window.location.origin;

    return `<!-- AgentForge Widget -->
<script src="${widgetUrl}/agentforge-widget.js"></script>
<script>
  AgentForge.init({
    apiKey: '${selectedKey || 'YOUR_API_KEY'}',
    apiUrl: '${apiUrl}/api/v1/public',
    position: '${customization.position}',
    primaryColor: '${customization.primaryColor}',
    title: '${customization.title}',
    subtitle: '${customization.subtitle}'
  });
</script>`;
  };

  const getReactCode = () => {
    const apiUrl = window.location.origin.replace('3000', '8000');

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
        primaryColor: '${customization.primaryColor}',
        title: '${customization.title}',
        subtitle: '${customization.subtitle}'
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
    const apiUrl = window.location.origin.replace('3000', '8000');

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
    const apiUrl = window.location.origin.replace('3000', '8000');

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
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          onClick={() => copyToClipboard(code, section)}
          className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          {copiedSection === section ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );

  if (apiKeys.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <Alert
          type="warning"
          message="You need to create an API key first to use the widget or Public API."
        />
        <p className="text-sm text-gray-600 mt-4">
          Go to the "API Keys" tab to generate your first API key.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Embed Widget & API Usage</h2>
        <p className="text-sm text-gray-600">
          Add {agentName} to your website or integrate it via API
        </p>
      </div>

      {/* API Key Selection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select API Key:
        </label>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="input w-full"
        >
          {apiKeys.map((key) => (
            <option key={key.id} value={key.key}>
              {key.name} (Rate limit: {key.rate_limit}/hour)
            </option>
          ))}
        </select>
      </div>

      {/* Widget Customization */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Widget Customization</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={customization.primaryColor}
                onChange={(e) =>
                  setCustomization({ ...customization, primaryColor: e.target.value })
                }
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={customization.primaryColor}
                onChange={(e) =>
                  setCustomization({ ...customization, primaryColor: e.target.value })
                }
                className="input flex-1"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={customization.title}
              onChange={(e) =>
                setCustomization({ ...customization, title: e.target.value })
              }
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4">
          {['HTML', 'React', 'API (JS)', 'API (Python)'].map((tab) => (
            <button
              key={tab}
              onClick={() => {}}
              className="px-4 py-2 font-medium text-gray-700 border-b-2 border-transparent hover:border-gray-300"
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Code Examples */}
      <div className="space-y-6">
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Code className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">HTML Widget</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Add this code before the closing <code className="text-red-600">&lt;/body&gt;</code>{' '}
            tag of your website:
          </p>
          <CodeBlock code={getWidgetCode()} section="html" title="Widget Installation" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">React Component</h3>
          <CodeBlock code={getReactCode()} section="react" title="React Integration" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Public API - JavaScript</h3>
          <CodeBlock code={getAPIExample()} section="api-js" title="API Usage (JavaScript)" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Public API - Python</h3>
          <CodeBlock code={getPythonExample()} section="api-python" title="API Usage (Python)" />
        </div>
      </div>

      {/* Documentation Link */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Full Documentation</h4>
            <p className="text-sm text-blue-800 mb-2">
              For advanced configuration options, security best practices, and more examples:
            </p>
            <a
              href="/widget-demo.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
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
