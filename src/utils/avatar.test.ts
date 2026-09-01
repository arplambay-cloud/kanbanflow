import { describe, it, expect } from 'vitest';
import { persistableAvatar, isInlineAvatar, avatarStoragePath } from './avatar';

describe('persistableAvatar', () => {
  it('keeps a normal Storage URL', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/avatars/a_1.png';
    expect(persistableAvatar(url)).toBe(url);
  });

  it('drops a base64 data URL — the cause of the multi-MB rows', () => {
    expect(persistableAvatar('data:image/png;base64,iVBORw0KGgoAAAANS')).toBe('');
  });

  it('drops an oversized value even if it is not a data URL', () => {
    expect(persistableAvatar('https://example.com/' + 'a'.repeat(600))).toBe('');
  });

  it('normalises empty-ish input to an empty string', () => {
    expect(persistableAvatar(undefined)).toBe('');
    expect(persistableAvatar(null)).toBe('');
    expect(persistableAvatar('')).toBe('');
    expect(persistableAvatar('   ')).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(persistableAvatar('  https://example.com/a.png  ')).toBe('https://example.com/a.png');
  });
});

describe('isInlineAvatar', () => {
  it('detects legacy inline avatars', () => {
    expect(isInlineAvatar('data:image/png;base64,AAA')).toBe(true);
    expect(isInlineAvatar('  data:image/jpeg;base64,AAA')).toBe(true);
  });

  it('does not flag URLs or empty values', () => {
    expect(isInlineAvatar('https://example.com/a.png')).toBe(false);
    expect(isInlineAvatar('')).toBe(false);
    expect(isInlineAvatar(undefined)).toBe(false);
  });
});

describe('avatarStoragePath', () => {
  const base = 'https://aoxpcehnqwwcjahqdkbd.supabase.co/storage/v1/object/public/avatars/';

  it('recovers the object path from a public avatar URL', () => {
    expect(avatarStoragePath(base + 'user-123/avatar_1788.png')).toBe('user-123/avatar_1788.png');
  });

  it('handles a signed URL and strips the query', () => {
    const signed =
      'https://x.supabase.co/storage/v1/object/sign/avatars/u/a.png?token=abc.def';
    expect(avatarStoragePath(signed)).toBe('u/a.png');
  });

  it('decodes percent-encoded names', () => {
    expect(avatarStoragePath(base + 'u/my%20photo.png')).toBe('u/my photo.png');
  });

  it('returns null for values that are not avatar objects', () => {
    expect(avatarStoragePath('data:image/png;base64,AAA')).toBeNull();
    expect(avatarStoragePath('https://images.unsplash.com/photo-123')).toBeNull();
    expect(avatarStoragePath('')).toBeNull();
    expect(avatarStoragePath(undefined)).toBeNull();
  });

  it('does not match the attachments bucket', () => {
    const att = 'https://x.supabase.co/storage/v1/object/public/attachments/t/f.png';
    expect(avatarStoragePath(att)).toBeNull();
  });
});
