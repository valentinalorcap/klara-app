'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastContextValue = { show: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

/** Show a transient bottom toast. Must be used within <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const AUTO_DISMISS_MS = 5000;

/**
 * Design-system toast: a pill that slides up from the bottom, auto-dismisses
 * after 5s, and can be swiped down to dismiss early (like WhatsApp's
 * "message deleted" snackbar). One toast at a time; a new one replaces it.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const dismiss = useCallback(() => {
    clear();
    setToast(null);
  }, [clear]);

  const show = useCallback(
    (message: string) => {
      clear();
      seq.current += 1;
      setToast({ id: seq.current, message });
      timer.current = setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-6">
        <AnimatePresence>
          {toast ? (
            <motion.div
              key={toast.id}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 40 || info.velocity.y > 400) dismiss();
              }}
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 90, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="pointer-events-auto flex cursor-grab touch-none items-center gap-2 rounded-full border border-white/10 bg-[#1a1633]/95 px-4 py-2.5 text-sm font-medium text-white shadow-2xl backdrop-blur-xl active:cursor-grabbing"
            >
              {toast.message}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
