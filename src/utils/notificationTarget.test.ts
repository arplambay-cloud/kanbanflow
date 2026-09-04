import { describe, it, expect } from 'vitest';
import { resolveNotificationTarget } from './notificationTarget';
import { Task } from '../types';

function makeTask(id: string, boardId: string): Task {
  return {
    id,
    boardId,
    columnId: 'col-1',
    title: `Task ${id}`,
    description: '',
    priority: 'medium',
    order: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('resolveNotificationTarget', () => {
  const tasks = [makeTask('task-1', 'board-a')];

  it('returns the task so the click can open it', () => {
    const target = resolveNotificationTarget(
      { taskId: 'task-1', boardId: 'board-a', type: 'task_assigned' },
      tasks
    );
    expect(target.task?.id).toBe('task-1');
    expect(target.boardId).toBe('board-a');
    expect(target.focusComments).toBe(false);
  });

  it('prefers the task current board over the id stored on the notification', () => {
    // The task was moved to another board after the notification was written.
    const target = resolveNotificationTarget(
      { taskId: 'task-1', boardId: 'board-stale', type: 'task_assigned' },
      tasks
    );
    expect(target.boardId).toBe('board-a');
  });

  it('asks for the comment thread on a comment notification', () => {
    const target = resolveNotificationTarget(
      { taskId: 'task-1', boardId: 'board-a', type: 'comment_added' },
      tasks
    );
    expect(target.focusComments).toBe(true);
  });

  it('still navigates to the board when the task is gone', () => {
    const target = resolveNotificationTarget(
      { taskId: 'deleted', boardId: 'board-a', type: 'task_assigned' },
      tasks
    );
    expect(target.task).toBeUndefined();
    expect(target.boardId).toBe('board-a');
  });

  it('resolves nothing to navigate to when the notification carries no ids', () => {
    const target = resolveNotificationTarget({ type: 'board_created' }, tasks);
    expect(target.task).toBeUndefined();
    expect(target.boardId).toBeUndefined();
  });
});
