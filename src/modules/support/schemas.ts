import { z } from "zod";

// ── Tickets ───────────────────────────────────────────────────────────────────

export const createTicketSchema = z.object({
  subject: z.string().min(1).max(255),
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  tags: z.array(z.string()).optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedUserId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedUserId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  sort: z.enum(["createdAt", "updatedAt", "priority"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export const addMessageSchema = z.object({
  body: z.string().min(1),
  isInternal: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        name: z.string(),
        size: z.number().int().min(0),
      }),
    )
    .optional(),
});

// ── RMA ───────────────────────────────────────────────────────────────────────

export const createRmaSchema = z.object({
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  reason: z.string().min(1),
  items: z.array(
    z.object({
      orderItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
      reason: z.string(),
    }),
  ),
});

export const updateRmaSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "shipped", "completed"]).optional(),
  resolution: z.string().optional(),
  resolutionNotes: z.string().optional(),
});

// ── Params ────────────────────────────────────────────────────────────────────

export const ticketIdParamSchema = z.object({
  ticketId: z.string().uuid(),
});

export const rmaIdParamSchema = z.object({
  rmaId: z.string().uuid(),
});
