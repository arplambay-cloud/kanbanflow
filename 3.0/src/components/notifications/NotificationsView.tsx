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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Notifications
            </h2>
            {unreadNotificationCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-brand-100 text-brand-700">
                {unreadNotificationCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time updates when tasks are assigned to you or updated by your team.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {unreadNotificationCount > 0 && (
            <button
              onClick={() => markAllNotificationsAsRead()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          {myNotifications.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear all notifications?')) {
                  clearNotifications();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setFilter('all')}
          className={`pb-2.5 text-xs font-semibold transition-all relative ${
            filter === 'all'
              ? 'text-brand-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>All ({myNotifications.length})</span>
          {filter === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={`pb-2.5 text-xs font-semibold transition-all relative ${
            filter === 'unread'
              ? 'text-brand-600 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Unread ({unreadNotificationCount})</span>
          {filter === 'unread' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-subtle divide-y divide-slate-100 overflow-hidden">
        {displayedNotifications.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="font-display font-bold text-slate-800 text-sm">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              When someone assigns you a task or makes changes to your work, updates will appear here.
            </p>
          </div>
        ) : (
          displayedNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 flex items-start justify-between gap-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                !n.isRead ? 'bg-brand-50/40' : ''
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
                    <span className="font-semibold text-slate-900">{n.senderName}</span>{' '}
                    {n.message}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span className="font-medium">{timeAgo(n.createdAt)}</span>
                    {n.taskTitle && (
                      <>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium truncate max-w-[200px]">
                          {n.taskTitle}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 shrink-0">
                {!n.isRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-600" />
                )}
                <span className="text-xs text-brand-600 hover:underline font-medium inline-flex items-center gap-1">
                  <span>View</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
