import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Menu,
  Bell,
  Plus,
  Search,
  Check,
  ArrowRight,
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
        return 'Overview';
      case 'boards':
        return 'Boards';
      case 'board-detail':
        return activeBoard?.title || 'Board';
      case 'tasks':
        return 'All Tasks';
      case 'notifications':
        return 'Notifications';
      case 'profile':
        return 'Profile';
      case 'settings':
        return 'Settings';
      default:
        return 'Workspace';
    }
  };

  const userNotifications = notifications
    .filter((n) => n.recipientId === currentUser.id)
    .slice(0, 5);

  return (
    <header className="h-[72px] bg-[#F5F2E9]/90 backdrop-blur-[4px] border-b border-[#DED9CC] px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: Hamburger & Title & Live rhythm cue */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 text-[#646C78] hover:text-[#1D2739] hover:bg-[#ECE8DC] rounded-control lg:hidden"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h1 className="font-display font-bold text-lg sm:text-xl text-[#1D2739] leading-tight">
            {getPageTitle()}
          </h1>

          {/* Green 'workspace in rhythm' live cue on desktop */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#DCECC3] border border-[#C7DCAB] text-[#3E6B2A] text-[10px] font-bold uppercase tracking-[0.14em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3E6B2A] animate-pulse" />
            <span>Workspace in rhythm</span>
          </div>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-3">
        {/* Quick New Task Button */}
        <button
          onClick={() => openTaskModal()}
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1D2739] hover:bg-[#253248] active:translate-y-[1px] text-[#FCFAF5] rounded-control font-semibold text-xs shadow-paper transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifPopoverOpen(!isNotifPopoverOpen)}
            className="p-2 text-[#646C78] hover:text-[#1D2739] hover:bg-[#ECE8DC] rounded-control relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#E8EB4F] text-[#1D2739] border border-[#1D2739] text-[10px] font-bold flex items-center justify-center">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {isNotifPopoverOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FCFAF5] rounded-card shadow-modal border border-[#DED9CC] overflow-hidden z-50 animate-rise-in">
              <div className="p-4 border-b border-[#DED9CC] flex items-center justify-between bg-[#F5F2E9]">
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-bold text-[#1D2739] text-sm">
                    Notifications
                  </h4>
                  {unreadNotificationCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#E8EB4F] text-[#1D2739]">
                      {unreadNotificationCount} new
                    </span>
                  )}
                </div>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsAsRead()}
                    className="text-xs text-[#1D2739] hover:underline font-bold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#DED9CC]">
                {userNotifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <p className="text-xs font-bold text-[#1D2739]">All caught up</p>
                    <p className="text-[11px] text-[#646C78] mt-0.5">
                      No pending alerts for your workspace tasks.
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
                      className={`p-3.5 flex items-start gap-3 hover:bg-[#F5F2E9] cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-[#E8EB4F]/10' : ''
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-[#DCECC3] text-[#3E6B2A] font-bold text-[10px] flex items-center justify-center shrink-0 ring-1 ring-[#DED9CC]">
                        {n.senderInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#1D2739] leading-relaxed">
                          <span className="font-bold">{n.senderName}</span>{' '}
                          {n.message}
                        </p>
                        <span className="text-[10px] text-[#646C78] font-medium mt-1 block">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#1D2739] shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-[#F5F2E9] border-t border-[#DED9CC] text-center">
                <button
                  onClick={() => {
                    setActivePage('notifications');
                    setIsNotifPopoverOpen(false);
                  }}
                  className="text-xs font-bold text-[#1D2739] hover:underline inline-flex items-center gap-1 py-1"
                >
                  <span>View all notifications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar */}
        <button
          onClick={() => setActivePage('profile')}
          className="flex items-center gap-2 p-1 rounded-control hover:bg-[#ECE8DC] transition-colors"
          title="Go to profile"
        >
          <UserAvatar user={currentUser} size="sm" />
        </button>
      </div>
    </header>
  );
};
