import { Router } from "express";
import * as favoriteController from "../controllers/favorite.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = Router();

router.post("/", authMiddleware, favoriteController.addFavorite);

router.delete(
  "/:targetType/:targetId",
  authMiddleware,
  favoriteController.removeFavorite
);

router.get("/", authMiddleware, favoriteController.getFavorites);

export default router;
