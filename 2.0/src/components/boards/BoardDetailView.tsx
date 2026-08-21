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
  Search,
  Filter,
  Layers,
} from 'lucide-react';

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
        <p className="text-[#646C78] mb-4">Board not found or has been deleted.</p>
        <button
          onClick={() => setActivePage('boards')}
          className="px-4 py-2 bg-[#1D2739] text-[#FCFAF5] rounded-control text-xs font-bold"
        >
          Back to Boards
        </button>
      </div>
    );
  }

  const boardColumns = columns
    .filter((c) => c.boardId === currentBoard.id)
    .sort((a, b) => a.order - b.order);

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
    <div className="flex-1 flex flex-col h-[calc(100vh-4.5rem)] overflow-hidden bg-[#F5F2E9]">
      {/* Board Header Toolbar */}
      <div className="bg-[#FCFAF5] border-b border-[#DED9CC] px-6 py-3.5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 max-w-[1440px] mx-auto w-full">
          {/* Title & Back */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActivePage('boards')}
              className="p-1.5 text-[#646C78] hover:text-[#1D2739] hover:bg-[#ECE8DC] rounded-control transition-colors"
              title="Back to boards"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-display font-bold text-[#1D2739] text-lg sm:text-xl">
                  {currentBoard.title}
                </h2>
                <span className="text-[11px] font-bold text-[#646C78] bg-[#ECE8DC] px-2 py-0.5 rounded-full">
                  {filteredTasks.length} tasks
                </span>
              </div>
              {currentBoard.description && (
                <p className="text-xs text-[#646C78] line-clamp-1 mt-0.5">
                  {currentBoard.description}
                </p>
              )}
            </div>
          </div>

          {/* Search, Filter, and Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-[#646C78] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search board..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-control border border-[#DED9CC] text-xs bg-[#F5F2E9] text-[#1D2739] placeholder-[#646C78]/70 focus:bg-[#FCFAF5] focus:outline-none focus:border-[#1D2739]"
              />
            </div>

            {/* Assignee Filter */}
            <select
              value={filterAssigneeId}
              onChange={(e) => setFilterAssigneeId(e.target.value)}
              className="px-2.5 py-1.5 rounded-control border border-[#DED9CC] text-xs bg-[#FCFAF5] text-[#1D2739] font-medium focus:outline-none focus:border-[#1D2739]"
            >
              <option value="all">All Members</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* Add Task */}
            <button
              onClick={() => openTaskModal(undefined, currentBoard.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1D2739] hover:bg-[#253248] text-[#FCFAF5] rounded-control font-semibold text-xs shadow-subtle transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Workflow Columns Canvas */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto p-6 flex items-start gap-5">
          {boardColumns.map((column) => {
            const columnTasks = filteredTasks
              .filter((t) => t.columnId === column.id)
              .sort((a, b) => a.order - b.order);

            const isEditing = editingColumnId === column.id;
            const isMenuOpen = activeMenuColumnId === column.id;

            return (
              <div
                key={column.id}
                className="w-72 sm:w-80 shrink-0 bg-[#ECE9DF] rounded-card p-3.5 flex flex-col max-h-full border border-[#DED9CC] shadow-subtle"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 py-1 mb-2 relative">
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
                        className="w-full px-2 py-1 text-xs font-bold rounded-control border border-[#1D2739] bg-[#FCFAF5] focus:outline-none text-[#1D2739]"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="font-display font-bold text-[#1D2739] text-sm tracking-tight truncate">
                        {column.title}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FCFAF5] text-[#1D2739] border border-[#DED9CC] shadow-subtle">
                        {columnTasks.length}
                      </span>
                    </div>
                  )}

                  {/* Header Options */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openTaskModal(undefined, currentBoard.id, column.id)}
                      className="p-1 text-[#646C78] hover:text-[#1D2739] hover:bg-[#FCFAF5] rounded-control transition-colors"
                      title="Add task in this column"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenuColumnId(isMenuOpen ? null : column.id)
                        }
                        className="p-1 text-[#646C78] hover:text-[#1D2739] hover:bg-[#FCFAF5] rounded-control transition-colors"
                        title="Column options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          className="absolute right-0 top-full mt-1 w-40 bg-[#FCFAF5] border border-[#DED9CC] rounded-control shadow-momentum py-1 z-30 animate-rise-in text-xs"
                          onMouseLeave={() => setActiveMenuColumnId(null)}
                        >
                          <button
                            onClick={() => {
                              setEditingColumnId(column.id);
                              setEditingColumnTitle(column.title);
                              setActiveMenuColumnId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-[#1D2739] hover:bg-[#ECE8DC] flex items-center gap-2 font-medium"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#646C78]" />
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
                            className="w-full px-3 py-1.5 text-left text-[#BF503D] hover:bg-[#F4DDD5] flex items-center gap-2 font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Column</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Droppable Container */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto min-h-[140px] rounded-control transition-all p-1 ${
                        snapshot.isDraggingOver
                          ? 'bg-[#E8EB4F]/20 border-2 border-[#1D2739] rounded-card'
                          : ''
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

                      {/* Quick Add Button */}
                      <button
                        onClick={() => openTaskModal(undefined, currentBoard.id, column.id)}
                        className="w-full py-2 px-3 text-xs font-semibold text-[#646C78] hover:text-[#1D2739] hover:bg-[#FCFAF5] rounded-control flex items-center justify-center gap-1.5 transition-all border border-dashed border-[#DED9CC] hover:border-[#1D2739]"
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

          {/* Add Column Action (Dashed Border Creation Affordance) */}
          <div className="w-72 sm:w-80 shrink-0">
            {isAddingColumn ? (
              <form
                onSubmit={handleAddColumnSubmit}
                className="bg-[#FCFAF5] p-4 rounded-card border border-[#DED9CC] shadow-paper animate-rise-in"
              >
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Column name (e.g. Blocked, In Review)..."
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-control border border-[#DED9CC] text-xs font-medium text-[#1D2739] placeholder-[#646C78]/70 focus:outline-none focus:border-[#1D2739] mb-3 bg-[#F5F2E9]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 px-3 bg-[#1D2739] hover:bg-[#253248] text-[#FCFAF5] rounded-control text-xs font-bold shadow-subtle transition-all"
                  >
                    Add Column
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingColumn(false);
                      setNewColumnTitle('');
                    }}
                    className="py-1.5 px-3 text-[#646C78] hover:bg-[#ECE8DC] rounded-control text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-full py-4 px-4 bg-[#FCFAF5]/60 hover:bg-[#FCFAF5] rounded-card border-2 border-dashed border-[#DED9CC] hover:border-[#1D2739] text-[#646C78] hover:text-[#1D2739] font-bold text-xs flex items-center justify-center gap-2 transition-all group cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#646C78] group-hover:text-[#1D2739] transition-transform" />
                <span>Add Column</span>
              </button>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};
