import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

const Alert = ({ type = 'info', message, onClose }) => {
  const config = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: Info,
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertCircle,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: XCircle,
    },
  };

  const { bg, border, text, icon: Icon } = config[type];

  return (
    <div className={`${bg} ${border} border rounded-lg p-4 flex items-start space-x-3`}>
      <Icon className={`w-5 h-5 ${text} flex-shrink-0 mt-0.5`} />
      <p className={`flex-1 text-sm ${text}`}>{message}</p>
      {onClose && (
        <button onClick={onClose} className={`${text} hover:opacity-70`}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
