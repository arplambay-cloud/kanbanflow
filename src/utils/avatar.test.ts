import { describe, it, expect } from 'vitest';
import { persistableAvatar, isInlineAvatar } from './avatar';

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
