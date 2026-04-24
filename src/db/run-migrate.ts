import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  const client = postgres("postgres://saasshop:saasshop@localhost:5432/saasshop", { max: 1 });
  const db = drizzle(client);
  console.log("Applying migrations...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("✅ Migrations done");
  await client.end();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
