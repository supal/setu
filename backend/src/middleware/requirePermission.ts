import type { NextFunction, Request, Response } from "express";
import { hasPermission, type Permission } from "../lib/permissions";

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
