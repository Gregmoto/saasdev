import type { FastifyInstance } from "fastify";

async function checkDb(app: FastifyInstance): Promise<boolean> {
  try {
    await app.db.execute("SELECT 1" as never);
    return true;
  } catch {
    return false;
  }
}

async function checkRedis(app: FastifyInstance): Promise<boolean> {
  try {
    await app.redis.ping();
    return true;
  } catch {
    return false;
  }
}

// ── Route catalogue ──────────────────────────────────────────────────────────

const API_MODULES: Array<{
  title: string;
  color: string;
  routes: Array<{ method: string; path: string; description: string }>;
}> = [
  {
    title: "Auth & Sessions",
    color: "#6366f1",
    routes: [
      { method: "POST", path: "/auth/register", description: "Register new store account" },
      { method: "POST", path: "/auth/login", description: "Login with email + password" },
      { method: "POST", path: "/auth/logout", description: "Destroy session" },
      { method: "GET",  path: "/auth/me", description: "Current session info" },
      { method: "GET",  path: "/auth/invite/preview", description: "Invite token metadata" },
      { method: "POST", path: "/auth/totp/enroll", description: "Enrol TOTP 2FA" },
      { method: "POST", path: "/auth/totp/verify", description: "Verify TOTP code" },
      { method: "POST", path: "/auth/totp/disable", description: "Disable TOTP" },
    ],
  },
  {
    title: "Store Accounts & Members",
    color: "#8b5cf6",
    routes: [
      { method: "GET",    path: "/api/store-accounts", description: "List store accounts" },
      { method: "POST",   path: "/api/store-accounts", description: "Create store account" },
      { method: "GET",    path: "/api/store-accounts/:id", description: "Get store account" },
      { method: "PATCH",  path: "/api/store-accounts/:id", description: "Update store account" },
      { method: "GET",    path: "/api/members", description: "List members" },
      { method: "POST",   path: "/api/invites", description: "Invite member" },
      { method: "DELETE", path: "/api/invites/:id", description: "Revoke invite" },
      { method: "POST",   path: "/auth/invite/accept", description: "Accept invite" },
    ],
  },
  {
    title: "Products",
    color: "#10b981",
    routes: [
      { method: "GET",    path: "/api/products", description: "List products (paginated)" },
      { method: "POST",   path: "/api/products", description: "Create product" },
      { method: "GET",    path: "/api/products/:id", description: "Get product" },
      { method: "PATCH",  path: "/api/products/:id", description: "Update product" },
      { method: "DELETE", path: "/api/products/:id", description: "Delete product" },
      { method: "GET",    path: "/api/products/:id/variants", description: "List variants" },
      { method: "POST",   path: "/api/products/:id/variants", description: "Add variant" },
      { method: "PATCH",  path: "/api/products/:id/variants/:variantId", description: "Update variant" },
    ],
  },
  {
    title: "Bundles",
    color: "#f59e0b",
    routes: [
      { method: "GET",    path: "/api/bundles/:id", description: "Get bundle with components" },
      { method: "GET",    path: "/api/bundles/:id/stock", description: "Computed bundle stock" },
      { method: "POST",   path: "/api/bundles/:id/option-groups", description: "Add option group" },
      { method: "PATCH",  path: "/api/bundles/:id/option-groups/:groupId", description: "Update group" },
      { method: "DELETE", path: "/api/bundles/:id/option-groups/:groupId", description: "Remove group" },
      { method: "POST",   path: "/api/bundles/:id/components", description: "Add component" },
      { method: "PATCH",  path: "/api/bundles/:id/components/:componentId", description: "Update component" },
      { method: "DELETE", path: "/api/bundles/:id/components/:componentId", description: "Remove component" },
    ],
  },
  {
    title: "Inventory",
    color: "#3b82f6",
    routes: [
      { method: "GET",   path: "/api/inventory/levels", description: "List inventory levels" },
      { method: "POST",  path: "/api/inventory/levels", description: "Set inventory level" },
      { method: "POST",  path: "/api/inventory/adjustments", description: "Adjust quantity" },
      { method: "GET",   path: "/api/inventory/warehouses", description: "List warehouses" },
      { method: "POST",  path: "/api/inventory/warehouses", description: "Create warehouse" },
      { method: "POST",  path: "/api/inventory/reservations/allocate", description: "Allocate inventory" },
      { method: "POST",  path: "/api/inventory/reservations/commit", description: "Commit reservations" },
      { method: "POST",  path: "/api/inventory/reservations/release", description: "Release reservations" },
      { method: "GET",   path: "/api/inventory/config", description: "Get allocation config" },
      { method: "PATCH", path: "/api/inventory/config", description: "Update allocation config" },
    ],
  },
  {
    title: "Orders & Customers",
    color: "#ec4899",
    routes: [
      { method: "GET",   path: "/api/orders", description: "List orders (paginated)" },
      { method: "POST",  path: "/api/orders", description: "Create order" },
      { method: "GET",   path: "/api/orders/:id", description: "Get order" },
      { method: "PATCH", path: "/api/orders/:id/status", description: "Update order status" },
      { method: "GET",   path: "/api/customers", description: "List customers" },
      { method: "POST",  path: "/api/customers", description: "Create customer" },
      { method: "GET",   path: "/api/customers/:id", description: "Get customer" },
      { method: "PATCH", path: "/api/customers/:id", description: "Update customer" },
    ],
  },
  {
    title: "Shops & Multi-store",
    color: "#14b8a6",
    routes: [
      { method: "GET",    path: "/api/shops", description: "List shops" },
      { method: "POST",   path: "/api/shops", description: "Create shop" },
      { method: "GET",    path: "/api/shops/:id", description: "Get shop" },
      { method: "GET",    path: "/api/shops/:id/stock", description: "Per-shop stock view" },
      { method: "GET",    path: "/api/shops/:id/warehouses", description: "Linked warehouses" },
      { method: "POST",   path: "/api/shops/:id/warehouses", description: "Link warehouse to shop" },
      { method: "PATCH",  path: "/api/shops/:id/warehouses/:whId", description: "Update warehouse priority" },
      { method: "DELETE", path: "/api/shops/:id/warehouses/:whId", description: "Unlink warehouse" },
    ],
  },
  {
    title: "Suppliers & Feeds",
    color: "#f97316",
    routes: [
      { method: "GET",    path: "/api/suppliers", description: "List suppliers" },
      { method: "POST",   path: "/api/suppliers", description: "Create supplier" },
      { method: "GET",    path: "/api/suppliers/:id/feeds", description: "List feeds" },
      { method: "POST",   path: "/api/suppliers/:id/feeds", description: "Create feed (FTP/SFTP/API/CSV)" },
      { method: "GET",    path: "/api/suppliers/feeds/:feedId/runs", description: "List feed runs" },
      { method: "POST",   path: "/api/suppliers/feeds/:feedId/runs", description: "Trigger feed run" },
      { method: "POST",   path: "/api/suppliers/feeds/:feedId/runs/preview", description: "Dry-run preview" },
      { method: "GET",    path: "/api/suppliers/runs/:runId/errors.csv", description: "Download error report" },
      { method: "GET",    path: "/api/suppliers/sku-mappings", description: "List SKU mappings" },
      { method: "POST",   path: "/api/suppliers/sku-mappings", description: "Create SKU mapping" },
      { method: "GET",    path: "/api/suppliers/review-queue", description: "Unknown SKU review queue" },
      { method: "POST",   path: "/api/suppliers/review-queue/:id/resolve", description: "Resolve review item" },
    ],
  },
  {
    title: "Import Center",
    color: "#a855f7",
    routes: [
      { method: "GET",   path: "/api/import/profiles", description: "List saved import profiles" },
      { method: "POST",  path: "/api/import/profiles", description: "Create import profile" },
      { method: "PATCH", path: "/api/import/profiles/:id", description: "Update profile" },
      { method: "DELETE",path: "/api/import/profiles/:id", description: "Delete profile" },
      { method: "GET",   path: "/api/import/jobs", description: "List import jobs" },
      { method: "POST",  path: "/api/import/jobs", description: "Create import job (Shopify/WC/PS)" },
      { method: "PATCH", path: "/api/import/jobs/:id/entities", description: "Select entities to import" },
      { method: "PATCH", path: "/api/import/jobs/:id/mapping", description: "Set field mapping" },
      { method: "PATCH", path: "/api/import/jobs/:id/mode", description: "Set mode (create/update)" },
      { method: "POST",  path: "/api/import/jobs/:id/validate", description: "Validate credentials" },
      { method: "POST",  path: "/api/import/jobs/:id/dry-run", description: "Preview without writing" },
      { method: "POST",  path: "/api/import/jobs/:id/run", description: "Start live import" },
      { method: "POST",  path: "/api/import/jobs/:id/resume", description: "Resume failed job" },
      { method: "POST",  path: "/api/import/jobs/:id/cancel", description: "Cancel job" },
      { method: "GET",   path: "/api/import/jobs/:id/conflicts", description: "List data conflicts" },
      { method: "PATCH", path: "/api/import/jobs/:id/conflicts/:cid", description: "Resolve conflict" },
      { method: "POST",  path: "/api/import/jobs/:id/conflicts/bulk-resolve", description: "Bulk resolve conflicts" },
      { method: "GET",   path: "/api/import/jobs/:id/conflicts.csv", description: "Download conflict report" },
      { method: "GET",   path: "/api/import/jobs/:id/errors.csv", description: "Download error report" },
    ],
  },
  {
    title: "Plans, Domains & Integrations",
    color: "#64748b",
    routes: [
      { method: "GET",   path: "/api/public/plans", description: "List available plans" },
      { method: "GET",   path: "/api/domains", description: "List custom domains" },
      { method: "POST",  path: "/api/domains", description: "Add custom domain" },
      { method: "DELETE",path: "/api/domains/:id", description: "Remove domain" },
      { method: "GET",   path: "/api/integrations", description: "List integrations" },
      { method: "POST",  path: "/api/integrations/:type/connect", description: "Connect integration" },
      { method: "DELETE",path: "/api/integrations/:type", description: "Disconnect integration" },
    ],
  },
];

function methodColor(method: string): string {
  const colors: Record<string, string> = {
    GET:    "#3b82f6",
    POST:   "#10b981",
    PATCH:  "#f59e0b",
    PUT:    "#f59e0b",
    DELETE: "#ef4444",
  };
  return colors[method] ?? "#64748b";
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // ── Visual landing page ──────────────────────────────────────────────────────
  app.get("/", async (_request, reply) => {
    const [db, redis] = await Promise.all([checkDb(app), checkRedis(app)]);
    const ok = db && redis;

    const badge = (up: boolean) =>
      up ? `<span class="badge up">UP</span>` : `<span class="badge down">DOWN</span>`;

    const routeRows = API_MODULES.map((mod) => {
      const rows = mod.routes.map((r) => `
        <tr>
          <td><span class="method" style="background:${methodColor(r.method)}20;color:${methodColor(r.method)}">${r.method}</span></td>
          <td class="path">${r.path}</td>
          <td class="desc">${r.description}</td>
        </tr>`).join("");
      return `
        <div class="module">
          <div class="module-header" style="border-left:3px solid ${mod.color}">
            <span class="module-dot" style="background:${mod.color}"></span>
            ${mod.title}
            <span class="route-count">${mod.routes.length} routes</span>
          </div>
          <table class="route-table">${rows}</table>
        </div>`;
    }).join("");

    const totalRoutes = API_MODULES.reduce((n, m) => n + m.routes.length, 0);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SaaS Shop API</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0b0f;
      color: #e2e8f0;
      min-height: 100vh;
      padding: 32px 24px 64px;
    }
    .header {
      max-width: 960px;
      margin: 0 auto 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .logo { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
    .logo span { color: #6366f1; }
    .status-bar {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #94a3b8;
    }
    .badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 99px;
    }
    .badge.up   { background: #14532d; color: #4ade80; }
    .badge.down { background: #450a0a; color: #f87171; }
    .summary {
      max-width: 960px;
      margin: 0 auto 28px;
      font-size: 13px;
      color: #64748b;
    }
    .summary strong { color: #94a3b8; }
    .grid {
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .module {
      background: #13151f;
      border: 1px solid #1e2235;
      border-radius: 10px;
      overflow: hidden;
    }
    .module-header {
      padding: 11px 16px;
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
      background: #0f1120;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .module-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .route-count {
      margin-left: auto;
      font-size: 11px;
      font-weight: 400;
      color: #475569;
    }
    .route-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    .route-table tr {
      border-top: 1px solid #1a1d2e;
    }
    .route-table tr:hover { background: #0f1120; }
    .route-table td {
      padding: 7px 16px;
      vertical-align: middle;
    }
    .method {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: monospace;
      letter-spacing: 0.3px;
    }
    .path {
      font-family: monospace;
      color: #93c5fd;
      font-size: 12px;
      padding-left: 8px;
    }
    .desc { color: #64748b; }
    @media (max-width: 600px) {
      .desc { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SaaS<span>Shop</span> <span style="font-weight:300;color:#475569;font-size:14px">REST API</span></div>
    <div class="status-bar">
      <div class="status-item">PostgreSQL ${badge(db)}</div>
      <div class="status-item">Redis ${badge(redis)}</div>
      <div class="status-item">API ${badge(true)}</div>
    </div>
  </div>

  <div class="summary">
    <strong>${API_MODULES.length} modules</strong> · <strong>${totalRoutes} routes</strong> · environment: development
  </div>

  <div class="grid">
    ${routeRows}
  </div>
</body>
</html>`;

    return reply
      .header("Content-Type", "text/html; charset=utf-8")
      .status(ok ? 200 : 503)
      .send(html);
  });

  // ── JSON health checks ───────────────────────────────────────────────────────
  app.get("/health", async (_request, reply) => {
    const [db, redis] = await Promise.all([checkDb(app), checkRedis(app)]);
    const ok = db && redis;

    return reply.status(ok ? 200 : 503).send({
      status: ok ? "ok" : "degraded",
      checks: { db, redis },
    });
  });

  app.get("/health/ready", async (_request, reply) => {
    return reply.send({ ready: true });
  });
}
