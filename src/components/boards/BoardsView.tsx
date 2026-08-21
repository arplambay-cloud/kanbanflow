import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Board } from '../../types';
import {
  Plus,
  Kanban,
  CheckCircle2,
  Calendar,
  Layers,
  Trash2,
  Edit2,
  ArrowRight,
  Sparkles,
  X,
} from 'lucide-react';
import { formatDate } from '../../utils/date';

const PRESET_COLORS = [
  '#7c3bed', // Primary Brand Purple
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ef4444', // Red
];

export const BoardsView: React.FC = () => {
  const { boards, columns, tasks, createBoard, deleteBoard, navigateToBoard } =
    useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardTitle.trim()) {
      setError('Please enter a board name');
      return;
    }

    const newBoardId = createBoard(
      boardTitle.trim(),
      boardDescription.trim(),
      selectedColor
    );
    setBoardTitle('');
    setBoardDescription('');
    setIsCreateModalOpen(false);
    setError('');
    // Automatically open the new board
    navigateToBoard(newBoardId);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Boards
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organize different projects, departments, or workflows with dedicated Kanban boards.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Board</span>
        </button>
      </div>

      {/* Boards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Create Board Card */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="h-56 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 p-6 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-lg bg-white group-hover:bg-indigo-600 text-slate-400 group-hover:text-white flex items-center justify-center shadow-subtle group-hover:shadow-md transition-all mb-3">
            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-200" />
          </div>
          <span className="font-semibold text-slate-800 group-hover:text-indigo-600 text-sm">
            Create New Board
          </span>
          <span className="text-xs text-slate-400 mt-1 max-w-[220px]">
            Comes with To Do, In Progress, and Done columns ready to use
          </span>
        </button>

        {/* Existing Boards */}
        {boards.map((board) => {
          const boardCols = columns.filter((c) => c.boardId === board.id);
          const boardTasks = tasks.filter((t) => t.boardId === board.id);
          const completedTasks = boardTasks.filter((t) => {
            const col = boardCols.find((c) => c.id === t.columnId);
            return col?.title.toLowerCase().includes('done');
          });

          return (
            <div
              key={board.id}
              onClick={() => navigateToBoard(board.id)}
              className="h-56 bg-white rounded-xl border border-slate-200 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all flex flex-col justify-between p-5 cursor-pointer relative group overflow-hidden"
            >
              {/* Card Content Top */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-md shrink-0"
                      style={{ backgroundColor: board.color || '#7c3bed' }}
                    />
                    <h3 className="font-bold text-slate-900 text-base truncate group-hover:text-indigo-600 transition-colors">
                      {board.title}
                    </h3>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Delete board "${board.title}" and all its tasks?`
                        )
                      ) {
                        deleteBoard(board.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Delete board"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {board.description || 'No description provided.'}
                </p>
              </div>

              {/* Progress bar */}
              {boardTasks.length > 0 && (
                <div className="my-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1">
                    <span>Progress</span>
                    <span>
                      {Math.round(
                        (completedTasks.length / boardTasks.length) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          (completedTasks.length / boardTasks.length) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Footer Meta */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{boardCols.length} cols</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{boardTasks.length} tasks</span>
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-indigo-600 group-hover:translate-x-0.5 transition-transform font-semibold text-xs">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Board Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-floating border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Kanban className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-slate-800 text-base">
                  Create New Board
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBoard} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Board Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder="e.g. Mobile App Redesign"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={boardDescription}
                  onChange={(e) => setBoardDescription(e.target.value)}
                  placeholder="What is this board for?"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600 resize-none"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Board Theme Color
                </label>
                <div className="flex items-center gap-2.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-lg transition-all ${
                        selectedColor === c
                          ? 'ring-2 ring-offset-2 ring-slate-800 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 text-xs text-indigo-800">
                <span className="font-semibold">Note:</span> Your new board will automatically include <span className="font-medium">To Do</span>, <span className="font-medium">In Progress</span>, and <span className="font-medium">Done</span> columns. You can add more columns anytime!
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-all"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
