import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../config/env";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

function sanitizeFilename(filename: string) {
  const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, "");
  return `${crypto.randomUUID()}${ext}`;
}

export const supabaseStorageClient =
  env.STORAGE_DRIVER === "supabase"
    ? new S3Client({
        region: env.SUPABASE_S3_REGION!,
        endpoint: `https://${env.SUPABASE_PROJECT_REF}.supabase.co/storage/v1/s3`,
        credentials: {
          accessKeyId: env.SUPABASE_S3_ACCESS_KEY_ID!,
          secretAccessKey: env.SUPABASE_S3_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
      })
    : null;

async function uploadLocal(buffer: Buffer, filename: string) {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const storedName = sanitizeFilename(filename);
  await fs.writeFile(path.join(UPLOADS_DIR, storedName), buffer);
  return `/uploads/${storedName}`;
}

async function deleteLocal(urlOrPath: string) {
  const storedName = path.basename(urlOrPath);
  await fs.unlink(path.join(UPLOADS_DIR, storedName)).catch(() => {});
}

/** Only used for Supabase deletes — uploads go straight from the browser to Supabase Storage via tus, bypassing this service. */
async function deleteSupabase(url: string) {
  const key = url.replace(`${env.SUPABASE_PUBLIC_URL}/`, "");
  await supabaseStorageClient!.send(new DeleteObjectCommand({ Bucket: env.SUPABASE_BUCKET, Key: key }));
}

export async function uploadFile(buffer: Buffer, filename: string) {
  return uploadLocal(buffer, filename);
}

export async function deleteFile(urlOrPath: string) {
  return env.STORAGE_DRIVER === "supabase" ? deleteSupabase(urlOrPath) : deleteLocal(urlOrPath);
}
