import { and, eq, ilike, desc, asc, count, sql } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { pages, blogPosts } from "../../db/schema/index.js";
import type { z } from "zod";
import type { createPageSchema, updatePageSchema, createBlogPostSchema, updateBlogPostSchema, contentQuerySchema } from "./schemas.js";

type CreatePageData = z.infer<typeof createPageSchema>;
type UpdatePageData = z.infer<typeof updatePageSchema>;
type CreateBlogPostData = z.infer<typeof createBlogPostSchema>;
type UpdateBlogPostData = z.infer<typeof updateBlogPostSchema>;
type ContentQueryOpts = z.infer<typeof contentQuerySchema>;

// ── Pages ─────────────────────────────────────────────────────────────────────

export async function listPages(
  db: Db,
  storeAccountId: string,
  opts: ContentQueryOpts,
) {
  const { page, limit, search, status, sort, order } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(pages.storeAccountId, storeAccountId)];
  if (status !== undefined) conditions.push(eq(pages.status, status));
  if (search !== undefined) conditions.push(ilike(pages.title, `%${search}%`));

  const where = and(...conditions);

  const orderCol =
    sort === "title"
      ? pages.title
      : sort === "publishedAt"
        ? pages.publishedAt
        : pages.createdAt;

  const orderDir = order === "asc" ? asc(orderCol) : desc(orderCol);

  const [items, countRows] = await Promise.all([
    db.select().from(pages).where(where).orderBy(orderDir).limit(limit).offset(offset),
    db.select({ value: count() }).from(pages).where(where),
  ]);

  const total = Number(countRows[0]?.value ?? 0);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPage(db: Db, pageId: string, storeAccountId: string) {
  const [row] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.storeAccountId, storeAccountId)))
    .limit(1);
  return row ?? null;
}

export async function createPage(db: Db, storeAccountId: string, data: CreatePageData) {
  try {
    const [page] = await db
      .insert(pages)
      .values({
        storeAccountId,
        title: data.title,
        slug: data.slug,
        body: data.body ?? null,
        excerpt: data.excerpt ?? null,
        status: data.status ?? "draft",
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        sortOrder: data.sortOrder ?? 0,
        publishedAt: data.publishedAt !== undefined ? new Date(data.publishedAt) : null,
      })
      .returning();
    if (!page) throw new Error("Failed to create page");
    return page;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      throw Object.assign(new Error("A page with this slug already exists"), { statusCode: 409 });
    }
    throw err;
  }
}

export async function updatePage(
  db: Db,
  pageId: string,
  storeAccountId: string,
  data: UpdatePageData,
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) set["title"] = data.title;
  if (data.slug !== undefined) set["slug"] = data.slug;
  if (data.body !== undefined) set["body"] = data.body;
  if (data.excerpt !== undefined) set["excerpt"] = data.excerpt;
  if (data.status !== undefined) set["status"] = data.status;
  if (data.seoTitle !== undefined) set["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) set["seoDescription"] = data.seoDescription;
  if (data.sortOrder !== undefined) set["sortOrder"] = data.sortOrder;
  if (data.publishedAt !== undefined) set["publishedAt"] = new Date(data.publishedAt);

  const [updated] = await db
    .update(pages)
    .set(set)
    .where(and(eq(pages.id, pageId), eq(pages.storeAccountId, storeAccountId)))
    .returning();
  if (!updated) throw Object.assign(new Error("Page not found"), { statusCode: 404 });
  return updated;
}

export async function deletePage(
  db: Db,
  pageId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(pages)
    .where(and(eq(pages.id, pageId), eq(pages.storeAccountId, storeAccountId)))
    .returning({ id: pages.id });
  return rows.length > 0;
}

// ── Blog Posts ────────────────────────────────────────────────────────────────

export async function listBlogPosts(
  db: Db,
  storeAccountId: string,
  opts: ContentQueryOpts,
) {
  const { page, limit, search, status, sort, order } = opts;
  const offset = (page - 1) * limit;

  const conditions = [eq(blogPosts.storeAccountId, storeAccountId)];
  if (status !== undefined) conditions.push(eq(blogPosts.status, status));
  if (search !== undefined) conditions.push(ilike(blogPosts.title, `%${search}%`));

  const where = and(...conditions);

  const orderCol =
    sort === "title"
      ? blogPosts.title
      : sort === "publishedAt"
        ? blogPosts.publishedAt
        : blogPosts.createdAt;

  const orderDir = order === "asc" ? asc(orderCol) : desc(orderCol);

  const [items, countRows] = await Promise.all([
    db.select().from(blogPosts).where(where).orderBy(orderDir).limit(limit).offset(offset),
    db.select({ value: count() }).from(blogPosts).where(where),
  ]);

  const total = Number(countRows[0]?.value ?? 0);

  return {
    items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getBlogPost(db: Db, postId: string, storeAccountId: string) {
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.storeAccountId, storeAccountId)))
    .limit(1);
  return row ?? null;
}

export async function createBlogPost(
  db: Db,
  storeAccountId: string,
  data: CreateBlogPostData & { authorId?: string },
) {
  try {
    const [post] = await db
      .insert(blogPosts)
      .values({
        storeAccountId,
        title: data.title,
        slug: data.slug,
        body: data.body ?? null,
        excerpt: data.excerpt ?? null,
        authorId: data.authorId ?? null,
        status: data.status ?? "draft",
        tags: data.tags ?? [],
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        coverImageUrl: data.coverImageUrl ?? null,
        publishedAt: data.publishedAt !== undefined ? new Date(data.publishedAt) : null,
      })
      .returning();
    if (!post) throw new Error("Failed to create blog post");
    return post;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      throw Object.assign(new Error("A blog post with this slug already exists"), { statusCode: 409 });
    }
    throw err;
  }
}

export async function updateBlogPost(
  db: Db,
  postId: string,
  storeAccountId: string,
  data: UpdateBlogPostData,
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) set["title"] = data.title;
  if (data.slug !== undefined) set["slug"] = data.slug;
  if (data.body !== undefined) set["body"] = data.body;
  if (data.excerpt !== undefined) set["excerpt"] = data.excerpt;
  if (data.status !== undefined) set["status"] = data.status;
  if (data.tags !== undefined) set["tags"] = data.tags;
  if (data.seoTitle !== undefined) set["seoTitle"] = data.seoTitle;
  if (data.seoDescription !== undefined) set["seoDescription"] = data.seoDescription;
  if (data.coverImageUrl !== undefined) set["coverImageUrl"] = data.coverImageUrl;
  if (data.publishedAt !== undefined) set["publishedAt"] = new Date(data.publishedAt);

  const [updated] = await db
    .update(blogPosts)
    .set(set)
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.storeAccountId, storeAccountId)))
    .returning();
  if (!updated) throw Object.assign(new Error("Blog post not found"), { statusCode: 404 });
  return updated;
}

export async function deleteBlogPost(
  db: Db,
  postId: string,
  storeAccountId: string,
): Promise<boolean> {
  const rows = await db
    .delete(blogPosts)
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.storeAccountId, storeAccountId)))
    .returning({ id: blogPosts.id });
  return rows.length > 0;
}
