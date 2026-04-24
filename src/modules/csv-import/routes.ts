import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { templateQuerySchema, uploadQuerySchema } from "./schemas.js";
import { productTemplate, customerTemplate, orderTemplate } from "./templates.js";
import { parseAndValidate, generateErrorCsv } from "./service.js";
import type { ColumnMapping } from "./templates.js";
import Papa from "papaparse";
import type { EntityType } from "./schemas.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

const templateByEntityType: Record<EntityType, ColumnMapping> = {
  products: productTemplate,
  customers: customerTemplate,
  orders: orderTemplate,
};

/** Maximum number of valid records returned in a single upload response. */
const MAX_RECORDS_IN_RESPONSE = 1000;

export async function csvImportRoutes(app: FastifyInstance): Promise<void> {
  // Register multipart support scoped to this plugin.
  await app.register(import("@fastify/multipart"), {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  });

  // ── GET /api/csv-import/template ────────────────────────────────────────────
  app.get(
    "/api/csv-import/template",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = templateQuerySchema.parse(request.query);

      const mapping = templateByEntityType[query.entityType];
      const headers = Object.keys(mapping);

      // Generate a CSV containing only the header row.
      const csv = Papa.unparse({ fields: headers, data: [] });

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename="${query.entityType}-template.csv"`,
        )
        .send(csv);
    },
  );

  // ── POST /api/csv-import/upload ─────────────────────────────────────────────
  app.post(
    "/api/csv-import/upload",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const query = uploadQuerySchema.parse(request.query);

      const fileData = await request.file();
      if (!fileData) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "No file uploaded. Send a CSV file in the 'file' field.",
        });
      }

      const buffer = await fileData.toBuffer();
      const csvText = buffer.toString("utf-8");

      const mapping = templateByEntityType[query.entityType];

      const result = parseAndValidate(csvText, query.entityType, mapping, {
        skipDuplicates: query.skipDuplicates,
      });

      // Build the response, capping valid records at MAX_RECORDS_IN_RESPONSE.
      const responseBody: {
        entityType: string;
        totalRows: number;
        validRows: number;
        errorRows: number;
        duplicateRows: number;
        records: Record<string, unknown>[];
        errors: typeof result.errors;
        duplicates: typeof result.duplicates;
        errorCsvBase64: string | null;
      } = {
        entityType: result.entityType,
        totalRows: result.totalRows,
        validRows: result.validRows,
        errorRows: result.errorRows,
        duplicateRows: result.duplicateRows,
        records: result.records.slice(0, MAX_RECORDS_IN_RESPONSE),
        errors: result.errors,
        duplicates: result.duplicates,
        errorCsvBase64: null,
      };

      if (result.errorRows > 0) {
        // Derive original CSV headers from the first data row keys before mapping.
        // We use the mapping keys (CSV headers) that are present in the file.
        const originalHeaders = Object.keys(mapping);
        const errorCsv = generateErrorCsv(originalHeaders, result.errors);
        responseBody.errorCsvBase64 = Buffer.from(errorCsv, "utf-8").toString("base64");
      }

      return reply.status(200).send(responseBody);
    },
  );
}
