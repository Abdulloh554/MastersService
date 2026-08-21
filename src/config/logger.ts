import pino from "pino";
import { config } from "./index";

const logger = pino({
  level: config.isDevelopment ? "debug" : "info",
  transport: config.isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:dd-mm-yyyy HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export default logger;
