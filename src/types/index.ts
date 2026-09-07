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
  clientId?: string;
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

/** A client the work is being done for. Tasks optionally belong to one. */
export interface Client {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
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

export type ActivePage = 'dashboard' | 'boards' | 'board-detail' | 'tasks' | 'clients' | 'notifications' | 'users' | 'profile' | 'settings';
