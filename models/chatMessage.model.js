const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: [true, "Message must belong to a chat"],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Message must have a sender"],
    },
    senderRole: {
      type: String,
      enum: ["customer", "admin"],
      required: [true, "Sender role is required"],
    },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },
    content: {
      type: String,
      maxlength: 5000,
    },
    attachments: [
      {
        fileName: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ chat: 1, createdAt: -1 });
chatMessageSchema.index({ sender: 1 });
chatMessageSchema.index({ isRead: 1 });
chatMessageSchema.index({ chat: 1, senderRole: 1, isRead: 1 });

chatMessageSchema.pre("validate", function () {
  if (!this.content && (!this.attachments || this.attachments.length === 0)) {
    throw (new Error("Message must have content or attachments"));
  } else {
  }
});

chatMessageSchema.post("save", async function () {
  try {
    await this.model("Chat").findByIdAndUpdate(this.chat, {
      lastMessageAt: this.createdAt,
    });
  } catch (error) {
    console.error("Failed to update chat lastMessageAt:", error);
  }
});

chatMessageSchema.post("save", async function () {
  try {
    if (this.senderRole === "admin") {
      const chat = await this.model("Chat").findById(this.chat);
      if (chat && chat.status === "waiting") {
        chat.status = "active";
        await chat.save();
      }
    }
  } catch (error) {
    console.error("Failed to update chat status:", error);
  }
});

chatMessageSchema.statics.getChatMessages = async function (
  chatId,
  options = {}
) {
  const { limit = 50, page = 1 } = options;
  const skip = (page - 1) * limit;

  const query = {
    chat: chatId,
    deletedAt: null,
  };

  const [messages, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("sender", "firstName lastName email role avatar")
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    messages,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + messages.length < total,
    },
  };
};

chatMessageSchema.statics.markAsRead = async function (chatId, senderRole) {
  const oppositeRole = senderRole === "customer" ? "admin" : "customer";

  const result = await this.updateMany(
    {
      chat: chatId,
      senderRole: oppositeRole,
      isRead: false,
      deletedAt: null,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

chatMessageSchema.statics.getUnreadCount = async function (chatId, senderRole) {
  const oppositeRole = senderRole === "customer" ? "admin" : "customer";

  return this.countDocuments({
    chat: chatId,
    senderRole: oppositeRole,
    isRead: false,
    deletedAt: null,
  });
};

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
