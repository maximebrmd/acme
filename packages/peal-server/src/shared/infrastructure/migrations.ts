import path from "node:path";

import { migrate as migrateDrizzle } from "drizzle-orm/effect-postgres/migrator";
import type { MigrationConfig } from "drizzle-orm/migrator";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { Drizzle } from "#shared/infrastructure/database.ts";

// Where drizzle-kit writes the migrations it generates from the schema files
// (see drizzle.config.ts): packages/acme-server/drizzle.
export const migrationsFolder = path.join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "drizzle"
);

// Applies the pending migrations with Drizzle's migrator, which records them
// in drizzle.__drizzle_migrations. It all runs in one transaction that holds an
// advisory lock, so servers starting together take turns and each migration
// runs once.
export const migrate = Effect.fn("Database.migrate")(function* migrate(
  config: MigrationConfig
) {
  const sql = yield* SqlClient.SqlClient;
  const db = yield* Drizzle;

  yield* sql.withTransaction(
    Effect.gen(function* migrateLocked() {
      yield* sql`SELECT pg_advisory_xact_lock(hashtext('acme-server/migrations'))`;
      yield* migrateDrizzle(db, config);
    })
  );
});

// Brings the database up to date when the server starts.
export const MigrationsLive = Layer.effectDiscard(
  migrate({ migrationsFolder })
);
