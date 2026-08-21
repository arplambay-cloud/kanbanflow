export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  jobTitle: string;
  initials: string;
}

export interface Task {
  id: string;
  boardId: string;
  columnId: string;
  title: string;
  description: string;
  assigneeId?: string;
  dueDate?: string; // YYYY-MM-DD
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  order: number;
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
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'task_assigned' | 'status_changed' | 'task_completed' | 'board_created';

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
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
  userInitials: string;
  action: 'created_task' | 'moved_task' | 'assigned_task' | 'completed_task' | 'created_board' | 'created_column';
  entityTitle: string;
  boardTitle?: string;
  details?: string;
  timestamp: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  initials: string;
  createdAt: string;
}

export type ActivePage = 'dashboard' | 'boards' | 'board-detail' | 'tasks' | 'notifications' | 'profile' | 'settings';
