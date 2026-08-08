import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "node:path";
import { env, isProduction } from "./config/env";
import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import sitesRoutes from "./routes/sites.routes";
import auditLogsRoutes from "./routes/auditLogs.routes";
import cronRoutes from "./routes/cron.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  // Render (and most PaaS) sit behind a reverse proxy — needed for req.ip / audit logging to see the real client IP.
  if (isProduction) app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      allowedHeaders: ["Content-Type"],
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/cron", cronRoutes);

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/sites", sitesRoutes);
  app.use("/api/audit-logs", auditLogsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
