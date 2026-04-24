import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  BASE_DOMAIN: z.string().default("saasshop.local"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  SESSION_SECRET: z.string().min(32),
  SESSION_TTL_SECONDS: z.coerce.number().default(86400),

  MEILISEARCH_HOST: z.string().default("http://localhost:7700"),
  MEILISEARCH_MASTER_KEY: z.string().default(""),

  S3_ENDPOINT: z.string().default(""),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_BUCKET: z.string().default("saasshop-media"),
  S3_PUBLIC_URL: z.string().default(""),

  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("noreply@saasshop.local"),

  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),

  SENTRY_DSN: z.string().default(""),

  // Lead capture webhook (CRM / email tool)
  LEAD_WEBHOOK_URL: z.string().default(""),

  // AES-256-GCM key for encrypting TOTP secrets at rest.
  // Must be exactly 32 bytes, base64-encoded.
  // Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  TOTP_ENCRYPTION_KEY: z.string().min(1).default("CHANGE_ME_generate_32_bytes_base64=="),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
