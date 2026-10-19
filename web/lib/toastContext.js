'use client';

import { useLanguage } from '@superapp/shared/language';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Undo2 } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { tx: translateCopy } = useLanguage();
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ message, type = 'info', action = null, duration = 4500 }) => {
    const id = ++idCounter.current;
    const newToast = { id, message, type, action };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const showSuccess = useCallback((message, action = null) => {
    return showToast({ message, type: 'success', action });
  }, [showToast]);

  const showError = useCallback((message, action = null) => {
    return showToast({ message, type: 'error', action, duration: 6000 });
  }, [showToast]);

  const showInfo = useCallback((message, action = null) => {
    return showToast({ message, type: 'info', action });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, removeToast }}>
      {children}
      <div className="toast-portal" role="region" aria-label={translateCopy("Notifikasi sistem")}>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';

          return (
            <div
              key={toast.id}
              className={`toast-notification toast-${toast.type}`}
              role="alert"
            >
              <div className="toast-icon">
                {isSuccess && <CheckCircle2 size={18} className="text-success" />}
                {isError && <AlertCircle size={18} className="text-danger" />}
                {!isSuccess && !isError && <Info size={18} className="text-accent" />}
              </div>
              <div className="toast-message">{translateCopy(toast.message)}</div>
              {toast.action && (
                <button
                  type="button"
                  className="toast-action-btn"
                  onClick={() => {
                    toast.action.onClick?.();
                    removeToast(toast.id);
                  }}
                >
                  <Undo2 size={14} />
                  <span>{translateCopy(toast.action.label || "Batal")}</span>
                </button>
              )}
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => removeToast(toast.id)}
                aria-label={translateCopy("Tutup notifikasi")}
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
      showSuccess: () => {},
      showError: () => {},
      showInfo: () => {},
      removeToast: () => {},
    };
  }
  return context;
}
