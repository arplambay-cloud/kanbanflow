export type ToastVariant = 'info' | 'success' | 'error' | 'sync';

export interface ToastPayload {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
}

const TOAST_EVENT = 'kf:toast';

/**
 * Show a transient message.
 *
 * Event-based rather than context-based on purpose: any module — including
 * non-React helpers and the Supabase write paths in AppContext — can raise a
 * toast without being threaded through props.
 */
export function notify(
  message: string,
  variant: ToastVariant = 'info',
  title?: string
): void {
  if (typeof window === 'undefined') return;

  const detail: ToastPayload = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    message,
    variant,
  };

  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail }));
}

export const notifyError = (message: string, title?: string) =>
  notify(message, 'error', title);
export const notifySuccess = (message: string, title?: string) =>
  notify(message, 'success', title);
export const notifyInfo = (message: string, title?: string) =>
  notify(message, 'info', title);

/**
 * A write reached the server and failed.
 *
 * These used to be `console.warn` only, so a rejected insert looked exactly like
 * a successful one — which is how broken attachment uploads went unnoticed. The
 * local edit is still applied, so the wording says the change is unsaved rather
 * than lost, and tells the user what to do about it.
 */
export function notifySyncFailure(what: string, error?: unknown): void {
  const reason =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : error
        ? String(error)
        : '';

  notify(
    `${what} could not be saved to the server${reason ? ` — ${reason}` : ''}. ` +
      `Your change is still on screen; refresh to see the saved version.`,
    'sync',
    'Not saved to the server'
  );
}

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
