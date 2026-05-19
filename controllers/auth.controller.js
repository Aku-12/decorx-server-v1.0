const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const {
  sendMagicLinkEmail,
  sendPasswordResetEmail,
} = require("../services/email.service");

const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

const attachTokenCookie = (res, token) => {
  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() +
        (Number(process.env.JWT_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
};

const sendAuthResponse = (user, statusCode, res) => {
  const token = signToken(user);
  attachTokenCookie(res, token);
  user.password = undefined;
  res.status(statusCode).json({ status: "success", token, data: { user } });
};

exports.sendMagicLink = async (req, res) => {
  try {
    const { email, fullName } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ status: "fail", message: "Email is required" });
    }

    let user = await User.findOne({ email, deletedAt: null });

    if (user && !user.isActive) {
      return res.status(403).json({
        status: "fail",
        message: "This account has been deactivated. Please contact support.",
      });
    }

    if (!user) {
      // Create user with fullName if provided
      let firstName = "";
      let lastName = "";
      if (fullName) {
        const parts = fullName.trim().split(/\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      }
      user = new User({ email, firstName, lastName });
    } else if (fullName && !user.firstName && !user.lastName) {
      // Extra step: if user exists but has no name (maybe partial setup), update it
      const parts = fullName.trim().split(/\s+/);
      user.firstName = parts[0];
      user.lastName = parts.slice(1).join(" ");
    }

    const rawToken = user.createMagicLinkToken();
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: "success",
      message: "Sign-in link sent to your email. It expires in 15 minutes.",
    });

    const magicLink = `${process.env.FRONTEND_URL}/auth/verify?token=${rawToken}`;
    sendMagicLinkEmail(email, magicLink).catch((err) =>
      console.error(`[email] Magic link failed for ${email}: ${err.message}`),
    );
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res
        .status(400)
        .json({ status: "fail", message: "Token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      magicLinkToken: hashedToken,
      magicLinkExpires: { $gt: Date.now() },
      deletedAt: null,
    }).select("+magicLinkToken +magicLinkExpires");

    if (!user) {
      return res.status(400).json({
        status: "fail",
        message:
          "This link is invalid or has expired. Please request a new one.",
      });
    }

    user.isEmailVerified = true;
    user.magicLinkToken = undefined;
    user.magicLinkExpires = undefined;
    user.updateLoginActivity();
    await user.save({ validateBeforeSave: false });

    sendAuthResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: "fail", message: "Email and password are required" });
    }

    const user = await User.findOne({ email, deletedAt: null }).select(
      "+password",
    );

    if (
      !user ||
      !user.password ||
      !(await user.correctPassword(password, user.password))
    ) {
      return res
        .status(401)
        .json({ status: "fail", message: "Invalid email or password" });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({
        status: "fail",
        message:
          "Please verify your email first. Check your inbox for a sign-in link.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: "fail",
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    user.updateLoginActivity();
    await user.save({ validateBeforeSave: false });

    sendAuthResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const VAGUE_OK = {
      status: "success",
      message: "If that email is registered, a reset link has been sent.",
    };

    const user = await User.findOne({ email, deletedAt: null });

    if (!user || !user.isEmailVerified) {
      return res.status(200).json(VAGUE_OK);
    }

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    res.status(200).json(VAGUE_OK);

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;
    sendPasswordResetEmail(user.email, user.firstName, resetURL).catch((err) =>
      console.error(
        `[email] Password reset failed for ${user.email}: ${err.message}`,
      ),
    );
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: "fail",
        message: "This reset link is invalid or has expired.",
      });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendAuthResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select("+password");

    if (!user.password) {
      return res.status(400).json({
        status: "fail",
        message: "No password set on this account. Use /set-password first.",
      });
    }

    if (!(await user.correctPassword(currentPassword, user.password))) {
      return res
        .status(401)
        .json({ status: "fail", message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    sendAuthResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.setPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res
        .status(400)
        .json({ status: "fail", message: "Password is required" });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (user.password) {
      return res.status(400).json({
        status: "fail",
        message: "Password already set. Use /update-password to change it.",
      });
    }

    user.password = password;
    await user.save();

    sendAuthResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.googleCallback = (req, res) => {
  const token = signToken(req.user);
  attachTokenCookie(res, token);
  res.redirect(`${process.env.FRONTEND_URL}/auth/success`);
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ status: "success", data: { user } });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.logout = (_req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res
    .status(200)
    .json({ status: "success", message: "Logged out successfully" });
};
