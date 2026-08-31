import { User, Board, Column, Task, Notification, ActivityLog, Workspace } from '../types';

export const initialUsers: User[] = [];

export const initialWorkspace: Workspace = {
  id: 'ws-default',
  name: 'My Workspace',
  description: 'Collaborative team workspace for managing projects and tasks.',
  accentColor: '#4f46e5',
  createdAt: new Date().toISOString(),
};

export const initialBoards: Board[] = [];

export const initialColumns: Column[] = [];

export const initialTasks: Task[] = [];

export const initialNotifications: Notification[] = [];

export const initialActivityLogs: ActivityLog[] = [];
