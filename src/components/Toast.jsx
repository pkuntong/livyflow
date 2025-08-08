import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const Toast = ({ message, type = 'info', duration = 5000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles = "w-full p-4 rounded-lg shadow-lg transform transition-all duration-300";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-500 text-white`;
      case 'error':
        return `${baseStyles} bg-red-500 text-white`;
      case 'warning':
        return `${baseStyles} bg-yellow-500 text-white`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-500 text-white`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" aria-hidden="true" />;
      case 'error':
        return <XCircle className="w-5 h-5" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" aria-hidden="true" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" aria-hidden="true" />;
    }
  };

  const getAriaLabel = () => {
    switch (type) {
      case 'success':
        return 'Success notification';
      case 'error':
        return 'Error notification';
      case 'warning':
        return 'Warning notification';
      case 'info':
      default:
        return 'Information notification';
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={getToastStyles()}
      role="alert"
      aria-live="polite"
      aria-label={getAriaLabel()}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <div className="flex-shrink-0 ml-3">
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(), 300);
            }}
            className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded p-1 transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast; 