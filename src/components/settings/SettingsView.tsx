import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Building,
  Users,
  RotateCcw,
  Check,
  Plus,
  Shield,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { CustomDropdown } from '../common/CustomDropdown';

export const SettingsView: React.FC = () => {
  const {
    workspace,
    updateWorkspace,
    users,
    addUser,
    resetToDefaultData,
  } = useApp();

  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [workspaceDesc, setWorkspaceDesc] = useState(workspace.description);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New member modal state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberTitle, setNewMemberTitle] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');

  const handleSaveWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    updateWorkspace({
      name: workspaceName.trim(),
      description: workspaceDesc.trim(),
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    addUser({
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      jobTitle: newMemberTitle.trim() || 'Team Member',
      role: newMemberRole,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`,
    });

    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberTitle('');
    setIsAddingMember(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Workspace Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Configure your team workspace name, members, and application preferences.
        </p>
      </div>

      {/* General Workspace Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-subtle p-6 sm:p-8">
        <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">General Information</h3>
            <p className="text-xs text-slate-400">
              Customize your workspace name and details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveWorkspace} className="mt-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Workspace settings updated successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Workspace Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Acme Product Team"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              This name will appear on the sidebar brand header, navigation bars, and across the app.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Workspace Description
            </label>
            <textarea
              rows={2}
              value={workspaceDesc}
              onChange={(e) => setWorkspaceDesc(e.target.value)}
              placeholder="Brief summary of your team's mission or purpose..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              Save Workspace Changes
            </button>
          </div>
        </form>
      </div>

      {/* Team Members Management Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-subtle p-6 sm:p-8">
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Team Members</h3>
              <p className="text-xs text-slate-400">
                People who have access to tasks, boards, and notifications in this workspace.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingMember(!isAddingMember)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>

        {/* Add Member Form Drawer/Inline */}
        {isAddingMember && (
          <form
            onSubmit={handleAddMember}
            className="my-5 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-fade-in"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              New Member Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Full Name (e.g. Jordan Smith)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <input
                type="email"
                required
                placeholder="Email address"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="Role / Title (e.g. Frontend Engineer)"
                value={newMemberTitle}
                onChange={(e) => setNewMemberTitle(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <CustomDropdown
                size="sm"
                value={newMemberRole}
                onChange={(val) => setNewMemberRole(val as any)}
                options={[
                  { value: 'member', label: 'Member' },
                  { value: 'admin', label: 'Admin' },
                ]}
                className="w-full"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
              >
                Add Member
              </button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="mt-6 divide-y divide-slate-100">
          {users.map((member) => (
            <div
              key={member.id}
              className="py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <UserAvatar user={member} size="md" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm">
                    {member.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {member.jobTitle || member.role} • {member.email}
                  </div>
                </div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${
                  member.role === 'admin'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Data & Danger Zone */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-subtle p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Reset Demo Data</h3>
              <p className="text-xs text-slate-400">
                Restore the default workspace, initial boards, tasks, and users.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (
                window.confirm(
                  'Are you sure you want to reset all data back to the default demo state?'
                )
              ) {
                resetToDefaultData();
                setWorkspaceName('Acme Product Team');
              }
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};
