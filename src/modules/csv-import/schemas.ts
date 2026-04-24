import { z } from "zod";

export const entityTypeSchema = z.enum(["products", "customers", "orders"]);
export type EntityType = z.infer<typeof entityTypeSchema>;

export const uploadQuerySchema = z.object({
  entityType: entityTypeSchema,
  mode: z.enum(["create_only", "update_existing", "create_and_update"]).default("create_and_update"),
  skipDuplicates: z.enum(["true", "false"]).transform(v => v === "true").default("false"),
});

export const templateQuerySchema = z.object({
  entityType: entityTypeSchema,
});
