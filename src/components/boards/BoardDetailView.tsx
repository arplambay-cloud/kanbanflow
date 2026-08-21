import React, { useState } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { useApp } from '../../context/AppContext';
import { TaskCard } from './TaskCard';
import {
  Plus,
  ArrowLeft,
  MoreHorizontal,
  Edit2,
  Trash2,
  Filter,
  Search,
  Users,
  Kanban,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

export const BoardDetailView: React.FC = () => {
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
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>('all');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [activeMenuColumnId, setActiveMenuColumnId] = useState<string | null>(null);

  const currentBoard = boards.find((b) => b.id === activeBoardId);

  if (!currentBoard) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Board not found or has been deleted.</p>
        <button
          onClick={() => setActivePage('boards')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
        >
          Back to Boards
        </button>
      </div>
    );
  }

  // Board's columns sorted by order
  const boardColumns = columns
    .filter((c) => c.boardId === currentBoard.id)
    .sort((a, b) => a.order - b.order);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (t.boardId !== currentBoard.id) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    if (filterAssigneeId !== 'all') {
      if (filterAssigneeId === 'unassigned' && t.assigneeId) return false;
      if (filterAssigneeId !== 'unassigned' && t.assigneeId !== filterAssigneeId) return false;
    }
    return true;
  });

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    moveTask(draggableId, destination.droppableId, destination.index);
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
              onClick={() => setActivePage('boards')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
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
                type="text"
                placeholder="Search board..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Assignee Filter Dropdown */}
            <select
              value={filterAssigneeId}
              onChange={(e) => setFilterAssigneeId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Members</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Add Task Button */}
            <button
              onClick={() => openTaskModal(undefined, currentBoard.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-medium text-xs shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Columns Horizontal Canvas */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto p-4 sm:p-6 flex items-start gap-4 sm:gap-5">
          {boardColumns.map((column) => {
            const columnTasks = filteredTasks
              .filter((t) => t.columnId === column.id)
              .sort((a, b) => a.order - b.order);

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
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                      title="Add task in this column"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenuColumnId(isMenuOpen ? null : column.id)
                        }
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-md transition-colors"
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
                            className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rename Column</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveMenuColumnId(null);
                              if (
                                window.confirm(
                                  `Delete column "${column.title}" and its ${columnTasks.length} tasks?`
                                )
                              ) {
                                deleteColumn(column.id);
                              }
                            }}
                            className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Column</span>
                          </button>
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
                        className="w-full py-2 px-3 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-white/80 rounded-lg flex items-center justify-center gap-1.5 transition-all border border-dashed border-slate-300 hover:border-indigo-400"
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
                className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-card animate-fade-in"
              >
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Column name (e.g. Blocked, In Review)..."
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2.5"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    Add Column
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColumnTitle('');
                    }}
                    className="py-1.5 px-3 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-full py-3.5 px-4 bg-slate-200/50 hover:bg-slate-200/80 active:bg-slate-300/60 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 font-semibold text-xs flex items-center justify-center gap-2 transition-all group"
              >
                <Plus className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 group-hover:rotate-90 transition-transform duration-200" />
                <span>Add Column</span>
              </button>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};
