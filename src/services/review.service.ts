import Review from "../models/Review";
import { AppError } from "../utils/AppError";
import { analyzeReview } from "./ai/reviewSentiment.service";
import { enqueueModeration } from "./ai/moderation.service";

export interface CreateReviewInput {
  authorId: string;
  targetUserId: string;
  rating: number;
  text: string;
}

export const createReview = async (input: CreateReviewInput) => {
  const existing = await Review.findOne({
    authorId: input.authorId,
    targetUserId: input.targetUserId,
  });
  if (existing) {
    throw AppError.conflict("You have already reviewed this user");
  }

  const review = await Review.create({
    authorId: input.authorId,
    targetUserId: input.targetUserId,
    rating: input.rating,
    text: input.text,
    sentimentScore: 0,
    isSuspicious: false,
    sentimentReasons: [],
  });

  // Async, best-effort sentiment analysis (does not block response).
  analyzeAndUpdateReview(review.id, input.authorId, input.rating, input.text).catch(
    () => undefined
  );

  return review;
};

async function analyzeAndUpdateReview(
  reviewId: string,
  authorId: string,
  rating: number,
  text: string
): Promise<void> {
  const [count, avg] = await Promise.all([
    Review.countDocuments({ authorId }),
    Review.aggregate([
      { $match: { authorId } },
      { $group: { _id: null, avg: { $avg: "$rating" } } },
    ]),
  ]);

  const analysis = await analyzeReview({
    text,
    rating,
    reviewCount: count,
    avgRating: avg[0]?.avg ?? rating,
  });

  await Review.updateOne(
    { _id: reviewId },
    {
      sentimentScore: analysis.sentimentScore,
      isSuspicious: analysis.isSuspicious,
      sentimentReasons: analysis.reasons,
    }
  );

  if (analysis.isSuspicious) {
    await enqueueModeration({
      entityType: "Review",
      entityId: reviewId,
      result: {
        isSafe: false,
        categories: ["spam"],
        confidence: 0.9,
      },
    });
  }
}

/**
 * Returns a target user's reviews plus an average rating. Suspicious reviews
 * are still returned (kept visible) but are EXCLUDED from the average.
 */
export const getReviewsForUser = async (targetUserId: string) => {
  const reviews = await Review.find({ targetUserId })
    .sort({ createdAt: -1 })
    .lean();

  const trusted = reviews.filter((r) => !r.isSuspicious);
  const averageRating =
    trusted.length > 0
      ? trusted.reduce((sum, r) => sum + r.rating, 0) / trusted.length
      : 0;

  return {
    reviews,
    averageRating: Math.round(averageRating * 10) / 10,
    reviewedCount: trusted.length,
  };
};
