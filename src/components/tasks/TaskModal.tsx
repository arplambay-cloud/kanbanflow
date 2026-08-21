import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Priority, TaskComment, TaskAttachment } from '../../types';
import {
  X,
  Calendar,
  User,
  Layout,
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
  ExternalLink,
  Clock,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { CustomDropdown } from '../common/CustomDropdown';
import { formatDate } from '../../utils/date';

export const TaskModal: React.FC = () => {
  const {
    taskModalState,
    closeTaskModal,
    boards,
    columns,
    users,
    currentUser,
    createTask,
    updateTask,
    deleteTask,
    addComment,
    deleteComment,
    addAttachment,
    deleteAttachment,
  } = useApp();

  const { isOpen, task, initialBoardId, initialColumnId } = taskModalState;

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments'>('details');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [error, setError] = useState('');

  // Comment input state
  const [newCommentText, setNewCommentText] = useState('');

  // Attachment file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize modal state on open or change
  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Edit mode
        setTitle(task.title);
        setDescription(task.description || '');
        setSelectedBoardId(task.boardId);
        setSelectedColumnId(task.columnId);
        setAssigneeId(task.assigneeId || '');
        setDueDate(task.dueDate || '');
        setPriority(task.priority);
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
        setDueDate('');
        setPriority('medium');
      }
      setActiveTab('details');
      setNewCommentText('');
      setError('');
    }
  }, [isOpen, task, initialBoardId, initialColumnId, boards, columns]);

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
        dueDate: dueDate || undefined,
        priority,
      });
    }

    closeTaskModal();
  };

  const handleDelete = () => {
    if (task && window.confirm('Are you sure you want to delete this task?')) {
      deleteTask(task.id);
      closeTaskModal();
    }
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newCommentText.trim()) return;
    addComment(task.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addAttachment(task.id, {
          name: file.name,
          size: file.size,
          type: file.type,
          url: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      {/* Hidden Attachment input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-floating border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <h3 className="font-bold text-slate-800 text-base sm:text-lg truncate max-w-md">
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

        {/* Tab Navigation (When editing an existing task) */}
        {task && (
          <div className="flex items-center gap-2 px-6 border-b border-slate-100 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'details'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layout className="w-4 h-4" />
              <span>Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'comments'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Comments</span>
              {currentTaskComments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">
                  {currentTaskComments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'attachments'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>Attachments</span>
              {currentTaskAttachments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">
                  {currentTaskAttachments.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {error}
                </div>
              )}

              {/* Task Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Task Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design mobile navigation wireframe"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium text-sm transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details, requirements, or links..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm resize-none transition-all"
                />
              </div>

              {/* Grid of Board & Column */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Layout className="w-3.5 h-3.5 text-slate-400" /> Board
                    </span>
                  </label>
                  <CustomDropdown
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" /> Column / Status
                    </span>
                  </label>
                  <CustomDropdown
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" /> Assignee
                    </span>
                  </label>
                  <CustomDropdown
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due Date
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-10 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                    />
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => setDueDate('')}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        title="Clear date"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" /> Priority
                  </span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                    const isSelected = priority === p;
                    const colors = {
                      low: isSelected ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                      medium: isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
                      high: isSelected ? 'bg-amber-600 text-white' : 'bg-amber-800 hover:bg-amber-100',
                      urgent: isSelected ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
                    };
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all text-center capitalize ${colors[p]}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Assignee preview */}
              {assigneeId && (
                <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Assigned to:</span>
                  <UserAvatar
                    user={users.find((u) => u.id === assigneeId)}
                    size="sm"
                    showName
                    showRole
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {task ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Task</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={closeTaskModal}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all"
                  >
                    {task ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: COMMENTS */}
          {activeTab === 'comments' && task && (
            <div className="space-y-6 animate-fade-in">
              {/* Comment Thread List */}
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {currentTaskComments.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No comments yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Start the discussion or leave feedback for teammates below.
                    </p>
                  </div>
                ) : (
                  currentTaskComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
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
                          <span className="text-xs font-bold text-slate-900">
                            {comment.userName}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>

                        {(comment.userId === currentUser.id || currentUser.role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => deleteComment(task.id, comment.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-all"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Box */}
              <form onSubmit={handlePostComment} className="pt-3 border-t border-slate-100 flex gap-3">
                <UserAvatar user={currentUser} size="sm" />
                <div className="flex-1 space-y-2">
                  <textarea
                    rows={2}
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handlePostComment(e);
                      }
                    }}
                    placeholder="Write a comment... (Cmd+Enter to post)"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none transition-all"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Comment</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS */}
          {activeTab === 'attachments' && task && (
            <div className="space-y-6 animate-fade-in">
              {/* Upload Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-xl text-center cursor-pointer transition-all group"
              >
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors" />
                <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">
                  Click to upload attachments
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supports images, documents, PDFs up to 10MB
                </p>
              </div>

              {/* Attachments List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Files ({currentTaskAttachments.length})
                </h4>

                {currentTaskAttachments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No attachments added yet.</p>
                ) : (
                  currentTaskAttachments.map((att) => {
                    const isImage = att.type.startsWith('image/');
                    return (
                      <div
                        key={att.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isImage ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {att.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {formatFileSize(att.size)} • {att.uploadedBy} • {formatDate(att.uploadedAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={att.url}
                            download={att.name}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Download / View"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteAttachment(task.id, att.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete attachment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
