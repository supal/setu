import type { Request } from "express";
import { HttpError } from "../middleware/errorHandler";

export function assertSiteAccess(req: Request, site: { userId: string }) {
  if (req.user!.role !== "ADMIN" && site.userId !== req.user!.id) {
    throw new HttpError(403, "You don't have access to this site");
  }
}
