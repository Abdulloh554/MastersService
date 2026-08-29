import { Router } from "express";
import * as reviewController from "../controllers/review.controller";
import authMiddleware from "../middleware/auth.middleware";
import validate from "../middleware/validate.middleware";
import { createReviewSchema } from "../validators/review.validator";
import { moderationMiddleware } from "../middleware/contentModeration";

const router = Router();

router.post(
  "/",
  authMiddleware,
  validate(createReviewSchema),
  moderationMiddleware,
  reviewController.createReview
);

router.get("/user/:userId", reviewController.getReviewsForUser);

export default router;
