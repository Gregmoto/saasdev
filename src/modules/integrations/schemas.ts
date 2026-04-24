import { z } from "zod";

const configSchemaFieldSchema = z.object({
  type: z.enum(["string", "password", "url", "number"]),
  label: z.string().min(1).max(100),
  secret: z.boolean().optional(),
  required: z.boolean().optional(),
});

export const createProviderSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  logoUrl: z.string().url().max(500).optional(),
  authType: z.enum(["api_key", "oauth2", "webhook", "custom"]),
  configSchema: z.record(configSchemaFieldSchema).default({}),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
  configSchema: z.record(configSchemaFieldSchema).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const connectIntegrationSchema = z.object({
  providerId: z.string().uuid(),
  // Arbitrary key-value config — provider-specific.
  // Values are strings (passwords, API keys, URLs).
  config: z.record(z.string()).default({}),
  // Optional non-sensitive metadata (e.g. webhook endpoint).
  metadata: z.record(z.unknown()).optional(),
});

export const connectionIdParamSchema = z.object({
  connectionId: z.string().uuid(),
});
