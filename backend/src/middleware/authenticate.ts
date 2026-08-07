import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "../services/auth.service";
import { findUserById } from "../services/user.service";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "sitetracker_session";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = verifySessionToken(token);
    const user = await findUserById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Session expired, please log in again" });
  }
}
