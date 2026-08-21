import React, { useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task, Column } from '../../types';
import { useApp } from '../../context/AppContext';
import { StatusPill } from '../common/StatusPill';
import { PriorityTag } from '../common/PriorityTag';
import { UserAvatar } from '../common/UserAvatar';
import { formatDate, isOverdue } from '../../utils/date';
import { GripVertical, Calendar, MoreVertical, Edit2, Trash2, ArrowRight } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  index: number;
  columns?: Column[];
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, columns }) => {
  const { users, openTaskModal, deleteTask, moveTask } = useApp();
  const [showMenu, setShowMenu] = useState(false);

  const assignee = users.find((u) => u.id === task.assigneeId);
  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;

  const currentColumn = columns?.find((c) => c.id === task.columnId);
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
          onClick={() => openTaskModal(task)}
          className={`group relative bg-[#FCFAF5] p-4 rounded-card border border-[#DED9CC] shadow-paper hover:border-[#1D2739] transition-all mb-3 select-none ${
            snapshot.isDragging
              ? 'opacity-60 scale-95 shadow-modal ring-2 ring-[#1D2739] z-50'
              : ''
          }`}
        >
          {/* Header Row: Grip Handle & Priority Tag & Options Menu */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <div
                {...provided.dragHandleProps}
                className="task-card-grab p-1 -ml-1 text-[#646C78] hover:text-[#1D2739] rounded transition-colors"
                title="Drag task"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              <PriorityTag priority={task.priority} size="sm" />
            </div>

            {/* Menu options */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#646C78] hover:text-[#1D2739] hover:bg-[#ECE8DC] rounded-control transition-all"
                title="Task actions"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-[#FCFAF5] border border-[#DED9CC] rounded-control shadow-momentum py-1 z-30 animate-rise-in text-xs">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      openTaskModal(task);
                    }}
                    className="w-full px-3 py-1.5 text-left text-[#1D2739] hover:bg-[#ECE8DC] flex items-center gap-2 font-medium"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#646C78]" />
                    <span>Edit Task</span>
                  </button>

                  {nextColumn && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        moveTask(task.id, nextColumn.id, 0);
                      }}
                      className="w-full px-3 py-1.5 text-left text-[#1D2739] hover:bg-[#ECE8DC] flex items-center gap-2 font-medium"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-[#3E6B2A]" />
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
                    className="w-full px-3 py-1.5 text-left text-[#BF503D] hover:bg-[#F4DDD5] flex items-center gap-2 font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Task Title (Strongest Element) */}
          <h4 className="text-sm font-bold text-[#1D2739] leading-snug line-clamp-2 mb-1">
            {task.title}
          </h4>

          {/* Description (Clamped to two lines) */}
          {task.description && (
            <p className="text-xs text-[#646C78] line-clamp-2 mb-3 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Bottom Row: Status Pill, Due Date & Assignee Avatar */}
          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-[#DED9CC]/60">
            <div className="flex items-center gap-2">
              <StatusPill status={currentColumn?.title || 'To Do'} size="sm" />
              {task.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-control ${
                    overdue
                      ? 'bg-[#F4DDD5] text-[#BF503D]'
                      : 'bg-[#ECE8DC] text-[#6D695E]'
                  }`}
                  title={`Due: ${task.dueDate}`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(task.dueDate)}</span>
                </span>
              )}
            </div>

            <UserAvatar user={assignee} size="xs" />
          </div>
        </div>
      )}
    </Draggable>
  );
};
