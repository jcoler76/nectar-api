import { useState, useEffect, useCallback, useRef } from 'react';

import { useNotification } from '../context/NotificationContext';
import NotificationService from '../services/notificationService';
import SecureSessionStorage from '../utils/secureStorage';

/**
 * Custom hook for managing notifications
 * Provides real-time notification state management with optimistic updates
 */
export const useNotifications = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    limit = 20,
    unreadOnly = false,
  } = options;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const { showNotification } = useNotification();
  const refreshIntervalRef = useRef(null);
  const [hasToken, setHasToken] = useState(false);

  // Check for token after mount to avoid triggering storage events during render
  useEffect(() => {
    try {
      const s = new SecureSessionStorage();
      setHasToken(!!s.getItem()?.token);
    } catch (_) {
      setHasToken(false);
    }
  }, []);

  /**
   * Fetch notifications from the API
   */
  const fetchNotifications = useCallback(
    async (page = 1, showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        setError('');

        const data = await NotificationService.getNotifications({
          page,
          limit,
          unreadOnly,
        });

        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        setError('Failed to load notifications');
        setNotifications([]);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [limit, unreadOnly]
  );

  /**
   * Fetch only the unread count (for badge updates)
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  /**
   * Mark notification as read with optimistic update
   */
  const markAsRead = useCallback(
    async notificationId => {
      try {
        // Optimistic update
        setNotifications(prev =>
          prev.map(notification =>
            notification._id === notificationId
              ? { ...notification, isRead: true, readAt: new Date().toISOString() }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));

        await NotificationService.markAsRead(notificationId);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        showNotification('Failed to mark notification as read', 'error');

        // Revert optimistic update on error
        setNotifications(prev =>
          prev.map(notification =>
            notification._id === notificationId
              ? { ...notification, isRead: false, readAt: null }
              : notification
          )
        );
        setUnreadCount(prev => prev + 1);
      }
    },
    [showNotification]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);

    try {
      // Optimistic update
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);

      const result = await NotificationService.markAllAsRead();
      showNotification(`Marked ${result.modifiedCount} notifications as read`, 'success');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      showNotification('Failed to mark all notifications as read', 'error');

      // Revert optimistic update on error
      setNotifications(prev =>
        prev.map(notification => {
          const originalNotification = unreadNotifications.find(n => n._id === notification._id);
          return originalNotification
            ? { ...notification, isRead: false, readAt: null }
            : notification;
        })
      );
      setUnreadCount(unreadNotifications.length);
    }
  }, [notifications, showNotification]);

  /**
   * Delete notification with optimistic update
   */
  const deleteNotification = useCallback(
    async notificationId => {
      try {
        const notificationToDelete = notifications.find(n => n._id === notificationId);

        // Optimistic update
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        if (notificationToDelete && !notificationToDelete.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }

        await NotificationService.deleteNotification(notificationId);
        showNotification('Notification deleted', 'success');
      } catch (error) {
        console.error('Failed to delete notification:', error);
        showNotification('Failed to delete notification', 'error');

        // Revert optimistic update on error
        fetchNotifications(pagination.page, false);
      }
    },
    [notifications, pagination.page, fetchNotifications, showNotification]
  );

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(async () => {
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    try {
      // Optimistic update
      setNotifications([]);
      setUnreadCount(0);
      setPagination({ page: 1, pages: 1, total: 0 });

      const result = await NotificationService.clearAllNotifications();
      showNotification(`Cleared ${result.deletedCount} notifications`, 'success');
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      showNotification('Failed to clear all notifications', 'error');

      // Revert optimistic update on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  }, [notifications, unreadCount, showNotification]);

  /**
   * Refresh notifications
   */
  const refresh = useCallback(() => {
    fetchNotifications(pagination.page, false);
  }, [fetchNotifications, pagination.page]);

  /**
   * Load more notifications (pagination)
   */
  const loadMore = useCallback(
    page => {
      fetchNotifications(page, true);
    },
    [fetchNotifications]
  );

  /**
   * Get notification summary for UI display
   */
  const notificationSummary = useCallback(() => {
    return NotificationService.getNotificationSummary(notifications);
  }, [notifications]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (hasToken && autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        fetchUnreadCount(); // Only fetch count for badge updates
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [hasToken, autoRefresh, refreshInterval, fetchUnreadCount]);

  // Initial fetch
  useEffect(() => {
    if (hasToken) {
      fetchNotifications(1, true);
    }
  }, [fetchNotifications, hasToken]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    pagination,

    // Actions
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refresh,
    loadMore,

    // Utilities
    notificationSummary,

    // Helper functions from service
    formatTime: NotificationService.formatTime,
    getPriorityColor: NotificationService.getPriorityColor,
    getTypeIcon: NotificationService.getTypeIcon,
    hasAction: NotificationService.hasAction,
  };
};

export default useNotifications;
