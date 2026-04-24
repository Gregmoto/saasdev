/**
 * System Status — Public status page for ShopMan platform.
 * Tracks service components, incidents, and subscriber notifications.
 * Platform-level, no storeAccountId.
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const componentStatusEnum = pgEnum("component_status", [
  "operational",
  "degraded_performance",
  "partial_outage",
  "major_outage",
  "under_maintenance",
]);

export const incidentStatusEnum = pgEnum("incident_status", [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
]);

export const incidentImpactEnum = pgEnum("incident_impact", [
  "none",
  "minor",
  "major",
  "critical",
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
]);

// ── status_components ─────────────────────────────────────────────────────────
// Individual service components (API, Admin, Storefront, etc.)

export const statusComponents = pgTable(
  "status_components",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    groupName: varchar("group_name", { length: 100 }), // e.g. "Core Services", "Integrations"
    status: componentStatusEnum("status").notNull().default("operational"),
    sortOrder: integer("sort_order").notNull().default(0),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugUnique: uniqueIndex("status_components_slug_unique").on(t.slug),
    sortIdx: index("status_components_sort_idx").on(t.sortOrder),
  }),
);

// ── status_incidents ──────────────────────────────────────────────────────────

export const statusIncidents = pgTable(
  "status_incidents",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull(),
    status: incidentStatusEnum("status").notNull().default("investigating"),
    impact: incidentImpactEnum("impact").notNull().default("minor"),

    // Affected component IDs (stored as comma-separated slugs for simplicity)
    affectedComponents: text("affected_components").default(""),

    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("status_incidents_status_idx").on(t.status),
    startedAtIdx: index("status_incidents_started_at_idx").on(t.startedAt),
  }),
);

// ── status_incident_updates ───────────────────────────────────────────────────

export const statusIncidentUpdates = pgTable(
  "status_incident_updates",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    incidentId: uuid("incident_id").notNull().references(() => statusIncidents.id, { onDelete: "cascade" }),
    status: incidentStatusEnum("status").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    incidentIdx: index("status_incident_updates_incident_idx").on(t.incidentId),
  }),
);

// ── status_maintenances ───────────────────────────────────────────────────────

export const statusMaintenances = pgTable(
  "status_maintenances",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: maintenanceStatusEnum("status").notNull().default("scheduled"),
    affectedComponents: text("affected_components").default(""),
    scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
    scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
    actualStart: timestamp("actual_start", { withTimezone: true }),
    actualEnd: timestamp("actual_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("status_maintenances_status_idx").on(t.status),
    scheduledStartIdx: index("status_maintenances_start_idx").on(t.scheduledStart),
  }),
);

// ── status_subscriptions ──────────────────────────────────────────────────────
// Email subscribers for status updates

export const statusSubscriptions = pgTable(
  "status_subscriptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(), // unsubscribe token
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("status_subscriptions_email_unique").on(t.email),
    tokenUnique: uniqueIndex("status_subscriptions_token_unique").on(t.token),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type StatusComponent = typeof statusComponents.$inferSelect;
export type StatusIncident = typeof statusIncidents.$inferSelect;
export type StatusIncidentUpdate = typeof statusIncidentUpdates.$inferSelect;
export type StatusMaintenance = typeof statusMaintenances.$inferSelect;
export type StatusSubscription = typeof statusSubscriptions.$inferSelect;
export type ComponentStatus = (typeof componentStatusEnum.enumValues)[number];
export type IncidentStatus = (typeof incidentStatusEnum.enumValues)[number];
export type IncidentImpact = (typeof incidentImpactEnum.enumValues)[number];
