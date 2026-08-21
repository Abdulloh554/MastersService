import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import authMiddleware from "../middleware/auth.middleware";
import requireRole from "../middleware/role.middleware";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("admin"));

router.get("/dashboard", adminController.getDashboardStats);

router.get("/users", adminController.getAllUsers);

router.put("/users/:id/status", adminController.updateUserStatus);

router.delete("/users/:id", adminController.deleteUser);

router.get("/ads", adminController.getAllAds);

router.delete("/ads/:id", adminController.deleteAd);

router.get("/products", adminController.getAllProducts);

router.delete("/products/:id", adminController.deleteProduct);

router.get("/orders", adminController.getAllOrders);

router.get("/transactions", adminController.getAllTransactions);

router.get("/reports", adminController.getReports);

router.get("/categories", adminController.getCategories);

router.post("/categories", adminController.createCategory);

router.put("/categories/:id", adminController.updateCategory);

router.delete("/categories/:id", adminController.deleteCategory);

export default router;
