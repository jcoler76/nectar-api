import api from './api';

/**
 * Notification Service
 * Handles all notification-related API calls
 */
class NotificationService {
  /**
   * Get user's notifications with pagination and filtering
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {boolean} [options.unreadOnly=false] - Show only unread notifications
   * @param {string} [options.type] - Filter by notification type
   * @returns {Promise<Object>} Notification data with pagination
   */
  static async getNotifications(options = {}) {
    try {
      const params = new URLSearchParams();

      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.unreadOnly) params.append('unreadOnly', options.unreadOnly);
      if (options.type) params.append('type', options.type);

      const response = await api.get(`/api/notifications?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch notifications');
    }
  }

  /**
   * Get count of unread notifications
   * @returns {Promise<number>} Unread notification count
   */
  static async getUnreadCount() {
    try {
      const response = await api.get('/api/notifications/unread-count');
      return response.data.unreadCount;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch unread count');
    }
  }

  /**
   * Mark a specific notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  static async markAsRead(notificationId) {
    try {
      const response = await api.patch(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} Result with count of updated notifications
   */
  static async markAllAsRead() {
    try {
      const response = await api.patch('/api/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to mark all notifications as read');
    }
  }

  /**
   * Delete a specific notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteNotification(notificationId) {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      return true;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete notification');
    }
  }

  /**
   * Clear all notifications
   * @returns {Promise<Object>} Result with count of deleted notifications
   */
  static async clearAllNotifications() {
    try {
      const response = await api.delete('/api/notifications');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to clear all notifications');
    }
  }

  /**
   * Create a new notification (for testing purposes)
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.type - Notification type
   * @param {string} notificationData.priority - Priority level
   * @param {string} notificationData.title - Notification title
   * @param {string} notificationData.message - Notification message
   * @param {string} [notificationData.actionUrl] - Action URL
   * @param {string} [notificationData.actionText] - Action text
   * @returns {Promise<Object>} Created notification
   */
  static async createNotification(notificationData) {
    try {
      const response = await api.post('/api/notifications', notificationData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create notification');
    }
  }

  /**
   * Get priority color for UI styling
   * @param {string} priority - Priority level (high, medium, low)
   * @returns {string} CSS color class or value
   */
  static getPriorityColor(priority) {
    const colors = {
      high: 'text-red-500',
      medium: 'text-amber-500',
      low: 'text-green-500',
    };
    return colors[priority] || 'text-gray-500';
  }

  /**
   * Get priority icon for UI
   * @param {string} priority - Priority level (high, medium, low)
   * @returns {string} Icon name or component
   */
  static getPriorityIcon(priority) {
    const icons = {
      high: 'AlertTriangle',
      medium: 'AlertCircle',
      low: 'Info',
    };
    return icons[priority] || 'Bell';
  }

  /**
   * Get type icon for notification type
   * @param {string} type - Notification type
   * @returns {string} Icon name
   */
  static getTypeIcon(type) {
    const icons = {
      system: 'Settings',
      workflow: 'Zap',
      security: 'Shield',
      user_message: 'MessageCircle',
    };
    return icons[type] || 'Bell';
  }

  /**
   * Format notification time for display
   * @param {string|Date} timestamp - Notification timestamp
   * @returns {string} Formatted time string
   */
  static formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

    return date.toLocaleDateString();
  }

  /**
   * Get notification display title with type context
   * @param {Object} notification - Notification object
   * @returns {string} Enhanced title
   */
  static getDisplayTitle(notification) {
    const typePrefix = {
      system: '🔧',
      workflow: '⚡',
      security: '🛡️',
      user_message: '💬',
    };

    const prefix = typePrefix[notification.type] || '🔔';
    return `${prefix} ${notification.title}`;
  }

  /**
   * Check if notification should show action button
   * @param {Object} notification - Notification object
   * @returns {boolean} Whether to show action button
   */
  static hasAction(notification) {
    return !!(notification.actionUrl && notification.actionText);
  }

  /**
   * Get notification summary for badge display
   * @param {Array} notifications - Array of notifications
   * @returns {Object} Summary with counts and priority info
   */
  static getNotificationSummary(notifications) {
    const unread = notifications.filter(n => !n.isRead);
    const highPriority = unread.filter(n => n.priority === 'high');

    return {
      total: notifications.length,
      unread: unread.length,
      highPriority: highPriority.length,
      hasHighPriority: highPriority.length > 0,
    };
  }
}

export default NotificationService;
