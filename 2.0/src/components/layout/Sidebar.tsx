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
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'boards', label: 'Boards', icon: Kanban },
    { id: 'tasks', label: 'All Tasks', icon: CheckSquare },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationCount,
    },
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
          className="fixed inset-0 z-40 bg-[#1D2739]/70 backdrop-blur-[2px] lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container: 254px deep ink */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-[254px] bg-[#1D2739] text-[#F3F0E7] flex flex-col border-r border-[#2D384D] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#2D384D] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo Mark with ~11px radius and chartreuse accent */}
            <div className="w-8 h-8 rounded-[11px] bg-[#E8EB4F] text-[#1D2739] flex items-center justify-center font-bold text-sm shadow-subtle shrink-0">
              <Kanban className="w-4 h-4 text-[#1D2739]" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-display font-bold text-[#F3F0E7] text-sm tracking-tight truncate">
                {workspace.name}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E8EB4F]">
                2.0 Rhythm
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#F3F0E7]/60 hover:text-white rounded-control hover:bg-[#2D384D] lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-3">
          <button
            onClick={() => {
              openTaskModal();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#2D384D] hover:bg-[#39465E] active:translate-y-[1px] text-[#FCFAF5] rounded-control font-semibold text-xs border border-[#39465E] transition-all"
          >
            <Plus className="w-4 h-4 text-[#E8EB4F]" />
            <span>New Task</span>
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F3F0E7]/40 px-3 pt-2 pb-1.5">
            Workspace
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
                className={`w-full flex items-center justify-between px-3 py-2 rounded-control text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#E8EB4F] text-[#1D2739] shadow-subtle font-bold'
                    : 'text-[#F3F0E7]/70 hover:text-[#F3F0E7] hover:bg-[#2D384D]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#1D2739]' : 'text-[#F3F0E7]/60'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive
                        ? 'bg-[#1D2739] text-[#FCFAF5]'
                        : 'bg-[#DB594A] text-white'
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
            <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F3F0E7]/40">
                Boards
              </span>
              <button
                onClick={() => {
                  setActivePage('boards');
                  onClose();
                }}
                className="text-[10px] text-[#E8EB4F] hover:underline font-bold"
              >
                All
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
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-control text-xs font-medium text-left truncate transition-colors ${
                      isCurrent
                        ? 'bg-[#2D384D] text-[#FCFAF5] font-bold border-l-2 border-[#E8EB4F]'
                        : 'text-[#F3F0E7]/70 hover:text-[#F3F0E7] hover:bg-[#2D384D]/60'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8EB4F] shrink-0" />
                    <span className="truncate">{b.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Bottom Profile & Settings Section */}
        <div className="p-3 border-t border-[#2D384D] space-y-1">
          <button
            onClick={() => handleNavClick('profile')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-xs font-semibold transition-colors ${
              activePage === 'profile'
                ? 'bg-[#E8EB4F] text-[#1D2739] font-bold'
                : 'text-[#F3F0E7]/70 hover:text-[#F3F0E7] hover:bg-[#2D384D]'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-control text-xs font-semibold transition-colors ${
              activePage === 'settings'
                ? 'bg-[#E8EB4F] text-[#1D2739] font-bold'
                : 'text-[#F3F0E7]/70 hover:text-[#F3F0E7] hover:bg-[#2D384D]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Current User Bar & Switcher */}
        <div className="p-3 border-t border-[#2D384D] bg-[#171F2E] relative">
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1D2739] border border-[#2D384D] rounded-card shadow-modal p-2 z-50 animate-rise-in">
              <div className="px-2 py-1.5 text-[10px] font-bold text-[#E8EB4F] uppercase tracking-[0.16em] border-b border-[#2D384D]">
                Switch Active Member
              </div>
              <div className="mt-1 space-y-1 max-h-48 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setCurrentUser(user);
                      setIsUserMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-control text-left transition-colors ${
                      user.id === currentUser.id
                        ? 'bg-[#2D384D] text-[#FCFAF5]'
                        : 'text-[#F3F0E7]/80 hover:bg-[#2D384D]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar user={user} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-[#F3F0E7]/50 truncate">
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
            className="w-full flex items-center justify-between p-2 rounded-control bg-[#2D384D]/60 hover:bg-[#2D384D] text-left transition-all border border-[#2D384D] group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar user={currentUser} size="sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#F3F0E7] truncate">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-[#F3F0E7]/60 truncate font-medium">
                  {currentUser.jobTitle || currentUser.role}
                </span>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[#F3F0E7]/60 group-hover:text-white transition-transform ${
                isUserMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </aside>
    </>
  );
};
