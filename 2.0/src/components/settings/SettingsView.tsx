import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building,
  Users,
  RotateCcw,
  Check,
  Plus,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

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
    });

    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberTitle('');
    setIsAddingMember(false);
  };

  return (
    <div className="p-6 lg:p-9 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] block mb-1">
          Configuration
        </span>
        <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1D2739] tracking-tight">
          Workspace Settings
        </h2>
        <p className="text-xs sm:text-sm text-[#646C78] mt-1">
          Configure team workspace branding, roster access, and data preferences.
        </p>
      </div>

      {/* General Settings */}
      <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-paper p-6 sm:p-8">
        <div className="flex items-center gap-3 pb-5 border-b border-[#DED9CC]">
          <div className="w-10 h-10 rounded-control bg-[#E6EDBF] text-[#1D2739] flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-[#1D2739] text-base">
              General Identity
            </h3>
            <p className="text-xs text-[#646C78]">
              Workspace name appears throughout headers, badges, and notifications.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveWorkspace} className="mt-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-[#DCECC3] border border-[#C7DCAB] text-[#3E6B2A] text-xs font-bold rounded-control flex items-center gap-2 animate-rise-in">
              <Check className="w-4 h-4 text-[#3E6B2A]" />
              <span>Workspace branding updated successfully.</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Core Delivery Team"
              className="w-full px-3.5 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] text-sm font-semibold focus:outline-none focus:border-[#1D2739]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={workspaceDesc}
              onChange={(e) => setWorkspaceDesc(e.target.value)}
              placeholder="Brief summary of your team's focus..."
              className="w-full px-3.5 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] text-sm focus:outline-none focus:border-[#1D2739] resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#1D2739] hover:bg-[#253248] text-[#FCFAF5] rounded-control text-xs sm:text-sm font-bold shadow-paper transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Team Roster */}
      <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-paper p-6 sm:p-8">
        <div className="flex items-center justify-between pb-5 border-b border-[#DED9CC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-control bg-[#DCEAF0] text-[#276170] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-[#1D2739] text-base">
                Team Roster
              </h3>
              <p className="text-xs text-[#646C78]">
                Members with workflow access to boards and notifications.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingMember(!isAddingMember)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FCFAF5] hover:bg-[#ECE8DC] border border-[#DED9CC] text-[#1D2739] rounded-control text-xs font-bold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>

        {/* Add Member Drawer */}
        {isAddingMember && (
          <form
            onSubmit={handleAddMember}
            className="my-5 p-4 bg-[#F5F2E9] border border-[#DED9CC] rounded-card space-y-4 animate-rise-in"
          >
            <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-[#1D2739]">
              Add Team Member
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Full Name (e.g. Jordan Smith)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="px-3 py-2 rounded-control border border-[#DED9CC] text-xs bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739] font-medium"
              />
              <input
                type="email"
                required
                placeholder="Email address"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="px-3 py-2 rounded-control border border-[#DED9CC] text-xs bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739]"
              />
              <input
                type="text"
                placeholder="Role / Title (e.g. Platform Engineer)"
                value={newMemberTitle}
                onChange={(e) => setNewMemberTitle(e.target.value)}
                className="px-3 py-2 rounded-control border border-[#DED9CC] text-xs bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739]"
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as any)}
                className="px-3 py-2 rounded-control border border-[#DED9CC] text-xs bg-[#FCFAF5] text-[#1D2739] focus:outline-none focus:border-[#1D2739]"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#646C78] hover:bg-[#ECE8DC] rounded-control"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#1D2739] hover:bg-[#253248] text-[#FCFAF5] text-xs font-bold rounded-control"
              >
                Save Member
              </button>
            </div>
          </form>
        )}

        {/* Member Roster List */}
        <div className="mt-6 divide-y divide-[#DED9CC]">
          {users.map((member) => (
            <div
              key={member.id}
              className="py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <UserAvatar user={member} size="md" />
                <div>
                  <div className="font-bold text-[#1D2739] text-sm">
                    {member.name}
                  </div>
                  <div className="text-xs text-[#646C78]">
                    {member.jobTitle || member.role} • {member.email}
                  </div>
                </div>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  member.role === 'admin'
                    ? 'bg-[#E8EB4F] text-[#1D2739]'
                    : 'bg-[#ECE8DC] text-[#6D695E]'
                }`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Demo Reset */}
      <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-paper p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-control bg-[#ECE8DC] text-[#6D695E] flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-[#1D2739] text-base">
                Reset Demo Workspace
              </h3>
              <p className="text-xs text-[#646C78]">
                Restore initial seed sample boards, tasks, and team roster.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (
                window.confirm(
                  'Restore all boards, tasks, and data back to initial demo state?'
                )
              ) {
                resetToDefaultData();
                setWorkspaceName('Core Delivery Team');
              }
            }}
            className="px-4 py-2 bg-[#FCFAF5] hover:bg-[#F4DDD5] hover:text-[#BF503D] border border-[#DED9CC] text-[#1D2739] rounded-control text-xs font-bold transition-colors"
          >
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};
