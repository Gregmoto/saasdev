import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const contentStatusEnum = pgEnum("content_status", [
  "draft",
  "published",
  "archived",
]);

// ── pages ─────────────────────────────────────────────────────────────────────

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    body: text("body"),
    excerpt: text("excerpt"),
    status: contentStatusEnum("status").notNull().default("draft"),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeSlugIdx: uniqueIndex("pages_store_slug_idx").on(t.storeAccountId, t.slug),
    storeAccountIdx: index("pages_store_account_id_idx").on(t.storeAccountId),
    statusIdx: index("pages_status_idx").on(t.status),
  }),
);

// ── blog_posts ────────────────────────────────────────────────────────────────

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    storeAccountId: uuid("store_account_id").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    body: text("body"),
    excerpt: text("excerpt"),
    authorId: uuid("author_id"),
    status: contentStatusEnum("status").notNull().default("draft"),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    coverImageUrl: text("cover_image_url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    storeSlugIdx: uniqueIndex("blog_posts_store_slug_idx").on(t.storeAccountId, t.slug),
    storeAccountIdx: index("blog_posts_store_account_id_idx").on(t.storeAccountId),
    statusIdx: index("blog_posts_status_idx").on(t.status),
  }),
);

// ── Types ─────────────────────────────────────────────────────────────────────

export type Page = typeof pages.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type ContentStatus = (typeof contentStatusEnum.enumValues)[number];
