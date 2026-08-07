import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../services/audit.service";
import { deleteFile, uploadFile } from "../services/storage.service";

const CONSTRUCTION_STATUSES = ["planned", "in_progress", "completed"] as const;

function assertAccess(req: Request, site: { userId: string }) {
  if (req.user!.role !== "ADMIN" && site.userId !== req.user!.id) {
    throw new HttpError(403, "You don't have access to this site");
  }
}

export async function listSites(req: Request, res: Response) {
  const where = req.user!.role === "ADMIN" ? {} : { userId: req.user!.id };
  const sites = await prisma.site.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json({ sites });
}

export async function getSite(req: Request, res: Response) {
  const site = await prisma.site.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!site) throw new HttpError(404, "Site not found");
  assertAccess(req, site);
  res.json({ site });
}

const baseFieldsSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  constructionStatus: z.enum(CONSTRUCTION_STATUSES).default("planned"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

// Local/multer mode: non-file fields arrive as strings; imageMetadata (if the client
// extracted EXIF client-side) comes as a JSON-encoded string form field.
const localFormSchema = baseFieldsSchema.extend({
  imageMetadata: z.string().optional(),
});

// Supabase/tus mode: the file already landed in Supabase Storage via tus, so the JSON
// body carries the resulting URL + metadata directly instead of a multipart file part.
const jsonPayloadSchema = baseFieldsSchema.extend({
  imageUrl: z.string().optional(),
  imageMetadata: z.record(z.unknown()).optional(),
});

interface SitePayload {
  name: string;
  address?: string;
  constructionStatus: (typeof CONSTRUCTION_STATUSES)[number];
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  imageMetadata?: object;
}

async function resolveSitePayload(req: Request): Promise<SitePayload> {
  if (req.file) {
    const data = localFormSchema.parse(req.body);
    const imageUrl = await uploadFile(req.file.buffer, req.file.originalname);
    return {
      ...data,
      imageUrl,
      imageMetadata: data.imageMetadata ? JSON.parse(data.imageMetadata) : undefined,
    };
  }

  const data = jsonPayloadSchema.parse(req.body);
  if (
    data.imageUrl &&
    (!env.SUPABASE_PUBLIC_URL || !data.imageUrl.startsWith(env.SUPABASE_PUBLIC_URL))
  ) {
    throw new HttpError(400, "imageUrl must point to this app's storage bucket");
  }
  return data;
}

export async function createSite(req: Request, res: Response) {
  const data = await resolveSitePayload(req);
  const { imageUrl, imageMetadata } = data;

  const site = await prisma.site.create({
    data: {
      userId: req.user!.id,
      name: data.name,
      address: data.address,
      constructionStatus: data.constructionStatus,
      latitude: data.latitude,
      longitude: data.longitude,
      imageUrl,
      imageMetadata,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
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
  assertAccess(req, existing);

  const data = await resolveSitePayload(req);
  const { imageUrl, imageMetadata } = data;
  if (imageUrl && existing.imageUrl) {
    await deleteFile(existing.imageUrl).catch(() => {});
  }

  const site = await prisma.site.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      address: data.address,
      constructionStatus: data.constructionStatus,
      latitude: data.latitude ?? existing.latitude,
      longitude: data.longitude ?? existing.longitude,
      ...(imageUrl ? { imageUrl, imageMetadata } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
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
  const existing = await prisma.site.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new HttpError(404, "Site not found");
  assertAccess(req, existing);

  await prisma.site.delete({ where: { id: existing.id } });
  if (existing.imageUrl) {
    await deleteFile(existing.imageUrl).catch(() => {});
  }

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
