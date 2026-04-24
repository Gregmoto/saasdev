/**
 * One-shot migrate + seed script.
 * Run: npx tsx src/db/migrate-and-seed.ts
 */
import postgres from "postgres";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { hashPassword } from "../lib/password.js";

const DB_URL =
  process.env["DATABASE_URL"] ?? "postgres://saasshop:saasshop@localhost:5432/saasshop";

const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🔧 ShopMan database setup\n");

  // ── 1. Check schema is applied ────────────────────────────────────────────
  console.log("📋 Verifying schema…");
  const countRows = await sql<Array<{ count: string }>>`
    SELECT count(*)::text AS count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  const tableCount = countRows[0]?.count ?? "0";
  console.log(`  ✅ ${tableCount} tables present in database`);

  if (tableCount === "0") {
    console.error("  ❌ No tables found — run schema migration first.");
    process.exit(1);
  }

  // ── 2. Seed: Super Admin (platform) ──────────────────────────────────────
  console.log("\n👤 Creating accounts…");

  // Check/create platform admin store account
  const existingStoreRows = await sql`
    SELECT id FROM store_accounts WHERE slug = 'platform-admin' LIMIT 1
  `.catch(() => [] as Array<{ id: string }>);

  let storeId: string;
  const existingStore = existingStoreRows[0];
  if (existingStore) {
    storeId = existingStore.id as string;
    console.log(`  ⏭  Store account already exists (${storeId})`);
  } else {
    const storeRows = await sql<Array<{ id: string }>>`
      INSERT INTO store_accounts (name, slug, plan, status, is_active)
      VALUES ('ShopMan Platform', 'platform-admin', 'enterprise', 'active', true)
      RETURNING id
    `;
    const store = storeRows[0];
    if (!store) throw new Error("Failed to create store account");
    storeId = store.id;
    console.log(`  ✅ Store account created (${storeId})`);
  }

  // Super admin user
  const SUPER_EMAIL = "info@gregmoto.se";
  const SUPER_PASS = "ShopMan2026!";
  const existingUserRows = await sql`
    SELECT id FROM auth_users WHERE email = ${SUPER_EMAIL} LIMIT 1
  `.catch(() => [] as Array<{ id: string }>);

  let userId: string;
  const existingUser = existingUserRows[0];
  if (existingUser) {
    userId = existingUser.id as string;
    console.log(`  ⏭  Super admin already exists (${userId})`);
  } else {
    const passwordHash = await hashPassword(SUPER_PASS);
    const userRows = await sql<Array<{ id: string }>>`
      INSERT INTO auth_users (email, password_hash, home_store_account_id)
      VALUES (${SUPER_EMAIL}, ${passwordHash}, ${storeId})
      RETURNING id
    `;
    const user = userRows[0];
    if (!user) throw new Error("Failed to create super admin user");
    userId = user.id;

    await sql`
      INSERT INTO store_memberships (user_id, store_account_id, role, accepted_at)
      VALUES (${userId}, ${storeId}, 'store_admin', now())
      ON CONFLICT DO NOTHING
    `;
    await sql`
      INSERT INTO platform_memberships (user_id)
      VALUES (${userId})
      ON CONFLICT DO NOTHING
    `;

    console.log(`  ✅ Super admin created: ${SUPER_EMAIL} / ${SUPER_PASS}`);
  }

  // ── 3. Seed: Demo Marketplace user ───────────────────────────────────────
  const MARKET_EMAIL = "marketplace@demo.shopman.dev";
  const MARKET_PASS = "Marketplace2026!";
  const existingMarketRows = await sql`
    SELECT id FROM store_accounts WHERE slug = 'demo-marketplace' LIMIT 1
  `.catch(() => []);

  if (!existingMarketRows[0]) {
    const mStoreRows = await sql<Array<{ id: string }>>`
      INSERT INTO store_accounts (name, slug, plan, status, is_active)
      VALUES ('Demo Marketplace', 'demo-marketplace', 'growth', 'active', true)
      RETURNING id
    `;
    const mStore = mStoreRows[0];
    if (!mStore) throw new Error("Failed to create marketplace store");
    const mStoreId = mStore.id;
    const mHash = await hashPassword(MARKET_PASS);
    const mUserRows = await sql<Array<{ id: string }>>`
      INSERT INTO auth_users (email, password_hash, home_store_account_id)
      VALUES (${MARKET_EMAIL}, ${mHash}, ${mStoreId})
      RETURNING id
    `;
    const mUser = mUserRows[0];
    if (!mUser) throw new Error("Failed to create marketplace user");
    await sql`
      INSERT INTO store_memberships (user_id, store_account_id, role, accepted_at)
      VALUES (${mUser.id}, ${mStoreId}, 'marketplace_owner', now())
      ON CONFLICT DO NOTHING
    `;
    console.log(`  ✅ Marketplace demo: ${MARKET_EMAIL} / ${MARKET_PASS}`);
  } else {
    console.log(`  ⏭  Marketplace demo already exists`);
  }

  // ── 4. Seed: Regular user ────────────────────────────────────────────────
  const USER_EMAIL = "user@demo.shopman.dev";
  const USER_PASS = "User2026!";
  const existingDemoUserRows = await sql`
    SELECT id FROM auth_users WHERE email = ${USER_EMAIL} LIMIT 1
  `.catch(() => []);

  if (!existingDemoUserRows[0]) {
    const uStoreRows = await sql<Array<{ id: string }>>`
      INSERT INTO store_accounts (name, slug, plan, status, is_active)
      VALUES ('Demo Store', 'demo-store', 'starter', 'active', true)
      RETURNING id
    `;
    const uStore = uStoreRows[0];
    if (!uStore) throw new Error("Failed to create demo store");
    const uHash = await hashPassword(USER_PASS);
    const uUserRows = await sql<Array<{ id: string }>>`
      INSERT INTO auth_users (email, password_hash, home_store_account_id)
      VALUES (${USER_EMAIL}, ${uHash}, ${uStore.id})
      RETURNING id
    `;
    const uUser = uUserRows[0];
    if (!uUser) throw new Error("Failed to create demo user");
    await sql`
      INSERT INTO store_memberships (user_id, store_account_id, role, accepted_at)
      VALUES (${uUser.id}, ${uStore.id}, 'store_admin', now())
      ON CONFLICT DO NOTHING
    `;
    console.log(`  ✅ Regular user: ${USER_EMAIL} / ${USER_PASS}`);
  } else {
    console.log(`  ⏭  Regular user already exists`);
  }

  await sql.end();

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Setup complete! Login uppgifter:

  🔑 Super Admin (plattform)
     E-post:   info@gregmoto.se
     Lösenord: ShopMan2026!

  🛒 Marketplace demo
     E-post:   marketplace@demo.shopman.dev
     Lösenord: Marketplace2026!

  👤 Vanlig användare
     E-post:   user@demo.shopman.dev
     Lösenord: User2026!

  Admin-panel: https://admin-production-42ec.up.railway.app/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error("❌ Setup failed:", msg);
  process.exit(1);
});
