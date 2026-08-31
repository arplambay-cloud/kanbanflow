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
