import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, Priority } from '../../types';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Edit2,
  Trash2,
  ArrowUpDown,
  Kanban,
  Check,
} from 'lucide-react';
import { PriorityBadge } from '../common/PriorityBadge';
import { UserAvatar } from '../common/UserAvatar';
import { CustomDropdown } from '../common/CustomDropdown';
import { formatDate, isOverdue } from '../../utils/date';

export const TaskListView: React.FC = () => {
  const {
    tasks,
    boards,
    columns,
    users,
    openTaskModal,
    updateTask,
    deleteTask,
    createTask,
    navigateToBoard,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoardFilter, setSelectedBoardFilter] = useState('all');
  const [selectedAssigneeFilter, setSelectedAssigneeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'title' | 'priority' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const doneColumnIds = new Set(
    columns
      .filter((c) => c.title.toLowerCase().includes('done'))
      .map((c) => c.id)
  );

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    // Board filter
    if (selectedBoardFilter !== 'all' && t.boardId !== selectedBoardFilter) {
      return false;
    }

    // Assignee filter
    if (selectedAssigneeFilter !== 'all') {
      if (selectedAssigneeFilter === 'unassigned' && t.assigneeId) return false;
      if (
        selectedAssigneeFilter !== 'unassigned' &&
        t.assigneeId !== selectedAssigneeFilter
      ) {
        return false;
      }
    }

    // Status filter
    if (selectedStatusFilter !== 'all') {
      const isDone = doneColumnIds.has(t.columnId);
      if (selectedStatusFilter === 'done' && !isDone) return false;
      if (selectedStatusFilter === 'pending' && isDone) return false;
    }

    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      comparison = dateA - dateB;
    } else if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'priority') {
      const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
      comparison = weight[b.priority] - weight[a.priority];
    } else {
      comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            All Tasks
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View, search, and manage tasks across all boards in a simple unified list.
          </p>
        </div>

        <button
          onClick={() => openTaskModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Board */}
          <CustomDropdown
            size="sm"
            value={selectedBoardFilter}
            onChange={(val) => setSelectedBoardFilter(val)}
            options={[
              { value: 'all', label: 'All Boards' },
              ...boards.map((b) => ({
                value: b.id,
                label: b.title,
                colorDot: b.color || '#7c3bed',
              })),
            ]}
            className="min-w-[130px]"
          />

          {/* Filter Status */}
          <CustomDropdown
            size="sm"
            value={selectedStatusFilter}
            onChange={(val) => setSelectedStatusFilter(val)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'done', label: 'Completed' },
            ]}
            className="min-w-[130px]"
          />

          {/* Filter Assignee */}
          <CustomDropdown
            size="sm"
            value={selectedAssigneeFilter}
            onChange={(val) => setSelectedAssigneeFilter(val)}
            options={[
              { value: 'all', label: 'All Assignees' },
              { value: 'unassigned', label: 'Unassigned' },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
            className="min-w-[140px]"
          />

          {/* Sort By */}
          <CustomDropdown
            size="sm"
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            options={[
              { value: 'createdAt', label: 'Date Created' },
              { value: 'dueDate', label: 'Due Date' },
              { value: 'title', label: 'Name' },
              { value: 'priority', label: 'Priority' },
            ]}
            className="min-w-[130px]"
          />
        </div>
      </div>

      {/* Task List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-subtle overflow-hidden">
        {sortedTasks.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-800 text-sm">No tasks found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No tasks match your current filters. Try changing your filters or add a new task.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 w-10">Done</th>
                  <th className="py-3 px-4 min-w-[220px]">Task Name</th>
                  <th className="py-3 px-4">Board</th>
                  <th className="py-3 px-4">Status / Column</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {sortedTasks.map((task) => {
                  const board = boards.find((b) => b.id === task.boardId);
                  const column = columns.find((c) => c.id === task.columnId);
                  const assignee = users.find((u) => u.id === task.assigneeId);
                  const isDone = doneColumnIds.has(task.columnId);
                  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => openTaskModal(task)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            const boardCols = columns.filter(
                              (c) => c.boardId === task.boardId
                            );
                            const doneCol = boardCols.find((c) =>
                              c.title.toLowerCase().includes('done')
                            );
                            const todoCol = boardCols.find((c) =>
                              c.title.toLowerCase().includes('to do')
                            );
                            if (isDone && todoCol) {
                              updateTask(task.id, { columnId: todoCol.id });
                            } else if (doneCol) {
                              updateTask(task.id, { columnId: doneCol.id });
                            }
                          }}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-slate-300 hover:border-indigo-500 bg-white'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Task Name & Description */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          <span className={isDone ? 'line-through text-slate-400' : ''}>
                            {task.title}
                          </span>
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </td>

                      {/* Board */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (board) navigateToBoard(board.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: board?.color || '#7c3bed' }}
                          />
                          <span>{board?.title || 'Board'}</span>
                        </button>
                      </td>

                      {/* Column / Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {column?.title || 'Status'}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <UserAvatar user={assignee} size="xs" />
                            <span className="text-xs font-medium text-slate-700">
                              {assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <PriorityBadge priority={task.priority} size="sm" />
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {task.dueDate ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${
                              overdue && !isDone
                                ? 'text-rose-700 bg-rose-50 font-semibold'
                                : 'text-slate-600'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(task.dueDate)}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openTaskModal(task)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this task?')) {
                                deleteTask(task.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
