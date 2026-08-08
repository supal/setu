import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../services/audit.service";
import { deleteFile as deleteFromStorage, uploadFile as uploadToStorage } from "../services/storage.service";
import { assertSiteAccess } from "../lib/assertSiteAccess";

export async function uploadFile(req: Request, res: Response) {
  const site = await prisma.site.findUnique({ where: { id: req.params.id } });
  if (!site) throw new HttpError(404, "Site not found");
  assertSiteAccess(req, site);

  if (!req.file) throw new HttpError(400, "No file provided");

  const url = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype);
  const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : undefined;

  const file = await prisma.file.create({ data: { siteId: site.id, url, metadata } });

  await recordAudit({
    actorId: req.user!.id,
    action: "ADD_FILE",
    entityType: "SITE",
    entityId: site.id,
    metadata: { fileId: file.id },
    req,
  });

  res.status(201).json({ file });
}

export async function deleteFile(req: Request, res: Response) {
  const site = await prisma.site.findUnique({ where: { id: req.params.id } });
  if (!site) throw new HttpError(404, "Site not found");
  assertSiteAccess(req, site);

  const file = await prisma.file.findFirst({ where: { id: req.params.fileId, siteId: site.id } });
  if (!file) throw new HttpError(404, "File not found");

  await prisma.file.delete({ where: { id: file.id } });
  await deleteFromStorage(file.url).catch(() => {});

  await recordAudit({
    actorId: req.user!.id,
    action: "DELETE_FILE",
    entityType: "SITE",
    entityId: site.id,
    metadata: { fileId: file.id },
    req,
  });

  res.status(204).send();
}
