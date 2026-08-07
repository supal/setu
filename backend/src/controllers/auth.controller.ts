import type { CookieOptions, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isProduction } from "../config/env";
import {
  cookieMaxAgeMs,
  generateResetToken,
  hashPassword,
  hashResetToken,
  signSessionToken,
  verifyPassword,
} from "../services/auth.service";
import { sendPasswordChangedEmail, sendPasswordResetEmail } from "../services/email.service";
import { findUserByEmail, findUserById, publicUserSelect } from "../services/user.service";
import { SESSION_COOKIE_NAME } from "../middleware/authenticate";
import { HttpError } from "../middleware/errorHandler";
import { env } from "../config/env";
import { recordAudit } from "../services/audit.service";

// Frontend (Netlify) and backend (Render) live on different domains in production,
// so the cookie must be SameSite=None + Secure there to be sent on cross-site requests.
// In local dev both run on http://localhost (different ports, but same "site"), where
// SameSite=Lax works and Secure would be dropped by non-https requests.
const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: cookieMaxAgeMs(),
  path: "/",
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash || !user.isActive) {
    await recordAudit({
      actorId: user?.id ?? null,
      action: "LOGIN_FAILED",
      entityType: "AUTH",
      metadata: { email },
      req,
    });
    throw new HttpError(401, "Invalid email or password");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await recordAudit({
      actorId: user.id,
      action: "LOGIN_FAILED",
      entityType: "AUTH",
      metadata: { email },
      req,
    });
    throw new HttpError(401, "Invalid email or password");
  }

  const token = signSessionToken({ sub: user.id, role: user.role });
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions);

  await recordAudit({ actorId: user.id, action: "LOGIN_SUCCESS", entityType: "AUTH", req });

  const safeUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: publicUserSelect,
  });
  res.json({ user: safeUser });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { ...sessionCookieOptions, maxAge: undefined });
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: publicUserSelect,
  });

  if (!user) {
    throw new HttpError(401, "Not authenticated");
  }

  res.json({ user });
}

const forgotPasswordSchema = z.object({ email: z.string().email() });

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);

  const user = await findUserByEmail(email);
  if (user && user.isActive) {
    const { rawToken, tokenHash, expiresAt } = generateResetToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { resetTokenHash: tokenHash, resetTokenExpiresAt: expiresAt },
    });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    await recordAudit({
      actorId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entityType: "AUTH",
      req,
    });
  }

  // Always respond 200 so we don't leak whether an email is registered.
  res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
}

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const tokenHash = hashResetToken(token);

  const user = await prisma.user.findFirst({ where: { resetTokenHash: tokenHash } });

  if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
    throw new HttpError(400, "This reset link is invalid or has expired");
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetTokenHash: null, resetTokenExpiresAt: null },
  });

  await sendPasswordChangedEmail(user.email);
  await recordAudit({ actorId: user.id, action: "PASSWORD_RESET_COMPLETED", entityType: "AUTH", req });
  res.status(200).json({ message: "Password updated. You can now log in." });
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await findUserById(req.user!.id);
  if (!user || !user.passwordHash) {
    throw new HttpError(400, "No password set for this account");
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "Current password is incorrect");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await sendPasswordChangedEmail(user.email);
  await recordAudit({ actorId: user.id, action: "PASSWORD_CHANGED", entityType: "AUTH", req });
  res.status(200).json({ message: "Password changed" });
}
