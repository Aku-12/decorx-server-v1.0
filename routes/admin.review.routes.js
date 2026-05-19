const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  getReviewsQuerySchema,
  adminResponseSchema,
} = require("../validators/review.validator");

router.use(protect, restrictTo("admin"));

router.get(
  "/",
  validate(getReviewsQuerySchema, "query"),
  reviewController.getAllReviews
);
router.get("/:reviewId", reviewController.getReview);
router.post(
  "/:reviewId/response",
  validate(adminResponseSchema),
  reviewController.addAdminResponse
);
router.patch("/:reviewId/toggle-approval", reviewController.toggleApproval);
router.delete("/:reviewId", reviewController.deleteReview);

module.exports = router;
