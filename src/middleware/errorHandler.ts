import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { config } from "../config";
import logger from "../config/logger";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(config.isDevelopment && { stack: err.stack }),
    });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  if (err.name === "CastError" && "kind" in err && err.kind === "ObjectId") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  if (err.name === "ValidationError" && "errors" in err) {
    const validationErrors = Object.values(
      err.errors
    ).map((e: any) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation error",
      error: validationErrors,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      success: false,
      message: `Duplicate value for field: ${field}`,
    });
  }

  logger.error({ err }, "Unhandled error");

  return res.status(500).json({
    success: false,
    message: config.isDevelopment ? err.message : "Internal server error",
    ...(config.isDevelopment && { stack: err.stack }),
  });
};

export default errorHandler;
