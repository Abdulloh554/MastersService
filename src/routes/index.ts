import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import adRoutes from "./ad.routes";
import orderRoutes from "./order.routes";
import productRoutes from "./product.routes";
import favoriteRoutes from "./favorite.routes";
import transactionRoutes from "./transaction.routes";
import adminRoutes from "./admin.routes";
import categoryRoutes from "./category.routes";
import notificationRoutes from "./notification.routes";
import aiRoutes from "./ai.routes";
import reviewRoutes from "./review.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/ads", adRoutes);
router.use("/orders", orderRoutes);
router.use("/products", productRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/transactions", transactionRoutes);
router.use("/admin", adminRoutes);
router.use("/categories", categoryRoutes);
router.use("/notifications", notificationRoutes);
router.use("/ai", aiRoutes);
router.use("/reviews", reviewRoutes);

export default router;
