import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  customerId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),
  orderId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  assignedToUserId: z.string().uuid().optional(),
  authorType: z.enum(["agent", "customer", "system"]).default("agent"),
});

export const updateTicketSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  status: z
    .enum(["new", "open", "pending", "waiting_customer", "solved", "closed"])
    .optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  tags: z.array(z.string()).optional(),
  orderId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export const addMessageSchema = z.object({
  body: z.string().min(1),
  isInternal: z.boolean().default(false),
  authorType: z.enum(["agent", "customer", "system"]).default("agent"),
  authorCustomerId: z.string().uuid().optional(),
  authorEmail: z.string().email().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#6366f1"),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const ticketsQuerySchema = z.object({
  status: z
    .enum(["new", "open", "pending", "waiting_customer", "solved", "closed"])
    .optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assignedToUserId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const assignTicketSchema = z.object({
  assignedToUserId: z.string().uuid().nullable(),
});

export const bulkStatusSchema = z.object({
  ticketIds: z.array(z.string().uuid()).min(1),
  status: z.enum(["new", "open", "pending", "waiting_customer", "solved", "closed"]),
});
