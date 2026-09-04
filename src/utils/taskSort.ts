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

/** Parsed timestamp, or null when absent or unparseable. */
const time = (value: string | undefined) => {
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * Compare two optional timestamps, putting the missing ones last in both
 * directions — an undated task should never outrank a dated one.
 */
const byTime = (a: number | null, b: number | null, direction: 1 | -1) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
};

/** Newer first. */
const createdAtDesc = (a: Task, b: Task) =>
  byTime(time(a.createdAt), time(b.createdAt), -1);

/** Soonest deadline first; undated tasks sink below every dated one. */
const dueDateAsc = (a: Task, b: Task) =>
  byTime(time(a.dueDate), time(b.dueDate), 1);

/**
 * Order the tasks of a single column for display.
 *
 * Always returns a new array — the caller's array is never mutated, so this is
 * safe to call directly on a filtered slice of context state.
 */
export function sortTasksForColumn(tasks: Task[], mode: BoardSortMode): Task[] {
  const sorted = [...tasks];

  if (mode === 'priority') {
    // Within a priority the nearer deadline wins — two urgent tasks due in 7
    // and 10 days should not be separated by when they happened to be typed
    // in. Undated tasks fall to the bottom of their priority, then newest.
    sorted.sort(
      (a, b) =>
        rank(b.priority) - rank(a.priority) ||
        dueDateAsc(a, b) ||
        createdAtDesc(a, b)
    );
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
