import { Request, Response, NextFunction } from "express";
import { moderateContent, ModerationResult } from "../services/ai/moderation.service";

const HARD_BLOCK_CONFIDENCE = 0.8;
const REVIEW_CONFIDENCE_MIN = 0.5;

/**
 * Middleware that moderates content (text in req.body plus optional imageUrl)
 * before it is persisted by an Ad/Product/Review create-or-update endpoint.
 *
 * - isSafe=false && confidence > 0.8   -> hard reject (403) with reasons.
 * - confidence in [0.5, 0.8]           -> allowed but flagged pending_review
 *                                         (attached to req.moderatedResult).
 * - otherwise                          -> allowed (safe result attached).
 *
 * AI outages fall back to "safe/allow" so the platform never hard-blocks
 * content simply because the AI provider is down.
 */
export const moderationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  moderateContent(
    String(req.body?.description ?? req.body?.text ?? ""),
    req.body?.imageUrl as string | undefined
  )
    .then((result: ModerationResult) => {
      if (!result.isSafe && result.confidence > HARD_BLOCK_CONFIDENCE) {
        return res.status(403).json({
          success: false,
          message: "Content blocked by moderation",
          error: {
            categories: result.categories,
            confidence: result.confidence,
          },
        });
      }

      if (!result.isSafe && result.confidence >= REVIEW_CONFIDENCE_MIN) {
        req.moderatedResult = result;
      } else {
        req.moderatedResult = {
          isSafe: true,
          categories: [],
          confidence: 1,
        };
      }

      next();
    })
    .catch(() => {
      req.moderatedResult = { isSafe: true, categories: [], confidence: 1 };
      next();
    });
};
