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

  const isImage = req.file.mimetype.startsWith("image/");
  const url = await uploadToStorage(req.file.buffer, req.file.originalname, req.file.mimetype);
  const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : undefined;

  // The first image uploaded to a site becomes its cover/thumbnail automatically — never a
  // non-image file, and never a second image while one's already set.
  const isCover =
    isImage && (await prisma.file.count({ where: { siteId: site.id, isCover: true } })) === 0;

  const file = await prisma.file.create({
    data: {
      siteId: site.id,
      url,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      isCover,
      metadata,
    },
  });

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

  if (file.isCover) {
    const nextCover = await prisma.file.findFirst({
      where: { siteId: site.id, mimeType: { startsWith: "image/" } },
      orderBy: { createdAt: "desc" },
    });
    if (nextCover) await prisma.file.update({ where: { id: nextCover.id }, data: { isCover: true } });
  }

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
