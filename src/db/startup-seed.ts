/**
 * Lightweight startup seed — runs on every API boot.
 *
 * Only touches the platform super-admin account so credentials are always
 * correct after a Railway deploy. All other seed data (demo stores, etc.)
 * lives in migrate-and-seed.ts which is run manually.
 */
import postgres from "postgres";
import { hashPassword } from "../lib/password.js";

const SUPER_EMAIL = "info@gregmoto.se";
const SUPER_PASS  = "ShopMan2026!";

export async function runStartupSeed(): Promise<void> {
  const DB_URL = process.env["DATABASE_URL"];
  if (!DB_URL) {
    console.warn("[startup-seed] DATABASE_URL not set — skipping seed");
    return;
  }

  const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });

  try {
    // 1. Ensure platform-admin store account
    const storeRows = await sql<Array<{ id: string }>>`
      INSERT INTO store_accounts (name, slug, plan, status, is_active)
      VALUES ('ShopMan Platform', 'platform-admin', 'enterprise', 'active', true)
      ON CONFLICT (slug) DO UPDATE
        SET is_active = true, status = 'active', updated_at = now()
      RETURNING id
    `;
    const storeId = storeRows[0]?.id;
    if (!storeId) return;

    // 2. Upsert super-admin user with correct password hash
    const hash = await hashPassword(SUPER_PASS);
    const userRows = await sql<Array<{ id: string }>>`
      INSERT INTO auth_users (email, password_hash, is_active, home_store_account_id)
      VALUES (${SUPER_EMAIL}, ${hash}, true, ${storeId})
      ON CONFLICT (email) DO UPDATE
        SET password_hash         = EXCLUDED.password_hash,
            is_active             = true,
            home_store_account_id = EXCLUDED.home_store_account_id,
            updated_at            = now()
      RETURNING id
    `;
    const userId = userRows[0]?.id;
    if (!userId) return;

    // 3. Ensure store membership
    await sql`
      INSERT INTO store_memberships (user_id, store_account_id, role, is_active, accepted_at)
      VALUES (${userId}, ${storeId}, 'store_admin', true, now())
      ON CONFLICT (user_id, store_account_id) DO UPDATE
        SET role = 'store_admin', is_active = true, updated_at = now()
    `;

    // 4. Ensure platform membership
    await sql`
      INSERT INTO platform_memberships (user_id, is_active)
      VALUES (${userId}, true)
      ON CONFLICT (user_id) DO UPDATE SET is_active = true, updated_at = now()
    `;

    console.log(`[startup-seed] Super-admin ready: ${SUPER_EMAIL}`);
  } catch (err) {
    // Non-fatal — don't crash the server if seed fails
    console.error("[startup-seed] Warning:", err instanceof Error ? err.message : String(err));
  } finally {
    await sql.end();
  }
}
