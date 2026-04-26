/**
 * Simple SQL-file migration runner — no drizzle journal needed.
 *
 * Creates a __migrations table to track which files have been applied,
 * then runs any .sql files in src/db/migrations/ that haven't been run yet.
 * Safe and idempotent — runs on every API boot.
 */
import { readdir, readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(): Promise<void> {
  const DB_URL = process.env["DATABASE_URL"];
  if (!DB_URL) {
    console.warn("[migrations] DATABASE_URL not set — skipping");
    return;
  }

  const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });

  try {
    // Create tracking table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS __migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    // Read all .sql files sorted alphabetically
    const migrationsDir = resolve(__dirname, "migrations");
    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    // Get already-applied migrations
    const applied = await sql<Array<{ name: string }>>`
      SELECT name FROM __migrations
    `;
    const appliedSet = new Set(applied.map((r) => r.name));

    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) continue;

      const sqlContent = await readFile(resolve(migrationsDir, file), "utf-8");

      console.log(`[migrations] Applying ${file}…`);
      // Run each migration in its own transaction
      await sql.begin(async (tx) => {
        await tx.unsafe(sqlContent);
        await tx`INSERT INTO __migrations (name) VALUES (${file})`;
      });
      count++;
    }

    if (count === 0) {
      console.log("[migrations] Schema up to date ✓");
    } else {
      console.log(`[migrations] Applied ${count} migration(s) ✓`);
    }
  } catch (err) {
    console.error(
      "[migrations] Failed:",
      err instanceof Error ? err.message : String(err),
    );
    throw err; // Fatal — don't start with broken schema
  } finally {
    await sql.end();
  }
}
