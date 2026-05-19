const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cart.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", cartController.getCart);
router.post("/", cartController.addToCart);
router.patch("/items/:itemId", cartController.updateCartItem);
router.delete("/items/:itemId", cartController.removeFromCart);
router.delete("/", cartController.clearCart);

module.exports = router;
