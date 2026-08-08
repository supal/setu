import { Router } from "express";
import * as cronController from "../controllers/cron.controller";
import { requireCronSecret } from "../middleware/requireCronSecret";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.post("/cleanup-orphans", requireCronSecret, asyncHandler(cronController.runCleanupOrphans));

export default router;
