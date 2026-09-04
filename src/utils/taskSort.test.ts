import { describe, it, expect } from 'vitest';
import { allowsManualReorder, isBoardSortMode, sortTasksForColumn } from './taskSort';
import { Priority, Task } from '../types';

function makeTask(
  id: string,
  priority: Priority,
  createdAt: string,
  order = 0
): Task {
  return {
    id,
    boardId: 'board-1',
    columnId: 'col-1',
    title: `Task ${id}`,
    description: '',
    priority,
    order,
    createdAt,
    updatedAt: createdAt,
  };
}

const ids = (tasks: Task[]) => tasks.map((t) => t.id);

describe('sortTasksForColumn', () => {
  it('keeps the hand-arranged order in manual mode', () => {
    const tasks = [
      makeTask('c', 'urgent', '2026-03-01T00:00:00.000Z', 2),
      makeTask('a', 'low', '2026-01-01T00:00:00.000Z', 0),
      makeTask('b', 'high', '2026-02-01T00:00:00.000Z', 1),
    ];
    expect(ids(sortTasksForColumn(tasks, 'manual'))).toEqual(['a', 'b', 'c']);
  });

  it('puts higher priority first, regardless of manual order', () => {
    // Mirrors the reported bug: a medium sat above a high because it was
    // dragged there first.
    const tasks = [
      makeTask('medium', 'medium', '2026-01-01T00:00:00.000Z', 0),
      makeTask('high', 'high', '2026-01-02T00:00:00.000Z', 1),
      makeTask('urgent', 'urgent', '2026-01-03T00:00:00.000Z', 2),
      makeTask('low', 'low', '2026-01-04T00:00:00.000Z', 3),
    ];
    expect(ids(sortTasksForColumn(tasks, 'priority'))).toEqual([
      'urgent',
      'high',
      'medium',
      'low',
    ]);
  });

  it('breaks a priority tie with the newest task', () => {
    const tasks = [
      makeTask('older', 'high', '2026-01-01T00:00:00.000Z'),
      makeTask('newer', 'high', '2026-06-01T00:00:00.000Z'),
    ];
    expect(ids(sortTasksForColumn(tasks, 'priority'))).toEqual(['newer', 'older']);
  });

  it('orders by recency in newest mode, ignoring priority', () => {
    const tasks = [
      makeTask('old-urgent', 'urgent', '2026-01-01T00:00:00.000Z'),
      makeTask('new-low', 'low', '2026-06-01T00:00:00.000Z'),
    ];
    expect(ids(sortTasksForColumn(tasks, 'newest'))).toEqual(['new-low', 'old-urgent']);
  });

  it('sorts tasks with an unparseable createdAt last instead of throwing', () => {
    const tasks = [
      makeTask('broken', 'high', 'not-a-date'),
      makeTask('fine', 'high', '2026-01-01T00:00:00.000Z'),
    ];
    expect(ids(sortTasksForColumn(tasks, 'newest'))).toEqual(['fine', 'broken']);
  });

  it('does not mutate the array it is given', () => {
    const tasks = [
      makeTask('a', 'low', '2026-01-01T00:00:00.000Z', 0),
      makeTask('b', 'urgent', '2026-01-02T00:00:00.000Z', 1),
    ];
    sortTasksForColumn(tasks, 'priority');
    expect(ids(tasks)).toEqual(['a', 'b']);
  });

  it('treats a missing priority as medium rather than dropping the task', () => {
    const tasks = [
      makeTask('none', undefined as unknown as Priority, '2026-01-01T00:00:00.000Z'),
      makeTask('low', 'low', '2026-01-02T00:00:00.000Z'),
      makeTask('high', 'high', '2026-01-03T00:00:00.000Z'),
    ];
    expect(ids(sortTasksForColumn(tasks, 'priority'))).toEqual(['high', 'none', 'low']);
  });
});

describe('isBoardSortMode', () => {
  it('accepts the three known modes', () => {
    expect(isBoardSortMode('manual')).toBe(true);
    expect(isBoardSortMode('priority')).toBe(true);
    expect(isBoardSortMode('newest')).toBe(true);
  });

  it('rejects anything else, so a stale row falls back to the default', () => {
    expect(isBoardSortMode(undefined)).toBe(false);
    expect(isBoardSortMode(null)).toBe(false);
    expect(isBoardSortMode('')).toBe(false);
    expect(isBoardSortMode('alphabetical')).toBe(false);
  });
});

describe('allowsManualReorder', () => {
  it('is true only for manual mode', () => {
    expect(allowsManualReorder('manual')).toBe(true);
    expect(allowsManualReorder('priority')).toBe(false);
    expect(allowsManualReorder('newest')).toBe(false);
  });
});
