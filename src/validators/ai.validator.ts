import { z } from "zod";

const SUPPORTED_LANGUAGES = ["uz", "ru", "en"] as const;

export const listingSuggestSchema = z.object({
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
  imageUrl: z.string().url("imageUrl must be a valid URL").optional(),
  language: z.enum(SUPPORTED_LANGUAGES).default("uz"),
});

export const supportChatSchema = z.object({
  message: z
    .string()
    .min(1, "Message is required")
    .max(500, "Message must be less than 500 characters"),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(10)
    .default([]),
  language: z.enum(SUPPORTED_LANGUAGES).default("uz"),
});

export const profileEnhanceSchema = z.object({
  rawText: z
    .string()
    .min(10, "Text must be at least 10 characters")
    .max(500, "Text must be less than 500 characters"),
  sourceLanguage: z.enum(SUPPORTED_LANGUAGES).default("uz"),
});

export const productGenerateSchema = z.object({
  productName: z
    .string()
    .min(1, "Product name is required")
    .max(200, "Product name must be less than 200 characters"),
  imageUrls: z
    .array(z.string().url("Each image URL must be valid"))
    .max(5, "At most 5 images are allowed")
    .default([]),
  categoryHint: z.string().max(200).optional(),
});

export type ListingSuggestInput = z.infer<typeof listingSuggestSchema>;
export type SupportChatInput = z.infer<typeof supportChatSchema>;
export type ProfileEnhanceInput = z.infer<typeof profileEnhanceSchema>;
export type ProductGenerateInput = z.infer<typeof productGenerateSchema>;
