import { User, Board, Column, Task, Notification, ActivityLog, Workspace } from '../types';

export const initialUsers: User[] = [];

export const initialWorkspace: Workspace = {
  id: 'ws-default',
  name: 'My Workspace',
  description: 'Collaborative team workspace for managing projects and tasks.',
  accentColor: '#4f46e5',
  createdAt: new Date().toISOString(),
};

export const initialBoards: Board[] = [
  {
    id: 'pjxmtkwq',
    title: 'Main Project Board',
    description: 'Central Kanban board for tracking tasks and sprints.',
    color: '#4f46e5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const initialColumns: Column[] = [
  { id: 'col-todo-1', boardId: 'pjxmtkwq', title: 'To Do', order: 0 },
  { id: 'col-inprogress-1', boardId: 'pjxmtkwq', title: 'In Progress', order: 1 },
  { id: 'col-review-1', boardId: 'pjxmtkwq', title: 'In Review', order: 2 },
  { id: 'col-done-1', boardId: 'pjxmtkwq', title: 'Done', order: 3 },
];

export const initialTasks: Task[] = [];

export const initialNotifications: Notification[] = [];

export const initialActivityLogs: ActivityLog[] = [];
