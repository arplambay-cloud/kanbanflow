import { describe, it, expect } from 'vitest';
import { attachmentStoragePath, isAbsoluteUrl } from './attachmentUrl';

describe('attachmentStoragePath', () => {
  it('returns a bare object path unchanged (how new uploads are stored)', () => {
    const p = 'task-1788343336795-xbtd/1788343431220_report.docx';
    expect(attachmentStoragePath(p)).toBe(p);
  });

  it('extracts the path from a legacy public URL', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/attachments/task-1/file.docx';
    expect(attachmentStoragePath(url)).toBe('task-1/file.docx');
  });

  it('extracts the path from a signed URL and drops the token', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/sign/attachments/task-1/file.docx?token=ab.cd';
    expect(attachmentStoragePath(url)).toBe('task-1/file.docx');
  });

  it('decodes percent-encoded names', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/attachments/t/my%20file.docx';
    expect(attachmentStoragePath(url)).toBe('t/my file.docx');
  });

  it('returns null for values that are not attachment objects', () => {
    expect(attachmentStoragePath('data:application/pdf;base64,AAA')).toBeNull();
    expect(attachmentStoragePath('blob:http://localhost/abc')).toBeNull();
    expect(attachmentStoragePath('')).toBeNull();
    expect(attachmentStoragePath(undefined)).toBeNull();
  });

  it('does not match the avatars bucket', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u/a.png';
    expect(attachmentStoragePath(url)).toBeNull();
  });
});

describe('isAbsoluteUrl', () => {
  it('recognises http, data and blob references', () => {
    expect(isAbsoluteUrl('https://example.com/a')).toBe(true);
    expect(isAbsoluteUrl('data:image/png;base64,A')).toBe(true);
    expect(isAbsoluteUrl('blob:http://x/y')).toBe(true);
  });

  it('treats a bare storage path as relative', () => {
    expect(isAbsoluteUrl('task-1/file.docx')).toBe(false);
  });
});
