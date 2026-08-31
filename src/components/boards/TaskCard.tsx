import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task, Column } from '../../types';
import { useApp } from '../../context/AppContext';
import { PriorityBadge } from '../common/PriorityBadge';
import { UserAvatar } from '../common/UserAvatar';
import { formatDate, isOverdue } from '../../utils/date';
import { Calendar, MoreVertical, Edit2, Trash2, ArrowRight, MessageSquare, Paperclip } from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface TaskCardProps {
  task: Task;
  index: number;
  columns?: Column[];
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, columns }) => {
  const { users, openTaskModal, deleteTask, moveTask } = useApp();
  const [showMenu, setShowMenu] = React.useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  if (!task || !task.id) return null;

  const assignee = (users || []).find((u) => u && u.id === task.assigneeId);
  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;
  const commentsCount = task.comments?.length || 0;
  const attachmentsCount = task.attachments?.length || 0;
  const safePriority = task.priority || 'medium';
  const safeId = String(task.id);

  // Next column for quick move button
  const currentColumnIndex = (columns || []).findIndex((c) => c && c.id === task.columnId) ?? -1;
  const nextColumn =
    columns && currentColumnIndex >= 0 && currentColumnIndex < columns.length - 1
      ? columns[currentColumnIndex + 1]
      : null;

  return (
    <Draggable draggableId={safeId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => openTaskModal(task)}
          className={`group relative bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all cursor-pointer select-none mb-2.5 ${
            snapshot.isDragging
              ? 'shadow-floating ring-2 ring-indigo-500/80 rotate-1 scale-[1.02] z-50 bg-white'
              : ''
          }`}
        >
          {/* Top Row: Priority Badge & Quick Action Menu */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <PriorityBadge priority={safePriority} size="sm" />

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
                title="Task options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 animate-fade-in text-xs">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      openTaskModal(task);
                    }}
                    className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-3 h-3 text-slate-400" />
                    <span>Edit Task</span>
                  </button>

                  {nextColumn && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        moveTask(task.id, nextColumn.id, 0);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <ArrowRight className="w-3 h-3 text-indigo-500" />
                      <span>Move to {nextColumn.title}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setIsConfirmOpen(true);
                    }}
                    className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Task Title */}
          <h4 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-relaxed mb-1.5 group-hover:text-indigo-600 transition-colors">
            {task.title || 'Untitled Task'}
          </h4>

          {/* Task Description Preview */}
          {task.description && (
            <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-normal">
              {task.description}
            </p>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-[11px] text-slate-400">
            <div className="flex items-center gap-2.5">
              {/* Due Date */}
              {task.dueDate && (
                <div
                  className={`inline-flex items-center gap-1 font-medium ${
                    overdue ? 'text-rose-600 font-semibold' : 'text-slate-500'
                  }`}
                  title={overdue ? 'Task is Overdue!' : 'Due Date'}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              )}

              {/* Attachments counter */}
              {attachmentsCount > 0 && (
                <div className="flex items-center gap-0.5 text-slate-400" title={`${attachmentsCount} attachments`}>
                  <Paperclip className="w-3 h-3" />
                  <span>{attachmentsCount}</span>
                </div>
              )}

              {/* Comments counter */}
              {commentsCount > 0 && (
                <div className="flex items-center gap-0.5 text-slate-400" title={`${commentsCount} comments`}>
                  <MessageSquare className="w-3 h-3" />
                  <span>{commentsCount}</span>
                </div>
              )}
            </div>

            {/* Assignee Avatar */}
            {assignee ? (
              <UserAvatar user={assignee} size="xs" />
            ) : (
              <div
                className="w-5 h-5 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400"
                title="Unassigned"
              >
                +
              </div>
            )}
          </div>

          {/* Delete Task In-App Modal */}
          {isConfirmOpen && (
            <ConfirmDialog
              isOpen={isConfirmOpen}
              title="Delete Task"
              message={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
              confirmLabel="Delete Task"
              cancelLabel="Cancel"
              confirmVariant="danger"
              onConfirm={() => {
                deleteTask(task.id);
                setIsConfirmOpen(false);
              }}
              onCancel={() => setIsConfirmOpen(false)}
            />
          )}
        </div>
      )}
    </Draggable>
  );
};
