import { Router } from "express";
import * as notificationController from "../controllers/notification.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllAsRead);
router.patch("/:id/read", notificationController.markAsRead);

export default router;
