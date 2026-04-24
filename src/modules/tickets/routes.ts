import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as TicketsService from "./service.js";
import {
  createTicketSchema,
  updateTicketSchema,
  addMessageSchema,
  createTagSchema,
  updateTagSchema,
  ticketsQuerySchema,
  assignTicketSchema,
  bulkStatusSchema,
} from "./schemas.js";
import { z } from "zod";

const preHandler = [requireAuth, requireStoreAccountContext] as const;

const idParamSchema = z.object({ id: z.string().uuid() });
const tagIdParamSchema = z.object({ id: z.string().uuid() });
const messageIdParamSchema = z.object({
  id: z.string().uuid(),
  messageId: z.string().uuid(),
});

export async function ticketsRoutes(app: FastifyInstance): Promise<void> {
  // ── Tickets ────────────────────────────────────────────────────────────────

  app.get(
    "/api/tickets",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = ticketsQuerySchema.parse(request.query);
      const result = await TicketsService.listTickets(
        app.db,
        request.storeAccount.id,
        query,
      );
      return reply.send(result);
    },
  );

  app.post(
    "/api/tickets",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = createTicketSchema.parse(request.body);
      const ticket = await TicketsService.createTicket(
        app.db,
        request.storeAccount.id,
        request.currentUser.id,
        body,
      );
      return reply.status(201).send(ticket);
    },
  );

  app.get(
    "/api/tickets/:id",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const ticket = await TicketsService.getTicket(
        app.db,
        id,
        request.storeAccount.id,
      );
      if (!ticket) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Ticket not found" });
      }
      return reply.send(ticket);
    },
  );

  app.patch(
    "/api/tickets/:id",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = updateTicketSchema.parse(request.body);
      const ticket = await TicketsService.updateTicket(
        app.db,
        id,
        request.storeAccount.id,
        request.currentUser.id,
        body,
      );
      if (!ticket) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Ticket not found" });
      }
      return reply.send(ticket);
    },
  );

  app.post(
    "/api/tickets/:id/messages",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = addMessageSchema.parse(request.body);
      const message = await TicketsService.addMessage(
        app.db,
        id,
        request.storeAccount.id,
        request.currentUser.id,
        body,
      );
      return reply.status(201).send(message);
    },
  );

  app.delete(
    "/api/tickets/:id/messages/:messageId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id, messageId } = messageIdParamSchema.parse(request.params);
      const deleted = await TicketsService.deleteMessage(
        app.db,
        messageId,
        id,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Message not found" });
      }
      return reply.status(204).send();
    },
  );

  app.post(
    "/api/tickets/:id/assign",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = assignTicketSchema.parse(request.body);
      const ticket = await TicketsService.assignTicket(
        app.db,
        id,
        request.storeAccount.id,
        body.assignedToUserId,
      );
      if (!ticket) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Ticket not found" });
      }
      return reply.send(ticket);
    },
  );

  app.post(
    "/api/tickets/bulk-status",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = bulkStatusSchema.parse(request.body);
      const updated = await TicketsService.bulkUpdateStatus(
        app.db,
        request.storeAccount.id,
        body.ticketIds,
        body.status,
      );
      return reply.send({ updated: updated.length });
    },
  );

  // ── Tags ───────────────────────────────────────────────────────────────────

  app.get(
    "/api/ticket-tags",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const tags = await TicketsService.listTags(app.db, request.storeAccount.id);
      return reply.send(tags);
    },
  );

  app.post(
    "/api/ticket-tags",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = createTagSchema.parse(request.body);
      const tag = await TicketsService.createTag(
        app.db,
        request.storeAccount.id,
        body,
      );
      return reply.status(201).send(tag);
    },
  );

  app.patch(
    "/api/ticket-tags/:id",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = tagIdParamSchema.parse(request.params);
      const body = updateTagSchema.parse(request.body);
      const tag = await TicketsService.updateTag(
        app.db,
        id,
        request.storeAccount.id,
        body,
      );
      if (!tag) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Tag not found" });
      }
      return reply.send(tag);
    },
  );

  app.delete(
    "/api/ticket-tags/:id",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { id } = tagIdParamSchema.parse(request.params);
      const deleted = await TicketsService.deleteTag(
        app.db,
        id,
        request.storeAccount.id,
      );
      if (!deleted) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: "Not Found", message: "Tag not found" });
      }
      return reply.status(204).send();
    },
  );
}
