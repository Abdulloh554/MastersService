import cron from "node-cron";
import logger from "../config/logger";
import { runFraudDetection } from "../services/ai/fraud.service";

export const startFraudDetectionJob = (): void => {
  cron.schedule("0 */6 * * *", async () => {
    try {
      const flagged = await runFraudDetection(24);
      logger.info({ flagged }, "Fraud detection job completed");
    } catch (error) {
      logger.error({ err: error }, "Fraud detection job failed");
    }
  });
  logger.info("Fraud detection job scheduled (every 6h)");
};
