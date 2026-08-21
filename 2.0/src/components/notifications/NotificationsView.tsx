import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  Check,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { timeAgo } from '../../utils/date';

export const NotificationsView: React.FC = () => {
  const {
    currentUser,
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    navigateToBoard,
    openTaskModal,
    tasks,
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const myNotifications = notifications.filter(
    (n) => n.recipientId === currentUser.id
  );

  const displayedNotifications = myNotifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    return true;
  });

  const handleNotificationClick = (n: typeof notifications[0]) => {
    markNotificationAsRead(n.id);
    if (n.taskId) {
      const task = tasks.find((t) => t.id === n.taskId);
      if (task) {
        openTaskModal(task);
        return;
      }
    }
    if (n.boardId) {
      navigateToBoard(n.boardId);
    }
  };

  return (
    <div className="p-6 lg:p-9 max-w-4xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#1D2739] tracking-tight">
              Notifications
            </h2>
            {unreadNotificationCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8EB4F] text-[#1D2739]">
                {unreadNotificationCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#646C78] mt-1">
            Real-time assignment updates and team board milestones.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {unreadNotificationCount > 0 && (
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FCFAF5] border border-[#DED9CC] hover:bg-[#ECE8DC] text-[#1D2739] rounded-control text-xs font-bold shadow-subtle transition-all"
            >
              <Check className="w-4 h-4 text-[#3E6B2A]" />
              <span>Mark all read</span>
            </button>
          )}

          {myNotifications.some((n) => n.isRead) && (
            <button
              onClick={() => clearNotifications()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[#BF503D] bg-[#F4DDD5] hover:bg-[#EAC9C0] border border-[#EAC9C0] rounded-control text-xs font-bold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#DED9CC] pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-control text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-[#1D2739] text-[#FCFAF5] shadow-subtle'
              : 'text-[#646C78] hover:text-[#1D2739] hover:bg-[#ECE8DC]'
          }`}
        >
          All ({myNotifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-control text-xs font-bold transition-all ${
            filter === 'unread'
              ? 'bg-[#1D2739] text-[#FCFAF5] shadow-subtle'
              : 'text-[#646C78] hover:text-[#1D2739] hover:bg-[#ECE8DC]'
          }`}
        >
          Unread ({unreadNotificationCount})
        </button>
      </div>

      {/* Notification List */}
      <div className="bg-[#FCFAF5] rounded-card border border-[#DED9CC] shadow-paper overflow-hidden divide-y divide-[#DED9CC]">
        {displayedNotifications.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-[#ECE8DC] text-[#646C78] mx-auto flex items-center justify-center mb-2">
              <Bell className="w-5 h-5" />
            </div>
            <h4 className="font-display font-bold text-[#1D2739] text-sm">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h4>
            <p className="text-xs text-[#646C78] mt-1 max-w-sm mx-auto">
              When teammates assign tasks to you or update project workflows, alerts will appear here.
            </p>
          </div>
        ) : (
          displayedNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-[#F5F2E9] transition-all ${
                !n.isRead ? 'bg-[#E8EB4F]/10' : ''
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#DCECC3] text-[#3E6B2A] font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-[#DED9CC]">
                  {n.senderInitials}
                </div>

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-[#1D2739] leading-relaxed">
                    <span className="font-bold">{n.senderName}</span> {n.message}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[#646C78] font-medium">
                    <span>{timeAgo(n.createdAt)}</span>
                    {n.taskTitle && (
                      <>
                        <span>•</span>
                        <span className="text-[#1D2739] font-bold hover:underline inline-flex items-center gap-1">
                          <span>View task</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {!n.isRead ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationAsRead(n.id);
                    }}
                    className="p-1.5 text-[#1D2739] hover:bg-[#ECE8DC] rounded-control text-xs font-bold flex items-center gap-1.5"
                    title="Mark as read"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E8EB4F] border border-[#1D2739]" />
                    <span className="hidden sm:inline">Mark read</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-[#646C78] font-medium hidden sm:inline">
                    Read
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
