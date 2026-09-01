import { describe, it, expect } from 'vitest';
import { reorderTasks, tasksNeedingPersist, resolveColumnForBoard } from './taskReorder';
import { Task } from '../types';

const FIXED_NOW = '2026-01-01T00:00:00.000Z';
const now = () => FIXED_NOW;

function makeTask(id: string, columnId: string, order: number): Task {
  return {
    id,
    boardId: 'board-1',
    columnId,
    title: `Task ${id}`,
    description: '',
    priority: 'medium',
    order,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  };
}

/** Tasks in one column, sorted by order — the shape the board renders. */
function column(tasks: Task[], columnId: string) {
  return tasks
    .filter((t) => t.columnId === columnId)
    .sort((a, b) => a.order - b.order)
    .map((t) => t.id);
}

describe('reorderTasks', () => {
  const base = [
    makeTask('a', 'todo', 0),
    makeTask('b', 'todo', 1),
    makeTask('c', 'todo', 2),
    makeTask('x', 'doing', 0),
    makeTask('y', 'doing', 1),
  ];

  it('returns the list unchanged when the task does not exist', () => {
    expect(reorderTasks(base, 'nope', 'doing', 0, now)).toBe(base);
  });

  it('never loses or duplicates tasks', () => {
    const result = reorderTasks(base, 'a', 'doing', 1, now);
    expect(result).toHaveLength(base.length);
    expect(new Set(result.map((t) => t.id)).size).toBe(base.length);
  });

  describe('within the same column', () => {
    it('moves a task to the end', () => {
      const result = reorderTasks(base, 'a', 'todo', 2, now);
      expect(column(result, 'todo')).toEqual(['b', 'c', 'a']);
    });

    it('moves a task to the front', () => {
      const result = reorderTasks(base, 'c', 'todo', 0, now);
      expect(column(result, 'todo')).toEqual(['c', 'a', 'b']);
    });

    it('leaves the other column untouched', () => {
      const result = reorderTasks(base, 'a', 'todo', 2, now);
      expect(column(result, 'doing')).toEqual(['x', 'y']);
    });

    it('produces contiguous order values starting at 0', () => {
      const result = reorderTasks(base, 'a', 'todo', 1, now);
      const orders = result
        .filter((t) => t.columnId === 'todo')
        .map((t) => t.order)
        .sort((p, q) => p - q);
      expect(orders).toEqual([0, 1, 2]);
    });
  });

  describe('across columns', () => {
    it('inserts at the requested index', () => {
      const result = reorderTasks(base, 'a', 'doing', 1, now);
      expect(column(result, 'doing')).toEqual(['x', 'a', 'y']);
    });

    it('reindexes the source column to close the gap', () => {
      const result = reorderTasks(base, 'a', 'doing', 0, now);
      expect(column(result, 'todo')).toEqual(['b', 'c']);
      const todoOrders = result
        .filter((t) => t.columnId === 'todo')
        .map((t) => t.order)
        .sort((p, q) => p - q);
      expect(todoOrders).toEqual([0, 1]);
    });

    it('updates the moved task columnId', () => {
      const result = reorderTasks(base, 'a', 'doing', 0, now);
      expect(result.find((t) => t.id === 'a')?.columnId).toBe('doing');
    });

    it('stamps updatedAt only on the moved task', () => {
      const result = reorderTasks(base, 'a', 'doing', 0, now);
      expect(result.find((t) => t.id === 'a')?.updatedAt).toBe(FIXED_NOW);
      expect(result.find((t) => t.id === 'b')?.updatedAt).toBe(
        '2025-01-01T00:00:00.000Z'
      );
    });

    it('handles moving into an empty column', () => {
      const result = reorderTasks(base, 'a', 'done', 0, now);
      expect(column(result, 'done')).toEqual(['a']);
      expect(result.find((t) => t.id === 'a')?.order).toBe(0);
    });
  });

  describe('out-of-range indices', () => {
    it('clamps an index beyond the end without creating holes', () => {
      const result = reorderTasks(base, 'a', 'doing', 99, now);
      expect(column(result, 'doing')).toEqual(['x', 'y', 'a']);
      expect(result.every((t) => typeof t.order === 'number')).toBe(true);
      expect(result).toHaveLength(base.length);
    });

    it('clamps a negative index to the front', () => {
      const result = reorderTasks(base, 'a', 'doing', -5, now);
      expect(column(result, 'doing')).toEqual(['a', 'x', 'y']);
    });
  });

  it('is idempotent when dropping a task back where it started', () => {
    const result = reorderTasks(base, 'b', 'todo', 1, now);
    expect(column(result, 'todo')).toEqual(['a', 'b', 'c']);
  });

  it('tolerates duplicate order values in the input', () => {
    const messy = [
      makeTask('a', 'todo', 0),
      makeTask('b', 'todo', 0),
      makeTask('c', 'todo', 0),
    ];
    const result = reorderTasks(messy, 'c', 'todo', 0, now);
    const orders = result.map((t) => t.order).sort((p, q) => p - q);
    expect(orders).toEqual([0, 1, 2]);
    expect(result).toHaveLength(3);
  });
});

describe('tasksNeedingPersist', () => {
  const before = [
    makeTask('a', 'todo', 0),
    makeTask('b', 'todo', 1),
    makeTask('x', 'doing', 0),
  ];

  it('returns only rows whose order or column changed', () => {
    const after = reorderTasks(before, 'a', 'doing', 0, now);
    const changed = tasksNeedingPersist(before, after).map((t) => t.id).sort();
    // 'a' moved column; 'b' shifted from order 1 to 0; 'x' shifted from 0 to 1.
    expect(changed).toEqual(['a', 'b', 'x']);
  });

  it('returns nothing when the layout is unchanged', () => {
    const after = reorderTasks(before, 'a', 'todo', 0, now);
    expect(tasksNeedingPersist(before, after)).toEqual([]);
  });
});

describe('resolveColumnForBoard', () => {
  const columns = [
    { id: 'a-todo', boardId: 'A', order: 0 },
    { id: 'a-done', boardId: 'A', order: 1 },
    { id: 'b-todo', boardId: 'B', order: 0 },
    { id: 'b-doing', boardId: 'B', order: 1 },
  ];

  it('keeps the column when it already belongs to the board', () => {
    expect(resolveColumnForBoard('B', 'b-doing', columns)).toBe('b-doing');
  });

  it('falls back to the first column when moving across boards', () => {
    // the bug: an A column carried over to board B
    expect(resolveColumnForBoard('B', 'a-todo', columns)).toBe('b-todo');
  });

  it('respects column order when picking the fallback', () => {
    const shuffled = [
      { id: 'b-doing', boardId: 'B', order: 1 },
      { id: 'b-todo', boardId: 'B', order: 0 },
    ];
    expect(resolveColumnForBoard('B', undefined, shuffled)).toBe('b-todo');
  });

  it('returns null when the target board has no columns', () => {
    expect(resolveColumnForBoard('C', 'a-todo', columns)).toBeNull();
  });
});
