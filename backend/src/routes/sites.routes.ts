import { Router } from "express";
import multer from "multer";
import * as sitesController from "../controllers/sites.controller";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/requirePermission";
import { asyncHandler } from "../lib/asyncHandler";
import { HttpError } from "../middleware/errorHandler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new HttpError(400, "Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(sitesController.listSites));
router.get("/:id", asyncHandler(sitesController.getSite));
router.post("/", requirePermission("ADD_SITE"), upload.single("image"), asyncHandler(sitesController.createSite));
router.put("/:id", upload.single("image"), asyncHandler(sitesController.updateSite));
router.delete("/:id", asyncHandler(sitesController.deleteSite));

export default router;
