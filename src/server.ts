import app from "./app";
import { config } from "./config";
import connectDatabase from "./config/database";
import logger from "./config/logger";
import { startFraudDetectionJob } from "./jobs/fraudDetection.job";

const startServer = async () => {
  try {
    await connectDatabase();

    if (config.ai.enabled) {
      startFraudDetectionJob();
    }

    app.listen(config.port, () => {
      logger.info(
        `Server running on port ${config.port} in ${config.nodeEnv} mode`
      );
    });
  } catch (err: any) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
