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
    .min(0, "Budget must be a positive number"),
  images: z
    .array(z.string())
    .optional()
    .default([]),
  location: z.object({
    address: z.string().min(1, "Address is required"),
    lat: z.number(),
    lng: z.number(),
  }),
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
      address: z.string().min(1, "Address is required"),
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});
