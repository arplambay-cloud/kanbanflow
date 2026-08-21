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

export const BoardsView: React.FC = () => {
  const { boards, columns, tasks, createBoard, deleteBoard, navigateToBoard } =
    useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [error, setError] = useState('');

  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardTitle.trim()) {
      setError('Please enter a board name.');
      return;
    }

    const newBoardId = createBoard(boardTitle.trim(), boardDescription.trim());
    setBoardTitle('');
    setBoardDescription('');
    setIsCreateModalOpen(false);
    setError('');
    navigateToBoard(newBoardId);
  };

  return (
    <div className="p-6 lg:p-9 max-w-[1440px] mx-auto space-y-7">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] block mb-1">
            Workspaces & Projects
          </span>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1D2739] tracking-tight">
            Boards
          </h2>
          <p className="text-xs sm:text-sm text-[#646C78] mt-1">
            Structured workflow boards for core sprint delivery and team focus.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1D2739] hover:bg-[#253248] active:translate-y-[1px] text-[#FCFAF5] rounded-control font-semibold text-xs sm:text-sm shadow-paper transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Board</span>
        </button>
      </div>

      {/* Boards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create Board Dashed Card */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="h-56 rounded-card border-2 border-dashed border-[#DED9CC] hover:border-[#1D2739] bg-[#FCFAF5]/50 hover:bg-[#FCFAF5] p-6 flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-control bg-[#E6EDBF] text-[#1D2739] flex items-center justify-center shadow-subtle group-hover:scale-105 transition-all mb-3">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-[#1D2739] text-base">
            Create New Board
          </span>
          <span className="text-xs text-[#646C78] mt-1 max-w-[220px]">
            Automatically provisions To Do, In Progress, and Done lanes.
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

          const pct =
            boardTasks.length > 0
              ? Math.round((completedTasks.length / boardTasks.length) * 100)
              : 0;

          return (
            <div
              key={board.id}
              onClick={() => navigateToBoard(board.id)}
              className="h-56 bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-paper hover:border-[#1D2739] transition-all flex flex-col justify-between p-6 cursor-pointer relative group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-[#1D2739] text-lg truncate group-hover:text-[#1D2739] transition-colors">
                    {board.title}
                  </h3>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `Delete board "${board.title}" and all associated tasks?`
                        )
                      ) {
                        deleteBoard(board.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-[#646C78] hover:text-[#BF503D] hover:bg-[#F4DDD5] rounded-control transition-all"
                    title="Delete board"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-[#646C78] line-clamp-2 leading-relaxed">
                  {board.description || 'No description provided.'}
                </p>
              </div>

              {/* Progress Bar with Chartreuse accent */}
              <div className="my-2">
                <div className="flex items-center justify-between text-[11px] text-[#646C78] font-bold mb-1.5">
                  <span className="uppercase tracking-[0.14em]">Progress</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-2 bg-[#ECE8DC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E8EB4F] rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Footer Details */}
              <div className="pt-3 border-t border-[#DED9CC] flex items-center justify-between text-xs text-[#646C78] font-medium">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{boardCols.length} columns</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{boardTasks.length} tasks</span>
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-[#1D2739] group-hover:translate-x-0.5 transition-transform font-bold text-xs">
                  <span>Open</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#1D2739]" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Board Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D2739]/60 backdrop-blur-[2px] animate-rise-in">
          <div
            className="w-full max-w-md bg-[#FCFAF5] rounded-card shadow-modal border border-[#DED9CC] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DED9CC] bg-[#F5F2E9]">
              <h3 className="font-display font-bold text-[#1D2739] text-base">
                Create New Board
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-[#646C78] hover:text-[#1D2739] rounded-control hover:bg-[#ECE8DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="p-6 space-y-4">
              {error && (
                <div className="p-3 text-xs font-semibold text-[#BF503D] bg-[#F4DDD5] border border-[#EAC9C0] rounded-control">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
                  Board Title
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder="e.g. Design Tokens & Architecture"
                  className="w-full px-3.5 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] text-sm font-medium focus:outline-none focus:border-[#1D2739]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-[#646C78] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={boardDescription}
                  onChange={(e) => setBoardDescription(e.target.value)}
                  placeholder="What is this board for?"
                  className="w-full px-3.5 py-2.5 rounded-control border border-[#DED9CC] bg-[#F5F2E9] text-[#1D2739] text-sm focus:outline-none focus:border-[#1D2739] resize-none"
                />
              </div>

              <div className="p-3.5 bg-[#ECE8DC] rounded-control border border-[#DED9CC] text-xs text-[#6D695E]">
                <span className="font-bold text-[#1D2739]">Workflow lanes:</span> Your board will be created with <span className="font-semibold text-[#1D2739]">To Do</span>, <span className="font-semibold text-[#1D2739]">In Progress</span>, and <span className="font-semibold text-[#1D2739]">Done</span> lanes.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DED9CC]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#1D2739] bg-[#FCFAF5] hover:bg-[#ECE8DC] border border-[#DED9CC] rounded-control transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-[#FCFAF5] bg-[#1D2739] hover:bg-[#253248] rounded-control shadow-paper transition-all"
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
