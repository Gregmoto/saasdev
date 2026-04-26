/**
 * Runs all pending Drizzle migrations at API startup.
 *
 * Uses drizzle-orm's built-in migrator so it is idempotent — already-applied
 * migrations are skipped. Safe to run on every boot.
 */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const DB_URL = process.env["DATABASE_URL"];
  if (!DB_URL) {
    console.warn("[migrations] DATABASE_URL not set — skipping migrations");
    return;
  }

  const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });
  const db = drizzle(sql);

  const migrationsFolder = resolve(__dirname, "migrations");

  try {
    console.log("[migrations] Running pending migrations…");
    await migrate(db, { migrationsFolder });
    console.log("[migrations] All migrations applied ✓");
  } catch (err) {
    // Fatal — if migrations fail the server shouldn't start with a broken schema.
    console.error(
      "[migrations] Migration failed:",
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  } finally {
    await sql.end();
  }
}
