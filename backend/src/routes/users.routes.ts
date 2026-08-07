import { Router } from "express";
import * as usersController from "../controllers/users.controller";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/requirePermission";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

router.use(authenticate, requirePermission("MANAGE_USERS"));

router.get("/", asyncHandler(usersController.listUsers));
router.post("/", asyncHandler(usersController.createUser));
router.get("/:id", asyncHandler(usersController.getUser));
router.put("/:id", asyncHandler(usersController.updateUser));
router.delete("/:id", asyncHandler(usersController.deleteUser));

export default router;
