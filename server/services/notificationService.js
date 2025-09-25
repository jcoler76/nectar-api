// MongoDB models replaced with Prisma for PostgreSQL migration
// const Notification = require('../models/Notification');
// const User = require('../models/User');

const prismaService = require('../services/prismaService');
const prisma = prismaService.getRLSClient();
const { logger } = require('../utils/logger');
const { sendEmail } = require('../utils/mailer');

class NotificationService {
  /**
   * Create a new notification for a user
   * @param {Object} data - Notification data
   * @param {string} data.userId - User ID
   * @param {string} data.type - Notification type (system, workflow, security, user_message)
   * @param {string} data.priority - Priority level (high, medium, low)
   * @param {string} data.title - Notification title
   * @param {string} data.message - Notification message
   * @param {Object} [data.metadata] - Additional metadata
   * @param {string} [data.actionUrl] - URL for action button
   * @param {string} [data.actionText] - Text for action button
   * @param {Date} [data.expiresAt] - Expiration date
   * @param {boolean} [sendEmailNotification=true] - Whether to send email
   * @returns {Promise<Notification>}
   */
  static async createNotification(data, sendEmailNotification = true) {
    try {
      // Validate required fields
      if (!data.userId || !data.type || !data.title || !data.message) {
        throw new Error('Missing required notification fields');
      }

      // TODO: Replace with Prisma user query during migration
      // const user = await User.findById(data.userId);
      // if (!user) {
      //   throw new Error('User not found');
      // }
      // For now, skip user query to allow server startup
      const user = { notificationPreferences: {} };

      const preferences = user.notificationPreferences || {
        inbox: {
          system: true,
          workflow: true,
          security: true,
          user_message: true,
        },
        email: {
          system: false,
          workflow: false,
          security: true,
          user_message: false,
        },
      };

      // Check if user wants this type of notification in their inbox
      const shouldCreateInboxNotification = preferences.inbox[data.type] !== false;

      // Security notifications are always created regardless of preferences
      if (data.type === 'security' || shouldCreateInboxNotification) {
        // Create the notification
        // TODO: Replace with Prisma notification creation during migration
        // const notification = await Notification.createNotification(data);
        const notification = { id: 'temp-id', ...data };

        logger.info(`Created notification ${notification._id} for user ${data.userId}`, {
          type: data.type,
          priority: data.priority,
          title: data.title,
        });

        // Determine if email should be sent based on user preferences and notification type
        const shouldSendEmail = preferences.email[data.type] !== false;

        // Send email notification based on preferences and priority
        // Security notifications are always sent via email regardless of preferences
        if (
          sendEmailNotification &&
          (data.type === 'security' || (shouldSendEmail && data.priority === 'high'))
        ) {
          await this.sendEmailNotification(notification);
        }

        // TODO: Emit real-time notification via WebSocket
        // this.emitRealTimeNotification(notification);

        return notification;
      } else {
        // User has disabled this notification type, log and return null
        logger.info(
          `Skipped creating notification for user ${data.userId} - type ${data.type} disabled in preferences`
        );
        return null;
      }
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Items per page
   * @param {boolean} [options.unreadOnly=false] - Show only unread
   * @param {string} [options.type] - Filter by type
   * @returns {Promise<Object>}
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false, type } = options;

      const query = { userId };

      if (unreadOnly) {
        query.isRead = false;
      }

      if (type) {
        query.type = type;
      }

      const skip = (page - 1) * limit;

      const [notifications, total, unreadCount] = await Promise.all([
        // TODO: Replace with Prisma notification queries during migration
        // Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        // Notification.countDocuments(query),
        // Notification.getUnreadCount(userId),
        Promise.resolve([]),
        Promise.resolve(0),
        Promise.resolve(0),
      ]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      logger.error('Error fetching user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<Notification>}
   */
  static async markAsRead(notificationId, userId) {
    try {
      // TODO: Replace with Prisma notification query during migration
      // const notification = await Notification.findOne({
      //   _id: notificationId,
      //   userId,
      // });
      const notification = null;

      if (!notification) {
        throw new Error('Notification not found');
      }

      await notification.markAsRead();
      return notification;
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  static async markAllAsRead(userId) {
    try {
      // TODO: Replace with Prisma notification update during migration
      // const result = await Notification.markAllAsRead(userId);
      const result = { modifiedCount: 0 };

      logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);

      return {
        modifiedCount: result.modifiedCount,
        message: `Marked ${result.modifiedCount} notifications as read`,
      };
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   * @returns {Promise<boolean>}
   */
  static async deleteNotification(notificationId, userId) {
    try {
      // TODO: Replace with Prisma notification deletion during migration
      // const result = await Notification.deleteOne({
      //   _id: notificationId,
      //   userId,
      // });
      const result = { deletedCount: 0 };

      if (result.deletedCount === 0) {
        throw new Error('Notification not found');
      }

      logger.info(`Deleted notification ${notificationId} for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Clear all notifications for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>}
   */
  static async clearAllNotifications(userId) {
    try {
      // TODO: Replace with Prisma notification deletion during migration
      // const result = await Notification.deleteMany({ userId });
      const result = { deletedCount: 0 };

      logger.info(`Cleared ${result.deletedCount} notifications for user ${userId}`);

      return {
        deletedCount: result.deletedCount,
        message: `Cleared ${result.deletedCount} notifications`,
      };
    } catch (error) {
      logger.error('Error clearing all notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  static async getUnreadCount(userId) {
    try {
      // TODO: Replace with Prisma notification count query during migration
      // return await Notification.getUnreadCount(userId);
      return 0;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  /**
   * Send email notification to user
   * @param {Notification} notification - Notification object
   * @private
   */
  static async sendEmailNotification(notification) {
    try {
      // TODO: Replace with Prisma user query during migration
      // const user = await User.findById(notification.userId);
      const user = null;
      if (!user || !user.email) {
        logger.warn(
          `Cannot send email notification - user ${notification.userId} not found or has no email`
        );
        return;
      }

      const emailData = {
        to: user.email,
        subject: `Nectar Studio - ${notification.title}`,
        html: this.generateEmailTemplate(notification, user),
      };

      await sendEmail(emailData);

      logger.info(`Sent email notification to ${user.email} for notification ${notification._id}`);
    } catch (error) {
      logger.error('Error sending email notification:', error);
      // Don't throw - email failure shouldn't break notification creation
    }
  }

  /**
   * Generate HTML email template for notification
   * @param {Notification} notification - Notification object
   * @param {User} user - User object
   * @returns {string} HTML email content
   * @private
   */
  static generateEmailTemplate(notification, user) {
    const priorityColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981',
    };

    const priorityColor = priorityColors[notification.priority] || '#6b7280';
    const actionButton = notification.actionUrl
      ? `
      <div style="text-align: center; margin: 20px 0;">
        <a href="${notification.actionUrl}" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; display: inline-block;">
          ${notification.actionText || 'View Details'}
        </a>
      </div>
    `
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nectar Studio Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1f2937; margin: 0;">Nectar Studio</h1>
          </div>
          
          <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid ${priorityColor};">
            <h2 style="color: #1f2937; margin-top: 0;">${notification.title}</h2>
            <p style="color: #6b7280; margin-bottom: 15px;">
              Hello ${user.firstName},
            </p>
            <p style="color: #374151; margin-bottom: 20px;">
              ${notification.message}
            </p>
            
            ${actionButton}
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Priority: <span style="color: ${priorityColor}; font-weight: bold; text-transform: uppercase;">${notification.priority}</span> | 
                Type: ${notification.type.replace('_', ' ')} | 
                Time: ${notification.createdAt.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px;">
              This notification was sent from Nectar Studio. 
              You can manage your notification preferences in your account settings.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Create system notification (helper method)
   * @param {string} userId - User ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} [priority='medium'] - Priority level
   * @returns {Promise<Notification>}
   */
  static async createSystemNotification(userId, title, message, priority = 'medium') {
    return this.createNotification({
      userId,
      type: 'system',
      priority,
      title,
      message,
    });
  }

  /**
   * Create workflow notification (helper method)
   * @param {string} userId - User ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} [metadata] - Workflow metadata
   * @param {string} [priority='medium'] - Priority level
   * @returns {Promise<Notification>}
   */
  static async createWorkflowNotification(
    userId,
    title,
    message,
    metadata = {},
    priority = 'medium'
  ) {
    return this.createNotification({
      userId,
      type: 'workflow',
      priority,
      title,
      message,
      metadata,
    });
  }

  /**
   * Create security notification (helper method)
   * @param {string} userId - User ID
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @returns {Promise<Notification>}
   */
  static async createSecurityNotification(userId, title, message) {
    return this.createNotification(
      {
        userId,
        type: 'security',
        priority: 'high',
        title,
        message,
      },
      true
    ); // Always send email for security notifications
  }
}

module.exports = NotificationService;
