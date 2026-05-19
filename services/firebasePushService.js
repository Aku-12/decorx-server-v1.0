const admin = require("firebase-admin");
const PushTokenService = require("./pushTokenService");
const NotificationService = require("./notificationService");
const AppError = require("../utils/AppError");

class FirebasePushService {
  constructor() {
    this.isInitialized = false;
  }

  initialize() {
    try {
      if (admin.apps.length > 0) {
        this.isInitialized = true;
        return;
      }

      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        console.warn(
          "Firebase credentials not configured. Push notifications will be disabled.",
          "\nRequired env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
        );
        this.isInitialized = false;
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });

      this.isInitialized = true;
      console.log("Firebase Cloud Messaging initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Firebase:", error.message);
      this.isInitialized = false;
    }
  }

  async sendPushToDevice(payload) {
    if (!this.isInitialized) {
      return {
        success: false,
        error: "Firebase not initialized",
      };
    }

    const { token, title, body, data = {}, notification } = payload;

    if (!token || !title || !body) {
      throw new AppError("token, title, and body are required", 400);
    }

    try {
      const stringifiedData = {};
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (value !== null && value !== undefined) {
          stringifiedData[key] =
            typeof value === "string" ? value : JSON.stringify(value);
        }
      });

      const message = {
        notification: notification || { title, body },
        data: {
          ...stringifiedData,
          title,
          body,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "high",
          notification: {
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              sound: "default",
            },
          },
        },
        webpush: {
          notification: {
            title,
            body,
            icon: "/icons/notification-icon.png",
            badge: "/icons/notification-badge.png",
          },
          fcmOptions: {
            link: stringifiedData.actionUrl || data.actionUrl || "/",
          },
        },
        token,
      };

      const messageId = await admin.messaging().send(message);

      await PushTokenService.recordDeliverySuccess(token);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      return await this._handleFCMError(error, token);
    }
  }

  async sendPushMulticast(tokens, payload) {
    if (!this.isInitialized) {
      return {
        successCount: 0,
        failureCount: tokens.length,
        error: "Firebase not initialized",
      };
    }

    const { title, body, data = {} } = payload;

    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new AppError("tokens must be a non-empty array", 400);
    }

    if (!title || !body) {
      throw new AppError("title and body are required", 400);
    }

    try {
      const stringifiedData = {};
      Object.keys(data).forEach((key) => {
        const value = data[key];
        if (value !== null && value !== undefined) {
          stringifiedData[key] =
            typeof value === "string" ? value : JSON.stringify(value);
        }
      });

      const message = {
        notification: { title, body },
        data: {
          ...stringifiedData,
          title,
          body,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: "high",
        },
        apns: {
          payload: {
            aps: {
              alert: { title, body },
              sound: "default",
            },
          },
        },
        webpush: {
          notification: {
            title,
            body,
            icon: "/icons/notification-icon.png",
          },
        },
      };

      let successCount = 0;
      let failureCount = 0;

      for (const token of tokens) {
        try {
          await admin.messaging().send({
            ...message,
            token,
          });
          successCount++;

          await PushTokenService.recordDeliverySuccess(token).catch(() => {});
        } catch (error) {
          failureCount++;
          console.error(
            "[FirebasePushService] Single send error:",
            error.code,
            error.message
          );
          this._handleFCMError(error, token).catch(() => {});
        }
      }

      return {
        successCount,
        failureCount,
        totalSent: tokens.length,
      };
    } catch (error) {
      console.error("[FirebasePushService] Multicast error:", error.message);
      console.error(
        "[FirebasePushService] Error details:",
        error.code,
        error.errorInfo
      );
      throw new AppError(
        "Failed to send multicast notifications: " + error.message,
        500
      );
    }
  }

  async _handleFCMError(error, token) {
    const errorCode = error.code;
    let action = null;
    let reason = errorCode;

    switch (errorCode) {
      case "messaging/invalid-registration-token":
      case "messaging/registration-token-not-registered":
        action = "invalidate";
        reason = "invalid_registration_token";
        await PushTokenService.invalidateToken(token, reason);
        break;

      case "messaging/mismatched-credential":
        action = "invalidate";
        reason = "mismatched_credential";
        await PushTokenService.invalidateToken(token, reason);
        break;

      case "messaging/message-rate-exceeded":
        action = "retry";
        await PushTokenService.recordDeliveryFailure(token, reason);
        break;

      case "messaging/third-party-auth-error":
        action = "retry";
        await PushTokenService.recordDeliveryFailure(token, reason);
        break;

      default:
        action = "retry";
        await PushTokenService.recordDeliveryFailure(token, reason);
    }

    return {
      success: false,
      error: error.message,
      action,
      reason,
    };
  }

  async sendNotificationToUser(userId, userNotificationId, notificationData) {
    try {
      const tokens = await PushTokenService.getUserActiveTokens(userId);

      if (tokens.length === 0) {
        await NotificationService.updateDeliveryStatus(
          userNotificationId,
          "push",
          {
            status: "failed",
            failureReason: "no_active_devices",
          }
        );
        return { success: false, sentCount: 0, failedCount: 0 };
      }

      const tokenStrings = tokens.map((t) => t.token);
      const result = await this.sendPushMulticast(
        tokenStrings,
        notificationData
      );

      const status =
        result.failureCount === 0 ? "delivered" : "partial_failure";
      await NotificationService.updateDeliveryStatus(
        userNotificationId,
        "push",
        {
          status,
          deviceToken: tokenStrings[0],
        }
      );

      return {
        success: result.failureCount === 0,
        sentCount: result.successCount,
        failedCount: result.failureCount,
      };
    } catch (error) {
      await NotificationService.updateDeliveryStatus(
        userNotificationId,
        "push",
        {
          status: "failed",
          failureReason: error.message,
        }
      ).catch(() => {});

      throw error;
    }
  }

  async subscribeToTopic(tokens, topic) {
    if (!this.isInitialized) {
      throw new AppError("Firebase not initialized", 500);
    }

    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new AppError("tokens must be a non-empty array", 400);
    }

    if (!topic || typeof topic !== "string") {
      throw new AppError("topic is required", 400);
    }

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);

      return {
        successCount: tokens.length - response.failureCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      throw new AppError("Failed to subscribe to topic", 500);
    }
  }

  async unsubscribeFromTopic(tokens, topic) {
    if (!this.isInitialized) {
      throw new AppError("Firebase not initialized", 500);
    }

    if (!Array.isArray(tokens) || tokens.length === 0) {
      throw new AppError("tokens must be a non-empty array", 400);
    }

    try {
      const response = await admin
        .messaging()
        .unsubscribeFromTopic(tokens, topic);

      return {
        successCount: tokens.length - response.failureCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      throw new AppError("Failed to unsubscribe from topic", 500);
    }
  }

  async sendToTopic(topic, payload) {
    if (!this.isInitialized) {
      throw new AppError("Firebase not initialized", 500);
    }

    const { title, body, data = {} } = payload;

    if (!title || !body) {
      throw new AppError("title and body are required", 400);
    }

    try {
      const message = {
        notification: { title, body },
        data,
        topic,
      };

      const messageId = await admin.messaging().send(message);
      return messageId;
    } catch (error) {
      throw new AppError("Failed to send to topic", 500);
    }
  }
}

module.exports = new FirebasePushService();
