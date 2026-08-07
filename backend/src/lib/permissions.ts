import type { Role } from "@prisma/client";

export const PERMISSIONS = {
  ADD_SITE: ["ADMIN", "USER"],
  MANAGE_USERS: ["ADMIN"],
  VIEW_AUDIT_LOG: ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission) {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}
