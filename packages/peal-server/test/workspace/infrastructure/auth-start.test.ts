// Better Auth checks that the schema it is given holds every model its
// options write, on the first request unless asked: the server asks when it
// starts, so a model missing from authTables stops the start instead.
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import type { DrizzleAdapterConfig } from "@better-auth/drizzle-adapter/relations-v2";
import { assert, describe, it } from "@effect/vitest";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect, Schema } from "effect";
import { Pool } from "pg";

import {
  account,
  session,
  user,
  verification,
} from "#workspace/infrastructure/auth-schema.generated.ts";
import { AuthStartFailed } from "#workspace/infrastructure/auth/auth-start-failed.ts";
import { authStarted } from "#workspace/infrastructure/auth/auth-start.ts";

const isSchemaMismatch = Schema.is(
  Schema.Struct({ code: Schema.Literal("SCHEMA_MISMATCH") })
);

const authOver = (schema: DrizzleAdapterConfig["schema"]) =>
  betterAuth({
    database: drizzleAdapter(drizzle({ client: pool }), {
      provider: "pg",
      schema,
      schemaName: "auth",
    }),
    secret: "synthetic-auth-start-secret-0123456789abcdef",
  });

// Never connected: the check reads the schema it is given, not the database.
const pool = new Pool({
  connectionString: "postgres://synthetic@127.0.0.1:1/synthetic",
});

describe("Better Auth's start", () => {
  it.effect("starts on a schema that holds every model", () =>
    authStarted(authOver({ account, session, user, verification }))
  );

  it.effect("fails on a schema that lacks a model the options write", () =>
    Effect.gen(function* lacking() {
      const failure = yield* Effect.flip(
        authStarted(authOver({ session, user, verification }))
      );

      assert.instanceOf(failure, AuthStartFailed);
      assert.isTrue(isSchemaMismatch(failure.cause));
    })
  );
});
