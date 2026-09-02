import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes
// Re-sign a little before expiry so a link is never handed out already stale.
const CACHE_TTL_MS = (SIGNED_URL_TTL_SECONDS - 60) * 1000;

const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * True for values that are already a usable URL rather than a storage object
 * path — legacy rows hold absolute URLs (public or long-lived signed) and
 * historical ones may even hold a base64 data URI.
 */
export function isAbsoluteUrl(value: string): boolean {
  return /^(https?:|data:|blob:)/i.test(value);
}

/**
 * Resolve a stored attachment reference to a URL the browser can load.
 *
 * New attachments store the Storage object path, which is signed on demand for
 * a short window. Legacy attachments already hold a URL and are returned as-is,
 * so existing data keeps working.
 */
export async function resolveAttachmentUrl(stored: string): Promise<string> {
  if (!stored) return '';
  if (isAbsoluteUrl(stored)) return stored;
  if (!isSupabaseConfigured || !supabase) return stored;

  const hit = cache.get(stored);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(stored, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn('Could not sign attachment URL:', error?.message);
    return '';
  }

  cache.set(stored, { url: data.signedUrl, expiresAt: Date.now() + CACHE_TTL_MS });
  return data.signedUrl;
}

/** Exposed for tests. */
export function clearAttachmentUrlCache(): void {
  cache.clear();
}

/**
 * Recover the Storage object path from a stored attachment reference, so
 * deleting an attachment can remove the underlying file instead of leaving it
 * orphaned in the bucket.
 *
 * New attachments store the object path directly. Older rows may hold an
 * absolute public or signed URL, so both shapes are handled. Returns null for
 * anything that is not an attachments-bucket object (a data URI, an external
 * link) so callers can skip the delete safely.
 */
export function attachmentStoragePath(stored?: string | null): string | null {
  if (!stored) return null;
  const trimmed = stored.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;

  if (!isAbsoluteUrl(trimmed)) return trimmed;

  const match = trimmed.match(
    /\/storage\/v1\/object\/(?:public\/|sign\/)?attachments\/(.+?)(?:\?|$)/
  );
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
