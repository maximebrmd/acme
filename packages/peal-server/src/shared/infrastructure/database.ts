import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Config, Context, Layer } from "effect";

// The Postgres connection pool, read from DATABASE_URL. It provides both
// PgClient and Effect's generic SqlClient. Connections open on first use, so
// the layer builds while the database is down and queries fail instead.
export const SqlLive = PgClient.layerConfig({
  applicationName: Config.succeed("peal-server"),
  url: Config.Redacted("DATABASE_URL"),
});

// The Drizzle database, running its queries through the pool above.
// Repositories build their queries with it from the tables that each context
// declares in src/<context>/infrastructure/schema.ts.
export class Drizzle extends Context.Service<
  Drizzle,
  PgDrizzle.EffectPgDatabase
>()("peal-server/shared/infrastructure/Drizzle") {
  static readonly layer = Layer.effect(Drizzle, PgDrizzle.makeWithDefaults());
}

// PgClient, SqlClient and Drizzle, sharing one pool.
export const DatabaseLive = Drizzle.layer.pipe(Layer.provideMerge(SqlLive));
