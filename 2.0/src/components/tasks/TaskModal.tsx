import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Priority } from '../../types';
import { X, Calendar, User, Layout, Tag, Trash2, CheckCircle2 } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task name.');
      return;
    }
    if (!selectedBoardId) {
      setError('Please select a board.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D2739]/60 backdrop-blur-[2px] animate-rise-in">
      <div
        className="w-full max-w-xl bg-[#FCFAF5] rounded-card shadow-modal border border-[#DED9CC] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DED9CC] bg-[#F5F2E9]">
          <h3 className="font-display font-bold text-[#1D2739] text-lg">
            {task ? 'Edit Task' : 'New Task'}
          </h3>
          <button
            onClick={closeTaskModal}
            className="p-1.5 text-[#646C78] hover:text-[#1D2739] rounded-control hover:bg-[#ECE8DC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs font-semibold text-[#BF503D] bg-[#F4DDD5] border border-[#EAC9C0] rounded-control">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement token refresh handling"
              className="w-full px-3.5 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] placeholder-[#646C78]/60 focus:outline-none focus:border-[#1D2739] focus:ring-1 focus:ring-[#1D2739] font-medium text-sm transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key requirements or details..."
              className="w-full px-3.5 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] placeholder-[#646C78]/60 focus:outline-none focus:border-[#1D2739] focus:ring-1 focus:ring-[#1D2739] text-sm resize-none transition-all leading-relaxed"
            />
          </div>

          {/* Grid of Board & Column */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
                Board
              </label>
              <select
                value={selectedBoardId}
                onChange={(e) => handleBoardChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] text-sm font-medium focus:outline-none focus:border-[#1D2739]"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
                Column / Status
              </label>
              <select
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] text-sm font-medium focus:outline-none focus:border-[#1D2739]"
              >
                {availableColumns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] text-sm font-medium focus:outline-none focus:border-[#1D2739]"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.jobTitle || u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
                Due Date
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] text-sm font-medium focus:outline-none focus:border-[#1D2739]"
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate('')}
                    className="p-2 text-[#646C78] hover:text-[#1D2739] rounded-control hover:bg-[#ECE8DC]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-2">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                const isSelected = priority === p;
                const styles = {
                  low: isSelected
                    ? 'bg-[#1D2739] text-[#FCFAF5] border-[#1D2739]'
                    : 'bg-[#ECE8DC] text-[#6D695E] border-[#DED9CC] hover:border-[#1D2739]',
                  medium: isSelected
                    ? 'bg-[#1D2739] text-[#FCFAF5] border-[#1D2739]'
                    : 'bg-[#ECE8DC] text-[#1D2739] border-[#DED9CC] hover:border-[#1D2739]',
                  high: isSelected
                    ? 'bg-[#DB594A] text-white border-[#DB594A]'
                    : 'bg-[#F4DDD5] text-[#BF503D] border-[#EAC9C0] hover:border-[#DB594A]',
                  urgent: isSelected
                    ? 'bg-[#DB594A] text-white border-[#DB594A]'
                    : 'bg-[#F4DDD5] text-[#BF503D] border-[#EAC9C0] hover:border-[#DB594A]',
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-control text-xs font-bold uppercase tracking-wider transition-all text-center border ${styles[p]}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assignee preview */}
          {assigneeId && (
            <div className="p-3 bg-[#F5F2E9] rounded-control flex items-center justify-between border border-[#DED9CC]">
              <span className="text-xs text-[#646C78] font-medium">Assigned to:</span>
              <UserAvatar
                user={users.find((u) => u.id === assigneeId)}
                size="sm"
                showName
                showRole
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#DED9CC]">
            {task ? (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#BF503D] bg-[#F4DDD5] hover:bg-[#EAC9C0] rounded-control border border-[#EAC9C0] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={closeTaskModal}
                className="px-4 py-2 text-xs font-semibold text-[#1D2739] bg-[#FCFAF5] hover:bg-[#ECE8DC] border border-[#DED9CC] rounded-control transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-[#FCFAF5] bg-[#1D2739] hover:bg-[#253248] rounded-control shadow-paper transition-all"
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
