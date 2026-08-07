import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { generateResetToken } from "../services/auth.service";
import { sendInviteEmail } from "../services/email.service";
import { publicUserSelect } from "../services/user.service";
import { HttpError } from "../middleware/errorHandler";
import { recordAudit } from "../services/audit.service";

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: publicUserSelect,
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
}

export async function getUser(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: publicUserSelect,
  });
  if (!user) throw new HttpError(404, "User not found");
  res.json({ user });
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
});

export async function createUser(req: Request, res: Response) {
  const data = createUserSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new HttpError(409, "A user with this email already exists");
  }

  const { rawToken, tokenHash, expiresAt } = generateResetToken();

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      role: data.role,
      isActive: true,
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: expiresAt,
    },
    select: publicUserSelect,
  });

  const setPasswordUrl = `${env.FRONTEND_URL}/set-password?token=${rawToken}`;
  await sendInviteEmail(data.email, data.name, setPasswordUrl);

  await recordAudit({
    actorId: req.user!.id,
    action: "CREATE_USER",
    entityType: "USER",
    entityId: user.id,
    metadata: { name: data.name, email: data.email, role: data.role },
    req,
  });

  res.status(201).json({ user });
}

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  isActive: z.boolean().optional(),
});

export async function updateUser(req: Request, res: Response) {
  const data = updateUserSchema.parse(req.body);
  const targetId = req.params.id;

  if (targetId === req.user!.id && (data.role === "USER" || data.isActive === false)) {
    throw new HttpError(400, "You cannot demote or deactivate your own account");
  }

  const existing = await prisma.user.findUnique({ where: { id: targetId } });
  if (!existing) throw new HttpError(404, "User not found");

  const user = await prisma.user.update({
    where: { id: targetId },
    data,
    select: publicUserSelect,
  });

  await recordAudit({
    actorId: req.user!.id,
    action: "UPDATE_USER",
    entityType: "USER",
    entityId: targetId,
    metadata: data,
    req,
  });

  res.json({ user });
}

export async function deleteUser(req: Request, res: Response) {
  const targetId = req.params.id;

  if (targetId === req.user!.id) {
    throw new HttpError(400, "You cannot delete your own account");
  }

  const existing = await prisma.user.findUnique({ where: { id: targetId } });
  if (!existing) throw new HttpError(404, "User not found");

  await prisma.user.delete({ where: { id: targetId } });

  await recordAudit({
    actorId: req.user!.id,
    action: "DELETE_USER",
    entityType: "USER",
    entityId: targetId,
    metadata: { name: existing.name, email: existing.email },
    req,
  });

  res.status(204).send();
}
