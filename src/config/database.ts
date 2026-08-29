import mongoose from "mongoose";
import dns from "dns";
import { config } from "./index";
import logger from "./logger";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    logger.info("MongoDB connected successfully");
  } catch (err: any) {
    logger.error({ err }, "MongoDB connection error");
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    logger.error({ err }, "MongoDB connection error");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected. Attempting to reconnect...");
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected successfully");
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Closing MongoDB connection...`);
    await mongoose.connection.close();
    logger.info("MongoDB connection closed.");
    process.exit(0);
  };

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
};

export default connectDatabase;
