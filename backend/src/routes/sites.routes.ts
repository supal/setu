import { Router } from "express";
import multer from "multer";
import * as sitesController from "../controllers/sites.controller";
import * as filesController from "../controllers/files.controller";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/requirePermission";
import { asyncHandler } from "../lib/asyncHandler";
import { HttpError } from "../middleware/errorHandler";

const upload = multer({
  storage: multer.memoryStorage(),
  // Client compresses to well under this before upload — this is a server-side backstop,
  // not the primary size control.
  limits: { fileSize: 2 * 1024 * 1024 },
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
router.post("/", requirePermission("ADD_SITE"), asyncHandler(sitesController.createSite));
router.put("/:id", asyncHandler(sitesController.updateSite));
router.delete("/:id", asyncHandler(sitesController.deleteSite));

router.post("/:id/files", upload.single("image"), asyncHandler(filesController.uploadFile));
router.delete("/:id/files/:fileId", asyncHandler(filesController.deleteFile));

export default router;
