import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastPayload, subscribeToToasts } from '../../utils/toast';

const AUTO_DISMISS_MS = 5000;

const VARIANT_STYLES: Record<
  ToastPayload['variant'],
  { wrap: string; icon: React.ReactNode }
> = {
  success: {
    wrap: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
  },
  error: {
    wrap: 'bg-rose-50 border-rose-200 text-rose-800',
    icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
  },
  info: {
    wrap: 'bg-slate-50 border-slate-200 text-slate-800',
    icon: <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />,
  },
};

/**
 * Renders toasts raised via `notify()`. Mounted once, near the app root.
 * Replaces blocking `alert()` calls with non-blocking, dismissable messages.
 */
export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      window.setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    });
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(24rem,calc(100vw-2rem))]"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style = VARIANT_STYLES[toast.variant] ?? VARIANT_STYLES.info;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-2.5 p-3.5 rounded-xl border shadow-lg text-xs font-medium animate-fade-in ${style.wrap}`}
          >
            {style.icon}
            <span className="flex-1 leading-relaxed break-words">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="p-0.5 opacity-60 hover:opacity-100 transition-opacity shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
