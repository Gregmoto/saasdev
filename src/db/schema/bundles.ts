import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── bundle_option_groups ───────────────────────────────────────────────────────
//
// Optional selection groups inside a bundle (e.g. "Choose one colour").
// Components assigned to an option group let the customer pick among them.
// Required components (optionGroupId = null) are always included.
//
// bundleProductId is a plain uuid — FK to products.id in migration SQL.

export const bundleOptionGroups = pgTable(
  "bundle_option_groups",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    // Plain uuid — FK to products.id (where type='bundle') in migration SQL.
    bundleProductId: uuid("bundle_product_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    // Customer must select between minSelect and maxSelect options from this group.
    minSelect: integer("min_select").notNull().default(1),
    maxSelect: integer("max_select").notNull().default(1),
    isRequired: boolean("is_required").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bundleProductIdx: index("bundle_option_groups_bundle_product_id_idx").on(t.bundleProductId),
    storeAccountIdx: index("bundle_option_groups_store_account_id_idx").on(t.storeAccountId),
    // Group name unique per bundle.
    uniqueBundleName: uniqueIndex("bundle_option_groups_bundle_name_idx").on(
      t.bundleProductId,
      t.name,
    ),
  }),
);

// ── bundle_components ─────────────────────────────────────────────────────────
//
// Each row is one component (product or specific variant) inside a bundle.
//
// Required components: optionGroupId = null — always included.
// Optional components: optionGroupId IS NOT NULL — customer selects qty from
//   the group according to group.minSelect / maxSelect rules.
//
// Stock availability of the bundle = min over all required components of
//   floor(component.qtyAvailable / component.quantity).
// Optional groups are excluded from the stock computation by default.
//
// bundleProductId, componentProductId, componentVariantId are plain uuids.
// FKs enforced in migration SQL.

export const bundleComponents = pgTable(
  "bundle_components",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    // The bundle product this component belongs to.
    bundleProductId: uuid("bundle_product_id").notNull(),
    // The component product (required when componentVariantId is null).
    componentProductId: uuid("component_product_id"),
    // The specific variant to use. When null, the cheapest/default variant is used.
    componentVariantId: uuid("component_variant_id"),
    // When not null, this component is part of an optional selection group.
    optionGroupId: uuid("option_group_id")
      .references(() => bundleOptionGroups.id, { onDelete: "cascade" }),
    // How many units of this component are included per bundle unit.
    quantity: integer("quantity").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bundleProductIdx: index("bundle_components_bundle_product_id_idx").on(t.bundleProductId),
    storeAccountIdx: index("bundle_components_store_account_id_idx").on(t.storeAccountId),
    componentProductIdx: index("bundle_components_component_product_id_idx").on(
      t.componentProductId,
    ),
    componentVariantIdx: index("bundle_components_component_variant_id_idx").on(
      t.componentVariantId,
    ),
    optionGroupIdx: index("bundle_components_option_group_id_idx").on(t.optionGroupId),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type BundleOptionGroup = typeof bundleOptionGroups.$inferSelect;
export type BundleComponent = typeof bundleComponents.$inferSelect;
