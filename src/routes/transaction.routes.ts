import { Router } from "express";
import * as transactionController from "../controllers/transaction.controller";
import authMiddleware from "../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, transactionController.getTransactions);

router.get("/balance", authMiddleware, transactionController.getBalance);

export default router;
