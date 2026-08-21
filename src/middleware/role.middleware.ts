import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden("You do not have permission to access this resource")
      );
    }

    next();
  };
};

export default requireRole;
