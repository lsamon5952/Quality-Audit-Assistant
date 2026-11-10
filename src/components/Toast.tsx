import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, X, RefreshCw } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', onRetry?: () => void, retryLabel?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info', onRetry?: () => void, retryLabel?: string) => {
      const id = crypto.randomUUID();
      const newToast: ToastMessage = { id, type, message, onRetry, retryLabel };
      setToasts((prev) => [...prev, newToast]);

      if (!onRetry) {
        setTimeout(() => {
          removeToast(id);
        }, 6000);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between p-4 rounded-xl shadow-lg border transition-all ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-900'
                : toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-stone-50 border-stone-200 text-stone-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-stone-600 shrink-0 mt-0.5" />}
              <div>
                <p className="text-sm font-medium leading-snug">{toast.message}</p>
                {toast.onRetry && (
                  <button
                    onClick={() => {
                      toast.onRetry!();
                      removeToast(toast.id);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {toast.retryLabel || 'Retry Save'}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-stone-400 hover:text-stone-600 p-1 shrink-0 ml-2"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
