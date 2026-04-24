import type { Db } from "../../db/client.js";
import {
  chatThreads,
  chatMessages,
  businessHours,
  chatWidgetConfig,
  chatOfflineSubmissions,
  tickets,
  ticketMessages,
} from "../../db/schema/index.js";
import { eq, and, desc, asc, count, sql, isNull, lt } from "drizzle-orm";
import type { z } from "zod";
import type {
  createThreadSchema,
  sendMessageSchema,
  updateThreadSchema,
  businessHoursSchema,
  widgetConfigSchema,
  offlineFormSchema,
  threadsQuerySchema,
} from "./schemas.js";

type CreateThreadData = z.infer<typeof createThreadSchema>;
type SendMessageData = z.infer<typeof sendMessageSchema>;
type UpdateThreadData = z.infer<typeof updateThreadSchema>;
type BusinessHoursData = z.infer<typeof businessHoursSchema>;
type WidgetConfigData = z.infer<typeof widgetConfigSchema>;
type OfflineFormData = z.infer<typeof offlineFormSchema>;
type ThreadsQuery = z.infer<typeof threadsQuerySchema>;

// ── Threads ───────────────────────────────────────────────────────────────────

export async function createThread(
  db: Db,
  storeAccountId: string,
  data: CreateThreadData,
) {
  const values: typeof chatThreads.$inferInsert = {
    storeAccountId,
  };
  if (data.shopId !== undefined) values.shopId = data.shopId;
  if (data.customerId !== undefined) values.customerId = data.customerId;
  if (data.customerEmail !== undefined) values.customerEmail = data.customerEmail;
  if (data.customerName !== undefined) values.customerName = data.customerName;
  if (data.sessionId !== undefined) values.sessionId = data.sessionId;
  if (data.subject !== undefined) values.subject = data.subject;

  const [thread] = await db.insert(chatThreads).values(values).returning();
  if (!thread) throw new Error("Failed to create chat thread");
  return thread;
}

export async function listThreads(
  db: Db,
  storeAccountId: string,
  query: ThreadsQuery,
) {
  const { page, limit, status, assignedToUserId, shopId } = query;
  const offset = (page - 1) * limit;

  const conditions = [eq(chatThreads.storeAccountId, storeAccountId)];
  if (status !== undefined) conditions.push(eq(chatThreads.status, status));
  if (assignedToUserId !== undefined)
    conditions.push(eq(chatThreads.assignedToUserId, assignedToUserId));
  if (shopId !== undefined) conditions.push(eq(chatThreads.shopId, shopId));

  const where = and(...conditions);

  const [threads, countRows] = await Promise.all([
    db
      .select()
      .from(chatThreads)
      .where(where)
      .orderBy(desc(chatThreads.lastMessageAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(chatThreads).where(where),
  ]);

  const total = Number(countRows[0]?.value ?? 0);

  return {
    threads,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getThread(
  db: Db,
  threadId: string,
  storeAccountId: string,
) {
  const [thread] = await db
    .select()
    .from(chatThreads)
    .where(
      and(
        eq(chatThreads.id, threadId),
        eq(chatThreads.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!thread) return null;

  const messages = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.threadId, threadId),
        eq(chatMessages.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(asc(chatMessages.createdAt));

  return { ...thread, messages };
}

export async function sendMessage(
  db: Db,
  threadId: string,
  storeAccountId: string,
  data: SendMessageData,
) {
  // Verify thread belongs to store
  const [thread] = await db
    .select()
    .from(chatThreads)
    .where(
      and(
        eq(chatThreads.id, threadId),
        eq(chatThreads.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!thread) throw Object.assign(new Error("Thread not found"), { statusCode: 404 });

  // Build message values imperatively
  const msgValues: typeof chatMessages.$inferInsert = {
    threadId,
    storeAccountId,
    authorType: data.authorType,
    body: data.body,
  };
  if (data.authorCustomerId !== undefined) {
    msgValues.authorCustomerId = data.authorCustomerId;
  }
  if (data.attachments !== undefined && data.attachments.length > 0) {
    msgValues.attachments = data.attachments;
  }

  const [message] = await db.insert(chatMessages).values(msgValues).returning();
  if (!message) throw new Error("Failed to send message");

  // Update thread lastMessageAt and updatedAt
  const threadUpdate: Partial<typeof chatThreads.$inferInsert> = {
    lastMessageAt: new Date(),
    updatedAt: new Date(),
  };

  // If agent sends and thread is open with no assignee, mark as assigned
  if (
    data.authorType === "agent" &&
    thread.status === "open" &&
    !thread.assignedToUserId
  ) {
    threadUpdate.status = "assigned";
  }

  await db
    .update(chatThreads)
    .set(threadUpdate)
    .where(eq(chatThreads.id, threadId));

  return message;
}

export async function updateThread(
  db: Db,
  threadId: string,
  storeAccountId: string,
  data: UpdateThreadData,
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };

  if (data.status !== undefined) {
    set["status"] = data.status;
    if (data.status === "closed") {
      set["closedAt"] = new Date();
    }
  }
  if (data.assignedToUserId !== undefined) {
    set["assignedToUserId"] = data.assignedToUserId;
  }
  if (data.subject !== undefined) {
    set["subject"] = data.subject;
  }

  const [updated] = await db
    .update(chatThreads)
    .set(set)
    .where(
      and(
        eq(chatThreads.id, threadId),
        eq(chatThreads.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  if (!updated) throw Object.assign(new Error("Thread not found"), { statusCode: 404 });
  return updated;
}

export async function markMessagesRead(
  db: Db,
  threadId: string,
  storeAccountId: string,
  beforeMessageId?: string,
) {
  // Verify thread belongs to store
  const [thread] = await db
    .select({ id: chatThreads.id })
    .from(chatThreads)
    .where(
      and(
        eq(chatThreads.id, threadId),
        eq(chatThreads.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!thread) throw Object.assign(new Error("Thread not found"), { statusCode: 404 });

  const conditions = [
    eq(chatMessages.threadId, threadId),
    eq(chatMessages.isRead, false),
    // Only mark non-agent messages (i.e. customer messages) as read
    sql`${chatMessages.authorType} != 'agent'`,
  ];

  if (beforeMessageId !== undefined) {
    // Get the createdAt of the boundary message and mark messages before it
    const [boundary] = await db
      .select({ createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(eq(chatMessages.id, beforeMessageId))
      .limit(1);

    if (boundary?.createdAt) {
      conditions.push(lt(chatMessages.createdAt, boundary.createdAt));
    }
  }

  await db
    .update(chatMessages)
    .set({ isRead: true, readAt: new Date() })
    .where(and(...conditions));
}

export async function assignThread(
  db: Db,
  threadId: string,
  storeAccountId: string,
  assignedToUserId: string,
) {
  const [thread] = await db
    .select({ id: chatThreads.id, status: chatThreads.status })
    .from(chatThreads)
    .where(
      and(
        eq(chatThreads.id, threadId),
        eq(chatThreads.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);

  if (!thread) throw Object.assign(new Error("Thread not found"), { statusCode: 404 });

  const set: Record<string, unknown> = {
    assignedToUserId,
    updatedAt: new Date(),
  };

  // Only change status to assigned if not already closed
  if (thread.status !== "closed") {
    set["status"] = "assigned";
  }

  const [updated] = await db
    .update(chatThreads)
    .set(set)
    .where(eq(chatThreads.id, threadId))
    .returning();

  if (!updated) throw Object.assign(new Error("Thread not found"), { statusCode: 404 });
  return updated;
}

// ── Business Hours ────────────────────────────────────────────────────────────

export async function upsertBusinessHours(
  db: Db,
  storeAccountId: string,
  shopId: string | undefined,
  hours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
    timezone: string;
  }>,
) {
  // Delete existing rows for this store/shop then bulk insert
  const deleteConditions = [eq(businessHours.storeAccountId, storeAccountId)];
  if (shopId !== undefined) {
    deleteConditions.push(eq(businessHours.shopId, shopId));
  } else {
    deleteConditions.push(isNull(businessHours.shopId));
  }

  await db.delete(businessHours).where(and(...deleteConditions));

  if (hours.length === 0) return [];

  const insertValues: (typeof businessHours.$inferInsert)[] = hours.map((h) => {
    const row: typeof businessHours.$inferInsert = {
      storeAccountId,
      dayOfWeek: h.dayOfWeek,
      openTime: h.openTime,
      closeTime: h.closeTime,
      isOpen: h.isOpen,
      timezone: h.timezone,
    };
    if (shopId !== undefined) row.shopId = shopId;
    return row;
  });

  const inserted = await db.insert(businessHours).values(insertValues).returning();
  return inserted;
}

export async function getBusinessHours(
  db: Db,
  storeAccountId: string,
  shopId?: string,
) {
  const conditions = [eq(businessHours.storeAccountId, storeAccountId)];
  if (shopId !== undefined) {
    conditions.push(eq(businessHours.shopId, shopId));
  } else {
    conditions.push(isNull(businessHours.shopId));
  }

  const rows = await db
    .select()
    .from(businessHours)
    .where(and(...conditions))
    .orderBy(asc(businessHours.dayOfWeek));

  return rows;
}

export function isCurrentlyOpen(
  hours: (typeof businessHours.$inferSelect)[],
): boolean {
  if (hours.length === 0) return false;

  const timezone = hours[0]?.timezone ?? "Europe/Stockholm";
  const now = new Date();

  // Get local date/time string for the given timezone
  const localStr = now.toLocaleString("en-US", { timeZone: timezone });
  const localDate = new Date(localStr);

  // 0 = Sunday in JS getDay(); the schema uses 0–6 where 0 = Monday? Use JS convention (0=Sun)
  const dayOfWeek = localDate.getDay();
  const localHour = localDate.getHours();
  const localMinute = localDate.getMinutes();
  const currentMinutes = localHour * 60 + localMinute;

  const todayHours = hours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours || !todayHours.isOpen) return false;

  const [openH = "00", openM = "00"] = todayHours.openTime.split(":");
  const [closeH = "00", closeM = "00"] = todayHours.closeTime.split(":");

  const openMinutes = parseInt(openH, 10) * 60 + parseInt(openM, 10);
  const closeMinutes = parseInt(closeH, 10) * 60 + parseInt(closeM, 10);

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

// ── Widget Config ─────────────────────────────────────────────────────────────

const defaultWidgetConfig = {
  isEnabled: true,
  welcomeMessage: "Hej! Hur kan vi hjälpa dig?",
  offlineMessage: "Vi är offline just nu. Lämna ett meddelande!",
  primaryColor: "#2563EB",
  position: "bottom_right" as const,
  requireEmail: false,
  autoGreetDelaySecs: 5,
};

export async function getWidgetConfig(
  db: Db,
  storeAccountId: string,
  shopId?: string,
) {
  const conditions = [eq(chatWidgetConfig.storeAccountId, storeAccountId)];
  if (shopId !== undefined) {
    conditions.push(eq(chatWidgetConfig.shopId, shopId));
  } else {
    conditions.push(isNull(chatWidgetConfig.shopId));
  }

  const [config] = await db
    .select()
    .from(chatWidgetConfig)
    .where(and(...conditions))
    .limit(1);

  if (!config) {
    return { ...defaultWidgetConfig };
  }

  return config;
}

export async function upsertWidgetConfig(
  db: Db,
  storeAccountId: string,
  data: WidgetConfigData,
) {
  const shopId = data.shopId ?? null;
  const shopIdSql = shopId
    ? sql`${shopId}::uuid`
    : sql`'00000000-0000-0000-0000-000000000000'::uuid`;

  const welcomeMessage = data.welcomeMessage ?? null;
  const offlineMessage = data.offlineMessage ?? null;

  await db.execute(sql`
    INSERT INTO chat_widget_config (
      store_account_id,
      shop_id,
      is_enabled,
      welcome_message,
      offline_message,
      primary_color,
      position,
      require_email,
      auto_greet_delay_secs,
      updated_at
    ) VALUES (
      ${storeAccountId}::uuid,
      ${shopId}::uuid,
      ${data.isEnabled},
      ${welcomeMessage},
      ${offlineMessage},
      ${data.primaryColor},
      ${data.position}::"chat_widget_position",
      ${data.requireEmail},
      ${data.autoGreetDelaySecs},
      NOW()
    )
    ON CONFLICT (store_account_id, COALESCE(shop_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
      is_enabled = EXCLUDED.is_enabled,
      welcome_message = EXCLUDED.welcome_message,
      offline_message = EXCLUDED.offline_message,
      primary_color = EXCLUDED.primary_color,
      position = EXCLUDED.position,
      require_email = EXCLUDED.require_email,
      auto_greet_delay_secs = EXCLUDED.auto_greet_delay_secs,
      updated_at = NOW()
  `);

  // Return the updated config
  const conditions = [eq(chatWidgetConfig.storeAccountId, storeAccountId)];
  if (shopId !== null) {
    conditions.push(eq(chatWidgetConfig.shopId, shopId));
  } else {
    conditions.push(isNull(chatWidgetConfig.shopId));
  }

  const [config] = await db
    .select()
    .from(chatWidgetConfig)
    .where(and(...conditions))
    .limit(1);

  return config ?? { ...defaultWidgetConfig };
}

// ── Offline Form ──────────────────────────────────────────────────────────────

export async function submitOfflineForm(
  db: Db,
  storeAccountId: string,
  data: OfflineFormData,
): Promise<{ submissionId: string; ticketId: string }> {
  // 1. INSERT chatOfflineSubmissions
  const submissionValues: typeof chatOfflineSubmissions.$inferInsert = {
    storeAccountId,
    email: data.email,
    message: data.message,
  };
  if (data.shopId !== undefined) submissionValues.shopId = data.shopId;
  if (data.name !== undefined) submissionValues.name = data.name;

  const [submission] = await db
    .insert(chatOfflineSubmissions)
    .values(submissionValues)
    .returning();

  if (!submission) throw new Error("Failed to save offline form submission");

  // 2. Generate ticket number and create ticket
  const ticketNumber = `CHAT-${Date.now()}`;
  const subject = data.name
    ? `Meddelande från ${data.name}`
    : `Meddelande från ${data.email}`;

  const ticketValues: typeof tickets.$inferInsert = {
    storeAccountId,
    ticketNumber,
    subject,
    status: "new",
    customerEmail: data.email,
  };
  if (data.shopId !== undefined) ticketValues.shopId = data.shopId;

  const [ticket] = await db.insert(tickets).values(ticketValues).returning();
  if (!ticket) throw new Error("Failed to create ticket from offline form");

  // 3. INSERT ticketMessage
  const msgValues: typeof ticketMessages.$inferInsert = {
    ticketId: ticket.id,
    storeAccountId,
    authorType: "customer",
    body: data.message,
    authorEmail: data.email,
  };

  await db.insert(ticketMessages).values(msgValues);

  // 4. UPDATE chatOfflineSubmissions SET ticketId = ticket.id
  await db
    .update(chatOfflineSubmissions)
    .set({ ticketId: ticket.id })
    .where(eq(chatOfflineSubmissions.id, submission.id));

  return { submissionId: submission.id, ticketId: ticket.id };
}

export async function listOfflineSubmissions(db: Db, storeAccountId: string) {
  const rows = await db
    .select()
    .from(chatOfflineSubmissions)
    .where(eq(chatOfflineSubmissions.storeAccountId, storeAccountId))
    .orderBy(desc(chatOfflineSubmissions.createdAt));

  return rows;
}
