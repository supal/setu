import type { Request } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "CREATE_SITE"
  | "UPDATE_SITE"
  | "DELETE_SITE";

interface RecordAuditInput {
  actorId: string | null;
  action: AuditAction;
  entityType: "USER" | "SITE" | "AUTH";
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  req: Request;
}

export async function recordAudit({ actorId, action, entityType, entityId, metadata, req }: RecordAuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId: entityId ?? null,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? null,
      },
    });
  } catch (err) {
    // Never let audit logging break the primary request.
    console.error("Failed to record audit log:", err);
  }
}
