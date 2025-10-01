import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Copy, Check } from 'lucide-react';

const ChatMessage = ({ message }) => {
  const [copied, setCopied] = React.useState(false);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex space-x-3 max-w-[80%] ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser ? 'bg-primary-600' : 'bg-gray-200'
          }`}
        >
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Bot className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1">
          <div
            className={`rounded-lg px-4 py-3 ${
              isUser
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-900'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Sources */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              <details className="cursor-pointer">
                <summary className="hover:text-gray-700">
                  {message.sources.length} source(s) used
                </summary>
                <div className="mt-2 space-y-1 ml-2">
                  {message.sources.map((source, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span>• {source.filename}</span>
                      <span className="text-gray-400">
                        (relevance: {(source.relevance_score * 100).toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Copy Button */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}

          {/* Timestamp */}
          <div className="mt-1 text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
