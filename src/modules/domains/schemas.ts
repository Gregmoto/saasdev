import { z } from "zod";

export const addDomainSchema = z.object({
  hostname: z.string().min(1).max(253),
  verificationType: z.enum(["dns", "file"]),
});

export const domainIdParamSchema = z.object({
  domainId: z.string().uuid(),
});
