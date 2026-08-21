import { User, Board, Column, Task, Notification, ActivityLog, Workspace } from '../types';

export const initialUsers: User[] = [];

export const initialWorkspace: Workspace = {
  id: 'ws-1',
  name: 'My Workspace',
  description: 'Collaborative team workspace for managing projects and tasks.',
  accentColor: '#4f46e5',
  createdAt: new Date().toISOString(),
};

export const initialBoards: Board[] = [
  {
    id: 'board-1',
    title: 'Main Project Board',
    description: 'Central Kanban board for tracking tasks and sprints.',
    color: '#4f46e5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const initialColumns: Column[] = [
  { id: 'col-1-todo', boardId: 'board-1', title: 'To Do', order: 0 },
  { id: 'col-1-in-progress', boardId: 'board-1', title: 'In Progress', order: 1 },
  { id: 'col-1-review', boardId: 'board-1', title: 'In Review', order: 2 },
  { id: 'col-1-done', boardId: 'board-1', title: 'Done', order: 3 },
];

export const initialTasks: Task[] = [];

export const initialNotifications: Notification[] = [];

export const initialActivityLogs: ActivityLog[] = [];
