import { z } from "zod";

export const createAdSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description must be less than 2000 characters"),
  category: z
    .string()
    .min(1, "Category is required"),
  budget: z
    .number()
    .min(0, "Budget must be a positive number")
    .optional()
    .default(0),
  images: z
    .array(z.string())
    .optional()
    .default([]),
  location: z.object({
    address: z.string().optional().default(''),
    lat: z.number().optional().default(41.311081),
    lng: z.number().optional().default(69.240562),
  }).optional().default({ address: '', lat: 41.311081, lng: 69.240562 }),
});

export const updateAdSchema = z.object({
  title: z
    .string()
    .max(200, "Title must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
  category: z.string().optional(),
  budget: z
    .number()
    .min(0, "Budget must be a positive number")
    .optional(),
  images: z.array(z.string()).optional(),
  location: z
    .object({
      address: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
});
