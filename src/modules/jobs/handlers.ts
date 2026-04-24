import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function aggregateAnalytics(db: PostgresJsDatabase<any>, storeAccountId: string | null): Promise<void> {
  void db;
  void storeAccountId;
  // TODO: aggregate analytics into cache
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function purgeStoreCache(db: PostgresJsDatabase<any>, storeAccountId: string): Promise<void> {
  void db;
  void storeAccountId;
  // TODO: flush Redis keys for this store
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateSitemap(db: PostgresJsDatabase<any>, storeAccountId: string): Promise<void> {
  void db;
  void storeAccountId;
  // TODO: generate and cache sitemap XML
}
