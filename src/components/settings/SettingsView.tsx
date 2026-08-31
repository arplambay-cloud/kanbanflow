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
  Edit2,
  Sparkles,
  User as UserIcon,
  Mail,
  Briefcase,
  X,
  KeyRound,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { CustomDropdown } from '../common/CustomDropdown';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';

export const SettingsView: React.FC = () => {
  const { inviteMember } = useAuth();
  const {
    workspace,
    updateWorkspace,
    users,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    resetToDefaultData,
  } = useApp();

  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [workspaceDesc, setWorkspaceDesc] = useState(workspace.description);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isOrgProfileModalOpen, setIsOrgProfileModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);

  // New member modal state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberTitle, setNewMemberTitle] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');

  // Edit existing member modal state
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');

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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;

    const trimmedEmail = newMemberEmail.trim().toLowerCase();
    const trimmedName = newMemberName.trim();
    const trimmedTitle = newMemberTitle.trim() || 'Team Member';

    addUser({
      name: trimmedName,
      email: trimmedEmail,
      jobTitle: trimmedTitle,
      role: newMemberRole,
      avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`,
    });

    // Send invitation / password link via SMTP
    await inviteMember(trimmedEmail, trimmedName, newMemberRole, trimmedTitle);

    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberTitle('');
    setIsAddingMember(false);
  };

  const startEditMember = (member: User) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditTitle(member.jobTitle || '');
    setEditRole((member.role as 'admin' | 'member') || 'member');
  };

  const handleSaveMemberEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editName.trim() || !editEmail.trim()) return;

    updateUser(editingMember.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      jobTitle: editTitle.trim() || undefined,
      role: editRole,
    });

    setEditingMember(null);
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    if (memberId === currentUser.id) {
      alert('You cannot remove your own active account from the workspace.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Team Member',
      message: `Are you sure you want to remove ${memberName} from this workspace?`,
      confirmLabel: 'Remove Member',
      onConfirm: () => {
        deleteUser(memberId);
        setConfirmDialog(null);
      },
    });
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
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
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
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none transition-all"
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingMember(!isAddingMember)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>
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
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium transition-all"
              />
              <input
                type="email"
                required
                placeholder="Email address"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              <input
                type="text"
                placeholder="Role / Title (e.g. Frontend Engineer)"
                value={newMemberTitle}
                onChange={(e) => setNewMemberTitle(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
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
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                Add Member
              </button>
            </div>
          </form>
        )}

        {/* Edit Member Modal / Drawer */}
        {editingMember && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 animate-scale-up space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <UserAvatar user={editingMember} size="md" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Edit Team Member
                    </h4>
                    <p className="text-xs text-slate-400">
                      Update details for {editingMember.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMemberEdit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Job Title / Role Description
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="e.g. Lead Designer"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Workspace Role Permission
                  </label>
                  <CustomDropdown
                    size="sm"
                    value={editRole}
                    onChange={(val) => setEditRole(val as any)}
                    options={[
                      { value: 'member', label: 'Member' },
                      { value: 'admin', label: 'Admin' },
                    ]}
                    className="w-full"
                  />
                </div>

                {/* Password Recovery Action */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Password Reset</span>
                    <span className="text-[11px] text-slate-500">Send password recovery link to user's email</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await inviteMember(editEmail.trim(), editName.trim(), editRole, editTitle.trim());
                      alert(`Password setup link sent to ${editEmail.trim()}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Send Reset Link</span>
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingMember(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="mt-6 divide-y divide-slate-100">
          {users.map((member) => (
            <div
              key={member.id}
              className="py-3.5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar user={member} size="md" />
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm flex items-center gap-2 truncate">
                    <span>{member.name}</span>
                    {member.id === currentUser.id && (
                      <span className="px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {member.jobTitle || 'Team Member'} • {member.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${
                    member.role === 'admin'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {member.role}
                </span>

                <button
                  type="button"
                  onClick={() => startEditMember(member)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="Edit member details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {member.id !== currentUser.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(member.id, member.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove member from workspace"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
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
              setConfirmDialog({
                isOpen: true,
                title: 'Reset Demo Data',
                message: 'Are you sure you want to reset all data back to the default demo state? All custom boards, tasks, and users will be replaced.',
                confirmLabel: 'Reset Data',
                onConfirm: () => {
                  resetToDefaultData();
                  setWorkspaceName('Acme Product Team');
                  setConfirmDialog(null);
                },
              });
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* In-App Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel || 'Delete'}
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
