import { defineConfig } from "vitest/config";

process.env.PORT = process.env.PORT || "5000";
process.env.MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/masterservice_test";
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test_access";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh";
process.env.JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
process.env.BCRYPT_SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS || "12";
process.env.NODE_ENV = "test";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test";
process.env.GROQ_API_KEYS = process.env.GROQ_API_KEYS || "test_key";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: true,
  },
});
