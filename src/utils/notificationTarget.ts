import { Notification, Task } from '../types';

export interface NotificationTarget {
  /** Board to navigate to, if one can be determined. */
  boardId?: string;
  /** The task to open in the modal, when it is still present. */
  task?: Task;
  /** Comment notifications should land on the thread, not the top of the form. */
  focusComments: boolean;
}

/**
 * Work out what clicking a notification should open.
 *
 * The task is looked up live rather than trusting `notification.boardId`: a
 * task can be moved to another board after the notification was written, and
 * following the stale id would navigate to a board that no longer holds it.
 *
 * Returns `focusComments` for comment notifications so the caller can scroll
 * the thread into view — otherwise "someone commented" opens a form scrolled
 * to the title and the comment is out of sight.
 */
export function resolveNotificationTarget(
  notification: Pick<Notification, 'taskId' | 'boardId' | 'type'>,
  tasks: Task[]
): NotificationTarget {
  const focusComments = notification.type === 'comment_added';
  const task = notification.taskId
    ? tasks.find((t) => t.id === notification.taskId)
    : undefined;

  return {
    boardId: task?.boardId || notification.boardId,
    task,
    focusComments,
  };
}
