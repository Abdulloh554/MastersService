import rateLimit from "express-rate-limit";
import { Request } from "express";

/**
 * Per-user rate limiter for AI endpoints, keyed by authenticated userId.
 * Limits AI spend per user per minute.
 */
export const createAIRateLimiter = (max: number, windowMinutes = 1) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    keyGenerator: (req: Request): string => {
      if (req.user?.userId) {
        return `ai:${req.user.userId}`;
      }
      return `ai:ip:${req.ip || "unknown"}`;
    },
    message: {
      success: false,
      message: "AI request limit reached, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

export const listingSuggestLimiter = createAIRateLimiter(5, 1);
export const supportChatLimiter = createAIRateLimiter(10, 1);
export const profileEnhanceLimiter = createAIRateLimiter(10, 1);
export const productGenerateLimiter = createAIRateLimiter(5, 1);
export const moderationLimiter = createAIRateLimiter(20, 1);
