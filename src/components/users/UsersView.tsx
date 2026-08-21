import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { User } from '../../types';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Briefcase,
  CheckCircle2,
  Clock,
  Shield,
  User as UserIcon,
  X,
  Check,
  Camera,
  Upload,
  Layers,
  Sparkles,
  Eye,
  Calendar,
  ArrowUpRight,
  KeyRound,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { CustomDropdown } from '../common/CustomDropdown';
import { PriorityBadge } from '../common/PriorityBadge';
import { formatDate } from '../../utils/date';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

export const UsersView: React.FC = () => {
  const { inviteMember } = useAuth();
  const {
    users,
    currentUser,
    addUser,
    updateUser,
    deleteUser,
    tasks,
    columns,
    boards,
    openTaskModal,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // View User Profile Modal state
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  // User to delete confirmation state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Add User Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [newAvatar, setNewAvatar] = useState('');
  const addFileInputRef = useRef<HTMLInputElement>(null);

  // Edit User Modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [editAvatar, setEditAvatar] = useState('');
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Toast / notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Keyboard shortcut ⌘K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const doneColumnIds = new Set(
    columns
      .filter((c) => c.title.toLowerCase().includes('done'))
      .map((c) => c.id)
  );

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchTitle = (u.jobTitle || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchTitle) return false;
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) {
      return false;
    }
    return true;
  });

  // Handle local file uploads
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setTargetAvatar: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTargetAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const trimmedEmail = newEmail.trim().toLowerCase();
    const trimmedName = newName.trim();
    const trimmedTitle = newTitle.trim() || 'Team Member';

    addUser({
      name: trimmedName,
      email: trimmedEmail,
      jobTitle: trimmedTitle,
      role: newRole,
      avatar: newAvatar.trim() || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`,
    });

    // Send invitation / password link via SMTP
    await inviteMember(trimmedEmail, trimmedName, newRole, trimmedTitle);

    setNewName('');
    setNewEmail('');
    setNewTitle('');
    setNewAvatar('');
    setIsAddModalOpen(false);
    showToast(`Added ${trimmedName} & sent account setup link to ${trimmedEmail}`);
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditTitle(user.jobTitle || '');
    setEditRole(user.role);
    setEditAvatar(user.avatar || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim() || !editEmail.trim()) return;

    updateUser(editingUser.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      jobTitle: editTitle.trim() || undefined,
      role: editRole,
      avatar: editAvatar.trim() || undefined,
    });

    setEditingUser(null);
    showToast(`Updated details for ${editName.trim()}.`);
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser.id) {
      alert('You cannot delete your own active user account.');
      return;
    }
    setUserToDelete(user);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Hidden file inputs for avatar uploads */}
      <input
        ref={addFileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileUpload(e, setNewAvatar)}
        className="hidden"
      />
      <input
        ref={editFileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileUpload(e, setEditAvatar)}
        className="hidden"
      />

      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Workspace Users</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {users.length} members
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your team directory, assign roles, edit member profiles, and monitor tasks.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-fade-in shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search users by name, email, or role title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-16 rounded-lg border border-slate-200 text-xs font-medium bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none select-none">
            <kbd className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded font-mono shadow-2xs">
              ⌘
            </kbd>
            <kbd className="inline-flex items-center justify-center min-w-[18px] h-5 px-1 text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded font-mono shadow-2xs">
              K
            </kbd>
          </div>
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2.5">
          <CustomDropdown
            size="sm"
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'admin', label: 'Admins' },
              { value: 'member', label: 'Members' },
            ]}
            className="min-w-[130px]"
          />
        </div>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-subtle">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No users found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No team members matched your search criteria. Try a different query or invite a new member.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((user) => {
            const userTasks = tasks.filter((t) => t.assigneeId === user.id);
            const userCompleted = userTasks.filter((t) => doneColumnIds.has(t.columnId));
            const userPending = userTasks.filter((t) => !doneColumnIds.has(t.columnId));

            return (
              <div
                key={user.id}
                className="bg-white rounded-xl border border-slate-200 shadow-subtle p-5 flex flex-col justify-between hover:border-slate-300 transition-all group"
              >
                <div>
                  {/* Top Row: Avatar, Role Badge, Actions */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="relative">
                      <UserAvatar user={user} size="lg" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                        }`}
                      >
                        {user.role}
                      </span>

                      {/* View Profile Button */}
                      <button
                        onClick={() => setViewingUser(user)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View profile details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => startEditUser(user)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit user details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove user from workspace"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* User Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base truncate">
                        {user.name}
                      </h3>
                      {user.id === currentUser.id && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-slate-100 text-slate-600 rounded">
                          You
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{user.jobTitle || 'Team Member'}</span>
                    </p>

                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </p>
                  </div>
                </div>

                {/* Workload Stats Bar */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Total
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {userTasks.length}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50/50 border border-blue-100">
                    <span className="text-[10px] font-bold uppercase text-blue-500 block">
                      Active
                    </span>
                    <span className="text-sm font-bold text-blue-700">
                      {userPending.length}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <span className="text-[10px] font-bold uppercase text-emerald-500 block">
                      Done
                    </span>
                    <span className="text-sm font-bold text-emerald-700">
                      {userCompleted.length}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Add Team Member</h4>
                  <p className="text-xs text-slate-400">Invite a new user to this workspace</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              {/* Photo Upload Row */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3.5">
                <UserAvatar user={{ id: 'temp', name: newName || 'User', email: newEmail, avatar: newAvatar, role: newRole, jobTitle: newTitle }} size="lg" />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-900 block">Profile Picture</span>
                  <button
                    type="button"
                    onClick={() => addFileInputRef.current?.click()}
                    className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-xs font-semibold text-slate-700 shadow-2xs"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Image</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="maya@company.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Job Title / Position
                </label>
                <input
                  type="text"
                  placeholder="e.g. Product Marketing Manager"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Workspace Role Permission
                </label>
                <CustomDropdown
                  size="sm"
                  value={newRole}
                  onChange={(val) => setNewRole(val as any)}
                  options={[
                    { value: 'member', label: 'Member' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 animate-scale-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <UserAvatar user={{ ...editingUser, name: editName, avatar: editAvatar }} size="md" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Edit Member Profile</h4>
                  <p className="text-xs text-slate-400">Update details for {editingUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Photo Upload Row */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-3.5">
                <UserAvatar user={{ ...editingUser, name: editName, avatar: editAvatar }} size="lg" />
                <div className="flex-1 space-y-1">
                  <span className="text-xs font-bold text-slate-900 block">Profile Picture</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-xs font-semibold text-slate-700 shadow-2xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload</span>
                    </button>
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar('')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-md text-xs font-semibold shadow-2xs"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

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
                  Job Title / Position
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Senior Product Designer"
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
                    showToast(`Password setup link sent to ${editEmail.trim()}`);
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
                  onClick={() => setEditingUser(null)}
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

      {/* ========================================================================= */}
      {/* 3. VIEW USER PROFILE MODAL */}
      {/* ========================================================================= */}
      {viewingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setViewingUser(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-floating border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">User Profile</h3>
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Profile Card Header */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <UserAvatar user={viewingUser} size="xl" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-lg font-bold text-slate-900 truncate">
                      {viewingUser.name}
                    </h2>
                    {viewingUser.id === currentUser.id && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded">
                        You
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        viewingUser.role === 'admin'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                      }`}
                    >
                      {viewingUser.role}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{viewingUser.jobTitle || 'Team Member'}</span>
                  </p>

                  <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{viewingUser.email}</span>
                  </p>
                </div>
              </div>

              {/* Password Recovery Action Card */}
              <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Password Recovery</span>
                    <span className="text-[11px] text-slate-500">Dispatch a secure setup/reset link</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await inviteMember(viewingUser.email, viewingUser.name, viewingUser.role, viewingUser.jobTitle);
                    showToast(`Password setup link sent to ${viewingUser.email}`);
                  }}
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Send Reset Link
                </button>
              </div>

              {/* Workload Stats */}
              {(() => {
                const userTasks = tasks.filter((t) => t.assigneeId === viewingUser.id);
                const userCompleted = userTasks.filter((t) => doneColumnIds.has(t.columnId));
                const userPending = userTasks.filter((t) => !doneColumnIds.has(t.columnId));

                return (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Total Tasks
                        </span>
                        <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">
                          {userTasks.length}
                        </span>
                      </div>
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-center">
                        <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                          Active
                        </span>
                        <span className="text-xl font-extrabold text-indigo-700 mt-0.5 block">
                          {userPending.length}
                        </span>
                      </div>
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center">
                        <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                          Completed
                        </span>
                        <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">
                          {userCompleted.length}
                        </span>
                      </div>
                    </div>

                    {/* Assigned Tasks List */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Assigned Tasks ({userTasks.length})
                        </h4>
                      </div>

                      {userTasks.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 border border-slate-200/80 rounded-xl">
                          <p className="text-xs text-slate-400 italic">
                            No tasks currently assigned to {viewingUser.name}.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {userTasks.map((task) => {
                            const board = boards.find((b) => b.id === task.boardId);
                            const column = columns.find((c) => c.id === task.columnId);
                            const isDone = doneColumnIds.has(task.columnId);

                            return (
                              <div
                                key={task.id}
                                onClick={() => {
                                  setViewingUser(null);
                                  openTaskModal(task);
                                }}
                                className="p-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl flex items-center justify-between gap-3 cursor-pointer group/task transition-all"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs font-semibold text-slate-900 group-hover/task:text-indigo-600 transition-colors truncate ${
                                        isDone ? 'line-through text-slate-400' : ''
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                    {board && (
                                      <span className="flex items-center gap-1">
                                        <span
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: board.color || '#7c3bed' }}
                                        />
                                        <span>{board.title}</span>
                                      </span>
                                    )}
                                    {column && (
                                      <span>• {column.title}</span>
                                    )}
                                    {task.dueDate && (
                                      <span className="flex items-center gap-0.5">
                                        <Calendar className="w-2.5 h-2.5" />
                                        <span>{formatDate(task.dueDate)}</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <PriorityBadge priority={task.priority} size="sm" showIcon={false} />
                                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover/task:text-indigo-600 transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const u = viewingUser;
                  setViewingUser(null);
                  startEditUser(u);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Dialog */}
      {userToDelete && (
        <ConfirmDialog
          isOpen={!!userToDelete}
          title="Remove Team Member"
          message={`Are you sure you want to remove ${userToDelete.name} from the workspace? Their assigned tasks will remain but become unassigned.`}
          confirmLabel="Remove Member"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={() => {
            deleteUser(userToDelete.id);
            showToast(`Removed ${userToDelete.name} from the workspace.`);
            setUserToDelete(null);
          }}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  );
};