import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActivePage } from '../../types';
import {
  LayoutDashboard,
  Kanban,
  CheckSquare,
  Bell,
  User as UserIcon,
  Settings,
  ChevronDown,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    workspace,
    activePage,
    setActivePage,
    unreadNotificationCount,
    users,
    currentUser,
    setCurrentUser,
    boards,
    activeBoardId,
    navigateToBoard,
    openTaskModal,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems: { id: ActivePage; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'boards', label: 'Boards', icon: Kanban },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationCount,
    },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (page: ActivePage) => {
    setActivePage(page);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-950 shrink-0 font-bold text-lg">
              <Kanban className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-white text-sm tracking-tight truncate">
                {workspace.name}
              </span>
              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Workspace
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick New Task Button */}
        <div className="p-3">
          <button
            onClick={() => {
              openTaskModal();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg font-medium text-xs shadow-sm hover:shadow-indigo-900/40 transition-all group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            <span>Create New Task</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1.5">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activePage === item.id ||
              (item.id === 'boards' && activePage === 'board-detail');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Boards List */}
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Your Boards
              </span>
              <button
                onClick={() => {
                  setActivePage('boards');
                  onClose();
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View all
              </button>
            </div>
            <div className="space-y-0.5">
              {boards.map((b) => {
                const isCurrent =
                  activePage === 'board-detail' && activeBoardId === b.id;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      navigateToBoard(b.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left truncate ${
                      isCurrent
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-md shrink-0"
                      style={{ backgroundColor: b.color || '#6366f1' }}
                    />
                    <span className="truncate">{b.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Account Switcher */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 relative">
          {/* User Switcher Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl p-2 z-50 animate-fade-in">
              <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/60 flex items-center justify-between">
                <span>Switch Team Member</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setCurrentUser(user);
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                      user.id === currentUser.id
                        ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                        : 'text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar user={user} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {user.jobTitle || user.role}
                        </span>
                      </div>
                    </div>
                    {user.id === currentUser.id && (
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded font-medium">
                        Active
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-left transition-all border border-slate-700/40 group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar user={currentUser} size="sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {currentUser.jobTitle || currentUser.role}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </aside>
    </>
  );
};
