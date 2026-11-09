import { integer, pgSchema, text } from "drizzle-orm/pg-core";

// A throwaway table for the migration tests: they generate its migration with
// drizzle-kit, apply it, then drop the schema it lives in.
export const probeSchema = pgSchema("migration_probe");

export const probes = probeSchema.table("probes", {
  id: integer().primaryKey(),
  label: text().notNull(),
});
