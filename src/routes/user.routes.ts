import { Router } from "express";
import * as userController from "../controllers/user.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = Router();

router.get("/me", authMiddleware, userController.getProfile);

router.put("/me", authMiddleware, userController.updateProfile);

router.put("/me/avatar", authMiddleware, userController.updateAvatar);

router.put("/me/language", authMiddleware, userController.updateLanguage);

router.put("/me/theme", authMiddleware, userController.updateTheme);

router.get("/master/:id", authMiddleware, userController.getMasterProfile);

export default router;
