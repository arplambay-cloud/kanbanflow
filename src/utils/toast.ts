export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastPayload {
  id: string;
  message: string;
  variant: ToastVariant;
}

const TOAST_EVENT = 'kf:toast';

/**
 * Show a transient message.
 *
 * Event-based rather than context-based on purpose: any module (including
 * non-React helpers) can raise a toast without being threaded through props,
 * which keeps the call sites a drop-in replacement for `alert()`.
 */
export function notify(message: string, variant: ToastVariant = 'info'): void {
  if (typeof window === 'undefined') return;

  const detail: ToastPayload = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    variant,
  };

  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail }));
}

export const notifyError = (message: string) => notify(message, 'error');
export const notifySuccess = (message: string) => notify(message, 'success');

export function subscribeToToasts(
  handler: (toast: ToastPayload) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const listener = (event: Event) => {
    handler((event as CustomEvent<ToastPayload>).detail);
  };

  window.addEventListener(TOAST_EVENT, listener);
  return () => window.removeEventListener(TOAST_EVENT, listener);
}
