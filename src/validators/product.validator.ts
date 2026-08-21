import { z } from "zod";

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(200, "Product name must be less than 200 characters"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description must be less than 2000 characters"),
  category: z
    .string()
    .min(1, "Category is required"),
  price: z
    .number()
    .min(0, "Price must be a positive number"),
  stock: z
    .number()
    .min(0, "Stock must be a positive number")
    .int("Stock must be an integer"),
  images: z
    .array(z.string())
    .optional()
    .default([]),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .max(200, "Product name must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
  category: z.string().optional(),
  price: z
    .number()
    .min(0, "Price must be a positive number")
    .optional(),
  stock: z
    .number()
    .min(0, "Stock must be a positive number")
    .int("Stock must be an integer")
    .optional(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});
