import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  COOKIE_MAX_AGE_DAYS: z.coerce.number().positive().default(7),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("SiteTracker <onboarding@resend.dev>"),
  FRONTEND_URL: z
    .string()
    .min(1, "FRONTEND_URL is required")
    .transform((url) => url.replace(/\/+$/, "")),
  PORT: z.coerce.number().positive().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Shared secret an external scheduler (cron-job.org, GitHub Actions, etc.) presents to
  // trigger POST /api/cron/cleanup-orphans without a logged-in session.
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters"),

  STORAGE_DRIVER: z.enum(["local", "supabase"]).default("local"),
  SUPABASE_PROJECT_REF: z.string().optional(),
  SUPABASE_S3_ACCESS_KEY_ID: z.string().optional(),
  SUPABASE_S3_SECRET_ACCESS_KEY: z.string().optional(),
  SUPABASE_S3_REGION: z.string().optional(),
  SUPABASE_BUCKET: z.string().default("site-photos"),
  SUPABASE_PUBLIC_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";

if (
  env.STORAGE_DRIVER === "supabase" &&
  (!env.SUPABASE_PROJECT_REF ||
    !env.SUPABASE_S3_ACCESS_KEY_ID ||
    !env.SUPABASE_S3_SECRET_ACCESS_KEY ||
    !env.SUPABASE_S3_REGION ||
    !env.SUPABASE_PUBLIC_URL)
) {
  console.error(
    "STORAGE_DRIVER=supabase requires SUPABASE_PROJECT_REF, SUPABASE_S3_ACCESS_KEY_ID, SUPABASE_S3_SECRET_ACCESS_KEY, SUPABASE_S3_REGION, and SUPABASE_PUBLIC_URL"
  );
  process.exit(1);
}
