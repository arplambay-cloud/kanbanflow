import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserAvatar } from '../common/UserAvatar';
import {
  UserCheck,
  Mail,
  Shield,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Calendar,
  Save,
  Check,
} from 'lucide-react';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusPill } from '../common/StatusPill';
import { formatDate, isOverdue } from '../../utils/date';

export const ProfileView: React.FC = () => {
  const { currentUser, users, setCurrentUser, tasks, boards, columns, openTaskModal } =
    useApp();

  const [name, setName] = useState(currentUser.name);
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle || '');
  const [isSaved, setIsSaved] = useState(false);

  const myTasks = tasks.filter((t) => t.assigneeId === currentUser.id);
  const doneColumnIds = new Set(
    columns
      .filter((c) => c.title.toLowerCase().includes('done'))
      .map((c) => c.id)
  );

  const myCompleted = myTasks.filter((t) => doneColumnIds.has(t.columnId));
  const myPending = myTasks.filter((t) => !doneColumnIds.has(t.columnId));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser({
      ...currentUser,
      name: name.trim(),
      jobTitle: jobTitle.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/90 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <UserAvatar user={currentUser} size="xl" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {currentUser.name}
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-brand-50 text-brand-700 uppercase tracking-wider">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {currentUser.jobTitle || 'Team Contributor'} • {currentUser.email}
            </p>
          </div>
        </div>

        {/* Quick User Switcher for Preview */}
        <div className="flex flex-col gap-1.5 shrink-0 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Switch active persona:
          </span>
          <div className="flex items-center gap-1.5">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setCurrentUser(u);
                  setName(u.name);
                  setJobTitle(u.jobTitle || '');
                }}
                className={`p-1 rounded-lg transition-all ${
                  u.id === currentUser.id
                    ? 'ring-2 ring-brand-600 bg-white shadow-xs'
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Assigned Tasks
          </span>
          <div className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
            {myTasks.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600">
            In Progress / Pending
          </span>
          <div className="font-display text-2xl sm:text-3xl font-bold text-brand-600 mt-2">
            {myPending.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            Completed Tasks
          </span>
          <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 mt-2">
            {myCompleted.length}
          </div>
        </div>
      </div>

      {/* Profile Details Form */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle p-6">
        <h3 className="font-display font-bold text-slate-900 text-base mb-4">
          Personal Information
        </h3>

        <form onSubmit={handleSave} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Job Title / Role
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={currentUser.email}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm font-medium cursor-not-allowed"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Profile</span>
            </button>
            {isSaved && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Profile updated!</span>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
