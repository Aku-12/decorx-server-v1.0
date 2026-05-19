const Notification = require("../models/notification.model");
const User = require("../models/user.model");

class NotificationService {
  async createNotification(data) {
    const notification = await Notification.create(data);
    return notification;
  }

  async notifyAdmins(type, title, message, data = {}, actionUrl = null) {
    const admins = await User.find({ role: "admin" }).select("_id");

    if (admins.length === 0) return [];

    const notifications = admins.map(admin => ({
      recipient: admin._id,
      type,
      title,
      message,
      data,
      actionUrl
    }));

    return await Notification.insertMany(notifications);
  }

  async getUserNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments({ recipient: userId });

    return {
      notifications,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
  }

  async markAsRead(notificationId) {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
  }
}

module.exports = new NotificationService();
