/**
 * How a board orders the cards inside each of its columns.
 *
 * 'manual' keeps the hand-arranged order that drag-and-drop writes; the
 * others derive the order from the task itself.
 */
export type BoardSortMode = 'manual' | 'priority' | 'newest';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member';
  jobTitle: string;
  /** Heartbeat from the member's most recent session; null if they have not signed in since it was added. */
  lastSeenAt?: string | null;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  assigneeId?: string;
  dueDate?: string; // ISO date string YYYY-MM-DD
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  order: number;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
}

export interface Column {
  id: string;
  boardId: string;
  title: string;
  order: number;
}

export interface Board {
  id: string;
  title: string;
  description?: string;
  color: string;
  /** How this board's columns order their cards. Defaults to 'manual'. */
  sortMode: BoardSortMode;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'status_changed'
  | 'task_completed'
  | 'board_created'
  | 'comment_added';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  taskId?: string;
  taskTitle?: string;
  boardId?: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  action: 'created_task' | 'moved_task' | 'assigned_task' | 'completed_task' | 'deleted_task' | 'created_board' | 'deleted_board' | 'created_column' | 'comment_added';
  entityTitle: string;
  boardTitle?: string;
  details?: string;
  timestamp: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  createdAt: string;
  /**
   * When the one-time setup wizard was completed for this workspace, or null
   * if it never has been. Server-side and shared by everyone in the workspace:
   * an invited admin must not be walked through setup again on their own
   * machine, because finishing it rewrites the workspace's own settings.
   */
  onboardedAt: string | null;
}

export type ChatChannelKind = 'group' | 'dm';

export interface ChatChannel {
  id: string;
  kind: ChatChannelKind;
  /** Display name; set for groups, null for DMs (which take the other person's name). */
  name: string | null;
  /** The two participants of a DM, sorted; both null for a group. */
  dmUserA: string | null;
  dmUserB: string | null;
  createdAt: string;
}

export interface ChatReaction {
  userId: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  /** Null once the author's account has been deleted. */
  senderId: string | null;
  content: string;
  createdAt: string;
  /** Set (by the database) when the author changed the text after sending. */
  editedAt: string | null;
  reactions: ChatReaction[];
  /** Sent from this tab and not yet confirmed by the server. */
  pending?: boolean;
}

export type ActivePage = 'dashboard' | 'boards' | 'board-detail' | 'tasks' | 'chat' | 'notifications' | 'users' | 'profile' | 'settings';
