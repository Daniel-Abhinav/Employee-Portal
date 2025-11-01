import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const showSuccess = useCallback((message, duration) => {
    return addToast(message, 'success', duration);
  }, [addToast]);

  const showError = useCallback((message, duration) => {
    return addToast(message, 'error', duration);
  }, [addToast]);

  const showInfo = useCallback((message, duration) => {
    return addToast(message, 'info', duration);
  }, [addToast]);

  const showWarning = useCallback((message, duration) => {
    return addToast(message, 'warning', duration);
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        addToast,
        removeToast,
        showSuccess,
        showError,
        showInfo,
        showWarning
      }}
    >
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '400px'
    }}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

const Toast = ({ toast, onClose }) => {
  const getToastStyles = (type) => {
    const baseStyles = {
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '300px',
      animation: 'slideIn 0.3s ease-out',
      cursor: 'pointer',
      transition: 'transform 0.2s',
      position: 'relative',
      overflow: 'hidden'
    };

    const typeStyles = {
      success: {
        background: '#d1fae5',
        color: '#065f46',
        border: '1px solid #10b981'
      },
      error: {
        background: '#fee2e2',
        color: '#991b1b',
        border: '1px solid #ef4444'
      },
      warning: {
        background: '#fef3c7',
        color: '#92400e',
        border: '1px solid #fbbf24'
      },
      info: {
        background: '#dbeafe',
        color: '#1e40af',
        border: '1px solid #3b82f6'
      }
    };

    return { ...baseStyles, ...typeStyles[type] };
  };

  const getIcon = (type) => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type];
  };

  return (
    <div 
      style={getToastStyles(toast.type)}
      onClick={onClose}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-8px)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
    >
      <div style={{ fontSize: '20px' }}>
        {getIcon(toast.type)}
      </div>
      <div style={{ flex: 1, fontWeight: '500', fontSize: '14px' }}>
        {toast.message}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          opacity: 0.6,
          padding: '4px',
          lineHeight: 1
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ToastProvider;
