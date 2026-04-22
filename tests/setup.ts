// Ensure env vars exist before any test imports config.ts
process.env["DATABASE_URL"] = process.env["DATABASE_URL"] ?? "postgres://saasshop:saasshop@localhost:5432/saasshop_test";
process.env["REDIS_URL"] = process.env["REDIS_URL"] ?? "redis://localhost:6379";
process.env["SESSION_SECRET"] = "test-secret-at-least-32-chars-long!!";
process.env["NODE_ENV"] = "test";
