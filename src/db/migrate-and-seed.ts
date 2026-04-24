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

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("🔧 ShopMan database setup\n");

  // ── 1. Check schema is applied ────────────────────────────────────────────
  console.log("📋 Verifying schema…");
  const [{ count }] = await sql`
    SELECT count(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `;
  console.log(`  ✅ ${count} tables present in database`);

  // ── 2. Seed: Super Admin (platform) ──────────────────────────────────────
  console.log("\n👤 Creating accounts…");

  // Check/create platform admin store account
  const [existingStore] = await sql`
    SELECT id FROM store_accounts WHERE slug = 'platform-admin' LIMIT 1
  `.catch(() => [null]);

  let storeId: string;
  if (existingStore) {
    storeId = existingStore.id as string;
    console.log(`  ⏭  Store account already exists (${storeId})`);
  } else {
    const [store] = await sql`
      INSERT INTO store_accounts (name, slug, plan, status, is_active)
      VALUES ('ShopMan Platform', 'platform-admin', 'enterprise', 'active', true)
      RETURNING id
    `;
    storeId = store.id as string;
    console.log(`  ✅ Store account created (${storeId})`);
  }

  // Super admin user
  const SUPER_EMAIL = "info@gregmoto.se";
  const SUPER_PASS = "ShopMan2026!";
  const [existingUser] = await sql`
    SELECT id FROM auth_users WHERE email = ${SUPER_EMAIL} LIMIT 1
  `.catch(() => [null]);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id as string;
    console.log(`  ⏭  Super admin already exists (${userId})`);
  } else {
    const passwordHash = await hashPassword(SUPER_PASS);
    const [user] = await sql`
      INSERT INTO auth_users (email, password_hash, home_store_account_id)
      VALUES (${SUPER_EMAIL}, ${passwordHash}, ${storeId})
      RETURNING id
    `;
    userId = user.id as string;

    // Grant store admin role on the platform store account
    await sql`
      INSERT INTO store_memberships (user_id, store_account_id, role, accepted_at)
      VALUES (${userId}, ${storeId}, 'store_admin', now())
      ON CONFLICT DO NOTHING
    `;

    // Grant platform admin access via platform_memberships
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
  const [existingMarket] = await sql`
    SELECT id FROM store_accounts WHERE slug = 'demo-marketplace' LIMIT 1
  `.catch(() => [null]);

  if (!existingMarket) {
    const [mStore] = await sql`
      INSERT INTO store_accounts (name, slug, plan, status, is_active)
      VALUES ('Demo Marketplace', 'demo-marketplace', 'growth', 'active', true)
      RETURNING id
    `;
    const mStoreId = mStore.id as string;
    const mHash = await hashPassword(MARKET_PASS);
    const [mUser] = await sql`
      INSERT INTO auth_users (email, password_hash, home_store_account_id)
      VALUES (${MARKET_EMAIL}, ${mHash}, ${mStoreId})
      RETURNING id
    `;
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
  const [existingDemoUser] = await sql`
    SELECT id FROM auth_users WHERE email = ${USER_EMAIL} LIMIT 1
  `.catch(() => [null]);

  if (!existingDemoUser) {
    const [uStore] = await sql`
      INSERT INTO store_accounts (name, slug, plan, status, is_active)
      VALUES ('Demo Store', 'demo-store', 'starter', 'active', true)
      RETURNING id
    `;
    const uHash = await hashPassword(USER_PASS);
    const [uUser] = await sql`
      INSERT INTO auth_users (email, password_hash, home_store_account_id)
      VALUES (${USER_EMAIL}, ${uHash}, ${uStore.id})
      RETURNING id
    `;
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

  Admin-panel: http://localhost:3001/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((e) => {
  console.error("❌ Setup failed:", e.message);
  process.exit(1);
});
