import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Mail,
  Briefcase,
  CheckCircle2,
  Calendar,
  Check,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { StatusPill } from '../common/StatusPill';
import { PriorityTag } from '../common/PriorityTag';
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
    <div className="p-6 lg:p-9 max-w-5xl mx-auto space-y-7">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] block mb-1">
          Team Identity
        </span>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1D2739] tracking-tight">
          User Profile
        </h2>
        <p className="text-xs sm:text-sm text-[#646C78] mt-1">
          Review personal focus items, account identity, and workload throughput.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-paper p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#DED9CC]">
          <div className="flex items-center gap-5">
            <UserAvatar user={currentUser} size="xl" />
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-display font-bold text-xl sm:text-2xl text-[#1D2739]">
                  {currentUser.name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    currentUser.role === 'admin'
                      ? 'bg-[#E8EB4F] text-[#1D2739]'
                      : 'bg-[#ECE8DC] text-[#6D695E]'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#646C78] mt-1 flex items-center gap-1.5 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-[#646C78]" />
                <span>{currentUser.jobTitle || 'Team Member'}</span>
              </p>
              <p className="text-xs text-[#646C78] mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#646C78]" />
                <span>{currentUser.email}</span>
              </p>
            </div>
          </div>

          {/* Quick User Switcher */}
          <div className="bg-[#F5F2E9] p-3.5 rounded-card border border-[#DED9CC]">
            <span className="text-[11px] font-bold text-[#646C78] uppercase tracking-[0.16em] block mb-2">
              Switch Active User
            </span>
            <div className="flex items-center gap-2">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setCurrentUser(u)}
                  className={`p-1 rounded-full transition-all ${
                    u.id === currentUser.id
                      ? 'ring-2 ring-[#1D2739] ring-offset-2 scale-105'
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

        {/* User Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-control bg-[#F5F2E9] border border-[#DED9CC]">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78]">
              Assigned Total
            </span>
            <div className="font-display font-bold text-2xl text-[#1D2739] mt-1">
              {assignedTasks.length}
            </div>
          </div>

          <div className="p-4 rounded-control bg-[#DCEAF0]/50 border border-[#C3DBE5]">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#276170]">
              Pending
            </span>
            <div className="font-display font-bold text-2xl text-[#276170] mt-1">
              {pendingTasks.length}
            </div>
          </div>

          <div className="p-4 rounded-control bg-[#DCECC3]/50 border border-[#C7DCAB]">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#3E6B2A]">
              Completed
            </span>
            <div className="font-display font-bold text-2xl text-[#3E6B2A] mt-1">
              {completedTasks.length}
            </div>
          </div>

          <div className="p-4 rounded-control bg-[#FCFAF5] border border-[#DED9CC]">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#1D2739]">
              Rate
            </span>
            <div className="font-display font-bold text-2xl text-[#1D2739] mt-1">
              {completionRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Tasks List */}
      <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-paper overflow-hidden">
        <div className="p-5 border-b border-[#DED9CC] flex items-center justify-between bg-[#F5F2E9]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#3E6B2A]" />
            <h3 className="font-display font-bold text-[#1D2739] text-base">
              Tasks Assigned To {currentUser.name.split(' ')[0]}
            </h3>
          </div>
          <span className="text-xs font-bold text-[#646C78] bg-[#ECE8DC] px-2.5 py-1 rounded-full">
            {assignedTasks.length} total
          </span>
        </div>

        <div className="divide-y divide-[#DED9CC]">
          {assignedTasks.length === 0 ? (
            <div className="py-12 px-6 text-center text-xs text-[#646C78]">
              No tasks assigned to this user profile.
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
                  className="p-4 flex items-center justify-between gap-4 hover:bg-[#F5F2E9] cursor-pointer transition-colors"
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
                      className={`w-5 h-5 rounded-control border flex items-center justify-center transition-all ${
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
  );
};
