import type { Request, Response } from "express";
import { cleanupOrphanFiles } from "../jobs/cleanupOrphanFiles";

export async function runCleanupOrphans(_req: Request, res: Response) {
  const result = await cleanupOrphanFiles();
  res.json(result);
}
