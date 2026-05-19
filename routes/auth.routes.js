const express = require("express");
const router = express.Router();
const passport = require("passport");
const authController = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

// Magic Link Authentication
router.post("/send-magic-link", authController.sendMagicLink);
router.post("/verify-magic-link", authController.verifyMagicLink);

// Password-based authentication
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.patch("/reset-password/:token", authController.resetPassword);
router.patch("/set-password", protect, authController.setPassword);

router.get("/me", protect, authController.getMe);
router.patch("/update-password", protect, authController.updatePassword);
router.post("/logout", authController.logout);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  authController.googleCallback,
);

module.exports = router;
