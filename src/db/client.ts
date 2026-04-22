import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index.js";

let _sql: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function createDbClient(url: string) {
  _sql = postgres(url, { max: 20, idle_timeout: 30 });
  _db = drizzle(_sql, { schema, logger: process.env["NODE_ENV"] === "development" });
  return { sql: _sql, db: _db };
}

export function getDb() {
  if (!_db) throw new Error("DB client not initialized — call createDbClient() first");
  return _db;
}

export type Db = ReturnType<typeof getDb>;
