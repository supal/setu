import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const listQuerySchema = z.object({
  take: z.coerce.number().int().positive().max(200).default(100),
  skip: z.coerce.number().int().min(0).default(0),
});

export async function listAuditLogs(req: Request, res: Response) {
  const { take, skip } = listQuerySchema.parse(req.query);

  const logs = await prisma.auditLog.findMany({
    take,
    skip,
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, name: true, email: true } } },
  });

  res.json({ logs });
}
