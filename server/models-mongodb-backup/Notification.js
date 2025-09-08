const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['system', 'workflow', 'security', 'user_message'],
      index: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    actionUrl: {
      type: String,
    },
    actionText: {
      type: String,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for user-friendly time
notificationSchema.virtual('timeAgo').get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return `${days} day${days === 1 ? '' : 's'} ago`;
});

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  const result = await this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result;
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({ userId, isRead: false });
};

module.exports = mongoose.model('Notification', notificationSchema);
