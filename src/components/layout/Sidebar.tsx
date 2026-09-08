import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActivePage } from '../../types';
import {
  LayoutDashboard,
  Kanban,
  CheckSquare,
  MessageSquare,
  Bell,
  Users,
  User as UserIcon,
  Settings,
  ChevronDown,
  Plus,
  Sparkles,
  X,
  LogOut,
  Building2,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { signOut, user: authUser } = useAuth();
  const { totalUnread: unreadMessageCount } = useChat();
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
  const activeUser = authUser || currentUser;
  const isAdmin = activeUser?.role === 'admin';

  const navItems: { id: ActivePage; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'boards', label: 'Boards', icon: Kanban },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'chat', label: 'Chat', icon: MessageSquare, badge: unreadMessageCount },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationCount,
    },
    ...(isAdmin ? [{ id: 'users' as ActivePage, label: 'Users', icon: Users }] : []),
    { id: 'profile' as ActivePage, label: 'Profile', icon: UserIcon },
    ...(isAdmin ? [{ id: 'settings' as ActivePage, label: 'Settings', icon: Settings }] : []),
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
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0 font-bold text-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-900 text-sm tracking-tight truncate">
                {workspace.name}
              </span>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5">
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
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-semibold text-xs shadow-sm hover:shadow transition-all group"
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
                    ? 'bg-indigo-50 text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
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
        </nav>

        {/* User Account Menu & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 relative">
          {/* User Profile Popover */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-slate-200 rounded-xl shadow-floating p-2 z-50 animate-fade-in">
              <div className="p-2 border-b border-slate-100 mb-1">
                <div className="flex items-center gap-2.5">
                  <UserAvatar user={activeUser} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {activeUser.name}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      {activeUser.email}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setActivePage('profile');
                    setIsUserMenuOpen(false);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => {
                    setActivePage('settings');
                    setIsUserMenuOpen(false);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Workspace Settings</span>
                </button>

                <div className="pt-1 mt-1 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      signOut();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-white hover:bg-slate-100/80 text-left transition-all border border-slate-200 shadow-subtle group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar user={activeUser} size="sm" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {activeUser.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {activeUser.jobTitle || activeUser.role}
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
