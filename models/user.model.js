const mongoose = require("mongoose");
const crypto = require("crypto");


const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },



    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{7,15}$/, "Please enter a valid phone number"],
    },

    avatar: { type: String, default: null },
    avatarPublicId: { type: String, default: null },

    dateOfBirth: Date,

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    // Magic link (used for both signup and passwordless login)
    magicLinkToken: { type: String, select: false },
    magicLinkExpires: { type: Date, select: false },

    preferences: {
      newsletter: { type: Boolean, default: false },
      smsNotifications: { type: Boolean, default: false },
      orderUpdates: { type: Boolean, default: true },
      promotionalEmails: { type: Boolean, default: false },
      preferredCategories: [
        {
          type: String,
          enum: ["living_room", "bedroom", "dining", "office", "outdoor", "storage", "decor"],
        },
      ],
    },

    googleId: { type: String, sparse: true },

    lastLogin: Date,
    loginCount: { type: Number, default: 0 },

    deactivatedAt: { type: Date, default: null },
    deactivationReason: { type: String, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });

userSchema.virtual("fullName").get(function () {
  if (this.firstName && this.lastName) return `${this.firstName} ${this.lastName}`;
  return this.firstName || null;
});



userSchema.methods.createMagicLinkToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.magicLinkToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  this.magicLinkExpires = Date.now() + 15 * 60 * 1000;
  return rawToken;
};



userSchema.methods.updateLoginActivity = function () {
  this.lastLogin = Date.now();
  this.loginCount += 1;
};

userSchema.statics.findActive = function () {
  return this.find({ isActive: true, deletedAt: null });
};

const User = mongoose.model("User", userSchema);
module.exports = User;