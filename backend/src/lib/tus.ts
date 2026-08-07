import { randomUUID } from "node:crypto";
import { Server } from "@tus/server";
import { S3Store } from "@tus/s3-store";
import { env } from "../config/env";
import { verifySessionToken } from "../services/auth.service";
import { SESSION_COOKIE_NAME } from "../middleware/authenticate";

function readCookie(cookieHeader: string, name: string): string | undefined {
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}

export const UPLOADS_PATH = "/api/uploads";

export function createTusServer() {
  const datastore = new S3Store({
    partSize: 8 * 1024 * 1024,
    s3ClientConfig: {
      bucket: env.SUPABASE_BUCKET,
      region: env.SUPABASE_S3_REGION!,
      endpoint: `https://${env.SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3`,
      credentials: {
        accessKeyId: env.SUPABASE_S3_ACCESS_KEY_ID!,
        secretAccessKey: env.SUPABASE_S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    },
  });

  return new Server({
    path: UPLOADS_PATH,
    datastore,
    // Flat key, no "/" — a slash in the id changes tus's URL routing scheme and would
    // require also implementing generateUrl/getFileIdFromRequest to match (see @tus/server's
    // "store files in custom nested directories" docs). SUPABASE_BUCKET is already dedicated to
    // site photos, so a folder prefix isn't needed for organization.
    namingFunction: () => randomUUID(),
    // CORS is handled entirely by the app-wide `cors()` middleware in app.ts (which runs
    // before this handler) — suppress tus's own CORS headers so the two don't conflict.
    allowedOrigins: [],
    respectForwardedHeaders: true,
    async onIncomingRequest(req) {
      // tus wraps the request in its own Fetch-style Request (see srvx's NodeRequest) — it never
      // runs through Express's middleware chain, so cookie-parser's `req.cookies` isn't available
      // here. Parse the raw `Cookie` header instead.
      const cookieHeader = req.headers.get("cookie");
      const token = cookieHeader ? readCookie(cookieHeader, SESSION_COOKIE_NAME) : undefined;
      if (!token) throw { status_code: 401, body: "Unauthorized" };

      try {
        verifySessionToken(token);
      } catch {
        throw { status_code: 401, body: "Session expired, please log in again" };
      }
    },
    async onUploadFinish(_req, upload) {
      // Hand the finished object's public URL straight back to the client, so the frontend
      // doesn't need its own copy of SUPABASE_PUBLIC_URL to reconstruct it.
      return { headers: { "X-Image-Public-Url": `${env.SUPABASE_PUBLIC_URL}/${upload.id}` } };
    },
  });
}
