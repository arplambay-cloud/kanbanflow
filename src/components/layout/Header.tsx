import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Menu,
  Bell,
  Plus,
  Search,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { timeAgo } from '../../utils/date';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    workspace,
    activePage,
    setActivePage,
    boards,
    activeBoardId,
    currentUser,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    openTaskModal,
    navigateToBoard,
  } = useApp();

  const [isNotifPopoverOpen, setIsNotifPopoverOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'boards':
        return 'Project Boards';
      case 'board-detail':
        return activeBoard?.title || 'Board';
      case 'tasks':
        return 'All Tasks';
      case 'notifications':
        return 'Notifications';
      case 'profile':
        return 'My Profile';
      case 'settings':
        return 'Workspace Settings';
      default:
        return 'Workspace';
    }
  };

  const userNotifications = notifications
    .filter((n) => n.recipientId === currentUser.id)
    .slice(0, 5);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-subtle">
      {/* Left side: Hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg lg:hidden focus:outline-none"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium hidden sm:flex">
            <span>{workspace.name}</span>
            <span>/</span>
            <span className="text-slate-600 font-semibold">{getPageTitle()}</span>
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Quick New Task Button */}
        <button
          onClick={() => openTaskModal()}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg font-medium text-xs shadow-sm hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifPopoverOpen(!isNotifPopoverOpen)}
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg relative transition-colors focus:outline-none"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notifications dropdown */}
          {isNotifPopoverOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-floating border border-slate-200 overflow-hidden z-50 animate-fade-in">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-800 text-sm">Notifications</h4>
                  {unreadNotificationCount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {unreadNotificationCount} new
                    </span>
                  )}
                </div>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsAsRead()}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {userNotifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                      <Bell className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-medium text-slate-600">No notifications yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      You're all caught up on your tasks!
                    </p>
                  </div>
                ) : (
                  userNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationAsRead(n.id);
                        if (n.boardId) {
                          navigateToBoard(n.boardId);
                          setIsNotifPopoverOpen(false);
                        }
                      }}
                      className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <UserAvatar
                        user={{
                          id: n.senderId,
                          name: n.senderName,
                          email: '',
                          avatar: n.senderAvatar,
                          role: 'member',
                          jobTitle: '',
                        }}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 leading-relaxed">
                          <span className="font-semibold text-slate-900">
                            {n.senderName}
                          </span>{' '}
                          {n.message}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setActivePage('notifications');
                    setIsNotifPopoverOpen(false);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 py-1"
                >
                  <span>View all notifications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Quick Button */}
        <button
          onClick={() => setActivePage('profile')}
          className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          title="Go to Profile"
        >
          <UserAvatar user={currentUser} size="sm" />
        </button>
      </div>
    </header>
  );
};
