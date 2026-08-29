import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = [
  "PORT",
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
  "BCRYPT_SALT_ROUNDS",
  "NODE_ENV",
  "CLIENT_URL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT!, 10),
  mongodbUri: process.env.MONGODB_URI!,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN!,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN!,
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS!, 10),
  nodeEnv: process.env.NODE_ENV!,
  clientUrl: process.env.CLIENT_URL!,
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
  ai: {
    groqApiKeys: (process.env.GROQ_API_KEYS || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean),
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    visionModel:
      process.env.GROQ_VISION_MODEL || "llama-3.2-11b-vision-preview",
    timeoutMs: parseInt(process.env.GROQ_TIMEOUT_MS || "30000", 10),
    maxRetries: parseInt(process.env.GROQ_MAX_RETRIES || "2", 10),
    enabled: Boolean(
      (process.env.GROQ_API_KEYS || "").split(",").filter((k) => k.trim()).length
    ),
  },
};
