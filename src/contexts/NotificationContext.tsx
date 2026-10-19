import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, type?: Notification['type'], duration?: number) => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showNotification = useCallback((
    message: string, 
    type: Notification['type'] = 'info', 
    duration = 4000
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type, duration }]);
    
    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }
  }, [dismissNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(() => ({
    notifications,
    showNotification,
    dismissNotification,
    clearAll
  }), [notifications, showNotification, dismissNotification, clearAll]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationToasts: React.FC = () => {
  const { notifications, dismissNotification } = useNotification();

  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none" id="notification-toasts">
      {notifications.map((item) => (
        <div
          key={item.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl glass shadow-xl border border-white/20 dark:border-white/5 bg-white/95 dark:bg-slate-900/95 ${
            item.type === 'error' ? 'border-l-4 border-l-red-500' : 
            item.type === 'warning' ? 'border-l-4 border-l-amber-500' :
            item.type === 'success' ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-blue-500'
          }`}
        >
          <div className="flex-grow">
            <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
              {item.message}
            </p>
          </div>
          <button
            onClick={() => dismissNotification(item.id)}
            className="flex-shrink-0 text-slate-500 hover:text-slate-900 dark:hover:text-white p-0.5"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
