import { z } from "zod";

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\+?(\d{9,15})$/, "Invalid phone number format"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
  role: z.enum(["client", "master", "seller"], {
    message: "Role must be client, master, or seller",
  }),
});

export const loginSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required"),
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, "Reset token is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
});

export const updateRoleSchema = z.object({
  role: z.enum(["client", "master", "seller"], {
    message: "Role must be client, master, or seller",
  }),
});
