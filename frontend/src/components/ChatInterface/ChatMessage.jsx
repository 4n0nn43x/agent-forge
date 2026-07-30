import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, ChevronRight, Copy } from 'lucide-react';
import Mark from '../Common/Mark';

const timeOf = (value) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const ChatMessage = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error('Clipboard unavailable:', error);
    }
  };

  // The user's turn is a compact tinted block; the agent's turn is the page's
  // running text. Making both bubbles would waste the reading width on the
  // answer, which is the part people actually read.
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="bg-subtle border border-rule rounded-md px-3.5 py-2.5">
            <p className="text-sm text-ink whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="mt-1 text-2xs text-faint text-right tnum">
            {timeOf(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  const sources = message.sources ?? [];

  return (
    <div className="flex gap-3 group">
      <div className="flex-shrink-0 w-7 h-7 rounded border border-rule bg-surface flex items-center justify-center">
        <Mark className="w-4 h-4 text-primary-600" />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="max-w-prose text-sm text-ink
                     [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
                     [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc
                     [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal
                     [&_li]:my-0.5
                     [&_h1]:text-lg [&_h1]:mt-4 [&_h1]:mb-2
                     [&_h2]:text-base [&_h2]:mt-4 [&_h2]:mb-2
                     [&_h3]:text-sm [&_h3]:mt-3 [&_h3]:mb-1.5
                     [&_a]:text-primary-600 [&_a]:underline [&_a]:underline-offset-2
                     [&_strong]:font-semibold
                     [&_blockquote]:border-l-2 [&_blockquote]:border-rule [&_blockquote]:pl-3 [&_blockquote]:text-muted
                     [&_code]:font-mono [&_code]:text-xs [&_code]:bg-subtle [&_code]:border [&_code]:border-rule [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5
                     [&_pre]:bg-subtle [&_pre]:border [&_pre]:border-rule [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:my-3 [&_pre]:overflow-x-auto
                     [&_pre_code]:bg-transparent [&_pre_code]:border-0 [&_pre_code]:p-0
                     [&_table]:my-3 [&_table]:text-xs [&_table]:w-full
                     [&_th]:text-left [&_th]:font-medium [&_th]:border-b [&_th]:border-rule [&_th]:py-1.5
                     [&_td]:border-b [&_td]:border-rule [&_td]:py-1.5"
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {sources.length > 0 && (
          <details className="mt-3 group/sources">
            <summary
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink
                         cursor-pointer list-none [&::-webkit-details-marker]:hidden"
            >
              <ChevronRight className="w-3 h-3 transition-transform group-open/sources:rotate-90" />
              Grounded in <span className="tnum">{sources.length}</span>{' '}
              {sources.length === 1 ? 'passage' : 'passages'}
            </summary>

            {/* Relevance is a number the retriever produced, so it reads as a value
                and the bar makes the ranking scannable without reading digits. */}
            <ul className="mt-2 flex flex-col gap-1.5">
              {sources.map((source, index) => (
                <li
                  key={`${source.filename}-${source.chunk_index ?? index}`}
                  className="flex items-center gap-2.5 text-xs"
                >
                  <span className="text-ink-soft truncate max-w-[16rem]">
                    {source.filename}
                  </span>
                  {source.chunk_index != null && (
                    <span className="val-bare">#{source.chunk_index + 1}</span>
                  )}
                  <span className="flex-1 h-1 bg-subtle rounded-full overflow-hidden min-w-8">
                    <span
                      className="block h-full bg-primary-500"
                      style={{
                        width: `${Math.max(0, Math.min(1, source.relevance_score)) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="val-bare w-8 text-right">
                    {(source.relevance_score * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-2 flex items-center gap-3 text-2xs text-faint">
          <span className="tnum">{timeOf(message.timestamp)}</span>
          {message.tokens_used != null && (
            <span className="tnum">{message.tokens_used} tokens</span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-faint hover:text-ink transition-colors
                       opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
