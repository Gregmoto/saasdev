/**
 * Lightweight startup seed — runs on every API boot.
 *
 * Upserts ALL seed accounts (super-admin + demo users) so credentials are
 * always correct after a Railway deploy, regardless of previous DB state.
 * Also clears Redis brute-force lockouts so previous failed attempts don't
 * block the accounts.
 */
import postgres from "postgres";
import { Redis } from "ioredis";
import { hashPassword } from "../lib/password.js";

const SEEDS = [
  {
    email: "info@gregmoto.se",
    pass: "ShopMan2026!",
    storeName: "ShopMan Platform",
    storeSlug: "platform-admin",
    plan: "enterprise" as const,
    role: "store_admin" as const,
    isPlatformAdmin: true,
  },
  {
    email: "marketplace@demo.shopman.dev",
    pass: "Marketplace2026!",
    storeName: "Demo Marketplace",
    storeSlug: "demo-marketplace",
    plan: "growth" as const,
    role: "marketplace_owner" as const,
    isPlatformAdmin: false,
  },
  {
    email: "user@demo.shopman.dev",
    pass: "User2026!",
    storeName: "Demo Store",
    storeSlug: "demo-store",
    plan: "starter" as const,
    role: "store_admin" as const,
    isPlatformAdmin: false,
  },
] as const;

export async function runStartupSeed(): Promise<void> {
  const DB_URL = process.env["DATABASE_URL"];
  if (!DB_URL) {
    console.warn("[startup-seed] DATABASE_URL not set — skipping seed");
    return;
  }

  // ── 1. Clear Redis brute-force lockouts ─────────────────────────────────────
  const REDIS_URL = process.env["REDIS_URL"];
  if (REDIS_URL) {
    try {
      const redis = new Redis(REDIS_URL, { lazyConnect: true, enableReadyCheck: false });
      await redis.connect();
      const keys: string[] = [];
      for (const seed of SEEDS) {
        const e = seed.email.toLowerCase();
        keys.push(`auth:locked:${e}`, `auth:fails:${e}`);
      }
      await redis.del(...keys);
      await redis.quit();
      console.log("[startup-seed] Cleared lockout keys for all seed accounts");
    } catch {
      // Non-fatal — Redis might be briefly unavailable on startup
    }
  }

  const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });

  try {
    for (const seed of SEEDS) {
      // a. Upsert store account
      const storeRows = await sql<Array<{ id: string }>>`
        INSERT INTO store_accounts (name, slug, plan, status, is_active)
        VALUES (${seed.storeName}, ${seed.storeSlug}, ${seed.plan}, 'active', true)
        ON CONFLICT (slug) DO UPDATE
          SET is_active = true, status = 'active', updated_at = now()
        RETURNING id
      `;
      const storeId = storeRows[0]?.id;
      if (!storeId) continue;

      // b. Upsert user with fresh password hash
      const hash = await hashPassword(seed.pass);
      const userRows = await sql<Array<{ id: string }>>`
        INSERT INTO auth_users (email, password_hash, is_active, home_store_account_id)
        VALUES (${seed.email}, ${hash}, true, ${storeId})
        ON CONFLICT (email) DO UPDATE
          SET password_hash         = EXCLUDED.password_hash,
              is_active             = true,
              home_store_account_id = EXCLUDED.home_store_account_id,
              updated_at            = now()
        RETURNING id
      `;
      const userId = userRows[0]?.id;
      if (!userId) continue;

      // c. Store membership
      await sql`
        INSERT INTO store_memberships (user_id, store_account_id, role, is_active, accepted_at)
        VALUES (${userId}, ${storeId}, ${seed.role}, true, now())
        ON CONFLICT (user_id, store_account_id) DO UPDATE
          SET role = ${seed.role}, is_active = true, updated_at = now()
      `;

      // d. Platform membership (super-admin only)
      if (seed.isPlatformAdmin) {
        await sql`
          INSERT INTO platform_memberships (user_id, is_active)
          VALUES (${userId}, true)
          ON CONFLICT (user_id) DO UPDATE SET is_active = true, updated_at = now()
        `;
      }

      console.log(`[startup-seed] Ready: ${seed.email}`);
    }
  } catch (err) {
    // Non-fatal — don't crash the server if seed fails
    console.error("[startup-seed] Warning:", err instanceof Error ? err.message : String(err));
  } finally {
    await sql.end();
  }
}
