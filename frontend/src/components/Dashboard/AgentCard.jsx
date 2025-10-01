import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, FileText, Trash2, Copy, MoreVertical } from 'lucide-react';
import useAgentStore from '../../store/agentStore';

const AgentCard = ({ agent }) => {
  const navigate = useNavigate();
  const { deleteAgent, duplicateAgent } = useAgentStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      setIsDeleting(true);
      try {
        await deleteAgent(agent.id);
      } catch (error) {
        alert('Failed to delete agent');
        setIsDeleting(false);
      }
    }
  };

  const handleDuplicate = async (e) => {
    e.stopPropagation();
    const newName = prompt('Enter name for duplicated agent:', `${agent.name} (Copy)`);
    if (newName) {
      try {
        await duplicateAgent(agent.id, newName);
        setShowMenu(false);
      } catch (error) {
        alert('Failed to duplicate agent');
      }
    }
  };

  const handleChat = (e) => {
    e.stopPropagation();
    navigate(`/agent/${agent.id}`);
  };

  return (
    <div
      className="card hover:shadow-md transition-shadow cursor-pointer relative"
      onClick={handleChat}
    >
      {/* Menu Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <MoreVertical className="w-5 h-5 text-gray-500" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
            <button
              onClick={handleDuplicate}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Agent Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-8">
          {agent.name}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2">
          {agent.description || 'No description'}
        </p>
      </div>

      {/* Template Badge */}
      {agent.template_name && (
        <div className="mb-3">
          <span className="inline-block px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">
            {agent.template_name.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Model */}
      <div className="mb-4">
        <span className="text-xs text-gray-500">Model: </span>
        <span className="text-xs font-medium text-gray-700">{agent.llm_model}</span>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center space-x-1">
          <FileText className="w-4 h-4" />
          <span>{agent.document_count} docs</span>
        </div>
        <div className="flex items-center space-x-1">
          <MessageSquare className="w-4 h-4" />
          <span>{agent.conversation_count} chats</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleChat}
        className="w-full btn btn-primary flex items-center justify-center space-x-2"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Chat with Agent</span>
      </button>
    </div>
  );
};

export default AgentCard;
