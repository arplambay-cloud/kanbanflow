import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Priority, TaskComment, TaskAttachment } from '../../types';
import {
  X,
  Calendar,
  User,
  Layout,
  Briefcase,
  Tag,
  Trash2,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Send,
  Upload,
  FileText,
  File,
  Image as ImageIcon,
  Download,
  Clock,
  Plus,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { CustomDropdown } from '../common/CustomDropdown';
import { formatDate } from '../../utils/date';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { PRIORITY_CONFIG } from '../../utils/priorityConfig';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AttachmentRow } from './AttachmentRow';
import { notifyError } from '../../utils/toast';
import { ModalPortal } from '../common/ModalPortal';
import { AutoGrowTextarea } from '../common/AutoGrowTextarea';

export const TaskModal: React.FC = () => {
  const {
    taskModalState,
    closeTaskModal,
    boards,
    columns,
    users,
    clients,
    tasks,
    currentUser,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    deleteComment,
    addAttachment,
    deleteAttachment,
  } = useApp();

  const { isOpen, task: modalTask, initialBoardId, initialColumnId } = taskModalState;

  // Reactively lookup live task from global state so comments/attachments/status reflect immediately
  const task = modalTask ? tasks.find((t) => t.id === modalTask.id) || modalTask : null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [error, setError] = useState('');

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Comment input state
  const [newCommentText, setNewCommentText] = useState('');

  // Attachment file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize modal state on open or change
  useEffect(() => {
    if (isOpen) {
      if (modalTask) {
        // Edit mode - initialize with current task data
        const currentData = tasks.find((t) => t.id === modalTask.id) || modalTask;
        setTitle(currentData.title);
        setDescription(currentData.description || '');
        setSelectedBoardId(currentData.boardId);
        setSelectedColumnId(currentData.columnId);
        setAssigneeId(currentData.assigneeId || '');
        setClientId(currentData.clientId || '');
        setDueDate(currentData.dueDate || '');
        setPriority(currentData.priority);
      } else {
        // Create mode
        const defaultBoard = initialBoardId || (boards.length > 0 ? boards[0].id : '');
        const boardCols = columns.filter((c) => c.boardId === defaultBoard);
        const defaultCol = initialColumnId || (boardCols.length > 0 ? boardCols[0].id : '');

        setTitle('');
        setDescription('');
        setSelectedBoardId(defaultBoard);
        setSelectedColumnId(defaultCol);
        setAssigneeId('');
        setClientId('');
        setDueDate('');
        setPriority('medium');
      }
      setNewCommentText('');
      setError('');
    }
  }, [isOpen, modalTask?.id]);

  // When board changes, ensure column is valid for that board
  const handleBoardChange = (boardId: string) => {
    setSelectedBoardId(boardId);
    const boardCols = columns.filter((c) => c.boardId === boardId);
    if (boardCols.length > 0) {
      setSelectedColumnId(boardCols[0].id);
    } else {
      setSelectedColumnId('');
    }
  };

  if (!isOpen) return null;

  const availableColumns = columns.filter((c) => c.boardId === selectedBoardId);
  const currentTaskComments = task?.comments || [];
  const currentTaskAttachments = task?.attachments || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task name');
      return;
    }
    if (!selectedBoardId) {
      setError('Please select a board');
      return;
    }
    if (!selectedColumnId) {
      setError('Please select a status column');
      return;
    }

    if (task) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        boardId: selectedBoardId,
        columnId: selectedColumnId,
        assigneeId: assigneeId || undefined,
        clientId: clientId || undefined,
        dueDate: dueDate || undefined,
        priority,
      });
    } else {
      createTask({
        title: title.trim(),
        description: description.trim(),
        boardId: selectedBoardId,
        columnId: selectedColumnId,
        assigneeId: assigneeId || undefined,
        clientId: clientId || undefined,
        dueDate: dueDate || undefined,
        priority,
      });
    }

    closeTaskModal();
  };

  const handleDelete = () => {
    if (!task) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      onConfirm: () => {
        deleteTask(task.id);
        setConfirmDialog(null);
        closeTaskModal();
      },
    });
  };

  const handleDeleteAttachment = (attachmentId: string, attachmentName: string) => {
    if (!task) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Attachment',
      message: `Are you sure you want to delete "${attachmentName}"? This file will be permanently removed from this task.`,
      onConfirm: () => {
        deleteAttachment(task.id, attachmentId);
        setConfirmDialog(null);
      },
    });
  };

  const handleDeleteComment = (commentId: string) => {
    if (!task) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.',
      onConfirm: () => {
        deleteComment(task.id, commentId);
        setConfirmDialog(null);
      },
    });
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newCommentText.trim()) return;
    addComment(task.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    if (file.size > 10 * 1024 * 1024) {
      notifyError('File size exceeds 10MB limit.');
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${task.id}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          notifyError('Failed to upload file to storage: ' + uploadError.message);
          e.target.value = '';
          return;
        }

        // Store the object PATH, not a signed URL. Signed URLs expire, and a
        // long-lived one persisted in the database is nearly as exposed as a
        // public object. We mint a short-lived URL on demand when rendering.
        addAttachment(task.id, {
          name: file.name,
          size: file.size,
          type: file.type,
          url: filePath,
        });
        e.target.value = '';
        return;
      }
    } catch (err: any) {
      notifyError('File upload error: ' + (err.message || 'Unknown error occurred.'));
    }

    // Reset input
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      {/* Hidden Attachment input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div
        className={`w-full ${
          task ? 'max-w-4xl' : 'max-w-xl'
        } bg-white rounded-2xl shadow-floating border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
            <h3 className="font-bold text-slate-800 text-base sm:text-lg truncate">
              {task ? task.title : 'Create New Task'}
            </h3>
          </div>
          <button
            onClick={closeTaskModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {task ? (
            /* 2-Column Responsive Layout for Task Details + Comments/Attachments */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Task Form (7 cols on lg) */}
              <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-4">
                {error && (
                  <div className="p-3 text-xs sm:text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Task Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Task Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Design mobile navigation wireframe"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-xs sm:text-sm transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Description
                  </label>
                  <AutoGrowTextarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add details, requirements, or links..."
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm transition-all"
                  />
                </div>


                {/* Client — first of the classification fields, full width so
                    longer client names are not truncated. */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Client
                    </span>
                  </label>
                  <CustomDropdown
                    size="sm"
                    value={clientId}
                    onChange={(val) => setClientId(val)}
                    options={[
                      { value: '', label: 'No client' },
                      ...clients.map((c) => ({
                        value: c.id,
                        label: c.name,
                        colorDot: c.color || '#7c3bed',
                      })),
                    ]}
                    className="w-full"
                  />
                </div>

  
              {/* Client — first of the classification fields, full width so
                  longer client names are not truncated. */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Client
                  </span>
                </label>
                <CustomDropdown
                  size="sm"
                  value={clientId}
                  onChange={(val) => setClientId(val)}
                  options={[
                    { value: '', label: 'No client' },
                    ...clients.map((c) => ({
                      value: c.id,
                      label: c.name,
                      colorDot: c.color || '#7c3bed',
                    })),
                  ]}
                  className="w-full"
                />
              </div>

              {/* Board & Column */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Layout className="w-3.5 h-3.5 text-slate-400" /> Board
                      </span>
                    </label>
                    <CustomDropdown
                      size="sm"
                      value={selectedBoardId}
                      onChange={(val) => handleBoardChange(val)}
                      options={boards.map((b) => ({
                        value: b.id,
                        label: b.title,
                        colorDot: b.color || '#7c3bed',
                      }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Column / Status
                      </span>
                    </label>
                    <CustomDropdown
                      size="sm"
                      value={selectedColumnId}
                      onChange={(val) => setSelectedColumnId(val)}
                      options={availableColumns.map((col) => ({
                        value: col.id,
                        label: col.title,
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Assignee & Due Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> Assignee
                      </span>
                    </label>
                    <CustomDropdown
                      size="sm"
                      value={assigneeId}
                      onChange={(val) => setAssigneeId(val)}
                      placeholder="Unassigned"
                      options={[
                        { value: '', label: 'Unassigned' },
                        ...users.map((u) => ({
                          value: u.id,
                          label: u.name,
                          sublabel: u.jobTitle || u.role,
                        })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full h-9 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                      />
                      {dueDate && (
                        <button
                          type="button"
                          onClick={() => setDueDate('')}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                          title="Clear date"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Priority Selector (Using Global PRIORITY_CONFIG) */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-400" /> Priority Level
                    </span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                      const isSelected = priority === p;
                      const cfg = PRIORITY_CONFIG[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`h-9 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 ${
                            isSelected ? cfg.buttonSelected : cfg.buttonUnselected
                          }`}
                        >
                          <span>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Task</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={closeTaskModal}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>

              {/* Right Column: Activity, Attachments & Comments Feed (5 cols on lg) */}
              <div className="lg:col-span-5 flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-5 lg:pt-0">
                {/* Attachments Section */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Attachments ({currentTaskAttachments.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Upload</span>
                    </button>
                  </div>

                  {currentTaskAttachments.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No attachments uploaded yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                      {currentTaskAttachments.map((att) => (
                        <AttachmentRow
                          key={att.id}
                          attachment={att}
                          onDelete={handleDeleteAttachment}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="flex-1 flex flex-col min-h-[260px] max-h-[380px] bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Comments ({currentTaskComments.length})</span>
                    </span>
                  </div>

                  {/* Comment Thread List */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2.5 pr-1 min-w-0">
                    {currentTaskComments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center py-6 text-center text-slate-400">
                        <MessageSquare className="w-6 h-6 text-slate-300 mb-1" />
                        <p className="text-[11px]">No comments yet. Start the thread below.</p>
                      </div>
                    ) : (
                      currentTaskComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1 group min-w-0 overflow-hidden"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <UserAvatar
                                user={{
                                  id: comment.userId,
                                  name: comment.userName,
                                  email: '',
                                  avatar: comment.userAvatar || '',
                                  role: 'member',
                                  jobTitle: '',
                                }}
                                size="xs"
                              />
                              <span className="text-xs font-bold text-slate-800 truncate">{comment.userName}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>

                            {(comment.userId === currentUser.id || currentUser.role === 'admin') && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 rounded transition-all"
                                title="Delete comment"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed break-words [overflow-wrap:anywhere]">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quick Composer */}
                  <form onSubmit={handlePostComment} className="pt-2 mt-2 border-t border-slate-200/80 flex gap-2">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            /* Create Task Form (Single Column) */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-xs sm:text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {error}
                </div>
              )}

              {/* Task Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Task Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design mobile navigation wireframe"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-xs sm:text-sm transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <AutoGrowTextarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details, requirements, or links..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs sm:text-sm transition-all"
                />
              </div>

              {/* Board & Column */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5 text-slate-400" /> Board
                    </span>
                  </label>
                  <CustomDropdown
                    size="sm"
                    value={selectedBoardId}
                    onChange={(val) => handleBoardChange(val)}
                    options={boards.map((b) => ({
                      value: b.id,
                      label: b.title,
                      colorDot: b.color || '#7c3bed',
                    }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Column / Status
                    </span>
                  </label>
                  <CustomDropdown
                    size="sm"
                    value={selectedColumnId}
                    onChange={(val) => setSelectedColumnId(val)}
                    options={availableColumns.map((col) => ({
                      value: col.id,
                      label: col.title,
                    }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Assignee & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Assignee
                    </span>
                  </label>
                  <CustomDropdown
                    size="sm"
                    value={assigneeId}
                    onChange={(val) => setAssigneeId(val)}
                    placeholder="Unassigned"
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...users.map((u) => ({
                        value: u.id,
                        label: u.name,
                        sublabel: u.jobTitle || u.role,
                      })),
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-9 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => setDueDate('')}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title="Clear date"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Priority Selector (Using Global PRIORITY_CONFIG) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" /> Priority Level
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                    const isSelected = priority === p;
                    const cfg = PRIORITY_CONFIG[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`h-9 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 ${
                          isSelected ? cfg.buttonSelected : cfg.buttonUnselected
                        }`}
                      >
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeTaskModal}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all"
                >
                  Create Task
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* In-App Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
    </ModalPortal>
  );
};
