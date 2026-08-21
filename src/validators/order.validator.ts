import { z } from "zod";

export const updateOrderStatusSchema = z.object({
  status: z.enum(["in_progress", "completed", "cancelled"], {
    message: "Status must be in_progress, completed, or cancelled",
  }),
});
