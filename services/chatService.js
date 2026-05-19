const Chat = require("../models/chat.model");
const ChatMessage = require("../models/chatMessage.model");
const AppError = require("../utils/AppError");
const notificationEventEmitter = require("./notificationEventEmitter");
const User = require("../models/user.model");

class ChatService {
  async createChat(customerId, data = {}) {
    const { subject, metadata } = data;

    const chat = await Chat.create({
      customer: customerId,
      subject,
      metadata,
      status: "waiting",
    });

    const populatedChat = await chat.populate("customer", "firstName lastName email");

    // Emit admin notification for new chat
    try {
      notificationEventEmitter.emit("admin:chat:started", {
        chatId: chat._id,
        customerName: populatedChat.customer ? `${populatedChat.customer.firstName} ${populatedChat.customer.lastName}` : null,
        customerEmail: populatedChat.customer?.email,
        subject,
      });
    } catch (error) {
      console.error("Failed to emit admin:chat:started event:", error.message);
    }

    // Auto-create Welcome Message from Admin/System
    try {
      const adminSelector = { role: 'admin' };
      const admin = await User.findOne(adminSelector).select('_id');

      if (admin) {
        await ChatMessage.create({
          chat: chat._id,
          sender: admin._id,
          senderRole: 'admin',
          messageType: 'text',
          content: 'Hello! Welcome to Aura Interiors. How can I help you find the perfect piece for your home?',
          deliveredAt: new Date(),
          isRead: true
        });

        // Update chat unread/lastMessage
        await Chat.findByIdAndUpdate(chat._id, {
          lastMessageAt: new Date(),
          $inc: { unreadCountCustomer: 1 }
        });
      }
    } catch (msgError) {
      console.error("Failed to create automated welcome message:", msgError.message);
    }

    return populatedChat;
  }

  async getChatById(chatId, userId, userRole) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    }).populate("customer", "firstName lastName email");

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    if (userRole !== "admin" && chat.customer._id.toString() !== userId.toString()) {
      throw new AppError("You are not authorized to view this chat", 403);
    }

    return chat;
  }

  async getCustomerChats(customerId, options = {}) {
    return Chat.getCustomerChats(customerId, options);
  }

  async getAllChats(options = {}) {
    return Chat.getAllChats(options);
  }

  async getWaitingQueue() {
    return Chat.getWaitingQueue();
  }

  async sendMessage(chatId, senderId, senderRole, data = {}) {
    const { content, attachments } = data;

    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    if (senderRole !== "admin" && chat.customer.toString() !== senderId.toString()) {
      throw new AppError("You are not authorized to message this chat", 403);
    }

    let messageType = "text";
    if (attachments && attachments.length > 0) {
      const hasImages = attachments.some((att) => att.fileType === "image");
      messageType = hasImages ? "image" : "file";
    }

    const message = await ChatMessage.create({
      chat: chatId,
      sender: senderId,
      senderRole,
      messageType,
      content,
      attachments,
      deliveredAt: new Date(),
    });

    // Update chat based on sender role
    const updateData = {
      lastMessageAt: new Date(),
    };

    if (senderRole === "customer") {
      updateData.$inc = { unreadCountAdmin: 1 };
      updateData.customerTyping = false;
    } else {
      updateData.$inc = { unreadCountCustomer: 1 };
      updateData.adminTyping = false;

      // If admin sends first message and chat is waiting, mark as active
      if (chat.status === "waiting") {
        updateData.status = "active";
      }
    }

    await Chat.findByIdAndUpdate(chatId, updateData);

    // Broadcast message via socket if gateway is available
    if (global.notificationGateway) {
      const populatedMessage = await message.populate("sender", "firstName lastName email role avatar");
      // Convert to plain object to ensure all fields (including attachments) are serialized
      const messageData = populatedMessage.toObject();
      const roomId = chatId.toString();

      console.log(`Broadcasting message to room chat:${roomId}`);

      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:message:new", {
        chatId: roomId,
        message: messageData,
        timestamp: new Date(),
      });

      // Also emit status change if chat became active
      if (senderRole === "admin" && chat.status === "waiting") {
        global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:status:changed", {
          chatId: roomId,
          status: "active",
        });
      }
    }

    return message.populate("sender", "firstName lastName email role avatar");
  }

  async getChatMessages(chatId, userId, userRole, options = {}) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    if (userRole !== "admin" && chat.customer.toString() !== userId.toString()) {
      throw new AppError("You are not authorized to view these messages", 403);
    }

    return ChatMessage.getChatMessages(chatId, options);
  }

  async markMessagesAsRead(chatId, userId, userRole) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    if (userRole !== "admin" && chat.customer.toString() !== userId.toString()) {
      throw new AppError("You are not authorized to mark these messages", 403);
    }

    const modifiedCount = await ChatMessage.markAsRead(chatId, userRole);

    if (userRole === "customer") {
      await Chat.findByIdAndUpdate(chatId, { unreadCountCustomer: 0 });
    } else {
      await Chat.findByIdAndUpdate(chatId, { unreadCountAdmin: 0 });
    }

    // Broadcast read status via socket
    if (global.notificationGateway) {
      const roomId = chatId.toString();
      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:messages:read", {
        chatId: roomId,
        userId,
        userRole,
        readAt: new Date(),
      });
    }

    return { modifiedCount };
  }

  async updateTypingStatus(chatId, userId, userRole, isTyping) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    if (userRole !== "admin" && chat.customer.toString() !== userId.toString()) {
      throw new AppError("You are not authorized to update this chat", 403);
    }

    const updateField =
      userRole === "customer" ? "customerTyping" : "adminTyping";

    await Chat.findByIdAndUpdate(chatId, {
      [updateField]: isTyping,
    });

    return { success: true };
  }

  async closeChat(chatId, userId, userRole) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    if (userRole !== "admin" && chat.customer.toString() !== userId) {
      throw new AppError("You are not authorized to close this chat", 403);
    }

    chat.status = "closed";
    chat.closedBy = userId;
    await chat.save();

    // Broadcast close event via socket
    if (global.notificationGateway) {
      const roomId = chatId.toString();
      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:closed", {
        chatId: roomId,
        closedBy: userId,
        closedAt: new Date(),
      });
    }

    return chat;
  }

  async resolveChat(chatId, userId) {
    const chat = await Chat.findOne({
      _id: chatId,
      deletedAt: null,
    });

    if (!chat) {
      throw new AppError("Chat not found", 404);
    }

    chat.status = "resolved";
    chat.closedBy = userId;
    await chat.save();

    // Broadcast resolve event via socket
    if (global.notificationGateway) {
      const roomId = chatId.toString();
      global.notificationGateway.io.to(`chat:${roomId}`).emit("chat:resolved", {
        chatId: roomId,
        resolvedBy: userId,
        resolvedAt: new Date(),
      });
    }

    return chat;
  }

  async getChatStats() {
    const [totalChats, waitingChats, activeChats, resolvedChats, closedChats] =
      await Promise.all([
        Chat.countDocuments({ deletedAt: null }),
        Chat.countDocuments({ status: "waiting", deletedAt: null }),
        Chat.countDocuments({ status: "active", deletedAt: null }),
        Chat.countDocuments({ status: "resolved", deletedAt: null }),
        Chat.countDocuments({ status: "closed", deletedAt: null }),
      ]);

    const chatsWithResponses = await Chat.aggregate([
      {
        $match: {
          status: { $in: ["active", "resolved", "closed"] },
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: "chatmessages",
          localField: "_id",
          foreignField: "chat",
          as: "messages",
        },
      },
      {
        $project: {
          createdAt: 1,
          firstAdminMessage: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$messages",
                  as: "msg",
                  cond: { $eq: ["$$msg.senderRole", "admin"] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $match: {
          "firstAdminMessage.createdAt": { $exists: true },
        },
      },
      {
        $project: {
          responseTime: {
            $subtract: ["$firstAdminMessage.createdAt", "$createdAt"],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
    ]);

    const avgResponseTimeMs =
      chatsWithResponses.length > 0
        ? chatsWithResponses[0].avgResponseTime
        : null;
    const avgResponseTimeMinutes = avgResponseTimeMs
      ? Math.round(avgResponseTimeMs / 1000 / 60)
      : null;

    return {
      totalChats,
      waitingChats,
      activeChats,
      resolvedChats,
      closedChats,
      avgResponseTimeMinutes,
    };
  }

  async getUnreadCount(chatId, userRole) {
    return ChatMessage.getUnreadCount(chatId, userRole);
  }
}

module.exports = new ChatService();
