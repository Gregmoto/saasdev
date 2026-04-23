import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgres://saasshop:saasshop@localhost:5432/saasshop",
  },
  verbose: true,
  strict: true,
});
