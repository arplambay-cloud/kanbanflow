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
  Compass,
  Kanban,
  Check,
} from 'lucide-react';
import { StatusPill } from '../common/StatusPill';
import { PriorityTag } from '../common/PriorityTag';
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

  const totalTasks = tasks.length;

  const doneColumnIds = new Set(
    columns
      .filter((c) => c.title.toLowerCase().includes('done'))
      .map((c) => c.id)
  );

  const inProgressColumnIds = new Set(
    columns
      .filter((c) => c.title.toLowerCase().includes('progress') || c.title.toLowerCase().includes('review'))
      .map((c) => c.id)
  );

  const completedTasks = tasks.filter((t) => doneColumnIds.has(t.columnId));
  const inProgressTasks = tasks.filter((t) => inProgressColumnIds.has(t.columnId));
  const myAssignedTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const myPendingTasks = myAssignedTasks.filter(
    (t) => !doneColumnIds.has(t.columnId)
  );

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  return (
    <div className="p-6 lg:p-9 max-w-[1440px] mx-auto space-y-8">
      {/* Top Editorial Rhythm Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DED9CC] pb-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] block mb-1">
            Overview • {workspace.name}
          </span>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1D2739] tracking-tight">
            Good morning, keep the pace.
          </h2>
          <p className="text-xs sm:text-sm text-[#646C78] mt-1 max-w-2xl leading-relaxed">
            A clear view of today’s work, what moved, and where your attention will have the most impact.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => openTaskModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1D2739] hover:bg-[#253248] text-[#FCFAF5] rounded-control font-semibold text-xs sm:text-sm shadow-paper transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
          <button
            onClick={() => setActivePage('boards')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FCFAF5] hover:bg-[#ECE8DC] text-[#1D2739] border border-[#DED9CC] rounded-control font-semibold text-xs sm:text-sm transition-all"
          >
            <Kanban className="w-4 h-4 text-[#1D2739]" />
            <span>Boards</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Row with Space Grotesk Big Numbers & Stagger Delays */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat 1: Total Work */}
        <div className="bg-[#FCFAF5] p-5 sm:p-6 rounded-card border border-[#DED9CC] shadow-subtle flex flex-col justify-between animate-rise-in stagger-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78]">
              Total Work
            </span>
            <div className="w-8 h-8 rounded-control bg-[#E6EDBF] text-[#1D2739] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display font-bold text-3xl sm:text-4xl text-[#1D2739] tracking-tight">
              {totalTasks}
            </div>
            <p className="text-xs text-[#646C78] mt-1 font-medium">
              across {boards.length} active boards
            </p>
          </div>
        </div>

        {/* Stat 2: In Progress */}
        <div className="bg-[#FCFAF5] p-5 sm:p-6 rounded-card border border-[#DED9CC] shadow-subtle flex flex-col justify-between animate-rise-in stagger-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#276170]">
              In Progress
            </span>
            <div className="w-8 h-8 rounded-control bg-[#DCEAF0] text-[#276170] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display font-bold text-3xl sm:text-4xl text-[#276170] tracking-tight">
              {inProgressTasks.length}
            </div>
            <p className="text-xs text-[#646C78] mt-1 font-medium">
              moving actively right now
            </p>
          </div>
        </div>

        {/* Stat 3: Completed */}
        <div className="bg-[#FCFAF5] p-5 sm:p-6 rounded-card border border-[#DED9CC] shadow-subtle flex flex-col justify-between animate-rise-in stagger-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3E6B2A]">
              Completed
            </span>
            <div className="w-8 h-8 rounded-control bg-[#DCECC3] text-[#3E6B2A] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display font-bold text-3xl sm:text-4xl text-[#3E6B2A] tracking-tight">
              {completedTasks.length}
            </div>
            <p className="text-xs text-[#3E6B2A] mt-1 font-bold">
              {completionRate}% completion rate
            </p>
          </div>
        </div>

        {/* Stat 4: Assigned to You */}
        <div className="bg-[#FCFAF5] p-5 sm:p-6 rounded-card border border-[#DED9CC] shadow-subtle flex flex-col justify-between animate-rise-in stagger-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D2739]">
              Your Focus
            </span>
            <div className="w-8 h-8 rounded-control bg-[#E8B98B] text-[#1D2739] flex items-center justify-center font-bold text-xs">
              {currentUser.initials}
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display font-bold text-3xl sm:text-4xl text-[#1D2739] tracking-tight">
              {myPendingTasks.length}
            </div>
            <p className="text-xs text-[#646C78] mt-1 font-medium">
              pending tasks for you
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Wider Focus Panel + Narrower Momentum Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assigned Focus Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-paper overflow-hidden">
            <div className="p-5 border-b border-[#DED9CC] flex items-center justify-between bg-[#F5F2E9]">
              <div>
                <h3 className="font-display font-bold text-[#1D2739] text-base">
                  Tasks Assigned to You
                </h3>
                <p className="text-xs text-[#646C78]">
                  Make the next action obvious, then make it easy.
                </p>
              </div>

              <button
                onClick={() => setActivePage('tasks')}
                className="text-xs font-bold text-[#1D2739] hover:underline inline-flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#DED9CC]">
              {myAssignedTasks.length === 0 ? (
                <div className="py-14 px-6 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#ECE8DC] text-[#646C78] mx-auto flex items-center justify-center mb-2">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="font-display font-bold text-[#1D2739] text-sm">
                    A quiet plate can be a productive one.
                  </h4>
                  <p className="text-xs text-[#646C78] mt-1">
                    No pending tasks assigned to you right now.
                  </p>
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
                      className="p-4 flex items-center justify-between gap-4 hover:bg-[#F5F2E9] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Status Checkbox */}
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
                          className={`w-5 h-5 rounded-control border flex items-center justify-center transition-all shrink-0 ${
                            isDone
                              ? 'bg-[#3E6B2A] border-[#3E6B2A] text-[#FCFAF5]'
                              : 'border-[#DED9CC] hover:border-[#1D2739] bg-[#FCFAF5]'
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5" />}
                        </button>

                        <div className="min-w-0">
                          <span
                            className={`text-sm font-bold truncate block ${
                              isDone ? 'line-through text-[#646C78]' : 'text-[#1D2739]'
                            }`}
                          >
                            {task.title}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-[#646C78] mt-0.5 font-medium">
                            <span>{board?.title || 'Board'}</span>
                            <span>•</span>
                            <StatusPill status={column?.title || 'To Do'} size="sm" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {task.dueDate && (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-control ${
                              overdue && !isDone
                                ? 'bg-[#F4DDD5] text-[#BF503D]'
                                : 'bg-[#ECE8DC] text-[#6D695E]'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(task.dueDate)}</span>
                          </span>
                        )}
                        <PriorityTag priority={task.priority} size="sm" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Dark Momentum Panel + Editorial Rhythm Guidance */}
        <div className="space-y-6">
          {/* Dark Momentum Panel with Chartreuse Progress Bar */}
          <div className="bg-[#1D2739] text-[#FCFAF5] rounded-card p-6 shadow-momentum border border-[#2D384D] relative overflow-hidden">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8EB4F] block mb-1">
              Organized Momentum
            </span>
            <h3 className="font-display font-bold text-xl text-[#FCFAF5] mb-2">
              Sprint Rhythm
            </h3>
            <p className="text-xs text-[#F3F0E7]/80 leading-relaxed mb-5">
              Small progress compounds. {completedTasks.length} of {totalTasks} total tasks completed across active workflows.
            </p>

            {/* Progress bar (700ms ease) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#F3F0E7]/70">Overall Completion</span>
                <span className="text-[#E8EB4F]">{completionRate}%</span>
              </div>
              <div className="w-full h-2.5 bg-[#2D384D] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E8EB4F] rounded-full"
                  style={{
                    width: `${completionRate}%`,
                    transition: 'width 700ms ease',
                  }}
                />
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#2D384D] flex items-center justify-between text-xs text-[#F3F0E7]/70">
              <span>{inProgressTasks.length} active in flight</span>
              <button
                onClick={() => setActivePage('boards')}
                className="text-[#E8EB4F] hover:underline font-bold inline-flex items-center gap-1"
              >
                <span>Open boards</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Editorial Guidance Panel */}
          <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] p-5 shadow-subtle">
            <div className="flex items-center gap-2 mb-2 text-[#1D2739]">
              <Compass className="w-4 h-4 text-[#1D2739]" />
              <h4 className="font-display font-bold text-sm">Working Principles</h4>
            </div>
            <p className="text-xs text-[#646C78] leading-relaxed">
              Decide what matters next, see work move, and make progress tangible without turning the day into an administrative task.
            </p>
          </div>

          {/* Recent Activity Stream */}
          <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-subtle p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#DED9CC] mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#1D2739]" />
                <h4 className="font-display font-bold text-[#1D2739] text-sm">
                  Recent Activity
                </h4>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#646C78] bg-[#ECE8DC] px-2 py-0.5 rounded-full">
                Live Feed
              </span>
            </div>

            <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
              {activityLogs.length === 0 ? (
                <p className="text-xs text-[#646C78] text-center py-4">
                  No activity recorded yet.
                </p>
              ) : (
                activityLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-[#DCECC3] text-[#3E6B2A] font-bold text-[10px] flex items-center justify-center shrink-0 ring-1 ring-[#DED9CC]">
                      {log.userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#1D2739] leading-relaxed">
                        <span className="font-bold">{log.userName}</span>{' '}
                        {log.action === 'created_task' && 'created'}{' '}
                        {log.action === 'moved_task' && 'updated'}{' '}
                        {log.action === 'completed_task' && 'completed'}{' '}
                        {log.action === 'assigned_task' && 'assigned'}{' '}
                        {log.action === 'created_board' && 'created board'}{' '}
                        {log.action === 'created_column' && 'added column'}{' '}
                        <span className="font-semibold text-[#1D2739]">
                          "{log.entityTitle}"
                        </span>
                      </p>
                      <span className="text-[10px] text-[#646C78] block mt-0.5 font-medium">
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
