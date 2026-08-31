import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  Clock,
  Layers,
  UserCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  Activity,
  Calendar,
  AlertCircle,
  Kanban,
  Building2,
} from 'lucide-react';
import { PriorityBadge } from '../common/PriorityBadge';
import { UserAvatar } from '../common/UserAvatar';
import { formatDate, isOverdue, timeAgo } from '../../utils/date';

export const DashboardView: React.FC = () => {
  const {
    workspace,
    currentUser,
    tasks,
    boards,
    columns,
    activityLogs,
    openTaskModal,
    setActivePage,
    navigateToBoard,
    updateTask,
  } = useApp();

  // Metrics
  const totalTasks = tasks.length;
  
  // Find which column IDs correspond to 'done' or 'in progress'
  const doneColumnIds = new Set(
    columns
      .filter((c) => c.title.toLowerCase().includes('done'))
      .map((c) => c.id)
  );

  const inProgressColumnIds = new Set(
    columns
      .filter((c) => c.title.toLowerCase().includes('progress'))
      .map((c) => c.id)
  );

  const completedTasks = (tasks || []).filter((t) => t && doneColumnIds.has(t.columnId));
  const inProgressTasks = (tasks || []).filter((t) => t && inProgressColumnIds.has(t.columnId));
  const myAssignedTasks = (tasks || []).filter((t) => t && t.assigneeId === (currentUser?.id || ''));
  const myPendingTasks = myAssignedTasks.filter(
    (t) => !doneColumnIds.has(t.columnId)
  );

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const userDisplayName = (currentUser?.name || 'User').trim() || 'User';
  const firstName = userDisplayName.split(' ')[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/40 rounded-xl p-6 sm:p-8 text-slate-900 border border-indigo-100/80 shadow-subtle relative overflow-hidden">
        {/* Subtle decorative background shapes */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 bottom-0 translate-y-12 w-48 h-48 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-semibold mb-3 border border-indigo-200/60 shadow-xs">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>{workspace.name}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Welcome back, {firstName}! 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              You have{' '}
              <span className="font-semibold text-slate-900">
                {myPendingTasks.length} pending task
                {myPendingTasks.length === 1 ? '' : 's'}
              </span>{' '}
              assigned to you. The team has completed {completionRate}% of all work.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => openTaskModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Create Task</span>
            </button>
            <button
              onClick={() => setActivePage('boards')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-semibold text-xs sm:text-sm border border-slate-200 shadow-subtle transition-all"
            >
              <Kanban className="w-4 h-4 text-indigo-600" />
              <span>View Boards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Total Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Tasks
            </span>
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {totalTasks}
            </span>
            <span className="text-xs text-slate-400 ml-2 font-medium">
              across {boards.length} boards
            </span>
          </div>
        </div>

        {/* Metric 2: In Progress */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              In Progress
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-bold text-blue-600">
              {inProgressTasks.length}
            </span>
            <span className="text-xs text-slate-400 ml-2 font-medium">
              active right now
            </span>
          </div>
        </div>

        {/* Metric 3: Completed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Completed
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
              {completedTasks.length}
            </span>
            <span className="text-xs text-emerald-600 ml-2 font-semibold">
              ({completionRate}% rate)
            </span>
          </div>
        </div>

        {/* Metric 4: Assigned to Me */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Assigned To Me
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl sm:text-3xl font-bold text-indigo-600">
              {myAssignedTasks.length}
            </span>
            <span className="text-xs text-slate-400 ml-2 font-medium">
              ({myPendingTasks.length} pending)
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assigned To Me Tasks List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-subtle overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Tasks Assigned To You
                  </h3>
                  <p className="text-xs text-slate-400">
                    Quickly manage and update your personal daily tasks
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('tasks')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                <span>View all tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {myAssignedTasks.length === 0 ? (
                <div className="py-12 px-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm">
                    No tasks assigned to you
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    You're all clear! Create a task or pick one from the project boards.
                  </p>
                  <button
                    onClick={() => openTaskModal()}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create a Task</span>
                  </button>
                </div>
              ) : (
                myAssignedTasks.map((task) => {
                  const board = boards.find((b) => b.id === task.boardId);
                  const column = columns.find((c) => c.id === task.columnId);
                  const isDone = doneColumnIds.has(task.columnId);
                  const overdue = task.dueDate ? isOverdue(task.dueDate) : false;

                  return (
                    <div
                      key={task.id}
                      onClick={() => openTaskModal(task)}
                      className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Status Checkbox toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // If done, move to todo, otherwise move to done column
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
                          title={isDone ? 'Mark uncompleted' : 'Mark as Done'}
                        >
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>

                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              isDone
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 group-hover:text-indigo-600 transition-colors'
                            }`}
                          >
                            {task.title}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-medium text-slate-600 truncate">
                              {board?.title || 'Board'}
                            </span>
                            <span>•</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {column?.title || 'Status'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Meta info */}
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

          {/* Quick Boards Overview list */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-subtle p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Kanban className="w-4 h-4 text-indigo-600" />
                <span>Active Boards</span>
              </h3>
              <button
                onClick={() => setActivePage('boards')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View all
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boards.slice(0, 4).map((board) => {
                const bTasks = tasks.filter((t) => t.boardId === board.id);
                const bDone = bTasks.filter((t) => doneColumnIds.has(t.columnId));
                const pct =
                  bTasks.length > 0
                    ? Math.round((bDone.length / bTasks.length) * 100)
                    : 0;

                return (
                  <div
                    key={board.id}
                    onClick={() => navigateToBoard(board.id)}
                    className="p-3.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-subtle cursor-pointer transition-all bg-slate-50/50 hover:bg-white"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-md shrink-0"
                          style={{ backgroundColor: board.color || '#7c3bed' }}
                        />
                        <span className="font-semibold text-slate-800 text-xs truncate">
                          {board.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">
                        {pct}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>{bTasks.length} tasks</span>
                      <span className="text-indigo-600 font-semibold">Open board →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Recent Activity Timeline Stream */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-subtle p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Recent Activity
                </h3>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Live Feed
              </span>
            </div>

            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No activity recorded yet.
                </p>
              ) : (
                activityLogs.slice(0, 15).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <UserAvatar
                      user={{
                        id: log.userId,
                        name: log.userName,
                        email: '',
                        avatar: log.userAvatar,
                        role: 'member',
                        jobTitle: '',
                      }}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-semibold text-slate-900">
                          {log.userName}
                        </span>{' '}
                        {log.action === 'created_task' && 'created task'}{' '}
                        {log.action === 'moved_task' && 'updated'}{' '}
                        {log.action === 'completed_task' && 'completed'}{' '}
                        {log.action === 'assigned_task' && 'assigned'}{' '}
                        {log.action === 'created_board' && 'created board'}{' '}
                        {log.action === 'created_column' && 'added column'}{' '}
                        {log.action === 'comment_added' && 'commented on'}{' '}
                        <span className="font-semibold text-slate-800">
                          "{log.entityTitle}"
                        </span>
                      </p>
                      {log.details && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {log.details}
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                        {timeAgo(log.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
