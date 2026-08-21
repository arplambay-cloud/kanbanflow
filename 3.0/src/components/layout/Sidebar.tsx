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
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Clean White Sidebar (256px wide) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white text-slate-800 flex flex-col border-r border-slate-200/90 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm shrink-0 font-bold">
              <Kanban className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-slate-900 text-sm tracking-tight truncate">
                {workspace.name}
              </span>
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Workspace
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 lg:hidden"
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
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg font-semibold text-xs shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Task</span>
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1">
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-brand-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Boards List */}
          <div className="pt-4">
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Your Boards
              </span>
              <button
                onClick={() => {
                  setActivePage('boards');
                  onClose();
                }}
                className="text-[11px] text-brand-600 hover:underline font-semibold"
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
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-left truncate transition-colors ${
                      isCurrent
                        ? 'bg-slate-100 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: b.color || '#7839e6' }}
                    />
                    <span className="truncate">{b.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Account Switcher */}
        <div className="p-3 border-t border-slate-100 relative bg-slate-50/50">
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 animate-fade-in">
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Switch Active User
              </div>
              <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setCurrentUser(user);
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                      user.id === currentUser.id
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
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
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-white hover:bg-slate-50 text-left transition-all border border-slate-200/80 shadow-xs group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar user={currentUser} size="sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {currentUser.jobTitle || currentUser.role}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </aside>
    </>
  );
};
