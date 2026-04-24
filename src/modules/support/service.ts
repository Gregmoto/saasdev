import { and, eq, ilike, desc, asc, count } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { supportTickets, supportTicketMessages as ticketMessages, rmaRequests } from "../../db/schema/index.js";
import type { z } from "zod";
import type {
  createTicketSchema,
  updateTicketSchema,
  ticketQuerySchema,
  addMessageSchema,
  createRmaSchema,
  updateRmaSchema,
} from "./schemas.js";

type CreateTicketData = z.infer<typeof createTicketSchema>;
type UpdateTicketData = z.infer<typeof updateTicketSchema>;
type TicketQueryOpts = z.infer<typeof ticketQuerySchema>;
type AddMessageData = z.infer<typeof addMessageSchema>;
type CreateRmaData = z.infer<typeof createRmaSchema>;
type UpdateRmaData = z.infer<typeof updateRmaSchema>;

// ── Tickets ───────────────────────────────────────────────────────────────────

export async function listTickets(
  db: Db,
  storeAccountId: string,
  opts: TicketQueryOpts,
) {
  const { page, limit, search, status, priority, assignedUserId, customerId, sort, order } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(supportTickets.storeAccountId, storeAccountId)];
  if (status !== undefined) conditions.push(eq(supportTickets.status, status));
  if (priority !== undefined) conditions.push(eq(supportTickets.priority, priority));
  if (assignedUserId !== undefined) conditions.push(eq(supportTickets.assignedUserId, assignedUserId));
  if (customerId !== undefined) conditions.push(eq(supportTickets.customerId, customerId));
  if (search !== undefined) conditions.push(ilike(supportTickets.subject, `%${search}%`));

  const where = and(...conditions);

  const orderCol =
    sort === "updatedAt"
      ? supportTickets.updatedAt
      : sort === "priority"
        ? supportTickets.priority
        : supportTickets.createdAt;

  const orderDir = order === "asc" ? asc(orderCol) : desc(orderCol);

  const [items, countRows] = await Promise.all([
    db.select().from(supportTickets).where(where).orderBy(orderDir).limit(limit).offset(offset),
    db.select({ value: count() }).from(supportTickets).where(where),
  ]);

  const total = Number(countRows[0]?.value ?? 0);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getTicket(db: Db, ticketId: string, storeAccountId: string) {
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(
      and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.storeAccountId, storeAccountId),
      ),
    )
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

  return { ...ticket, messages };
}

export async function createTicket(db: Db, storeAccountId: string, data: CreateTicketData) {
  const [ticket] = await db
    .insert(supportTickets)
    .values({
      storeAccountId,
      subject: data.subject,
      customerId: data.customerId ?? null,
      orderId: data.orderId ?? null,
      priority: data.priority,
      tags: data.tags ?? [],
    })
    .returning();
  if (!ticket) throw new Error("Failed to create ticket");
  return ticket;
}

export async function updateTicket(
  db: Db,
  ticketId: string,
  storeAccountId: string,
  data: UpdateTicketData,
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.status !== undefined) {
    set["status"] = data.status;
    if (data.status === "resolved") {
      set["resolvedAt"] = new Date();
    }
  }
  if (data.priority !== undefined) set["priority"] = data.priority;
  if (data.assignedUserId !== undefined) set["assignedUserId"] = data.assignedUserId;
  if (data.tags !== undefined) set["tags"] = data.tags;

  const [updated] = await db
    .update(supportTickets)
    .set(set)
    .where(
      and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  if (!updated) throw Object.assign(new Error("Ticket not found"), { statusCode: 404 });
  return updated;
}

export async function addMessage(
  db: Db,
  ticketId: string,
  storeAccountId: string,
  authorId: string,
  authorType: string,
  data: AddMessageData,
) {
  // Verify ticket belongs to the store account.
  const [ticket] = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(
      and(
        eq(supportTickets.id, ticketId),
        eq(supportTickets.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  if (!ticket) throw Object.assign(new Error("Ticket not found"), { statusCode: 404 });

  const [message] = await db
    .insert(ticketMessages)
    .values({
      ticketId,
      storeAccountId,
      authorId,
      authorType,
      body: data.body,
      isInternal: data.isInternal ?? false,
      attachments: data.attachments ?? null,
    })
    .returning();
  if (!message) throw new Error("Failed to add message");

  // Update ticket updatedAt.
  await db
    .update(supportTickets)
    .set({ updatedAt: new Date() })
    .where(eq(supportTickets.id, ticketId));

  return message;
}

// ── RMA ───────────────────────────────────────────────────────────────────────

export async function listRma(
  db: Db,
  storeAccountId: string,
  opts: { page: number; limit: number; status?: string },
) {
  const { page, limit, status } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(rmaRequests.storeAccountId, storeAccountId)];
  if (status !== undefined) conditions.push(eq(rmaRequests.status, status));

  const where = and(...conditions);

  const [items, countRows] = await Promise.all([
    db
      .select()
      .from(rmaRequests)
      .where(where)
      .orderBy(desc(rmaRequests.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(rmaRequests).where(where),
  ]);

  const total = Number(countRows[0]?.value ?? 0);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getRma(db: Db, rmaId: string, storeAccountId: string) {
  const [row] = await db
    .select()
    .from(rmaRequests)
    .where(
      and(
        eq(rmaRequests.id, rmaId),
        eq(rmaRequests.storeAccountId, storeAccountId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createRma(db: Db, storeAccountId: string, data: CreateRmaData) {
  const [rma] = await db
    .insert(rmaRequests)
    .values({
      storeAccountId,
      orderId: data.orderId ?? null,
      customerId: data.customerId ?? null,
      reason: data.reason,
      items: data.items,
    })
    .returning();
  if (!rma) throw new Error("Failed to create RMA");
  return rma;
}

export async function updateRma(
  db: Db,
  rmaId: string,
  storeAccountId: string,
  data: UpdateRmaData,
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.status !== undefined) set["status"] = data.status;
  if (data.resolution !== undefined) set["resolution"] = data.resolution;
  if (data.resolutionNotes !== undefined) set["resolutionNotes"] = data.resolutionNotes;

  const [updated] = await db
    .update(rmaRequests)
    .set(set)
    .where(
      and(
        eq(rmaRequests.id, rmaId),
        eq(rmaRequests.storeAccountId, storeAccountId),
      ),
    )
    .returning();
  if (!updated) throw Object.assign(new Error("RMA not found"), { statusCode: 404 });
  return updated;
}
