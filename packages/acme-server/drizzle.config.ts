import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` reads the tables each context declares in its
// infrastructure layer and writes the SQL that changes the database to match
// into ./drizzle, one folder per migration. The server applies them when it
// starts (src/shared/infrastructure/migrations.ts).
export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/*/infrastructure/schema.ts",
});
