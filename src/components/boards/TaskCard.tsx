import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task, Column } from '../../types';
import { useApp } from '../../context/AppContext';
import { PriorityBadge } from '../common/PriorityBadge';
import { UserAvatar } from '../common/UserAvatar';
import { formatDate, isOverdue } from '../../utils/date';
import { Calendar, MoreVertical, Edit2, Trash2, ArrowRight, MessageSquare, Paperclip } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  columns?: Column[];
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, columns }) => {
  const { users, openTaskModal, deleteTask, moveTask } = useApp();
  const [showMenu, setShowMenu] = React.useState(false);

  const assignee = users.find((u) => u.id === task.assigneeId);
  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;
  const commentsCount = task.comments?.length || 0;
  const attachmentsCount = task.attachments?.length || 0;

  // Next column for quick move button
  const currentColumnIndex = columns?.findIndex((c) => c.id === task.columnId) ?? -1;
  const nextColumn =
    columns && currentColumnIndex >= 0 && currentColumnIndex < columns.length - 1
      ? columns[currentColumnIndex + 1]
      : null;

  return (
    <Draggable draggableId={task.id} index={index}>
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
            <PriorityBadge priority={task.priority} size="sm" />

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
                      if (window.confirm('Delete this task?')) {
                        deleteTask(task.id);
                      }
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
          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug line-clamp-2 mb-1.5">
            {task.title}
          </h4>

          {/* Description Preview (if present) */}
          {task.description && (
            <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Bottom Row: Metadata badges & Assignee Avatar */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100/80">
            {/* Left metadata: Due Date, Comments, Attachments */}
            <div className="flex items-center gap-2 flex-wrap">
              {task.dueDate && (
                <div
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${
                    overdue
                      ? 'text-rose-700 bg-rose-50 font-semibold'
                      : 'text-slate-500 bg-slate-50'
                  }`}
                  title={`Due: ${task.dueDate}`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(task.dueDate)}</span>
                </div>
              )}

              {commentsCount > 0 && (
                <div
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600"
                  title={`${commentsCount} comments`}
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>{commentsCount}</span>
                </div>
              )}

              {attachmentsCount > 0 && (
                <div
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600"
                  title={`${attachmentsCount} attachments`}
                >
                  <Paperclip className="w-3 h-3" />
                  <span>{attachmentsCount}</span>
                </div>
              )}
            </div>

            {/* Assignee */}
            <div className="shrink-0" title={assignee ? `Assigned to ${assignee.name}` : 'Unassigned'}>
              <UserAvatar user={assignee} size="xs" />
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};
