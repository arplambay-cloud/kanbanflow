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
import { PriorityTag } from '../common/PriorityTag';
import { UserAvatar } from '../common/UserAvatar';
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

  // Inline quick add
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

  return (
    <div className="p-6 lg:p-9 max-w-[1440px] mx-auto space-y-7">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] block mb-1">
            Global Workstream
          </span>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1D2739] tracking-tight">
            All Tasks
          </h2>
          <p className="text-xs sm:text-sm text-[#646C78] mt-1">
            Single unified vertical surface with row dividers across all workspace boards.
          </p>
        </div>

        <button
          onClick={() => openTaskModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1D2739] hover:bg-[#253248] text-[#FCFAF5] rounded-control font-semibold text-xs sm:text-sm shadow-paper transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Quick Add Inline Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-[#FCFAF5] p-4 rounded-card border border-[#DED9CC] shadow-subtle flex flex-col md:flex-row items-stretch md:items-center gap-3"
      >
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="+ Quick add a task title and press Enter..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="w-full px-3.5 py-2 rounded-control border border-[#DED9CC] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#1D2739] placeholder-[#646C78]/70 bg-[#F5F2E9] focus:bg-[#FCFAF5] transition-all text-[#1D2739]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={quickBoardId}
            onChange={(e) => setQuickBoardId(e.target.value)}
            className="px-2.5 py-2 rounded-control border border-[#DED9CC] text-xs font-semibold bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739]"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>

          <select
            value={quickAssigneeId}
            onChange={(e) => setQuickAssigneeId(e.target.value)}
            className="px-2.5 py-2 rounded-control border border-[#DED9CC] text-xs font-semibold bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739]"
          >
            <option value="">Assignee (None)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={quickDueDate}
            onChange={(e) => setQuickDueDate(e.target.value)}
            className="px-2.5 py-2 rounded-control border border-[#DED9CC] text-xs font-semibold bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739]"
          />

          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="px-4 py-2 bg-[#1D2739] hover:bg-[#253248] disabled:opacity-40 disabled:cursor-not-allowed text-[#FCFAF5] rounded-control text-xs font-bold shadow-subtle transition-all"
          >
            Add Task
          </button>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="bg-[#FCFAF5] p-4 rounded-card border border-[#DED9CC] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-[#646C78] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-control border border-[#DED9CC] text-xs font-medium focus:outline-none focus:border-[#1D2739] bg-[#F5F2E9] text-[#1D2739]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedBoardFilter}
            onChange={(e) => setSelectedBoardFilter(e.target.value)}
            className="px-3 py-2 rounded-control border border-[#DED9CC] text-xs font-semibold bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739]"
          >
            <option value="all">All Boards</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-control border border-[#DED9CC] text-xs font-semibold bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="done">Completed</option>
          </select>

          <select
            value={selectedAssigneeFilter}
            onChange={(e) => setSelectedAssigneeFilter(e.target.value)}
            className="px-3 py-2 rounded-control border border-[#DED9CC] text-xs font-semibold bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739]"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-[#ECE8DC] border border-[#DED9CC] rounded-control px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#646C78] ml-1" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-[#1D2739] focus:outline-none py-1"
            >
              <option value="createdAt">Date Created</option>
              <option value="dueDate">Due Date</option>
              <option value="title">Name</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Surface with Clear Row Dividers */}
      <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-paper overflow-hidden">
        {sortedTasks.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-[#ECE8DC] text-[#646C78] mx-auto flex items-center justify-center mb-2">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="font-display font-bold text-[#1D2739] text-sm">
              No tasks match your filters
            </h4>
            <p className="text-xs text-[#646C78] mt-1">
              Try adjusting your query or add a new task above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DED9CC] bg-[#F5F2E9] text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78]">
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
              <tbody className="divide-y divide-[#DED9CC] text-xs sm:text-sm">
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
                      className="hover:bg-[#F5F2E9] cursor-pointer transition-colors"
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
                          className={`w-5 h-5 rounded-control border flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-[#3E6B2A] border-[#3E6B2A] text-[#FCFAF5]'
                              : 'border-[#DED9CC] hover:border-[#1D2739] bg-[#FCFAF5]'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Title & Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1D2739] line-clamp-1">
                          <span className={isDone ? 'line-through text-[#646C78]' : ''}>
                            {task.title}
                          </span>
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-[#646C78] line-clamp-1 mt-0.5">
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
                          className="px-2.5 py-1 rounded-control bg-[#ECE8DC] hover:bg-[#DED9CC] text-[#1D2739] text-xs font-semibold transition-colors"
                        >
                          {board?.title || 'Board'}
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
                            <span className="text-xs font-semibold text-[#1D2739]">
                              {assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#646C78] italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PriorityTag priority={task.priority} size="sm" />
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.dueDate ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-control ${
                              overdue && !isDone
                                ? 'bg-[#F4DDD5] text-[#BF503D]'
                                : 'text-[#646C78]'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(task.dueDate)}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-[#646C78]/50">—</span>
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
                            className="p-1.5 text-[#646C78] hover:text-[#1D2739] hover:bg-[#ECE8DC] rounded-control transition-colors"
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
                            className="p-1.5 text-[#646C78] hover:text-[#BF503D] hover:bg-[#F4DDD5] rounded-control transition-colors"
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
