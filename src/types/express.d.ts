import { UserRole } from "./user.types";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: UserRole;
      };
      moderatedResult?: {
        isSafe: boolean;
        categories: string[];
        confidence: number;
      };
    }
  }
}
