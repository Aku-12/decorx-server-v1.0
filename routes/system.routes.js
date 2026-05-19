const express = require("express");
const router = express.Router();
const systemController = require("../controllers/system.controller");

// Public route to get server info (used for AR QR codes in development)
router.get("/info", systemController.getSystemInfo);

module.exports = router;
