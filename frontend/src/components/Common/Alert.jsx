import React from 'react';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

const Alert = ({ type = 'info', message, onClose }) => {
  const config = {
    info: {
      bg: 'bg-primary-50',
      border: 'border-primary-200',
      text: 'text-primary-800',
      icon: Info,
    },
    success: {
      bg: 'bg-ready-bg',
      border: 'border-ready/30',
      text: 'text-ready',
      icon: CheckCircle,
    },
    warning: {
      bg: 'bg-warn-bg',
      border: 'border-warn/30',
      text: 'text-warn',
      icon: AlertCircle,
    },
    error: {
      bg: 'bg-danger-bg',
      border: 'border-danger/30',
      text: 'text-danger',
      icon: XCircle,
    },
  };

  const { bg, border, text, icon: Icon } = config[type];

  return (
    <div className={`${bg} ${border} border rounded-md p-4 flex items-start space-x-3`}>
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
