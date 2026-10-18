import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { classNames } from '@/lib/format';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={classNames('glass-strong relative z-10 w-full overflow-hidden rounded-3xl shadow-glass-lg', sizes[size], className)}
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h3 className="font-display text-xl font-semibold text-ink-50">{title}</h3>
                <button onClick={onClose} className="rounded-full p-1.5 text-ink-300 hover:bg-white/10 hover:text-ink-50">
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="max-h-[80vh] overflow-y-auto scrollbar-thin">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
