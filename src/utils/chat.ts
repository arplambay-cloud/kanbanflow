import { ChatChannel, ChatMessage } from '../types';

/** The one channel every workspace member shares. Seeded by the schema. */
export const GENERAL_CHANNEL_ID = 'general';

/**
 * Sorted participant pair for a direct-message channel.
 *
 * The schema requires `dm_user_a < dm_user_b`, and sorting here means (a, b)
 * and (b, a) name the same conversation — so either side can open it without
 * first asking the server whether it already exists.
 */
export function dmPair(userA: string, userB: string): { a: string; b: string } {
  return userA < userB ? { a: userA, b: userB } : { a: userB, b: userA };
}

/** Deterministic id for the DM between two users, given in either order. */
export function dmChannelId(userA: string, userB: string): string {
  const { a, b } = dmPair(userA, userB);
  return `dm-${a}-${b}`;
}

/** The other participant of a DM from `viewerId`'s side, or null if not a party to it. */
export function dmPartnerId(
  channel: Pick<ChatChannel, 'kind' | 'dmUserA' | 'dmUserB'>,
  viewerId: string
): string | null {
  if (channel.kind !== 'dm') return null;
  if (channel.dmUserA === viewerId) return channel.dmUserB;
  if (channel.dmUserB === viewerId) return channel.dmUserA;
  return null;
}

/** A unique id for a message sent from this tab. */
export function newMessageId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let slug = '';
  for (let i = 0; i < bytes.length; i++) slug += chars.charAt(bytes[i] % chars.length);
  return `msg-${Date.now()}-${slug}`;
}

/** Local calendar day of a timestamp as YYYY-MM-DD, for grouping under date separators. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "Today", "Yesterday", "Mon, Sep 8" or "Sep 8, 2025" for a day key. */
export function dayLabel(key: string, now: Date = new Date()): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Wall-clock time of a message, e.g. "3:42 PM". */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export interface MessageDayGroup {
  dayKey: string;
  messages: ChatMessage[];
}

/** Split an ascending thread into consecutive runs that share a calendar day. */
export function groupMessagesByDay(messages: ChatMessage[]): MessageDayGroup[] {
  const groups: MessageDayGroup[] = [];
  for (const message of messages) {
    const key = dayKey(message.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.dayKey === key) last.messages.push(message);
    else groups.push({ dayKey: key, messages: [message] });
  }
  return groups;
}

/**
 * Whether `message` continues the previous message's run — same sender, sent
 * within `windowMs` — so the avatar and name need not be repeated.
 */
export function continuesRun(
  prev: ChatMessage | undefined,
  message: ChatMessage,
  windowMs = 5 * 60 * 1000
): boolean {
  if (!prev) return false;
  if (message.senderId === null || prev.senderId !== message.senderId) return false;
  const gap = new Date(message.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap >= 0 && gap < windowMs;
}
