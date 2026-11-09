import { drizzle } from "drizzle-orm/node-postgres";
import { Config, Effect, Redacted } from "effect";
import { Pool } from "pg";

import {
  account,
  apikey,
  authRelations,
  deviceCode,
  invitation,
  jwks,
  member,
  oauthAccessToken,
  oauthClient,
  oauthClientAssertion,
  oauthClientResource,
  oauthConsent,
  oauthRefreshToken,
  oauthResource,
  organization,
  rateLimit,
  session,
  user,
  verification,
} from "#workspace/infrastructure/auth-schema.generated.ts";

// Every Better Auth model's table, by model name. The adapter finds tables
// with relations through the database, and the others only here; a model
// missing from both fails Better Auth's schema check on the first request.
const authTables = {
  account,
  apikey,
  deviceCode,
  invitation,
  jwks,
  member,
  oauthAccessToken,
  oauthClient,
  oauthClientAssertion,
  oauthClientResource,
  oauthConsent,
  oauthRefreshToken,
  oauthResource,
  organization,
  rateLimit,
  session,
  user,
  verification,
};

/**
 * The database Better Auth runs its queries on: promise-based Drizzle over a
 * small node-postgres pool of its own. Better Auth awaits each query, which
 * the Effect driver the rest of the server uses does not support.
 */
export const makeAuthDatabase = Effect.fn("makeAuthDatabase")(
  function* makeAuthDatabase(poolSize: number) {
    const url = yield* Config.Redacted("DATABASE_URL");

    const pool = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Pool({
            application_name: "acme-server/better-auth",
            connectionString: Redacted.value(url),
            max: poolSize,
          })
      ),
      (opened) =>
        Effect.promise(async () => {
          await opened.end();
        })
    );

    // An idle connection that breaks, as when Postgres restarts, is reported on
    // the pool; unhandled, Node would treat it as a crash. The pool replaces it.
    const logLost = Effect.runForkWith(yield* Effect.context());

    pool.on("error", (error) => {
      logLost(
        Effect.logWarning("Better Auth lost a database connection", error)
      );
    });

    return {
      db: drizzle({ client: pool, relations: authRelations }),
      tables: authTables,
    };
  }
);
