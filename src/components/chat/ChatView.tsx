import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hash, Loader2, MessageSquare, Search, Send, Trash2, WifiOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { UserAvatar } from '../common/UserAvatar';
import { AutoGrowTextarea } from '../common/AutoGrowTextarea';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ChatMessage, User } from '../../types';
import {
  GENERAL_CHANNEL_ID,
  clockTime,
  continuesRun,
  dayLabel,
  dmChannelId,
  dmPartnerId,
  groupMessagesByDay,
} from '../../utils/chat';

const DM_ID_PATTERN = /^dm-([0-9a-f-]{36})-([0-9a-f-]{36})$/i;

export const ChatView: React.FC = () => {
  const { channelId: routeChannelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { users, workspace } = useApp();
  const { user: authUser } = useAuth();
  const {
    channels,
    messagesByChannel,
    unreadByChannel,
    activeChannelId,
    setActiveChannelId,
    openDirectMessage,
    sendMessage,
    deleteMessage,
    hasLoadedChannels,
    loadingChannelIds,
    isChatAvailable,
  } = useChat();

  const me = authUser?.id ?? '';
  const isAdmin = authUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const teammates = useMemo(
    () => users.filter((u) => u.id !== me).sort((a, b) => a.name.localeCompare(b.name)),
    [users, me]
  );
  const visibleTeammates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teammates;
    return teammates.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [teammates, search]);
  const groupChannels = useMemo(() => channels.filter((c) => c.kind === 'group'), [channels]);

  // The URL is the source of truth for which conversation is open.
  useEffect(() => {
    if (!isChatAvailable) return;
    if (!routeChannelId) {
      // A desktop has room for both panes, so land on the group; a phone shows the list.
      if (window.matchMedia('(min-width: 768px)').matches) {
        navigate(`/chat/${GENERAL_CHANNEL_ID}`, { replace: true });
      } else if (activeChannelId !== null) {
        setActiveChannelId(null);
      }
      return;
    }
    if (routeChannelId !== activeChannelId) setActiveChannelId(routeChannelId);
  }, [routeChannelId, isChatAvailable, activeChannelId, setActiveChannelId, navigate]);

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  // A deep link to a DM that has not been opened yet: create it if the viewer is one side of it.
  useEffect(() => {
    if (!hasLoadedChannels || !routeChannelId || activeChannel) return;
    const match = DM_ID_PATTERN.exec(routeChannelId);
    if (!match) return;
    const partner = match[1] === me ? match[2] : match[2] === me ? match[1] : null;
    if (partner && usersById.has(partner)) openDirectMessage(partner);
  }, [hasLoadedChannels, routeChannelId, activeChannel, me, usersById, openDirectMessage]);

  const thread = useMemo(
    () => (activeChannelId ? (messagesByChannel[activeChannelId] ?? []) : []),
    [messagesByChannel, activeChannelId]
  );
  const isLoadingThread = !!(activeChannelId && loadingChannelIds[activeChannelId]);
  const dayGroups = useMemo(() => groupMessagesByDay(thread), [thread]);

  const partnerId = activeChannel ? dmPartnerId(activeChannel, me) : null;
  const partner = partnerId ? usersById.get(partnerId) : undefined;
  const title =
    activeChannel?.kind === 'group'
      ? `# ${activeChannel.name}`
      : (partner?.name ?? (activeChannel ? 'Former member' : 'Conversation'));

  // Stay pinned to the newest message unless the reader has scrolled up to look at history.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const lastMessageId = thread.length > 0 ? thread[thread.length - 1].id : null;
  const lastMessageIsMine = thread.length > 0 && thread[thread.length - 1].senderId === me;

  const onThreadScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    stickToBottomRef.current = true;
    setDraft('');
  }, [activeChannelId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickToBottomRef.current || lastMessageIsMine) el.scrollTop = el.scrollHeight;
  }, [lastMessageId, lastMessageIsMine, isLoadingThread, activeChannelId]);

  const openChannel = (id: string) => navigate(`/chat/${id}`);
  const openDm = (userId: string) => {
    openDirectMessage(userId);
    navigate(`/chat/${dmChannelId(me, userId)}`);
  };

  const handleSend = () => {
    if (!activeChannelId || !draft.trim()) return;
    stickToBottomRef.current = true;
    sendMessage(activeChannelId, draft);
    setDraft('');
  };

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isChatAvailable) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <WifiOff className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">Chat needs a connected workspace</h3>
          <p className="text-xs text-slate-500">
            Messages are stored in Supabase, which is not configured for this deployment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white">
      {/* Conversation list */}
      <aside
        className={`${
          activeChannelId ? 'hidden md:flex' : 'flex'
        } w-full md:w-72 lg:w-80 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60`}
      >
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Messages</h2>
          <div className="relative mt-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a teammate..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <SectionLabel>Channels</SectionLabel>
          {!hasLoadedChannels && groupChannels.length === 0 ? (
            <div className="px-4 py-2 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            groupChannels.map((c) => (
              <ConversationRow
                key={c.id}
                active={c.id === activeChannelId}
                unread={unreadByChannel[c.id] ?? 0}
                onClick={() => openChannel(c.id)}
                icon={
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4" />
                  </div>
                }
                title={c.name ?? c.id}
                subtitle="Everyone in the workspace"
              />
            ))
          )}

          <SectionLabel className="mt-3">Direct Messages</SectionLabel>
          {teammates.length === 0 ? (
            <p className="px-4 py-2 text-xs text-slate-400">
              Invite teammates to start a direct message.
            </p>
          ) : visibleTeammates.length === 0 ? (
            <p className="px-4 py-2 text-xs text-slate-400">No teammates match that search.</p>
          ) : (
            visibleTeammates.map((u) => {
              const id = dmChannelId(me, u.id);
              return (
                <ConversationRow
                  key={u.id}
                  active={id === activeChannelId}
                  unread={unreadByChannel[id] ?? 0}
                  onClick={() => openDm(u.id)}
                  icon={<UserAvatar user={u} size="md" />}
                  title={u.name}
                  subtitle={u.jobTitle || u.email}
                />
              );
            })
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className={`${activeChannelId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
        {!activeChannelId ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Pick a conversation</h3>
              <p className="text-xs text-slate-500">
                Post to the whole team in #general, or message a teammate directly.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header className="h-16 px-4 sm:px-6 border-b border-slate-200 flex items-center gap-3 shrink-0">
              <button
                onClick={() => navigate('/chat')}
                className="p-1.5 -ml-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden"
                title="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {activeChannel?.kind === 'dm' ? (
                <UserAvatar user={partner ?? { name: 'Former member' }} size="lg" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Hash className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm truncate">{title}</h3>
                <p className="text-[11px] text-slate-500 truncate">
                  {activeChannel?.kind === 'dm'
                    ? partner?.jobTitle || partner?.email || 'This member has left the workspace'
                    : `Everyone in ${workspace.name} · ${users.length} ${
                        users.length === 1 ? 'member' : 'members'
                      }`}
                </p>
              </div>
            </header>

            <div
              ref={scrollRef}
              onScroll={onThreadScroll}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-slate-50/40"
            >
              {isLoadingThread && thread.length === 0 ? (
                <div className="h-full flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading messages...</span>
                </div>
              ) : thread.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">No messages yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {activeChannel?.kind === 'dm'
                        ? `Say hello to ${partner?.name ?? 'your teammate'}.`
                        : 'Start the conversation with your team.'}
                    </p>
                  </div>
                </div>
              ) : (
                dayGroups.map((group) => (
                  <div key={group.dayKey}>
                    <DaySeparator label={dayLabel(group.dayKey)} />
                    {group.messages.map((message, i) => (
                      <MessageRow
                        key={message.id}
                        message={message}
                        sender={message.senderId ? usersById.get(message.senderId) : undefined}
                        isMine={message.senderId === me}
                        continued={continuesRun(group.messages[i - 1], message)}
                        canDelete={message.senderId === me || isAdmin}
                        onDelete={() => setPendingDelete(message)}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-200 bg-white shrink-0">
              <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                <AutoGrowTextarea
                  minRows={1}
                  maxHeight={160}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder={`Message ${title}`}
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none py-1"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 px-1">
                Enter to send · Shift+Enter for a new line
              </p>
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete message"
        message="This message will be removed for everyone in the conversation."
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete && activeChannelId) deleteMessage(activeChannelId, pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`text-[10px] font-bold uppercase tracking-wider text-slate-400 px-4 pt-2 pb-1.5 ${className}`}
  >
    {children}
  </div>
);

const ConversationRow: React.FC<{
  active: boolean;
  unread: number;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ active, unread, onClick, icon, title, subtitle }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
      active ? 'bg-indigo-50/80' : 'hover:bg-slate-100/80'
    }`}
  >
    {icon}
    <div className="flex-1 min-w-0">
      <div className={`text-xs truncate ${unread > 0 || active ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
        {title}
      </div>
      {subtitle && <div className="text-[11px] text-slate-400 truncate">{subtitle}</div>}
    </div>
    {unread > 0 && (
      <span className="px-1.5 py-0.5 min-w-[1.25rem] text-center text-[10px] font-bold rounded-full bg-rose-500 text-white">
        {unread > 99 ? '99+' : unread}
      </span>
    )}
  </button>
);

const DaySeparator: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="h-px flex-1 bg-slate-200" />
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
    <div className="h-px flex-1 bg-slate-200" />
  </div>
);

const MessageRow: React.FC<{
  message: ChatMessage;
  sender?: User;
  isMine: boolean;
  continued: boolean;
  canDelete: boolean;
  onDelete: () => void;
}> = ({ message, sender, isMine, continued, canDelete, onDelete }) => {
  const name = sender?.name ?? 'Former member';
  return (
    <div
      className={`group flex items-end gap-2.5 ${continued ? 'mt-0.5' : 'mt-4'} ${
        isMine ? 'flex-row-reverse' : ''
      }`}
    >
      {!isMine && (
        <div className="w-8 shrink-0">
          {!continued && <UserAvatar user={sender ?? { name }} size="md" />}
        </div>
      )}

      <div className={`max-w-[75%] min-w-0 flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {!continued && (
          <div className={`flex items-baseline gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
            <span className="text-xs font-bold text-slate-800">{isMine ? 'You' : name}</span>
            <span className="text-[10px] text-slate-400">{clockTime(message.createdAt)}</span>
          </div>
        )}
        <div
          className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-subtle ${
            isMine
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
          } ${message.pending ? 'opacity-60' : ''}`}
        >
          {message.content}
        </div>
      </div>

      <div className="self-center flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {continued && (
          <span className="text-[10px] text-slate-400">{clockTime(message.createdAt)}</span>
        )}
        {canDelete && !message.pending && (
          <button
            onClick={onDelete}
            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            title="Delete message"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
