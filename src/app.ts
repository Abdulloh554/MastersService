import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config";
import routes from "./routes";
import { generalLimiter } from "./middleware/rateLimiter";
import requestLogger from "./middleware/requestLogger";
import errorHandler from "./middleware/errorHandler";
import noSqlSanitizer from "./middleware/sanitize";
import { perfProfiler } from "./middleware/perfProfiler.middleware";

const app = express();

// Vaqtinchalik perf profiler — eng birinchi middleware (peri udit uchun).
app.use(perfProfiler);

// Express 5: req.ip (rate limiting, audit) reverse-proxy (Render/NGINX)
// orqasida ham to'g'ri ishlashi uchun trust proxy yoqiladi. Faqat bitta hop.
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(noSqlSanitizer);

app.use(generalLimiter);
app.use(requestLogger);

app.use("/api", routes);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("{*splat}", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

app.use(errorHandler);

export default app;
