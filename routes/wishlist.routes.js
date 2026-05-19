const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlist.controller");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", wishlistController.getWishlist);
router.post("/", wishlistController.addToWishlist);
router.get("/check/:productId", wishlistController.checkWishlist);
router.delete("/:productId", wishlistController.removeFromWishlist);
router.delete("/", wishlistController.clearWishlist);

module.exports = router;
