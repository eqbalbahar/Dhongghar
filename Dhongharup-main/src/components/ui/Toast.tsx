import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  push: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const iconFor = (kind: ToastKind) => {
  if (kind === 'success') return <CheckCircle2 size={18} className="text-accent-400" />;
  if (kind === 'error') return <AlertCircle size={18} className="text-danger" />;
  return <Info size={18} className="text-gold-400" />;
};

const ringFor = (kind: ToastKind) => {
  if (kind === 'success') return 'border-accent-500/30';
  if (kind === 'error') return 'border-danger/30';
  return 'border-gold-400/30';
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-6 sm:right-auto sm:items-start sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className={`glass-strong pointer-events-auto flex items-center gap-3 rounded-2xl border ${ringFor(t.kind)} px-4 py-3 shadow-glass-lg`}
            >
              {iconFor(t.kind)}
              <span className="text-sm text-ink-50">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="ml-1 text-ink-400 transition-colors hover:text-ink-100">
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
