import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/helpers";
import { AppError } from "../utils/AppError";
import { UserRole } from "../types/user.types";

const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized("No token provided");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw AppError.unauthorized("No token provided");
    }

    const decoded = verifyAccessToken(token);

    req.user = {
      userId: decoded.userId,
      role: decoded.role as UserRole,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(AppError.unauthorized("Invalid or expired token"));
  }
};

export default authMiddleware;
