/**
 * Reset / upsert the platform super-admin account.
 *
 * Safe to run multiple times — uses ON CONFLICT DO UPDATE so it always
 * ensures the correct password hash and active platform membership.
 *
 * Run on Railway:
 *   railway run npx tsx src/db/reset-superadmin.ts
 *
 * Or locally (set DATABASE_URL first):
 *   DATABASE_URL=postgres://... npx tsx src/db/reset-superadmin.ts
 */
import postgres from "postgres";
import { hashPassword } from "../lib/password.js";

const DB_URL =
  process.env["DATABASE_URL"] ?? "postgres://saasshop:saasshop@localhost:5432/saasshop";

const SUPER_EMAIL = "info@gregmoto.se";
const SUPER_PASS  = "ShopMan2026!";

const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });

async function main() {
  console.log(`\n🔐 Resetting platform super-admin: ${SUPER_EMAIL}\n`);

  const passwordHash = await hashPassword(SUPER_PASS);

  // ── 1. Ensure the "platform-admin" store account exists ─────────────────
  const storeRows = await sql<Array<{ id: string }>>`
    INSERT INTO store_accounts (name, slug, plan, status, is_active)
    VALUES ('ShopMan Platform', 'platform-admin', 'enterprise', 'active', true)
    ON CONFLICT (slug) DO UPDATE
      SET is_active = true, status = 'active', updated_at = now()
    RETURNING id
  `;
  const storeId = storeRows[0]?.id;
  if (!storeId) throw new Error("Could not upsert store account");
  console.log(`  ✅ Store account: ${storeId}`);

  // ── 2. Upsert the auth_user row with fresh password hash ─────────────────
  const userRows = await sql<Array<{ id: string }>>`
    INSERT INTO auth_users (email, password_hash, is_active, home_store_account_id)
    VALUES (${SUPER_EMAIL}, ${passwordHash}, true, ${storeId})
    ON CONFLICT (email) DO UPDATE
      SET password_hash         = EXCLUDED.password_hash,
          is_active             = true,
          home_store_account_id = EXCLUDED.home_store_account_id,
          updated_at            = now()
    RETURNING id
  `;
  const userId = userRows[0]?.id;
  if (!userId) throw new Error("Could not upsert auth user");
  console.log(`  ✅ Auth user: ${userId}`);

  // ── 3. Ensure store membership ───────────────────────────────────────────
  await sql`
    INSERT INTO store_memberships (user_id, store_account_id, role, is_active, accepted_at)
    VALUES (${userId}, ${storeId}, 'store_admin', true, now())
    ON CONFLICT (user_id, store_account_id) DO UPDATE
      SET role = 'store_admin', is_active = true, updated_at = now()
  `;
  console.log(`  ✅ Store membership`);

  // ── 4. Ensure platform membership ───────────────────────────────────────
  await sql`
    INSERT INTO platform_memberships (user_id, is_active)
    VALUES (${userId}, true)
    ON CONFLICT (user_id) DO UPDATE
      SET is_active = true, updated_at = now()
  `;
  console.log(`  ✅ Platform membership\n`);

  await sql.end();

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  Super-admin reset complete!

   E-post:   ${SUPER_EMAIL}
   Lösenord: ${SUPER_PASS}

   Admin:    https://admin-production-42ec.up.railway.app/login
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch((e: unknown) => {
  console.error("❌ Failed:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
