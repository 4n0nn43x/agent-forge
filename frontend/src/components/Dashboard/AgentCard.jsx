import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, Trash2, Copy, MoreHorizontal } from 'lucide-react';
import useAgentStore from '../../store/agentStore';

// "openai/gpt-4o-mini" -> vendor and model shown separately, so the eye can scan
// the provider without reading the whole id.
const splitModel = (id = '') => {
  const slash = id.indexOf('/');
  return slash === -1
    ? { vendor: 'ollama', model: id }
    : { vendor: id.slice(0, slash), model: id.slice(slash + 1) };
};

const AgentCard = ({ agent }) => {
  const navigate = useNavigate();
  const { deleteAgent, duplicateAgent } = useAgentStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);

  // A menu that only closes on its own trigger feels stuck.
  useEffect(() => {
    if (!showMenu) return;
    const onDocumentClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false);
    };
    const onEscape = (event) => event.key === 'Escape' && setShowMenu(false);
    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onEscape);
    };
  }, [showMenu]);

  const handleDelete = async (event) => {
    event.stopPropagation();
    if (!window.confirm(`Delete "${agent.name}"? Its documents and conversations go with it.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAgent(agent.id);
    } catch (error) {
      window.alert('Could not delete the agent. It is still there.');
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (event) => {
    event.stopPropagation();
    const newName = window.prompt('Name for the copy', `${agent.name} copy`);
    if (!newName) return;
    try {
      await duplicateAgent(agent.id, newName);
      setShowMenu(false);
    } catch (error) {
      window.alert('Could not duplicate the agent.');
    }
  };

  const openChat = () => navigate(`/agent/${agent.id}`);
  const { vendor, model } = splitModel(agent.llm_model);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openChat}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openChat();
        }
      }}
      className="card-interactive group relative flex flex-col gap-4 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink truncate">{agent.name}</h3>
          <p className="mt-1 text-sm text-muted line-clamp-2">
            {agent.description || 'No description'}
          </p>
        </div>

        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-label={`Actions for ${agent.name}`}
            onClick={(event) => {
              event.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="btn btn-ghost w-8 h-8 px-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-44 panel py-1 z-10">
              <button
                type="button"
                onClick={handleDuplicate}
                className="w-full px-3 py-1.5 text-left text-sm text-ink-soft hover:bg-subtle flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full px-3 py-1.5 text-left text-sm text-danger hover:bg-danger-bg flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* The model id is a value the system holds, so it gets the value treatment. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="val-accent">
          <span className="opacity-60">{vendor}/</span>
          {model}
        </span>
        {agent.template_name && (
          <span className="pill-neutral">{agent.template_name.replace(/_/g, ' ')}</span>
        )}
      </div>

      <div className="mt-auto pt-3 divider flex items-center gap-5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5 tnum">
          <FileText className="w-3.5 h-3.5" />
          {agent.document_count} {agent.document_count === 1 ? 'document' : 'documents'}
        </span>
        <span className="inline-flex items-center gap-1.5 tnum">
          <MessageSquare className="w-3.5 h-3.5" />
          {agent.conversation_count} {agent.conversation_count === 1 ? 'chat' : 'chats'}
        </span>
      </div>
    </div>
  );
};

export default AgentCard;
