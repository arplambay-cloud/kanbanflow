import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Plus,
  Kanban,
  CheckCircle2,
  Layers,
  Trash2,
  ArrowRight,
  X,
} from 'lucide-react';

const PRESET_COLORS = [
  '#7839e6', // Royal Violet (#7839e6)
  '#2563eb', // Cobalt Blue
  '#0d9488', // Teal
  '#059669', // Emerald
  '#ea580c', // Orange
  '#db2777', // Pink
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
    navigateToBoard(newBoardId);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Boards
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organize different projects, departments, or workflows with dedicated Kanban boards.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Board</span>
        </button>
      </div>

      {/* Boards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create Board Prompt Card */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="h-56 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-500 bg-slate-50/50 hover:bg-brand-50/30 p-6 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-slate-200 text-slate-400 group-hover:text-brand-600 group-hover:border-brand-300 flex items-center justify-center transition-colors mb-3">
            <Plus className="w-5 h-5" />
          </div>
          <span className="font-semibold text-slate-800 text-sm group-hover:text-brand-700">
            Create New Board
          </span>
          <span className="text-xs text-slate-400 mt-1 max-w-[200px]">
            Set up a dedicated project workspace with default columns
          </span>
        </button>

        {/* Existing Board Cards */}
        {boards.map((board) => {
          const boardCols = columns.filter((c) => c.boardId === board.id);
          const boardTasks = tasks.filter((t) => t.boardId === board.id);
          const completedTasks = boardTasks.filter((t) => {
            const col = boardCols.find((c) => c.id === t.columnId);
            return col?.title.toLowerCase().includes('done');
          });

          const pct =
            boardTasks.length > 0
              ? Math.round((completedTasks.length / boardTasks.length) * 100)
              : 0;

          return (
            <div
              key={board.id}
              onClick={() => navigateToBoard(board.id)}
              className="h-56 bg-white rounded-xl border border-slate-200/90 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all flex flex-col justify-between p-5 cursor-pointer relative group overflow-hidden"
            >
              {/* Top Accent Stripe */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: board.color || '#7839e6' }}
              />

              {/* Top Content */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-md shrink-0"
                      style={{ backgroundColor: board.color || '#7839e6' }}
                    />
                    <h3 className="font-display font-bold text-slate-900 text-base truncate group-hover:text-brand-600 transition-colors">
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

              {/* Progress Bar */}
              <div className="my-2">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
                  <span>Progress</span>
                  <span className="font-semibold text-slate-700">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Card Footer Info */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{boardCols.length} columns</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{boardTasks.length} tasks</span>
                  </span>
                </div>

                <span className="text-brand-600 font-semibold inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-floating border border-slate-200/90 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-display font-bold text-slate-900 text-base sm:text-lg">
                Create New Board
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Board Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder="e.g. Mobile App Redesign"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={boardDescription}
                  onChange={(e) => setBoardDescription(e.target.value)}
                  placeholder="Brief summary of board purpose..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600 text-sm resize-none"
                />
              </div>

              {/* Color Preset Palette */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-2.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-lg transition-all ${
                        selectedColor === color
                          ? 'ring-2 ring-offset-2 ring-brand-600 scale-110'
                          : 'hover:scale-105 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-lg shadow-sm transition-all"
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
