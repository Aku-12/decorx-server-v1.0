const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contact.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

// Public route - submit contact form
router.post("/", contactController.submitContact);

// Admin routes
router.use(protect, restrictTo("admin"));

router.get("/", contactController.getAllContacts);
router.get("/stats", contactController.getContactStats);
router.get("/:id", contactController.getContact);
router.patch("/:id", contactController.updateContact);
router.patch("/:id/read", contactController.markAsRead);
router.post("/:id/respond", contactController.respondToContact);
router.delete("/:id", contactController.deleteContact);
router.patch("/bulk/update", contactController.bulkUpdateContacts);

module.exports = router;
