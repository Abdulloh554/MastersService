import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authLimiter } from "../middleware/rateLimiter";
import authMiddleware from "../middleware/auth.middleware";
import validate from "../middleware/validate.middleware";
import {
  registerSchema,
  loginSchema,
  updateRoleSchema,
} from "../validators/auth.validator";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  authController.register
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  authController.login
);

router.post("/refresh", authController.refreshTokens);

router.post("/logout", authController.logout);

router.patch(
  "/role",
  authMiddleware,
  validate(updateRoleSchema),
  authController.updateRole
);

export default router;
