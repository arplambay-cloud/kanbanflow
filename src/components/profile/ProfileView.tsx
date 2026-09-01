import React, { useState, useRef, useEffect } from 'react';
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
  Edit3,
  Check,
  X,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { UserAvatar } from '../common/UserAvatar';
import { PriorityBadge } from '../common/PriorityBadge';
import { formatDate, isOverdue } from '../../utils/date';
import { notifyError, notifySuccess } from '../../utils/toast';
import { persistableAvatar } from '../../utils/avatar';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    updateUser,
    tasks,
    boards,
    columns,
    openTaskModal,
    updateTask,
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [jobTitle, setJobTitle] = useState(currentUser.jobTitle || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize with currentUser when not actively editing
  useEffect(() => {
    if (!isEditing) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setJobTitle(currentUser.jobTitle || '');
      setAvatar(currentUser.avatar || '');
    }
  }, [currentUser, isEditing]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      notifyError('Photo size exceeds 5MB limit. Please upload a smaller image file.');
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const filePath = `${currentUser.id}/avatar_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          notifyError('Photo upload failed: ' + uploadError.message);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        const publicUrl = publicUrlData?.publicUrl || filePath;
        setAvatar(publicUrl);
        updateUser(currentUser.id, { avatar: publicUrl });

        // Surface a failed write. Without this the photo appears to save, then
        // vanishes on the next profile sync because the row never changed.
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', currentUser.id);

        if (profileErr) {
          notifyError('Could not save your photo: ' + profileErr.message);
          return;
        }

        await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        });

        notifySuccess('Profile photo updated.');
        return;
      }
    } catch (err: any) {
      notifyError('Photo upload failed: ' + (err.message || 'Unknown error occurred'));
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedTitle = jobTitle.trim();
    const trimmedAvatar = avatar.trim();

    updateUser(currentUser.id, {
      name: trimmedName,
      email: trimmedEmail,
      jobTitle: trimmedTitle || undefined,
      avatar: trimmedAvatar || undefined,
    });

    if (isSupabaseConfigured && supabase) {
      try {
        // 1. Update Supabase Auth metadata and email
        const authPayload: any = {
          data: {
            display_name: trimmedName,
            full_name: trimmedName,
            name: trimmedName,
            job_title: trimmedTitle || undefined,
          },
        };
        if (trimmedEmail !== currentUser.email) {
          authPayload.email = trimmedEmail;
        }
        await supabase.auth.updateUser(authPayload);

        // 2. Update profiles table
        await supabase
          .from('profiles')
          .update({
            full_name: trimmedName,
            email: trimmedEmail,
            job_title: trimmedTitle || undefined,
            avatar_url: persistableAvatar(trimmedAvatar),
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentUser.id);
      } catch (err) {
        console.warn('Supabase user profile update:', err);
      }
    }

    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCancelEdit = () => {
    setName(currentUser.name);
    setEmail(currentUser.email);
    setJobTitle(currentUser.jobTitle || '');
    setAvatar(currentUser.avatar || '');
    setIsEditing(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Hidden file upload input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            User Profile
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your personal profile details, profile picture, and workload.
          </p>
        </div>

        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Your profile details have been saved successfully!</span>
        </div>
      )}

      {/* User Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-subtle p-6 sm:p-8">
        {isEditing ? (
          /* Profile Edit Form */
          <form onSubmit={handleSaveProfile} className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Edit Personal Information
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your profile picture, display name, email, and job title.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {currentUser.role}
              </span>
            </div>

            {/* Profile Picture Upload Area */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <UserAvatar
                  user={{ ...currentUser, name, avatar }}
                  size="xl"
                />
                <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] font-medium mt-0.5">Upload</span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Profile Picture</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Upload a JPEG, PNG, or GIF file (up to 5MB) from your computer.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload New Photo</span>
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold shadow-2xs transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              {/* Job Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Job Title / Position
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        ) : (
          /* View Mode */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4 sm:gap-6">
              <div
                className="relative group cursor-pointer"
                onClick={() => setIsEditing(true)}
                title="Click to edit profile & change picture"
              >
                <UserAvatar user={currentUser} size="xl" />
                <div className="absolute inset-0 bg-black/35 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-5 h-5" />
                  <span className="text-[9px] font-medium mt-0.5">Edit</span>
                </div>
              </div>
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
          </div>
        )}

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
