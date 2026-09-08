import { describe, it, expect } from 'vitest';
import {
  continuesRun,
  dayKey,
  dayLabel,
  dmChannelId,
  dmPair,
  dmPartnerId,
  groupMessagesByDay,
} from './chat';
import { ChatMessage } from '../types';

// Built from local date parts so the expectations hold in any timezone.
const at = (h: number, min: number, day = 8) => new Date(2026, 8, day, h, min).toISOString();

const msg = (over: Partial<ChatMessage>): ChatMessage => ({
  id: 'm',
  channelId: 'general',
  senderId: 'u1',
  content: 'hi',
  createdAt: at(10, 0),
  ...over,
});

describe('dmPair / dmChannelId', () => {
  it('orders the pair so both directions name the same conversation', () => {
    expect(dmPair('b', 'a')).toEqual({ a: 'a', b: 'b' });
    expect(dmChannelId('b', 'a')).toBe(dmChannelId('a', 'b'));
    expect(dmChannelId('a', 'b')).toBe('dm-a-b');
  });

  it('sorts uuids the way the database check constraint compares them', () => {
    const lo = '12b1c843-d123-4901-a1f4-fc17dcd4555f';
    const hi = 'f0000000-0000-0000-0000-000000000000';
    expect(dmPair(hi, lo)).toEqual({ a: lo, b: hi });
  });
});

describe('dmPartnerId', () => {
  const dm = { kind: 'dm' as const, dmUserA: 'a', dmUserB: 'b' };

  it('returns the other side of the conversation', () => {
    expect(dmPartnerId(dm, 'a')).toBe('b');
    expect(dmPartnerId(dm, 'b')).toBe('a');
  });

  it('is null for outsiders and for group channels', () => {
    expect(dmPartnerId(dm, 'z')).toBeNull();
    expect(dmPartnerId({ kind: 'group', dmUserA: null, dmUserB: null }, 'a')).toBeNull();
  });
});

describe('day grouping', () => {
  it('groups consecutive messages by local calendar day', () => {
    const lateSunday = at(23, 59, 7);
    const earlyMonday = at(0, 1, 8);
    const groups = groupMessagesByDay([
      msg({ id: '1', createdAt: lateSunday }),
      msg({ id: '2', createdAt: earlyMonday }),
      msg({ id: '3', createdAt: earlyMonday }),
    ]);
    expect(groups.map((g) => g.messages.length)).toEqual([1, 2]);
    expect(groups[1].dayKey).toBe(dayKey(earlyMonday));
  });

  it('labels days relative to now', () => {
    const now = new Date(2026, 8, 8, 12);
    expect(dayLabel('2026-09-08', now)).toBe('Today');
    expect(dayLabel('2026-09-07', now)).toBe('Yesterday');
    expect(dayLabel('2026-09-01', now)).toMatch(/Sep 1/);
    expect(dayLabel('2025-12-25', now)).toMatch(/2025/);
  });
});

describe('continuesRun', () => {
  it('collapses same-sender messages sent close together', () => {
    expect(continuesRun(msg({ id: '1' }), msg({ id: '2', createdAt: at(10, 3) }))).toBe(true);
  });

  it('breaks on a different sender, a long gap, a deleted account, or the first message', () => {
    const first = msg({ id: '1' });
    expect(continuesRun(first, msg({ id: '2', senderId: 'u2' }))).toBe(false);
    expect(continuesRun(first, msg({ id: '3', createdAt: at(10, 6) }))).toBe(false);
    expect(continuesRun(msg({ senderId: null }), msg({ senderId: null }))).toBe(false);
    expect(continuesRun(undefined, first)).toBe(false);
  });
});
