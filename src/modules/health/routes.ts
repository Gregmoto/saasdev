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

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // ── Visual landing page ──────────────────────────────────────────────────────
  app.get("/", async (_request, reply) => {
    const [db, redis] = await Promise.all([checkDb(app), checkRedis(app)]);
    const ok = db && redis;

    const badge = (up: boolean) =>
      up
        ? `<span class="badge up">UP</span>`
        : `<span class="badge down">DOWN</span>`;

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
      background: #0f1117;
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1a1d2e;
      border: 1px solid #2d3148;
      border-radius: 16px;
      padding: 48px 56px;
      max-width: 480px;
      width: 100%;
      box-shadow: 0 24px 48px rgba(0,0,0,0.4);
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #fff;
      margin-bottom: 4px;
    }
    .logo span { color: #6366f1; }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 36px;
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 0;
      border-bottom: 1px solid #2d3148;
    }
    .status-row:last-child { border-bottom: none; }
    .service-name { font-size: 14px; color: #94a3b8; }
    .badge {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 3px 10px;
      border-radius: 99px;
    }
    .badge.up   { background: #14532d; color: #4ade80; }
    .badge.down { background: #450a0a; color: #f87171; }
    .overall {
      margin-top: 32px;
      padding: 14px 20px;
      border-radius: 10px;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
    }
    .overall.ok   { background: #14532d33; color: #4ade80; border: 1px solid #14532d; }
    .overall.down { background: #450a0a33; color: #f87171; border: 1px solid #450a0a; }
    .meta {
      margin-top: 28px;
      font-size: 12px;
      color: #475569;
      text-align: center;
    }
    .meta a { color: #6366f1; text-decoration: none; }
    .meta a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">SaaS<span>Shop</span></div>
    <div class="subtitle">REST API — development</div>

    <div class="status-row">
      <span class="service-name">PostgreSQL</span>
      ${badge(db)}
    </div>
    <div class="status-row">
      <span class="service-name">Redis</span>
      ${badge(redis)}
    </div>
    <div class="status-row">
      <span class="service-name">API server</span>
      ${badge(true)}
    </div>

    <div class="overall ${ok ? "ok" : "down"}">
      ${ok ? "All systems operational" : "One or more services are down"}
    </div>

    <div class="meta">
      <a href="/health">/health</a> &nbsp;·&nbsp;
      <a href="/health/ready">/health/ready</a>
    </div>
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
