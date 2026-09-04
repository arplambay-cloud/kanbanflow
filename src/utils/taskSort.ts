import { BoardSortMode, Priority, Task } from '../types';

export type { BoardSortMode };

export const BOARD_SORT_MODES: BoardSortMode[] = ['manual', 'priority', 'newest'];

export const isBoardSortMode = (value: unknown): value is BoardSortMode =>
  typeof value === 'string' && (BOARD_SORT_MODES as string[]).includes(value);

/** Highest first, so `urgent` sorts above `low`. */
const PRIORITY_RANK: Record<Priority, number> = {
  urgent: 3,
  high: 2,
  medium: 1,
  low: 0,
};

const rank = (p: Priority | undefined) =>
  p && p in PRIORITY_RANK ? PRIORITY_RANK[p] : PRIORITY_RANK.medium;

/** Newer first. Missing/invalid dates sort last rather than throwing off the order. */
const createdAtDesc = (a: Task, b: Task) => {
  const at = Date.parse(a.createdAt || '');
  const bt = Date.parse(b.createdAt || '');
  if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
  if (Number.isNaN(at)) return 1;
  if (Number.isNaN(bt)) return -1;
  return bt - at;
};

/**
 * Order the tasks of a single column for display.
 *
 * Always returns a new array — the caller's array is never mutated, so this is
 * safe to call directly on a filtered slice of context state.
 */
export function sortTasksForColumn(tasks: Task[], mode: BoardSortMode): Task[] {
  const sorted = [...tasks];

  if (mode === 'priority') {
    // Same priority falls back to newest, so a fresh urgent task still leads.
    sorted.sort((a, b) => rank(b.priority) - rank(a.priority) || createdAtDesc(a, b));
    return sorted;
  }

  if (mode === 'newest') {
    sorted.sort(createdAtDesc);
    return sorted;
  }

  sorted.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return sorted;
}

/** Whether a card may be reordered inside its own column under this mode. */
export const allowsManualReorder = (mode: BoardSortMode) => mode === 'manual';
