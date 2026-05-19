const NotificationService = require("../services/notificationService");
const PushTokenService = require("../services/pushTokenService");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const AppError = require("../utils/AppError");

exports.getUserNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead, category } = req.query;
    const userId = req.user._id;

    console.log(`Getting notifications for user: ${userId}`);

    const result = await NotificationService.getUserNotifications(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    console.log(`Found ${result.total} notifications`);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const count = await NotificationService.getUnreadCount(userId);

    res.status(200).json({
      status: "success",
      data: { unreadCount: count },
    });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(id);

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    if (notification.recipient.toString() !== userId.toString()) {
      throw new AppError("Permission denied", 403);
    }

    res.status(200).json({
      status: "success",
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(id);

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    if (notification.recipient.toString() !== userId.toString()) {
      throw new AppError("Permission denied", 403);
    }

    const updated = await NotificationService.markAsRead(id);

    res.status(200).json({
      status: "success",
      data: { notification: updated },
    });
  } catch (error) {
    next(error);
  }
};

exports.markMultipleAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    await NotificationService.markAllAsRead(userId);

    res.status(200).json({
      status: "success",
      message: "All notifications marked as read"
    });
  } catch (error) {
    next(error);
  }
};

exports.registerPushToken = async (req, res, next) => {
  try {
    const { token, deviceId, deviceName, platform } = req.body;
    const userId = req.user._id;

    if (!token || !deviceId || !platform) {
      throw new AppError("token, deviceId, and platform are required", 400);
    }

    const deviceToken = await PushTokenService.registerPushToken({
      userId,
      token,
      deviceId,
      deviceName: deviceName || "Unknown Device",
      platform
    });

    res.status(201).json({
      status: "success",
      data: { device: deviceToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserDevices = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const devices = await PushTokenService.getUserDevices(userId);

    res.status(200).json({
      status: "success",
      data: { devices },
    });
  } catch (error) {
    next(error);
  }
};

exports.unregisterDevice = async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user._id;
    const result = await PushTokenService.unregisterDevice(userId, deviceId);

    res.status(200).json({
      status: "success",
      data: { device: result },
    });
  } catch (error) {
    next(error);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("preferences");
    if (!user) {
      throw new AppError("User not found", 404);
    }
    res.status(200).json({
      status: "success",
      data: { preferences: user.preferences },
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findByIdAndUpdate(userId, { preferences: req.body }, {
      new: true,
      runValidators: true,
    }).select("preferences");

    res.status(200).json({
      status: "success",
      data: { preferences: user.preferences },
    });
  } catch (error) {
    next(error);
  }
};

exports.archiveNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Notification deleted"
    });
  } catch (error) {
    next(error);
  }
};

exports.archiveMultiple = async (req, res, next) => {
  try {
    const { notificationIds } = req.body;
    await Notification.deleteMany({ _id: { $in: notificationIds } });

    res.status(200).json({
      status: "success",
      message: "Notifications deleted"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
