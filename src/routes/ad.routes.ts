import { Router } from "express";
import * as adController from "../controllers/ad.controller";
import authMiddleware from "../middleware/auth.middleware";
import requireRole from "../middleware/role.middleware";
import validate from "../middleware/validate.middleware";
import { createAdSchema, updateAdSchema } from "../validators/ad.validator";

const router = Router();

router.post(
  "/",
  authMiddleware,
  requireRole("client"),
  validate(createAdSchema),
  adController.createAd
);

router.get("/", adController.getAds);

router.get("/my", authMiddleware, adController.getMyAds);

router.get("/:id", adController.getAdById);

router.put(
  "/:id",
  authMiddleware,
  requireRole("client"),
  validate(updateAdSchema),
  adController.updateAd
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("client"),
  adController.deleteAd
);

router.post(
  "/:id/accept",
  authMiddleware,
  requireRole("master"),
  adController.acceptAd
);

router.post(
  "/:id/complete",
  authMiddleware,
  requireRole("master", "client"),
  adController.completeAd
);

router.post(
  "/:id/cancel",
  authMiddleware,
  requireRole("master", "client"),
  adController.cancelAd
);

export default router;
