import { Request, Response, NextFunction } from "express";
import * as transactionService from "../services/transaction.service";

export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit } = req.query;
    const result = await transactionService.getTransactions(
      req.user!.userId,
      Number(page) || 1,
      Number(limit) || 20
    );

    res.status(200).json({
      success: true,
      message: "Transactions retrieved successfully",
      data: result.transactions,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getBalance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const balance = await transactionService.getBalance(req.user!.userId);

    res.status(200).json({
      success: true,
      message: "Balance retrieved successfully",
      data: balance,
    });
  } catch (error) {
    next(error);
  }
};
