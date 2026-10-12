import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  const getIcon = (type: 'success' | 'info' | 'warning') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-nature-600 dark:text-nature-400" id="toast-icon-success" />;
      case 'info':
        return <Info className="w-5 h-5 text-earth-600 dark:text-earth-400" id="toast-icon-info" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" id="toast-icon-warning" />;
    }
  };

  return (
    <div className="fixed top-24 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none" id="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl glass shadow-xl border border-white/20 dark:border-white/5"
            id={`toast-${toast.id}`}
          >
            <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
            <div className="flex-grow">
              <p className="text-sm font-medium text-charcoal-900 dark:text-white leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-charcoal-500 hover:text-charcoal-900 dark:hover:text-white transition-colors p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              id={`toast-close-${toast.id}`}
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
