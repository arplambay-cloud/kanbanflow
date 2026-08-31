import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useApp } from '../../context/AppContext';
import { TaskCard } from './TaskCard';
import {
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Edit2,
  Trash2,
  Search,
  Kanban,
  AlertCircle,
} from 'lucide-react';
import { CustomDropdown } from '../common/CustomDropdown';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ErrorBoundary } from '../common/ErrorBoundary';

const BoardDetailContent: React.FC = () => {
  const {
    boards,
    activeBoardId,
    setActivePage,
    columns,
    tasks,
    moveTask,
    createColumn,
    updateColumn,
    deleteColumn,
    openTaskModal,
    users,
    setIsDragging,
    currentUser,
    isLoadingRemote,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('all');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [activeMenuColumnId, setActiveMenuColumnId] = useState<string | null>(null);
  const [columnToDelete, setColumnToDelete] = useState<{ id: string; title: string; taskCount: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const { boardId: paramBoardId } = useParams<{ boardId?: string }>();
  const navigate = useNavigate();
  const effectiveBoardId = paramBoardId || activeBoardId;
  const currentBoard = (boards || []).find((b) => b && b.id === effectiveBoardId);

  if (isLoadingRemote && !currentBoard) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Syncing board from workspace...</p>
        </div>
      </div>
    );
  }

  if (!currentBoard) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-slate-200 m-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
          <Kanban className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Board Not Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mb-4">
          This board may have been deleted or the link is incorrect.
        </p>
        <button
          onClick={() => navigate('/boards')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Boards</span>
        </button>
      </div>
    );
  }

  // Board's columns sorted by order
  const boardColumns = (columns || [])
    .filter((c) => c && c.boardId === currentBoard.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Filter tasks safely
  const filteredTasks = (tasks || []).filter((t) => {
    if (!t || !t.id || t.boardId !== currentBoard.id) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (filterAssigneeId !== 'all') {
      if (filterAssigneeId === 'unassigned' && t.assigneeId) return false;
      if (filterAssigneeId !== 'unassigned' && t.assigneeId !== filterAssigneeId) return false;
    }
    return true;
  });

  const handleDragEnd = (result: DropResult) => {
    try {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      moveTask(draggableId, destination.droppableId, destination.index);
    } catch (e) {
      console.warn('Drag end error:', e);
    }
  };

  const handleAddColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    createColumn(currentBoard.id, newColumnTitle.trim());
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  const handleUpdateColumnSubmit = (columnId: string) => {
    if (!editingColumnTitle.trim()) return;
    updateColumn(columnId, editingColumnTitle.trim());
    setEditingColumnId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100/60">
      {/* Board Sub-Header Toolbar */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Board Title & Back */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/boards')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Back to all boards"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <span
                className="w-3.5 h-3.5 rounded-md shrink-0 shadow-sm"
                style={{ backgroundColor: currentBoard.color || '#6366f1' }}
              />
              <div>
                <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <span>{currentBoard.title}</span>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {filteredTasks.length} tasks
                  </span>
                </h2>
                {currentBoard.description && (
                  <p className="text-xs text-slate-500 line-clamp-1">
                    {currentBoard.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Search, Assignee Filter, Add Task */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[160px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search board..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              />
              <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-sans border border-slate-200 bg-white px-1 rounded shadow-2xs">
                Ctrl+K
              </kbd>
            </div>

            {/* Assignee Filter Dropdown */}
            <CustomDropdown
              size="sm"
              value={filterAssigneeId}
              onChange={(val) => setFilterAssigneeId(val)}
              options={[
                { value: 'all', label: 'All Members' },
                { value: 'unassigned', label: 'Unassigned' },
                ...(users || []).map((u) => ({ value: u.id, label: u.name || 'Member' })),
              ]}
              className="min-w-[130px]"
            />

            {/* Add Task Button */}
            <button
              onClick={() => openTaskModal(undefined, currentBoard.id)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-medium text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Columns Horizontal Canvas */}
      <DragDropContext
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(result) => {
          setIsDragging(false);
          handleDragEnd(result);
        }}
      >
        <div className="flex-1 overflow-x-auto p-4 sm:p-6 flex items-start gap-4 sm:gap-5">
          {boardColumns.map((column) => {
            const columnTasks = filteredTasks
              .filter((t) => t.columnId === column.id)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            const isEditing = editingColumnId === column.id;
            const isMenuOpen = activeMenuColumnId === column.id;

            return (
              <div
                key={column.id}
                className="w-72 sm:w-80 shrink-0 bg-slate-200/60 rounded-xl p-3 flex flex-col max-h-full border border-slate-200 shadow-subtle"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 py-1.5 mb-2 relative">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingColumnTitle}
                        onChange={(e) => setEditingColumnTitle(e.target.value)}
                        onBlur={() => handleUpdateColumnSubmit(column.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateColumnSubmit(column.id);
                          if (e.key === 'Escape') setEditingColumnId(null);
                        }}
                        className="w-full px-2 py-1 text-xs font-semibold rounded-md border border-indigo-400 bg-white focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-bold text-slate-800 text-xs sm:text-sm tracking-tight truncate">
                        {column.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-600 shadow-subtle">
                        {columnTasks.length}
                      </span>
                    </div>
                  )}

                  {/* Column Header Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openTaskModal(undefined, currentBoard.id, column.id)}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors cursor-pointer"
                      title="Add task in this column"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenuColumnId(isMenuOpen ? null : column.id)
                        }
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md transition-colors cursor-pointer"
                        title="Column settings"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 animate-fade-in text-xs"
                          onMouseLeave={() => setActiveMenuColumnId(null)}
                        >
                          <button
                            onClick={() => {
                              setEditingColumnId(column.id);
                              setEditingColumnTitle(column.title);
                              setActiveMenuColumnId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rename Column</span>
                          </button>

                          {currentUser?.role === 'admin' && (
                            <button
                              onClick={() => {
                                setActiveMenuColumnId(null);
                                setColumnToDelete({
                                  id: column.id,
                                  title: column.title,
                                  taskCount: columnTasks.length,
                                });
                              }}
                              className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Column</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Droppable Task List */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto min-h-[120px] rounded-lg transition-colors p-1 ${
                        snapshot.isDraggingOver ? 'bg-indigo-50/60 ring-2 ring-indigo-400/40' : ''
                      }`}
                    >
                      {columnTasks.map((task, idx) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={idx}
                          columns={boardColumns}
                        />
                      ))}
                      {provided.placeholder}

                      {/* Quick "+ Add Card" inline trigger */}
                      <button
                        onClick={() => openTaskModal(undefined, currentBoard.id, column.id)}
                        className="w-full py-2 px-3 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-white/80 rounded-lg flex items-center justify-center gap-1.5 transition-all border border-dashed border-slate-300 hover:border-indigo-400 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Task</span>
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}

          {/* Add Column Option */}
          <div className="w-72 sm:w-80 shrink-0">
            {isAddingColumn ? (
              <form
                onSubmit={handleAddColumnSubmit}
                className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2.5 animate-fade-in"
              >
                <input
                  type="text"
                  autoFocus
                  placeholder="Column Title (e.g. In Review)"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddingColumn(false)}
                    className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-2xs transition-all cursor-pointer"
                  >
                    Add Column
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/30 text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Column</span>
              </button>
            )}
          </div>
        </div>
      </DragDropContext>

      {/* Delete Column Confirmation Modal */}
      {columnToDelete && (
        <ConfirmDialog
          isOpen={!!columnToDelete}
          title="Delete Column"
          message={`Are you sure you want to delete "${columnToDelete.title}"? ${
            columnToDelete.taskCount > 0
              ? `This will also remove all ${columnToDelete.taskCount} tasks inside it.`
              : 'This action cannot be undone.'
          }`}
          confirmLabel="Delete Column"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onConfirm={() => {
            deleteColumn(columnToDelete.id);
            setColumnToDelete(null);
          }}
          onCancel={() => setColumnToDelete(null)}
        />
      )}
    </div>
  );
};

export const BoardDetailView: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Unable to display Board">
      <BoardDetailContent />
    </ErrorBoundary>
  );
};
