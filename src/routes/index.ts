import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import adRoutes from "./ad.routes";
import orderRoutes from "./order.routes";
import productRoutes from "./product.routes";
import favoriteRoutes from "./favorite.routes";
import transactionRoutes from "./transaction.routes";
import adminRoutes from "./admin.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/ads", adRoutes);
router.use("/orders", orderRoutes);
router.use("/products", productRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/transactions", transactionRoutes);
router.use("/admin", adminRoutes);

export default router;
