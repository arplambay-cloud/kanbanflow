/** Longest avatar reference we are willing to persist (a Storage URL is ~100 chars). */
const MAX_PERSISTED_AVATAR_LENGTH = 500;

/**
 * Guard for anything written to an avatar column.
 *
 * A base64 `data:` URL is roughly 1.2 MB per photo. Those used to be stored in
 * `profiles.avatar_url` and copied into every `notifications.sender_avatar` and
 * `activity_logs.user_avatar` row, which grew the workspace payload to ~9 MB and
 * stalled the loading screen on every boot.
 *
 * Avatars now live in Supabase Storage, so only a short URL should ever reach
 * the database. Anything that looks like inline image data is dropped instead —
 * the UI falls back to initials, which is far better than a multi-megabyte row.
 */
export function persistableAvatar(avatar?: string | null): string {
  if (!avatar) return '';
  const trimmed = avatar.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:')) return '';
  if (trimmed.length > MAX_PERSISTED_AVATAR_LENGTH) return '';
  return trimmed;
}

/** True for a legacy inline-image avatar that should be migrated to Storage. */
export function isInlineAvatar(avatar?: string | null): boolean {
  return Boolean(avatar && avatar.trim().startsWith('data:'));
}

/**
 * Recover the Storage object path from a stored avatar URL, so removing or
 * replacing a photo can delete the underlying file instead of leaving it
 * orphaned in the bucket.
 *
 * Returns null for anything that is not an avatars-bucket URL — a data URL, an
 * external image, or an empty value — so callers can skip the delete safely.
 */
export function avatarStoragePath(avatar?: string | null): string | null {
  if (!avatar) return null;
  const trimmed = avatar.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  // .../storage/v1/object/public/avatars/<path>  (also matches signed URLs)
  const match = trimmed.match(/\/storage\/v1\/object\/(?:public\/|sign\/)?avatars\/(.+?)(?:\?|$)/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
