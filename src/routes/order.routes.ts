import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import authMiddleware from "../middleware/auth.middleware";
import requireRole from "../middleware/role.middleware";
import validate from "../middleware/validate.middleware";
import { updateOrderStatusSchema } from "../validators/order.validator";

const router = Router();

router.get("/", authMiddleware, orderController.getOrders);

router.get("/:id", authMiddleware, orderController.getOrderById);

router.put(
  "/:id/status",
  authMiddleware,
  requireRole("master", "client", "admin"),
  validate(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

export default router;
