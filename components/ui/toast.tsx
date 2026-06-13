'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  show: (tone: ToastTone, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { panel: string; icon: ReactNode }> = {
  success: {
    panel: 'border-[#bfe8d0] bg-[#F1FBF5] text-[#1F7A4D]',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
  },
  error: {
    panel: 'border-[#f0c2cf] bg-[#FFF0F4] text-[#B23A5C]',
    icon: <XCircle className="h-4 w-4" aria-hidden />,
  },
  info: {
    panel: 'border-[#cdd2f0] bg-[#EEEDFE] text-[#4B45B8]',
    icon: <Info className="h-4 w-4" aria-hidden />,
  },
};

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const show = useCallback(
    (tone: ToastTone, message: string) => {
      counter.current += 1;
      const id = counter.current;
      setToasts(prev => [...prev, { id, tone, message }]);
      timers.current[id] = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:pr-6"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {toasts.map(toast => {
            const styles = toneStyles[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                role="status"
                aria-live="polite"
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_48px_rgba(46,40,51,0.16)]',
                  styles.panel
                )}
              >
                <span className="mt-0.5 shrink-0">{styles.icon}</span>
                <span className="min-w-0 flex-1 leading-5">{toast.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 rounded-lg p-0.5 text-current/70 transition hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return useMemo(
    () => ({
      success: (message: string) => ctx.show('success', message),
      error: (message: string) => ctx.show('error', message),
      info: (message: string) => ctx.show('info', message),
    }),
    [ctx]
  );
}
