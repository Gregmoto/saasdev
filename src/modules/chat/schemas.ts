import { z } from "zod";

export const createThreadSchema = z.object({
  shopId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),
  customerName: z.string().optional(),
  sessionId: z.string().optional(),
  subject: z.string().optional(),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1),
  authorType: z.enum(["customer", "agent", "bot", "system"]).default("agent"),
  authorCustomerId: z.string().uuid().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        url: z.string().url(),
        mimeType: z.string(),
        sizeBytes: z.number().int().nonnegative(),
      }),
    )
    .optional(),
});

export const updateThreadSchema = z.object({
  status: z.enum(["open", "assigned", "closed", "archived"]).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  subject: z.string().optional(),
});

export const businessHoursSchema = z.object({
  shopId: z.string().uuid().optional(),
  hours: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      openTime: z.string().regex(/^\d{2}:\d{2}$/),
      closeTime: z.string().regex(/^\d{2}:\d{2}$/),
      isOpen: z.boolean(),
      timezone: z.string().default("Europe/Stockholm"),
    }),
  ),
});

export const widgetConfigSchema = z.object({
  shopId: z.string().uuid().optional(),
  isEnabled: z.boolean().default(true),
  welcomeMessage: z.string().optional(),
  offlineMessage: z.string().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#2563EB"),
  position: z.enum(["bottom_right", "bottom_left"]).default("bottom_right"),
  requireEmail: z.boolean().default(false),
  autoGreetDelaySecs: z.number().int().nonnegative().default(5),
});

export const offlineFormSchema = z.object({
  shopId: z.string().uuid().optional(),
  name: z.string().optional(),
  email: z.string().email(),
  message: z.string().min(1),
});

export const threadsQuerySchema = z.object({
  status: z.enum(["open", "assigned", "closed", "archived"]).optional(),
  assignedToUserId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const threadIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const assignThreadSchema = z.object({
  assignedToUserId: z.string().uuid(),
});

export const markReadSchema = z.object({
  beforeMessageId: z.string().uuid().optional(),
});
