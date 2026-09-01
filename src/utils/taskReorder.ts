import { Task } from '../types';

/**
 * Pure reorder logic for drag-and-drop task movement.
 *
 * Extracted from AppContext so it can be unit-tested without React or Supabase.
 * Returns a new array containing every task, with `order` reindexed to be
 * contiguous (0..n-1) within the affected column(s).
 *
 * @param tasks          the full task list (all boards)
 * @param taskId         the task being moved
 * @param targetColumnId the column it is dropped into
 * @param newOrder       the destination index within the target column
 * @param now            injectable clock, so tests are deterministic
 */
export function reorderTasks(
  tasks: Task[],
  taskId: string,
  targetColumnId: string,
  newOrder: number,
  now: () => string = () => new Date().toISOString()
): Task[] {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return tasks;

  const sourceColumnId = task.columnId;
  const isSameColumn = sourceColumnId === targetColumnId;
  const timestamp = now();

  // Clamp so an out-of-range index can never create a sparse array via splice.
  const clamp = (index: number, length: number) =>
    Math.max(0, Math.min(index, length));

  if (isSameColumn) {
    const colTasks = tasks
      .filter((t) => t.columnId === sourceColumnId && t.id !== taskId)
      .sort((a, b) => a.order - b.order);

    colTasks.splice(clamp(newOrder, colTasks.length), 0, {
      ...task,
      updatedAt: timestamp,
    });

    const reordered = colTasks.map((t, idx) => ({ ...t, order: idx }));
    const otherTasks = tasks.filter((t) => t.columnId !== sourceColumnId);

    return [...otherTasks, ...reordered];
  }

  const sourceColTasks = tasks
    .filter((t) => t.columnId === sourceColumnId && t.id !== taskId)
    .sort((a, b) => a.order - b.order)
    .map((t, idx) => ({ ...t, order: idx }));

  const targetColTasks = tasks
    .filter((t) => t.columnId === targetColumnId && t.id !== taskId)
    .sort((a, b) => a.order - b.order);

  targetColTasks.splice(clamp(newOrder, targetColTasks.length), 0, {
    ...task,
    columnId: targetColumnId,
    updatedAt: timestamp,
  });

  const reorderedTarget = targetColTasks.map((t, idx) => ({ ...t, order: idx }));

  const restTasks = tasks.filter(
    (t) => t.columnId !== sourceColumnId && t.columnId !== targetColumnId
  );

  return [...restTasks, ...sourceColTasks, ...reorderedTarget];
}

/**
 * The subset of tasks whose persisted `order` / `column_id` may have changed,
 * so callers only write back rows that actually moved.
 */
export function tasksNeedingPersist(
  before: Task[],
  after: Task[]
): Task[] {
  const previous = new Map(before.map((t) => [t.id, t]));
  return after.filter((t) => {
    const old = previous.get(t.id);
    return !old || old.order !== t.order || old.columnId !== t.columnId;
  });
}

/**
 * A task must always sit in a column belonging to its own board.
 *
 * Moving a task between boards previously wrote the new column_id against the
 * old board_id, producing a row that rendered on a board whose columns did not
 * contain it — the task vanished from the UI while still existing in the
 * database. This resolves the landing column for a board move.
 *
 * Returns the column the task should occupy, or null when the target board has
 * no columns at all.
 */
export function resolveColumnForBoard(
  boardId: string,
  desiredColumnId: string | undefined,
  columns: { id: string; boardId: string; order: number }[]
): string | null {
  const onBoard = columns
    .filter((c) => c.boardId === boardId)
    .sort((a, b) => a.order - b.order);

  if (onBoard.length === 0) return null;
  if (desiredColumnId && onBoard.some((c) => c.id === desiredColumnId)) {
    return desiredColumnId;
  }
  return onBoard[0].id;
}
