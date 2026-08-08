import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

export function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const provided = req.get("x-cron-secret") ?? req.query.secret;
  if (provided !== env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
