import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Priority } from '../../types';
import { X, Calendar, User, Layout, Tag, Trash2, CheckCircle2 } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { CustomDropdown, DropdownOption } from '../common/CustomDropdown';

export const TaskModal: React.FC = () => {
  const {
    taskModalState,
    closeTaskModal,
    boards,
    columns,
    users,
    createTask,
    updateTask,
    deleteTask,
  } = useApp();

  const { isOpen, task, initialBoardId, initialColumnId } = taskModalState;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedColumnId, setSelectedColumnId] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setSelectedBoardId(task.boardId);
        setSelectedColumnId(task.columnId);
        setAssigneeId(task.assigneeId || '');
        setDueDate(task.dueDate || '');
        setPriority(task.priority);
      } else {
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
      setError('');
    }
  }, [isOpen, task, initialBoardId, initialColumnId, boards, columns]);

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

  // Prepare custom dropdown options
  const boardOptions: DropdownOption[] = boards.map((b) => ({
    value: b.id,
    label: b.title,
    colorDot: b.color || '#7839e6',
  }));

  const columnOptions: DropdownOption[] = availableColumns.map((col) => ({
    value: col.id,
    label: col.title,
  }));

  const assigneeOptions: DropdownOption[] = [
    { value: '', label: 'Unassigned', sublabel: 'No team member' },
    ...users.map((u) => ({
      value: u.id,
      label: u.name,
      sublabel: u.jobTitle || u.role,
    })),
  ];

  const priorityOptions: DropdownOption[] = [
    { value: 'low', label: 'Low', colorDot: '#94a3b8' },
    { value: 'medium', label: 'Medium', colorDot: '#7839e6' },
    { value: 'high', label: 'High', colorDot: '#f59e0b' },
    { value: 'urgent', label: 'Urgent', colorDot: '#ef4444' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a task title.');
      return;
    }
    if (!selectedBoardId) {
      setError('Please select a project board.');
      return;
    }
    if (!selectedColumnId) {
      setError('Please select a column.');
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
    if (task && window.confirm('Delete this task?')) {
      deleteTask(task.id);
      closeTaskModal();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-floating border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
            <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">
              {task ? 'Edit Task' : 'Create New Task'}
            </h3>
          </div>
          <button
            onClick={closeTaskModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement user authentication flow"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm font-medium transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description & Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key details, acceptance criteria, or links..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm resize-none transition-all"
            />
          </div>

          {/* Board & Column (Custom Dropdowns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomDropdown
              label="Board *"
              options={boardOptions}
              value={selectedBoardId}
              onChange={handleBoardChange}
              placeholder="Select board..."
            />

            <CustomDropdown
              label="Column / Status *"
              options={columnOptions}
              value={selectedColumnId}
              onChange={setSelectedColumnId}
              placeholder="Select column..."
              disabled={!selectedBoardId}
            />
          </div>

          {/* Assignee & Due Date (Custom Dropdown) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomDropdown
              label="Assignee"
              options={assigneeOptions}
              value={assigneeId}
              onChange={setAssigneeId}
              placeholder="Select assignee..."
            />

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Due Date
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 font-medium"
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Priority (Custom Dropdown) */}
          <div>
            <CustomDropdown
              label="Priority Level"
              options={priorityOptions}
              value={priority}
              onChange={(val) => setPriority(val as Priority)}
              placeholder="Select priority..."
            />
          </div>

          {/* Assignee preview */}
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {task ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeTaskModal}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg shadow-sm transition-all"
              >
                {task ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
