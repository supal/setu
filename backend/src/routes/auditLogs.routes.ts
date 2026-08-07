import { Router } from "express";
import * as auditLogsController from "../controllers/auditLogs.controller";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/requirePermission";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.use(authenticate, requirePermission("VIEW_AUDIT_LOG"));

router.get("/", asyncHandler(auditLogsController.listAuditLogs));

export default router;
