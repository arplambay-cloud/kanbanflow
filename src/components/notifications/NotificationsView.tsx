import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Bell,
  Check,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { timeAgo } from '../../utils/date';
import { resolveNotificationTarget } from '../../utils/notificationTarget';

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

    const { boardId, task, focusComments } = resolveNotificationTarget(n, tasks);
    if (boardId) navigateToBoard(boardId);
    if (task) openTaskModal(task, undefined, undefined, focusComments);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Notifications
            </h2>
            {unreadNotificationCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-700">
                {unreadNotificationCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Stay updated when tasks are assigned to you or important updates happen.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          {unreadNotificationCount > 0 && (
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-subtle transition-all"
            >
              <Check className="w-4 h-4 text-indigo-600" />
              <span>Mark all read</span>
            </button>
          )}

          {myNotifications.some((n) => n.isRead) && (
            <button
              onClick={() => clearNotifications()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          All ({myNotifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'unread'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
        >
          Unread ({unreadNotificationCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-subtle overflow-hidden divide-y divide-slate-100">
        {displayedNotifications.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-slate-800 text-sm">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When teammates assign tasks to you or update project boards, your alerts will show up here.
            </p>
          </div>
        ) : (
          displayedNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition-all ${
                !n.isRead ? 'bg-indigo-50/30' : ''
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <UserAvatar
                  user={{
                    id: n.senderId,
                    name: n.senderName,
                    email: '',
                    avatar: n.senderAvatar,
                    role: 'member',
                    jobTitle: '',
                  }}
                  size="md"
                />

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                    <span className="font-bold text-slate-900">{n.senderName}</span>{' '}
                    {n.message}
                  </p>

                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-medium">
                    <span>{timeAgo(n.createdAt)}</span>
                    {n.taskTitle && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                          <span>View task</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Read / Unread Indicator */}
              <div className="shrink-0 flex items-center gap-2">
                {!n.isRead ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markNotificationAsRead(n.id);
                    }}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-semibold flex items-center gap-1"
                    title="Mark as read"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                    <span className="hidden sm:inline">Mark read</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
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
