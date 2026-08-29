import { Router } from "express";
import * as aiController from "../controllers/ai.controller";
import authMiddleware from "../middleware/auth.middleware";
import validate from "../middleware/validate.middleware";
import {
  listingSuggestSchema,
  supportChatSchema,
  profileEnhanceSchema,
  productGenerateSchema,
} from "../validators/ai.validator";
import {
  listingSuggestLimiter,
  supportChatLimiter,
  profileEnhanceLimiter,
  productGenerateLimiter,
} from "../middleware/aiRateLimiter";

const router = Router();

router.use(authMiddleware);

router.post(
  "/listing-suggest",
  listingSuggestLimiter,
  validate(listingSuggestSchema),
  aiController.listingSuggest
);

router.post(
  "/support-chat",
  supportChatLimiter,
  validate(supportChatSchema),
  aiController.supportChat
);

router.post(
  "/profile-enhance",
  profileEnhanceLimiter,
  validate(profileEnhanceSchema),
  aiController.profileEnhance
);

router.post(
  "/product-generate",
  productGenerateLimiter,
  validate(productGenerateSchema),
  aiController.productGenerate
);

export default router;
