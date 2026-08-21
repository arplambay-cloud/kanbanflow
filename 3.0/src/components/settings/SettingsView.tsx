import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Save,
  RotateCcw,
  Check,
  Building,
  Users,
  Shield,
  Palette,
  CheckCircle2,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

export const SettingsView: React.FC = () => {
  const {
    workspace,
    updateWorkspace,
    users,
    resetToDefaultData,
  } = useApp();

  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [workspaceDesc, setWorkspaceDesc] = useState(workspace.description || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkspace({
      name: workspaceName.trim(),
      description: workspaceDesc.trim(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all boards, columns, and tasks to initial sample data?'
      )
    ) {
      resetToDefaultData();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Workspace Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage workspace profile, members, and application storage preferences.
        </p>
      </div>

      {/* Workspace General Info */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">
              General Information
            </h3>
            <p className="text-xs text-slate-400">
              Customize workspace name and public profile details
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={workspaceDesc}
              onChange={(e) => setWorkspaceDesc(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm resize-none"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
            {isSaved && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Saved successfully!</span>
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">
                Team Members
              </h3>
              <p className="text-xs text-slate-400">
                {users.length} active contributors in this workspace
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map((user) => (
            <div
              key={user.id}
              className="py-3 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <UserAvatar user={user} size="md" />
                <div>
                  <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {user.jobTitle || user.role} • {user.email}
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-slate-100 text-slate-600 uppercase tracking-wider">
                {user.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone: Reset Data */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-subtle p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-rose-900 text-base">
              Reset Demo Data
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Restore all initial project boards, sample columns, default tasks, and live activities to their pristine starter state.
            </p>
          </div>

          <button
            onClick={handleReset}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
