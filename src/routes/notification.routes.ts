import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import authMiddleware from "../middleware/auth.middleware";
import validate from "../middleware/validate.middleware";
import {
  registerTokenSchema,
  updateCategoriesSchema,
} from "../validators/notification.validator";

const router = Router();

router.use(authMiddleware);

router.post(
  "/register-token",
  validate(registerTokenSchema),
  notificationController.registerToken
);

router.patch(
  "/update-categories",
  validate(updateCategoriesSchema),
  notificationController.updateCategories
);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);

export default router;
