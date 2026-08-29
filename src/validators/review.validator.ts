import { z } from "zod";

export const createReviewSchema = z.object({
  targetUserId: z.string().min(1, "Target user is required"),
  rating: z
    .number()
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  text: z
    .string()
    .min(1, "Review text is required")
    .max(2000, "Review text must be less than 2000 characters"),
});
