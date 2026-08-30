import { z } from "zod";

export const registerTokenSchema = z.object({
  token: z
    .string()
    .min(1, "Push token is required")
    .max(400, "Push token is too long"),
  platform: z.enum(["ios", "android", "web"], {
    message: "Platform must be ios, android, or web",
  }),
  categoryIds: z
    .array(z.string().min(1))
    .max(100)
    .optional()
    .default([]),
});

export const updateCategoriesSchema = z.object({
  categoryIds: z
    .array(z.string().min(1, "Invalid category id"))
    .max(100, "Too many categories"),
});
