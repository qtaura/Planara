import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  EyeOff,
  Filter,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  acceptTeamInvite,
} from '@lib/api';
import { toast } from 'sonner';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('');
  const [filterChannel, setFilterChannel] = useState<string>('');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications({
        read: showUnreadOnly ? false : undefined,
        type: filterType || undefined,
        channel: filterChannel || undefined,
        limit: 200,
      });
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [showUnreadOnly, filterType, filterChannel]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkAsRead(notificationId: number) {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      // Dispatch event to update sidebar count
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      // Dispatch event to update sidebar count
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }

  async function handleDelete(notificationId: number) {
    try {
      await deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      // Dispatch event to update sidebar count
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }

  function parseInviterId(actionUrl?: string): number | null {
    if (!actionUrl) return null;
    try {
      const url = new URL(actionUrl);
      const from = url.searchParams.get('from');
      return from ? Number(from) : null;
    } catch {
      const m = actionUrl.match(/[?&]from=(\d+)/);
      return m ? Number(m[1]) : null;
    }
  }

  function parseTeamId(actionUrl?: string): number | null {
    if (!actionUrl) return null;
    try {
      const url = new URL(actionUrl);
      const tid = url.searchParams.get('teamId');
      return tid ? Number(tid) : null;
    } catch {
      const m = actionUrl.match(/[?&]teamId=(\d+)/);
      return m ? Number(m[1]) : null;
    }
  }

  async function handleAcceptInvite(notification: Notification) {
    const inviterId = parseInviterId(notification.actionUrl);
    const teamId = parseTeamId(notification.actionUrl);
    if (!inviterId) {
      toast.error('Invalid invite link');
      return;
    }
    try {
      await acceptTeamInvite(inviterId, teamId || undefined);
      toast.success('Joined the team successfully');
      // Mark as read and remove from list
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch (err: any) {
      const msg = err?.message || 'Failed to accept invite';
      toast.error(msg);
    }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>{error}</p>
          <button
            onClick={fetchNotifications}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              title="Filter by type"
            >
              <option value="">All types</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="team_invite">Team Invites</option>
            </select>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              title="Filter by channel"
            >
              <option value="">All channels</option>
              <option value="in_app">In-app</option>
              <option value="email">Email</option>
              <option value="push">Push</option>
            </select>
            <button
              onClick={() => setShowUnreadOnly((v) => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${showUnreadOnly ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'}`}
              title="Show unread only"
            >
              <EyeOff className="w-4 h-4" />
              Unread only
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No notifications</h3>
          <p className="text-gray-400">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-colors ${notification.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200 shadow-sm'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3
                        className={`font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}
                      >
                        {notification.title}
                      </h3>
                      <p
                        className={`mt-1 text-sm ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}
                      >
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDate(notification.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {notification.read && (
                        <button
                          onClick={() => handleMarkAsUnread(notification.id)}
                          className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                          title="Mark as unread"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {notification.actionUrl && notification.type === 'team_invite' && (
                    <div className="mt-3">
                      <button
                        onClick={() => handleAcceptInvite(notification)}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Accept Invite
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}