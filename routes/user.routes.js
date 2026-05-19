const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// All routes here are admin only
router.use(protect, restrictTo("admin"));

router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUser);
router.patch("/:id/status", userController.updateUserStatus);
router.patch("/:id/reset-password", userController.adminResetPassword);
router.delete("/:id", userController.deleteUser);

module.exports = router;
