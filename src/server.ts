import app from "./app";
import { config } from "./config";
import connectDatabase from "./config/database";
import logger from "./config/logger";

const startServer = async () => {
  try {
    await connectDatabase();

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
