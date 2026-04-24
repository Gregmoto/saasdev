import type { Db } from "../../db/client.js";
import { tickets, ticketMessages, ticketTags } from "../../db/schema/index.js";
import { eq, and, or, ilike, desc, asc, count, inArray, sql, isNull } from "drizzle-orm";
import type {
  createTicketSchema,
  updateTicketSchema,
  addMessageSchema,
  createTagSchema,
  updateTagSchema,
  ticketsQuerySchema,
} from "./schemas.js";
import type { z } from "zod";

type CreateTicketInput = z.infer<typeof createTicketSchema>;
type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
type AddMessageInput = z.infer<typeof addMessageSchema>;
type CreateTagInput = z.infer<typeof createTagSchema>;
type UpdateTagInput = z.infer<typeof updateTagSchema>;
type TicketsQuery = z.infer<typeof ticketsQuerySchema>;

// ── Ticket number ──────────────────────────────────────────────────────────────

export async function generateTicketNumber(
  db: Db,
  storeAccountId: string,
): Promise<string> {
  const [row] = await db
    .select({ cnt: count() })
    .from(tickets)
    .where(eq(tickets.storeAccountId, storeAccountId));

  const n = (row?.cnt ?? 0) + 1;
  return `TKT-${String(n).padStart(4, "0")}`;
}

// ── Tickets CRUD ───────────────────────────────────────────────────────────────

export async function createTicket(
  db: Db,
  storeAccountId: string,
  actorUserId: string,
  data: CreateTicketInput,
) {
  const ticketNumber = await generateTicketNumber(db, storeAccountId);

  const insertValues: typeof tickets.$inferInsert = {
    storeAccountId,
    ticketNumber,
    subject: data.subject,
    priority: data.priority,
    tags: data.tags,
  };

  if (data.customerId !== undefined) insertValues.customerId = data.customerId;
  if (data.customerEmail !== undefined) insertValues.customerEmail = data.customerEmail;
  if (data.orderId !== undefined) insertValues.orderId = data.orderId;
  if (data.productId !== undefined) insertValues.productId = data.productId;
  if (data.shopId !== undefined) insertValues.shopId = data.shopId;
  if (data.assignedToUserId !== undefined) {
    insertValues.assignedToUserId = data.assignedToUserId;
    insertValues.status = "open";
  }

  const [ticket] = await db.insert(tickets).values(insertValues).returning();

  if (!ticket) throw new Error("Failed to create ticket");

  const messageInsert: typeof ticketMessages.$inferInsert = {
    ticketId: ticket.id,
    storeAccountId,
    authorType: data.authorType,
    authorUserId: actorUserId,
    body: data.body,
    isInternal: false,
  };

  await db.insert(ticketMessages).values(messageInsert);

  return ticket;
}

export async function listTickets(
  db: Db,
  storeAccountId: string,
  query: TicketsQuery,
) {
  const conditions = [eq(tickets.storeAccountId, storeAccountId)];

  if (query.status !== undefined) {
    conditions.push(eq(tickets.status, query.status));
  }
  if (query.priority !== undefined) {
    conditions.push(eq(tickets.priority, query.priority));
  }
  if (query.assignedToUserId !== undefined) {
    conditions.push(eq(tickets.assignedToUserId, query.assignedToUserId));
  }
  if (query.customerId !== undefined) {
    conditions.push(eq(tickets.customerId, query.customerId));
  }
  if (query.orderId !== undefined) {
    conditions.push(eq(tickets.orderId, query.orderId));
  }
  if (query.search !== undefined) {
    conditions.push(ilike(tickets.subject, `%${query.search}%`));
  }

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ cnt: count() })
    .from(tickets)
    .where(where);

  const total = totalRow?.cnt ?? 0;
  const offset = (query.page - 1) * query.limit;

  const rows = await db
    .select()
    .from(tickets)
    .where(where)
    .orderBy(desc(tickets.createdAt))
    .limit(query.limit)
    .offset(offset);

  return { tickets: rows, total, page: query.page, limit: query.limit };
}

export async function getTicket(
  db: Db,
  ticketId: string,
  storeAccountId: string,
) {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.storeAccountId, storeAccountId)))
    .limit(1);

  if (!ticket) return null;

  const messages = await db
    .select()
    .from(ticketMessages)
    .where(
      and(
        eq(ticketMessages.ticketId, ticketId),
        eq(ticketMessages.storeAccountId, storeAccountId),
      ),
    )
    .orderBy(asc(ticketMessages.createdAt));

  const tags = await db
    .select()
    .from(ticketTags)
    .where(eq(ticketTags.storeAccountId, storeAccountId));

  return { ...ticket, messages, tags };
}

export async function updateTicket(
  db: Db,
  ticketId: string,
  storeAccountId: string,
  _actorUserId: string,
  data: UpdateTicketInput,
) {
  // Fetch current ticket first to check status transitions
  const [current] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.storeAccountId, storeAccountId)))
    .limit(1);

  if (!current) return null;

  const updateValues: Partial<typeof tickets.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.subject !== undefined) updateValues.subject = data.subject;
  if (data.priority !== undefined) updateValues.priority = data.priority;
  if (data.tags !== undefined) updateValues.tags = data.tags;
  if (data.orderId !== undefined) updateValues.orderId = data.orderId;
  if (data.productId !== undefined) updateValues.productId = data.productId;

  if (data.assignedToUserId !== undefined) {
    updateValues.assignedToUserId =
      data.assignedToUserId === null ? null : data.assignedToUserId;
  }

  if (data.status !== undefined) {
    updateValues.status = data.status;
    if (data.status === "solved" && !current.solvedAt) {
      updateValues.solvedAt = new Date();
    }
    if (data.status === "closed" && !current.closedAt) {
      updateValues.closedAt = new Date();
    }
  }

  const [updated] = await db
    .update(tickets)
    .set(updateValues)
    .where(and(eq(tickets.id, ticketId), eq(tickets.storeAccountId, storeAccountId)))
    .returning();

  return updated ?? null;
}

export async function addMessage(
  db: Db,
  ticketId: string,
  storeAccountId: string,
  actorUserId: string,
  data: AddMessageInput,
) {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.storeAccountId, storeAccountId)))
    .limit(1);

  if (!ticket) throw new Error("Ticket not found");

  const messageInsert: typeof ticketMessages.$inferInsert = {
    ticketId,
    storeAccountId,
    authorType: data.authorType,
    authorUserId: data.authorType === "agent" ? actorUserId : undefined,
    body: data.body,
    isInternal: data.isInternal,
  };

  if (data.authorCustomerId !== undefined) {
    messageInsert.authorCustomerId = data.authorCustomerId;
  }
  if (data.authorEmail !== undefined) {
    messageInsert.authorEmail = data.authorEmail;
  }

  const [message] = await db.insert(ticketMessages).values(messageInsert).returning();

  if (!message) throw new Error("Failed to insert message");

  const ticketUpdates: Partial<typeof tickets.$inferInsert> = {
    updatedAt: new Date(),
  };

  // Set firstResponseAt if this is the first non-internal agent reply
  if (!data.isInternal && !ticket.firstResponseAt && data.authorType === "agent") {
    ticketUpdates.firstResponseAt = new Date();
  }

  // Status transitions based on who replied
  if (!data.isInternal) {
    if (
      data.authorType === "agent" &&
      ticket.status === "waiting_customer"
    ) {
      ticketUpdates.status = "open";
    } else if (
      data.authorType === "customer" &&
      (ticket.status === "pending" || ticket.status === "open")
    ) {
      ticketUpdates.status = "waiting_customer";
    }
  }

  await db
    .update(tickets)
    .set(ticketUpdates)
    .where(and(eq(tickets.id, ticketId), eq(tickets.storeAccountId, storeAccountId)));

  return message;
}

export async function deleteMessage(
  db: Db,
  messageId: string,
  ticketId: string,
  storeAccountId: string,
) {
  const [deleted] = await db
    .delete(ticketMessages)
    .where(
      and(
        eq(ticketMessages.id, messageId),
        eq(ticketMessages.ticketId, ticketId),
        eq(ticketMessages.storeAccountId, storeAccountId),
      ),
    )
    .returning();

  return deleted ?? null;
}

export async function assignTicket(
  db: Db,
  ticketId: string,
  storeAccountId: string,
  assignedToUserId: string | null,
) {
  const [current] = await db
    .select()
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.storeAccountId, storeAccountId)))
    .limit(1);

  if (!current) return null;

  const updateValues: Partial<typeof tickets.$inferInsert> = {
    assignedToUserId: assignedToUserId ?? undefined,
    updatedAt: new Date(),
  };

  // If assigning from null to someone and status is 'new', move to 'open'
  if (assignedToUserId !== null && !current.assignedToUserId && current.status === "new") {
    updateValues.status = "open";
  }

  const [updated] = await db
    .update(tickets)
    .set(updateValues)
    .where(and(eq(tickets.id, ticketId), eq(tickets.storeAccountId, storeAccountId)))
    .returning();

  return updated ?? null;
}

export async function bulkUpdateStatus(
  db: Db,
  storeAccountId: string,
  ticketIds: string[],
  status: "new" | "open" | "pending" | "waiting_customer" | "solved" | "closed",
) {
  const updateValues: Partial<typeof tickets.$inferInsert> = {
    status,
    updatedAt: new Date(),
  };

  if (status === "solved") {
    updateValues.solvedAt = new Date();
  }
  if (status === "closed") {
    updateValues.closedAt = new Date();
  }

  const updated = await db
    .update(tickets)
    .set(updateValues)
    .where(
      and(
        eq(tickets.storeAccountId, storeAccountId),
        inArray(tickets.id, ticketIds),
      ),
    )
    .returning();

  return updated;
}

// ── Tags CRUD ──────────────────────────────────────────────────────────────────

export async function listTags(db: Db, storeAccountId: string) {
  return db
    .select()
    .from(ticketTags)
    .where(eq(ticketTags.storeAccountId, storeAccountId))
    .orderBy(asc(ticketTags.name));
}

export async function createTag(
  db: Db,
  storeAccountId: string,
  data: CreateTagInput,
) {
  const [tag] = await db
    .insert(ticketTags)
    .values({ storeAccountId, name: data.name, color: data.color })
    .returning();

  if (!tag) throw new Error("Failed to create tag");
  return tag;
}

export async function updateTag(
  db: Db,
  tagId: string,
  storeAccountId: string,
  data: UpdateTagInput,
) {
  const updateValues: Partial<typeof ticketTags.$inferInsert> = {};
  if (data.name !== undefined) updateValues.name = data.name;
  if (data.color !== undefined) updateValues.color = data.color;

  if (Object.keys(updateValues).length === 0) {
    const [tag] = await db
      .select()
      .from(ticketTags)
      .where(and(eq(ticketTags.id, tagId), eq(ticketTags.storeAccountId, storeAccountId)))
      .limit(1);
    return tag ?? null;
  }

  const [updated] = await db
    .update(ticketTags)
    .set(updateValues)
    .where(and(eq(ticketTags.id, tagId), eq(ticketTags.storeAccountId, storeAccountId)))
    .returning();

  return updated ?? null;
}

export async function deleteTag(
  db: Db,
  tagId: string,
  storeAccountId: string,
) {
  const [deleted] = await db
    .delete(ticketTags)
    .where(and(eq(ticketTags.id, tagId), eq(ticketTags.storeAccountId, storeAccountId)))
    .returning();

  return deleted ?? null;
}
