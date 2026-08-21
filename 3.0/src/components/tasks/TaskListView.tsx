import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, Priority } from '../../types';
import {
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Edit2,
  Trash2,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { StatusPill } from '../common/StatusPill';
import { PriorityBadge } from '../common/PriorityBadge';
import { UserAvatar } from '../common/UserAvatar';
import { CustomDropdown, DropdownOption } from '../common/CustomDropdown';
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

  const [quickTitle, setQuickTitle] = useState('');
  const [quickBoardId, setQuickBoardId] = useState(boards[0]?.id || '');
  const [quickAssigneeId, setQuickAssigneeId] = useState('');
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickPriority, setQuickPriority] = useState<Priority>('medium');

  const doneColumnIds = new Set(
    columns
      .filter((c) => c.title.toLowerCase().includes('done'))
      .map((c) => c.id)
  );

  const filteredTasks = tasks.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (selectedBoardFilter !== 'all' && t.boardId !== selectedBoardFilter) {
      return false;
    }

    if (selectedAssigneeFilter !== 'all') {
      if (selectedAssigneeFilter === 'unassigned' && t.assigneeId) return false;
      if (
        selectedAssigneeFilter !== 'unassigned' &&
        t.assigneeId !== selectedAssigneeFilter
      ) {
        return false;
      }
    }

    if (selectedStatusFilter !== 'all') {
      const isDone = doneColumnIds.has(t.columnId);
      if (selectedStatusFilter === 'done' && !isDone) return false;
      if (selectedStatusFilter === 'pending' && isDone) return false;
    }

    return true;
  });

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

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const targetBoardId = quickBoardId || boards[0]?.id;
    const boardCols = columns.filter((c) => c.boardId === targetBoardId);
    const targetColId = boardCols[0]?.id;

    if (!targetColId) return;

    createTask({
      title: quickTitle.trim(),
      description: '',
      boardId: targetBoardId,
      columnId: targetColId,
      assigneeId: quickAssigneeId || undefined,
      dueDate: quickDueDate || undefined,
      priority: quickPriority,
    });

    setQuickTitle('');
    setQuickDueDate('');
    setQuickAssigneeId('');
  };

  // Dropdown options
  const boardFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'All Boards' },
    ...boards.map((b) => ({
      value: b.id,
      label: b.title,
      colorDot: b.color || '#7839e6',
    })),
  ];

  const statusFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'done', label: 'Completed' },
  ];

  const assigneeFilterOptions: DropdownOption[] = [
    { value: 'all', label: 'All Assignees' },
    { value: 'unassigned', label: 'Unassigned' },
    ...users.map((u) => ({
      value: u.id,
      label: u.name,
    })),
  ];

  const sortOptions: DropdownOption[] = [
    { value: 'createdAt', label: 'Date Created' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'title', label: 'Alphabetical' },
    { value: 'priority', label: 'Priority' },
  ];

  const quickBoardOptions: DropdownOption[] = boards.map((b) => ({
    value: b.id,
    label: b.title,
    colorDot: b.color || '#7839e6',
  }));

  const quickAssigneeOptions: DropdownOption[] = [
    { value: '', label: 'No Assignee' },
    ...users.map((u) => ({
      value: u.id,
      label: u.name,
    })),
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            All Tasks
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View, search, and manage tasks across all boards in a simple unified list.
          </p>
        </div>

        <button
          onClick={() => openTaskModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Quick Add Inline Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-subtle flex flex-col md:flex-row items-stretch md:items-center gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="+ Quick add a task title and press Return..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 placeholder-slate-400 text-slate-900 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <CustomDropdown
            options={quickBoardOptions}
            value={quickBoardId}
            onChange={setQuickBoardId}
            size="sm"
            className="min-w-[140px]"
          />

          <CustomDropdown
            options={quickAssigneeOptions}
            value={quickAssigneeId}
            onChange={setQuickAssigneeId}
            size="sm"
            className="min-w-[130px]"
          />

          <input
            type="date"
            value={quickDueDate}
            onChange={(e) => setQuickDueDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200/90 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 bg-white"
          />

          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            Add
          </button>
        </div>
      </form>

      {/* Filter and Search Bar with Custom Dropdowns */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 placeholder-slate-400 text-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <CustomDropdown
            options={boardFilterOptions}
            value={selectedBoardFilter}
            onChange={setSelectedBoardFilter}
            size="sm"
            className="min-w-[130px]"
          />

          <CustomDropdown
            options={statusFilterOptions}
            value={selectedStatusFilter}
            onChange={setSelectedStatusFilter}
            size="sm"
            className="min-w-[120px]"
          />

          <CustomDropdown
            options={assigneeFilterOptions}
            value={selectedAssigneeFilter}
            onChange={setSelectedAssigneeFilter}
            size="sm"
            className="min-w-[130px]"
          />

          <CustomDropdown
            options={sortOptions}
            value={sortBy}
            onChange={(val) => setSortBy(val as any)}
            size="sm"
            className="min-w-[130px]"
          />
        </div>
      </div>

      {/* Task List Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle overflow-hidden">
        {sortedTasks.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="font-display font-bold text-slate-800 text-sm">No tasks found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your search filters or add a new task using the quick add bar above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4 w-10">Done</th>
                  <th className="py-3 px-4 min-w-[220px]">Task Name</th>
                  <th className="py-3 px-4">Board</th>
                  <th className="py-3 px-4">Status</th>
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
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
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
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-brand-600 bg-white'
                          }`}
                        >
                          {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                        </button>
                      </td>

                      {/* Title & Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (board) navigateToBoard(board.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: board?.color || '#7839e6' }}
                          />
                          <span>{board?.title || 'Board'}</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusPill status={column?.title || 'To Do'} size="sm" />
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityBadge priority={task.priority} size="sm" />
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.dueDate ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${
                              overdue && !isDone
                                ? 'text-rose-700 bg-rose-50 font-semibold'
                                : 'text-slate-500'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(task.dueDate)}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openTaskModal(task)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
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
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
