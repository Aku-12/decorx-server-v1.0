const express = require("express");
const router = express.Router({ mergeParams: true }); // mergeParams to access productId from parent router
const reviewController = require("../controllers/review.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createReviewSchema,
  updateReviewSchema,
  getReviewsQuerySchema,
  adminResponseSchema,
} = require("../validators/review.validator");

router.get(
  "/",
  validate(getReviewsQuerySchema, "query"),
  reviewController.getProductReviews
);
router.use(protect);
router.get("/my-review", reviewController.getUserReview);
router.get("/can-review", reviewController.canReview);
router.post("/", validate(createReviewSchema), reviewController.createReview);
router.patch(
  "/:reviewId",
  validate(updateReviewSchema),
  reviewController.updateReview
);
router.delete("/:reviewId", reviewController.deleteReview);
router.post("/:reviewId/helpful", reviewController.markHelpful);
router.use(restrictTo("admin"));
router.post(
  "/:reviewId/response",
  validate(adminResponseSchema),
  reviewController.addAdminResponse
);
router.patch("/:reviewId/toggle-approval", reviewController.toggleApproval);

module.exports = router;
