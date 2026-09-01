import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, CloudOff, X } from 'lucide-react';
import { ToastPayload, ToastVariant, subscribeToToasts } from '../../utils/toast';

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 4000,
  info: 5000,
  // Failures stay longer — a sync problem is worth reading before it vanishes.
  error: 9000,
  sync: 9000,
};

interface VariantStyle {
  accent: string;
  iconWrap: string;
  icon: React.ReactNode;
  title: string;
}

const VARIANTS: Record<ToastVariant, VariantStyle> = {
  success: {
    accent: 'bg-emerald-500',
    iconWrap: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    icon: <CheckCircle2 className="w-4 h-4" />,
    title: 'Saved',
  },
  error: {
    accent: 'bg-rose-500',
    iconWrap: 'bg-rose-50 text-rose-600 ring-rose-100',
    icon: <AlertTriangle className="w-4 h-4" />,
    title: 'Something went wrong',
  },
  sync: {
    accent: 'bg-amber-500',
    iconWrap: 'bg-amber-50 text-amber-600 ring-amber-100',
    icon: <CloudOff className="w-4 h-4" />,
    title: 'Not saved to the server',
  },
  info: {
    accent: 'bg-indigo-500',
    iconWrap: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    icon: <Info className="w-4 h-4" />,
    title: 'Heads up',
  },
};

const Toast: React.FC<{ toast: ToastPayload; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const style = VARIANTS[toast.variant] ?? VARIANTS.info;
  const duration = AUTO_DISMISS_MS[toast.variant] ?? 5000;

  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(duration);
  const startedRef = useRef(Date.now());
  const timerRef = useRef<number | undefined>(undefined);

  const close = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => onDismiss(toast.id), 180);
  }, [onDismiss, toast.id]);

  // Pause the countdown on hover so a message can actually be read.
  useEffect(() => {
    if (paused) {
      window.clearTimeout(timerRef.current);
      remainingRef.current -= Date.now() - startedRef.current;
      return;
    }
    startedRef.current = Date.now();
    timerRef.current = window.setTimeout(close, Math.max(remainingRef.current, 0));
    return () => window.clearTimeout(timerRef.current);
  }, [paused, close]);

  return (
    <div
      role="alert"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`group relative flex items-start gap-3 w-full overflow-hidden rounded-xl border border-slate-200 bg-white pl-4 pr-3 py-3 shadow-lg shadow-slate-900/5 ring-1 ring-black/[0.03] transition-all duration-200 ${
        leaving
          ? 'translate-x-2 opacity-0 scale-[0.98]'
          : 'translate-x-0 opacity-100 animate-toast-in'
      }`}
    >
      {/* Accent rail */}
      <span className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} aria-hidden="true" />

      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${style.iconWrap}`}
        aria-hidden="true"
      >
        {style.icon}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[13px] font-semibold leading-none text-slate-900">
          {toast.title || style.title}
        </p>
        <p className="mt-1.5 break-words text-xs leading-relaxed text-slate-500">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={close}
        aria-label="Dismiss notification"
        className="mt-0.5 shrink-0 rounded-md p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Countdown bar — freezes while hovered */}
      <span
        className={`absolute bottom-0 left-0 h-0.5 ${style.accent} opacity-30`}
        style={{
          animation: `toast-countdown ${duration}ms linear forwards`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

/**
 * Renders toasts raised via `notify()`. Mounted once, near the app root.
 * Newest appears at the bottom, closest to where the eye already is.
 */
export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(
    () =>
      subscribeToToasts((toast) => {
        // Cap the stack so a burst of sync failures cannot cover the screen.
        setToasts((prev) => [...prev, toast].slice(-4));
      }),
    []
  );

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(26rem,calc(100vw-2.5rem))] flex-col gap-2.5"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
};
