import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  COOKIE_MAX_AGE_DAYS: z.coerce.number().positive().default(7),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("SiteTracker <onboarding@resend.dev>"),
  FRONTEND_URL: z.string().min(1, "FRONTEND_URL is required"),
  PORT: z.coerce.number().positive().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default("site-photos"),
  R2_PUBLIC_URL: z.string().optional(),
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
  env.STORAGE_DRIVER === "r2" &&
  (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_PUBLIC_URL)
) {
  console.error(
    "STORAGE_DRIVER=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL"
  );
  process.exit(1);
}
