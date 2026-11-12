import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { ConnectedAppStore } from "#workspace/application/connected-app-store.ts";
import { DrizzleConnectedAppStore } from "#workspace/infrastructure/drizzle-connected-app-store.ts";

// What an OAuth client may do for a user in one workspace, read from its
// consents and live refresh tokens there or bound to none: never the
// scopes it was given for another workspace.

const StoreTest = DrizzleConnectedAppStore.pipe(
  Layer.provideMerge(DatabaseTest)
);

const now = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const seeded = Effect.gen(function* seeded() {
  const sql = yield* SqlClient.SqlClient;
  const userId = UserIdSchema.make(randomUUID());
  const clientId = `synthetic-${randomUUID()}`;
  const cli = `synthetic-cli-${randomUUID()}`;
  const writing = WorkspaceIdSchema.make(randomUUID());
  const publishing = WorkspaceIdSchema.make(randomUUID());

  yield* sql`INSERT INTO auth."user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${userId}, 'Synthetic member', ${`${userId}@example.test`}, true, now(), now())`;

  for (const id of [clientId, cli]) {
    yield* sql`INSERT INTO auth.oauth_client (client_id, name, redirect_uris, created_at, updated_at)
      VALUES (${id}, 'Synthetic client', ARRAY['https://client.example.test/callback'], now(), now())`;
  }

  yield* sql`INSERT INTO auth.oauth_consent (client_id, user_id, reference_id, scopes, created_at, updated_at)
    VALUES (${clientId}, ${userId}, ${writing}, ARRAY['openid', 'workspace:write'], now(), now())`;

  yield* sql`INSERT INTO auth.oauth_consent (client_id, user_id, reference_id, scopes, created_at, updated_at)
    VALUES (${clientId}, ${userId}, ${publishing}, ARRAY['openid', 'workspace:publish'], now(), now())`;

  // A command line's token, bound to no workspace, and one revoked.
  yield* sql`INSERT INTO auth.oauth_refresh_token (token, client_id, user_id, reference_id, scopes, created_at, expires_at)
    VALUES (${`synthetic-${randomUUID()}`}, ${cli}, ${userId}, NULL, ARRAY['offline_access', 'workspace:publish'], ${DateTime.toDateUtc(now)}, ${DateTime.toDateUtc(DateTime.add(now, { days: 30 }))})`;

  yield* sql`INSERT INTO auth.oauth_refresh_token (token, client_id, user_id, reference_id, scopes, created_at, expires_at, revoked)
    VALUES (${`synthetic-${randomUUID()}`}, ${cli}, ${userId}, NULL, ARRAY['workspace:ads'], ${DateTime.toDateUtc(now)}, ${DateTime.toDateUtc(DateTime.add(now, { days: 30 }))}, ${DateTime.toDateUtc(now)})`;

  return { cli, clientId, publishing, userId, writing };
});

const cleared = (userId: string, clients: readonly string[]) =>
  SqlClient.SqlClient.use((sql) =>
    sql`DELETE FROM auth."user" WHERE id = ${userId}`.pipe(
      Effect.andThen(
        sql`DELETE FROM auth.oauth_client WHERE client_id IN ${sql.in(clients)}`
      )
    )
  ).pipe(Effect.orDie);

layer(StoreTest)("a client's grant in one workspace", (it) => {
  it.effect("holds the scopes given there, or bound to none", () =>
    Effect.gen(function* grants() {
      const store = yield* ConnectedAppStore;
      const { cli, clientId, publishing, userId, writing } = yield* seeded;

      yield* Effect.gen(function* checks() {
        const elsewhere = WorkspaceIdSchema.make(randomUUID());

        assert.deepStrictEqual(
          yield* store.grantIn(userId, clientId, writing, now),
          Option.some({ bound: true, scopes: ["openid", "workspace:write"] })
        );
        assert.deepStrictEqual(
          yield* store.grantIn(userId, clientId, publishing, now),
          Option.some({ bound: true, scopes: ["openid", "workspace:publish"] })
        );
        assert.deepStrictEqual(
          yield* store.grantIn(userId, clientId, elsewhere, now),
          Option.none()
        );
        assert.deepStrictEqual(
          yield* store.grantIn(userId, cli, elsewhere, now),
          Option.some({
            bound: false,
            scopes: ["offline_access", "workspace:publish"],
          })
        );
      }).pipe(Effect.ensuring(cleared(userId, [clientId, cli])));
    })
  );
});
