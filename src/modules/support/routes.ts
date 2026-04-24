import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import * as SupportService from "./service.js";
import {
  createTicketSchema,
  updateTicketSchema,
  ticketQuerySchema,
  addMessageSchema,
  createRmaSchema,
  updateRmaSchema,
  ticketIdParamSchema,
  rmaIdParamSchema,
} from "./schemas.js";
import { z } from "zod";

const preHandler = [requireAuth, requireStoreAccountContext] as const;

const rmaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

export async function supportRoutes(app: FastifyInstance): Promise<void> {

  // ── Tickets ────────────────────────────────────────────────────────────────

  app.get(
    "/api/support/tickets",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = ticketQuerySchema.parse(request.query);
      const result = await SupportService.listTickets(app.db, request.storeAccount.id, query);
      return reply.send(result);
    },
  );

  app.post(
    "/api/support/tickets",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = createTicketSchema.parse(request.body);
      const ticket = await SupportService.createTicket(app.db, request.storeAccount.id, body);
      return reply.status(201).send(ticket);
    },
  );

  app.get(
    "/api/support/tickets/:ticketId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { ticketId } = ticketIdParamSchema.parse(request.params);
      const ticket = await SupportService.getTicket(app.db, ticketId, request.storeAccount.id);
      if (!ticket) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "Ticket not found" });
      }
      return reply.send(ticket);
    },
  );

  app.patch(
    "/api/support/tickets/:ticketId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { ticketId } = ticketIdParamSchema.parse(request.params);
      const body = updateTicketSchema.parse(request.body);
      const ticket = await SupportService.updateTicket(app.db, ticketId, request.storeAccount.id, body);
      return reply.send(ticket);
    },
  );

  app.post(
    "/api/support/tickets/:ticketId/messages",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { ticketId } = ticketIdParamSchema.parse(request.params);
      const body = addMessageSchema.parse(request.body);
      const message = await SupportService.addMessage(
        app.db,
        ticketId,
        request.storeAccount.id,
        request.currentUser.id,
        "agent",
        body,
      );
      return reply.status(201).send(message);
    },
  );

  // ── RMA ────────────────────────────────────────────────────────────────────

  app.get(
    "/api/support/rma",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const query = rmaQuerySchema.parse(request.query);
      const result = await SupportService.listRma(app.db, request.storeAccount.id, {
        page: query.page,
        limit: query.limit,
        ...(query.status !== undefined && { status: query.status }),
      });
      return reply.send(result);
    },
  );

  app.post(
    "/api/support/rma",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const body = createRmaSchema.parse(request.body);
      const rma = await SupportService.createRma(app.db, request.storeAccount.id, body);
      return reply.status(201).send(rma);
    },
  );

  app.get(
    "/api/support/rma/:rmaId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { rmaId } = rmaIdParamSchema.parse(request.params);
      const rma = await SupportService.getRma(app.db, rmaId, request.storeAccount.id);
      if (!rma) {
        return reply.status(404).send({ statusCode: 404, error: "Not Found", message: "RMA not found" });
      }
      return reply.send(rma);
    },
  );

  app.patch(
    "/api/support/rma/:rmaId",
    { preHandler: [...preHandler] },
    async (request, reply) => {
      const { rmaId } = rmaIdParamSchema.parse(request.params);
      const body = updateRmaSchema.parse(request.body);
      const rma = await SupportService.updateRma(app.db, rmaId, request.storeAccount.id, body);
      return reply.send(rma);
    },
  );
}
