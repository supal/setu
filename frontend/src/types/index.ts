export type Role = "ADMIN" | "USER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ConstructionStatus = "planned" | "in_progress" | "completed";

export interface ImageMetadata {
  width?: number;
  height?: number;
  camera?: string;
  takenAt?: string;
  gps?: { latitude: number; longitude: number } | null;
}

export interface Site {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  name: string;
  address: string | null;
  constructionStatus: ConstructionStatus;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  imageMetadata: ImageMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actor: { id: string; name: string; email: string } | null;
  action: string;
  entityType: "USER" | "SITE" | "AUTH";
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
