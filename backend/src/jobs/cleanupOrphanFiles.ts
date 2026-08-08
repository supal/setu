import fs from "node:fs/promises";
import path from "node:path";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { deleteFile, supabaseStorageClient } from "../services/storage.service";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

// Skip anything newer than this — protects files whose Site row hasn't been created yet
// (upload just finished, POST /api/sites hasn't landed) from being swept as "orphaned".
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

interface CleanupResult {
  scanned: number;
  deleted: number;
}

async function referencedKeys(): Promise<Set<string>> {
  const files = await prisma.file.findMany({ select: { url: true } });
  return new Set(files.map((f) => f.url));
}

async function cleanupLocalOrphans(): Promise<CleanupResult> {
  const referenced = await referencedKeys();
  const referencedFilenames = new Set([...referenced].map((url) => path.basename(url)));

  let entries: string[];
  try {
    entries = await fs.readdir(UPLOADS_DIR);
  } catch {
    return { scanned: 0, deleted: 0 };
  }

  let deleted = 0;
  for (const filename of entries) {
    if (referencedFilenames.has(filename)) continue;

    const stat = await fs.stat(path.join(UPLOADS_DIR, filename)).catch(() => null);
    if (!stat || Date.now() - stat.mtimeMs < GRACE_PERIOD_MS) continue;

    await deleteFile(filename).catch(() => {});
    deleted++;
  }

  return { scanned: entries.length, deleted };
}

async function cleanupSupabaseOrphans(): Promise<CleanupResult> {
  const referenced = await referencedKeys();
  const referencedObjectKeys = new Set(
    [...referenced].map((url) => url.replace(`${env.SUPABASE_PUBLIC_URL}/`, ""))
  );

  let scanned = 0;
  let deleted = 0;
  let continuationToken: string | undefined;

  do {
    const page = await supabaseStorageClient!.send(
      new ListObjectsV2Command({
        Bucket: env.SUPABASE_BUCKET,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of page.Contents ?? []) {
      if (!obj.Key || referencedObjectKeys.has(obj.Key)) continue;

      const age = obj.LastModified ? Date.now() - obj.LastModified.getTime() : Infinity;
      if (age < GRACE_PERIOD_MS) continue;

      await deleteFile(`${env.SUPABASE_PUBLIC_URL}/${obj.Key}`).catch(() => {});
      deleted++;
    }

    scanned += page.Contents?.length ?? 0;
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  return { scanned, deleted };
}

export async function cleanupOrphanFiles() {
  const startedAt = Date.now();
  try {
    const result =
      env.STORAGE_DRIVER === "supabase" ? await cleanupSupabaseOrphans() : await cleanupLocalOrphans();
    console.log(
      `[cleanup] orphan file sweep done in ${Date.now() - startedAt}ms — scanned ${result.scanned}, deleted ${result.deleted}`
    );
    return result;
  } catch (err) {
    console.error("[cleanup] orphan file sweep failed:", err);
    return { scanned: 0, deleted: 0 };
  }
}
