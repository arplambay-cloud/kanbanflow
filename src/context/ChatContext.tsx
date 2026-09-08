import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { ChatChannel, ChatMessage } from '../types';
import { dmChannelId, dmPair, newMessageId } from '../utils/chat';
import { notifyError, notifySyncFailure } from '../utils/toast';

interface ChatContextType {
  /** Channels the signed-in user can see: the shared group plus their own DMs. */
  channels: ChatChannel[];
  /** Ascending threads keyed by channel id; a channel is absent until it is opened. */
  messagesByChannel: Record<string, ChatMessage[]>;
  unreadByChannel: Record<string, number>;
  totalUnread: number;
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;
  /** Open (creating if needed) the DM with `userId`; resolves to its channel id. */
  openDirectMessage: (userId: string) => Promise<string | null>;
  sendMessage: (channelId: string, content: string) => Promise<void>;
  deleteMessage: (channelId: string, messageId: string) => Promise<void>;
  markChannelRead: (channelId: string) => void;
  hasLoadedChannels: boolean;
  loadingChannelIds: Record<string, boolean>;
  /** False in local-only mode: messaging has no offline story. */
  isChatAvailable: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

/** How many messages a channel loads when it is first opened. */
const THREAD_PAGE_SIZE = 200;

interface ChannelRow {
  id: string;
  kind: 'group' | 'dm';
  name: string | null;
  dm_user_a: string | null;
  dm_user_b: string | null;
  created_at: string;
}

interface MessageRow {
  id: string;
  channel_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
}

const mapChannel = (c: ChannelRow): ChatChannel => ({
  id: c.id,
  kind: c.kind,
  name: c.name,
  dmUserA: c.dm_user_a,
  dmUserB: c.dm_user_b,
  createdAt: c.created_at,
});

const mapMessage = (m: MessageRow): ChatMessage => ({
  id: m.id,
  channelId: m.channel_id,
  senderId: m.sender_id,
  content: m.content,
  createdAt: m.created_at,
});

/**
 * Insert `message` into an ascending thread. A message with the same id — the
 * server's copy of one we sent optimistically — replaces the local one.
 */
const upsertIntoThread = (thread: ChatMessage[] | undefined, message: ChatMessage): ChatMessage[] => {
  const existing = thread ?? [];
  const idx = existing.findIndex((m) => m.id === message.id);
  if (idx >= 0) {
    const next = existing.slice();
    next[idx] = message;
    return next;
  }
  // Realtime can deliver slightly out of order; keep the thread sorted.
  const next = [...existing, message];
  next.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return next;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const userId = authUser?.id ?? null;
  const isChatAvailable = isSupabaseConfigured && !!supabase;

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messagesByChannel, setMessagesByChannel] = useState<Record<string, ChatMessage[]>>({});
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [hasLoadedChannels, setHasLoadedChannels] = useState(false);
  const [loadingChannelIds, setLoadingChannelIds] = useState<Record<string, boolean>>({});

  // The realtime handler is registered once per session, so it reads current
  // state through refs rather than through a closure that would go stale.
  const activeChannelIdRef = useRef<string | null>(null);
  const channelIdsRef = useRef<Set<string>>(new Set());
  const loadedThreadsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  useEffect(() => {
    channelIdsRef.current = new Set(channels.map((c) => c.id));
  }, [channels]);

  const loadChannels = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('Chat: could not load channels:', error.message);
      return;
    }
    setChannels(((data ?? []) as ChannelRow[]).map(mapChannel));
  }, [userId]);

  const loadUnreadCounts = useCallback(async () => {
    if (!supabase || !userId) return;
    const { data, error } = await supabase.rpc('chat_unread_counts');
    if (error) {
      console.warn('Chat: could not load unread counts:', error.message);
      return;
    }
    const next: Record<string, number> = {};
    for (const row of ((data ?? []) as { channel_id: string; unread: number | string }[])) {
      next[row.channel_id] = Number(row.unread) || 0;
    }
    setUnreadByChannel(next);
  }, [userId]);

  const loadThread = useCallback(
    async (channelId: string) => {
      if (!supabase || !userId) return;
      if (loadedThreadsRef.current.has(channelId)) return;
      loadedThreadsRef.current.add(channelId);
      setLoadingChannelIds((prev) => ({ ...prev, [channelId]: true }));
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('channel_id', channelId)
          .order('created_at', { ascending: false })
          .limit(THREAD_PAGE_SIZE);
        if (error) throw error;
        const fetched = ((data ?? []) as MessageRow[]).map(mapMessage).reverse();
        setMessagesByChannel((prev) => {
          // Keep anything that arrived over realtime, or was sent, while the fetch was in flight.
          let thread = fetched;
          for (const m of prev[channelId] ?? []) thread = upsertIntoThread(thread, m);
          return { ...prev, [channelId]: thread };
        });
      } catch (err) {
        loadedThreadsRef.current.delete(channelId);
        console.warn('Chat: could not load messages:', err);
      } finally {
        setLoadingChannelIds((prev) => {
          const next = { ...prev };
          delete next[channelId];
          return next;
        });
      }
    },
    [userId]
  );

  const markChannelRead = useCallback(
    (channelId: string) => {
      setUnreadByChannel((prev) => (prev[channelId] ? { ...prev, [channelId]: 0 } : prev));
      if (!supabase || !userId) return;
      const client = supabase;
      (async () => {
        const { error } = await client.from('chat_reads').upsert(
          { channel_id: channelId, user_id: userId, last_read_at: new Date().toISOString() },
          { onConflict: 'channel_id,user_id' }
        );
        if (error) console.warn('Chat: could not save read marker:', error.message);
      })();
    },
    [userId]
  );

  // Load on sign-in; clear everything on sign-out so the next account starts clean.
  useEffect(() => {
    if (!isChatAvailable || !userId) {
      setChannels([]);
      setMessagesByChannel({});
      setUnreadByChannel({});
      setActiveChannelId(null);
      setHasLoadedChannels(false);
      loadedThreadsRef.current = new Set();
      return;
    }
    let cancelled = false;
    (async () => {
      await Promise.all([loadChannels(), loadUnreadCounts()]);
      if (!cancelled) setHasLoadedChannels(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isChatAvailable, userId, loadChannels, loadUnreadCounts]);

  // Live updates. RLS applies to these events too, so a DM between two other
  // people never reaches this client.
  useEffect(() => {
    if (!isChatAvailable || !supabase || !userId) return;
    const client = supabase;

    const channel = client
      .channel('kanbanflow_chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const message = mapMessage(payload.new as MessageRow);
          const isMine = message.senderId === userId;
          const isActive = activeChannelIdRef.current === message.channelId;

          // Only threads that have been opened are held in memory; the rest load on demand.
          if (loadedThreadsRef.current.has(message.channelId)) {
            setMessagesByChannel((prev) => ({
              ...prev,
              [message.channelId]: upsertIntoThread(prev[message.channelId], message),
            }));
          }

          if (!isMine) {
            if (isActive) {
              markChannelRead(message.channelId);
            } else {
              setUnreadByChannel((prev) => ({
                ...prev,
                [message.channelId]: (prev[message.channelId] ?? 0) + 1,
              }));
            }
          }

          // A message in a channel we have never seen means someone just opened a DM with us.
          if (!channelIdsRef.current.has(message.channelId)) loadChannels();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const id = (payload.old as { id?: string } | null)?.id;
          if (!id) return;
          setMessagesByChannel((prev) => {
            let changed = false;
            const next: Record<string, ChatMessage[]> = {};
            for (const [channelId, thread] of Object.entries(prev)) {
              const filtered = thread.filter((m) => m.id !== id);
              if (filtered.length !== thread.length) changed = true;
              next[channelId] = filtered;
            }
            return changed ? next : prev;
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_channels' },
        (payload) => {
          const row = mapChannel(payload.new as ChannelRow);
          setChannels((prev) => (prev.some((c) => c.id === row.id) ? prev : [...prev, row]));
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isChatAvailable, userId, loadChannels, markChannelRead]);

  // Opening a conversation loads it and clears its badge.
  useEffect(() => {
    if (!activeChannelId || !isChatAvailable) return;
    loadThread(activeChannelId);
    markChannelRead(activeChannelId);
  }, [activeChannelId, isChatAvailable, loadThread, markChannelRead]);

  const openDirectMessage = useCallback(
    async (otherUserId: string): Promise<string | null> => {
      if (!userId || otherUserId === userId) return null;
      const id = dmChannelId(userId, otherUserId);
      if (channelIdsRef.current.has(id)) {
        setActiveChannelId(id);
        return id;
      }

      const { a, b } = dmPair(userId, otherUserId);
      const optimistic: ChatChannel = {
        id,
        kind: 'dm',
        name: null,
        dmUserA: a,
        dmUserB: b,
        createdAt: new Date().toISOString(),
      };
      setChannels((prev) => (prev.some((c) => c.id === id) ? prev : [...prev, optimistic]));
      setActiveChannelId(id);
      if (!supabase) return id;

      // Deterministic id, so a conversation the other side already opened is
      // simply reused rather than duplicated.
      const { error } = await supabase
        .from('chat_channels')
        .upsert(
          { id, kind: 'dm', dm_user_a: a, dm_user_b: b, created_by: userId },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      if (error) {
        setChannels((prev) => prev.filter((c) => c.id !== id));
        setActiveChannelId((current) => (current === id ? null : current));
        notifySyncFailure('Opening the conversation', error);
        return null;
      }
      return id;
    },
    [userId]
  );

  const sendMessage = useCallback(
    async (channelId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !userId) return;

      const message: ChatMessage = {
        id: newMessageId(),
        channelId,
        senderId: userId,
        content: trimmed,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessagesByChannel((prev) => ({
        ...prev,
        [channelId]: upsertIntoThread(prev[channelId], message),
      }));
      if (!supabase) return;

      const { error } = await supabase.from('chat_messages').insert({
        id: message.id,
        channel_id: channelId,
        sender_id: userId,
        content: trimmed,
      });
      if (error) {
        setMessagesByChannel((prev) => ({
          ...prev,
          [channelId]: (prev[channelId] ?? []).filter((m) => m.id !== message.id),
        }));
        notifySyncFailure('Your message', error);
        return;
      }

      setMessagesByChannel((prev) => ({
        ...prev,
        [channelId]: (prev[channelId] ?? []).map((m) =>
          m.id === message.id ? { ...m, pending: false } : m
        ),
      }));
      // Replying means everything above it has been seen.
      markChannelRead(channelId);
    },
    [userId, markChannelRead]
  );

  const deleteMessage = useCallback(
    async (channelId: string, messageId: string) => {
      const removed = (messagesByChannel[channelId] ?? []).find((m) => m.id === messageId);
      setMessagesByChannel((prev) => ({
        ...prev,
        [channelId]: (prev[channelId] ?? []).filter((m) => m.id !== messageId),
      }));
      if (!supabase) return;

      // RLS turns a forbidden delete into a silent no-op, so check that a row
      // actually went rather than trusting the absence of an error.
      const { data, error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', messageId)
        .select('id');
      if (error || !data || data.length === 0) {
        if (removed) {
          setMessagesByChannel((prev) => ({
            ...prev,
            [channelId]: upsertIntoThread(prev[channelId], removed),
          }));
        }
        if (error) notifySyncFailure('Deleting the message', error);
        else notifyError('Only the author or an admin can delete that message.');
      }
    },
    [messagesByChannel]
  );

  const totalUnread = useMemo(
    () => Object.values(unreadByChannel).reduce((sum, n) => sum + n, 0),
    [unreadByChannel]
  );

  const value = useMemo<ChatContextType>(
    () => ({
      channels,
      messagesByChannel,
      unreadByChannel,
      totalUnread,
      activeChannelId,
      setActiveChannelId,
      openDirectMessage,
      sendMessage,
      deleteMessage,
      markChannelRead,
      hasLoadedChannels,
      loadingChannelIds,
      isChatAvailable,
    }),
    [
      channels,
      messagesByChannel,
      unreadByChannel,
      totalUnread,
      activeChannelId,
      openDirectMessage,
      sendMessage,
      deleteMessage,
      markChannelRead,
      hasLoadedChannels,
      loadingChannelIds,
      isChatAvailable,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
