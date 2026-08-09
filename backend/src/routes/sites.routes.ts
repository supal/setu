import { Router } from "express";
import multer from "multer";
import * as sitesController from "../controllers/sites.controller";
import * as filesController from "../controllers/files.controller";
import { authenticate } from "../middleware/authenticate";
import { requirePermission } from "../middleware/requirePermission";
import { asyncHandler } from "../lib/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { ALLOWED_FILE_MIME_TYPES } from "../lib/allowedFileTypes";

const upload = multer({
  storage: multer.memoryStorage(),
  // Images are compressed to well under this client-side before upload; documents aren't
  // compressed at all, so this is sized for an uncompressed document, not a photo.
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!(ALLOWED_FILE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(new HttpError(400, "This file type isn't allowed"));
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

router.post("/:id/files", upload.single("file"), asyncHandler(filesController.uploadFile));
router.delete("/:id/files/:fileId", asyncHandler(filesController.deleteFile));

export default router;
