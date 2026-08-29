import { Router } from "express";
import * as productController from "../controllers/product.controller";
import authMiddleware from "../middleware/auth.middleware";
import requireRole from "../middleware/role.middleware";
import validate from "../middleware/validate.middleware";
import { publicReadLimiter } from "../middleware/rateLimiter";
import { moderationMiddleware } from "../middleware/contentModeration";
import { createProductSchema, updateProductSchema } from "../validators/product.validator";

const router = Router();

router.post(
  "/",
  authMiddleware,
  requireRole("seller"),
  validate(createProductSchema),
  moderationMiddleware,
  productController.createProduct
);

router.get("/", publicReadLimiter, productController.getProducts);

router.get("/seller/me", authMiddleware, requireRole("seller"), productController.getSellerProducts);

router.get("/:id", publicReadLimiter, productController.getProductById);

router.put(
  "/:id",
  authMiddleware,
  requireRole("seller"),
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("seller"),
  productController.deleteProduct
);

router.post(
  "/:id/checkout",
  authMiddleware,
  requireRole("client", "master", "seller"),
  productController.checkoutProduct
);

export default router;
