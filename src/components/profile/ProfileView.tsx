import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  User as UserIcon,
  Mail,
  Shield,
  Briefcase,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { PriorityBadge } from '../common/PriorityBadge';
import { formatDate, isOverdue } from '../../utils/date';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    users,
    setCurrentUser,
    tasks,
    boards,
    columns,
    openTaskModal,
    updateTask,
  } = useApp();

  const doneColumnIds = new Set(
    columns
      .filter((c) => c.title.toLowerCase().includes('done'))
      .map((c) => c.id)
  );

  const assignedTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const completedTasks = assignedTasks.filter((t) =>
    doneColumnIds.has(t.columnId)
  );
  const pendingTasks = assignedTasks.filter(
    (t) => !doneColumnIds.has(t.columnId)
  );

  const completionRate =
    assignedTasks.length > 0
      ? Math.round((completedTasks.length / assignedTasks.length) * 100)
      : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          User Profile
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your account information and view your personal assigned workload.
        </p>
      </div>

      {/* User Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-subtle p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4 sm:gap-6">
            <UserAvatar user={currentUser} size="xl" />
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {currentUser.name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    currentUser.role === 'admin'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUser.jobTitle || 'Team Member'}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUser.email}</span>
              </p>
            </div>
          </div>

          {/* Quick Team Member Switcher */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Switch Active User:
            </span>
            <div className="flex items-center gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setCurrentUser(u)}
                  className={`relative p-1 rounded-md transition-all ${
                    u.id === currentUser.id
                      ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={`Switch to ${u.name}`}
                >
                  <UserAvatar user={u} size="sm" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task Metrics Grid for Current User */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Total Assigned
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {assignedTasks.length}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
              Pending
            </span>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {pendingTasks.length}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
              Completed
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {completedTasks.length}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
              Completion Rate
            </span>
            <div className="text-2xl font-bold text-indigo-700 mt-1">
              {completionRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Tasks List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Tasks Assigned To {currentUser.name.split(' ')[0]}
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {assignedTasks.length} total
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {assignedTasks.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <p className="text-xs text-slate-400">
                You have no tasks assigned to you currently.
              </p>
            </div>
          ) : (
            assignedTasks.map((task) => {
              const board = boards.find((b) => b.id === task.boardId);
              const column = columns.find((c) => c.id === task.columnId);
              const isDone = doneColumnIds.has(task.columnId);
              const overdue = task.dueDate ? isOverdue(task.dueDate) : false;

              return (
                <div
                  key={task.id}
                  onClick={() => openTaskModal(task)}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
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
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-indigo-500 bg-white'
                      }`}
                    >
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div className="min-w-0">
                      <span
                        className={`text-xs sm:text-sm font-semibold truncate ${
                          isDone
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-600">
                          {board?.title || 'Board'}
                        </span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {column?.title || 'Status'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {task.dueDate && (
                      <div
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                          overdue && !isDone
                            ? 'text-rose-700 bg-rose-50 font-semibold'
                            : 'text-slate-500 bg-slate-100'
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(task.dueDate)}</span>
                      </div>
                    )}
                    <PriorityBadge priority={task.priority} size="sm" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
