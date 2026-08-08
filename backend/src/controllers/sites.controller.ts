import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../services/audit.service";
import { deleteFile } from "../services/storage.service";
import { assertSiteAccess } from "../lib/assertSiteAccess";

const CONSTRUCTION_STATUSES = ["planned", "in_progress", "completed"] as const;

const filesInclude = {
  files: { orderBy: [{ isCover: "desc" as const }, { createdAt: "desc" as const }] },
};

export async function listSites(_req: Request, res: Response) {
  const sites = await prisma.site.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } }, ...filesInclude },
  });
  res.json({ sites });
}

export async function getSite(req: Request, res: Response) {
  const site = await prisma.site.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, name: true, email: true } }, ...filesInclude },
  });
  if (!site) throw new HttpError(404, "Site not found");
  res.json({ site });
}

const siteFieldsSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  constructionStatus: z.enum(CONSTRUCTION_STATUSES).default("planned"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export async function createSite(req: Request, res: Response) {
  const data = siteFieldsSchema.parse(req.body);

  const site = await prisma.site.create({
    data: {
      userId: req.user!.id,
      name: data.name,
      address: data.address,
      constructionStatus: data.constructionStatus,
      latitude: data.latitude,
      longitude: data.longitude,
    },
    include: { user: { select: { id: true, name: true, email: true } }, ...filesInclude },
  });

  await recordAudit({
    actorId: req.user!.id,
    action: "CREATE_SITE",
    entityType: "SITE",
    entityId: site.id,
    metadata: { name: site.name },
    req,
  });

  res.status(201).json({ site });
}

export async function updateSite(req: Request, res: Response) {
  const existing = await prisma.site.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "Site not found");
  assertSiteAccess(req, existing);

  const data = siteFieldsSchema.parse(req.body);

  const site = await prisma.site.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      address: data.address,
      constructionStatus: data.constructionStatus,
      latitude: data.latitude ?? existing.latitude,
      longitude: data.longitude ?? existing.longitude,
    },
    include: { user: { select: { id: true, name: true, email: true } }, ...filesInclude },
  });

  await recordAudit({
    actorId: req.user!.id,
    action: "UPDATE_SITE",
    entityType: "SITE",
    entityId: site.id,
    metadata: { name: data.name },
    req,
  });

  res.json({ site });
}

export async function deleteSite(req: Request, res: Response) {
  const existing = await prisma.site.findUnique({
    where: { id: req.params.id },
    include: { files: true },
  });
  if (!existing) throw new HttpError(404, "Site not found");
  assertSiteAccess(req, existing);

  // Files are cascade-deleted in the DB by this call. A file uploaded in the race window
  // between the fetch above and this delete would be cascaded without its storage object
  // being cleaned up below — cleanupOrphanFiles' grace-period sweep is the backstop for that.
  await prisma.site.delete({ where: { id: existing.id } });
  await Promise.all(existing.files.map((file) => deleteFile(file.url).catch(() => {})));

  await recordAudit({
    actorId: req.user!.id,
    action: "DELETE_SITE",
    entityType: "SITE",
    entityId: existing.id,
    metadata: { name: existing.name },
    req,
  });

  res.status(204).send();
}
