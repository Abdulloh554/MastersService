import { Router } from "express";
import { getCategories } from "../controllers/category.controller";
import { publicReadLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/", publicReadLimiter, getCategories);

export default router;
