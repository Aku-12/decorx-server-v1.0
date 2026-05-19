const express = require("express");
const router = express.Router();
const promotionController = require("../controllers/promotion.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createPromotionSchema,
  updatePromotionSchema,
  schedulePromotionSchema,
  trackEngagementSchema,
  previewPromotionSchema,
  getPromotionsQuerySchema,
} = require("../validators/promotion.validator");

router.use(protect);

router.post(
  "/track",
  validate(trackEngagementSchema),
  promotionController.trackEngagement
);
router.use(restrictTo("admin"));
router.get(
  "/",
  validate(getPromotionsQuerySchema, "query"),
  promotionController.getAllPromotions
);
router.post(
  "/preview",
  validate(previewPromotionSchema),
  promotionController.previewPromotion
);
router.post(
  "/",
  validate(createPromotionSchema),
  promotionController.createPromotion
);
router.get("/:id", promotionController.getPromotion);
router.patch(
  "/:id",
  validate(updatePromotionSchema),
  promotionController.updatePromotion
);
router.delete("/:id", promotionController.deletePromotion);
router.post("/:id/send", promotionController.sendPromotion);
router.post(
  "/:id/schedule",
  validate(schedulePromotionSchema),
  promotionController.schedulePromotion
);
router.post("/:id/cancel", promotionController.cancelPromotion);
router.get("/:id/analytics", promotionController.getPromotionAnalytics);

module.exports = router;
