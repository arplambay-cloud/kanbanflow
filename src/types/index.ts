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
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'task_assigned' | 'status_changed' | 'task_completed' | 'board_created';

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
  action: 'created_task' | 'moved_task' | 'assigned_task' | 'completed_task' | 'created_board' | 'created_column' | 'comment_added';
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
}

export type ActivePage = 'dashboard' | 'boards' | 'board-detail' | 'tasks' | 'notifications' | 'users' | 'profile' | 'settings';
