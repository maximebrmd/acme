// Meta's callbacks about a Facebook user, through the whole server as the
// composition root builds it: the user's sign-ins to Meta's ad network run
// on the same app, so a deauthorization marks them to sign in again and a
// data deletion removes them with their ad accounts, as it removes the
// channels the user connected.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Redacted, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { metaApp, signedRequest } from "#test/channels/fakes/fake-meta.ts";
import {
  MigratedSqlLive,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";

const settings = {
  ...unconfirmedEmails,
  META_APP_ID: metaApp.appId,
  META_APP_SECRET: Redacted.value(metaApp.appSecret),
};

const Test = Layer.mergeAll(TestApp.layerWith(settings), MigratedSqlLive);

const AccessSchema = Schema.Array(Schema.Struct({ access: Schema.String }));

const CountSchema = Schema.Array(Schema.Struct({ count: Schema.Number }));

// A random UUID with the version digit of v7.
const uuid7 = () => {
  const random = randomUUID();

  return `${random.slice(0, 14)}7${random.slice(15)}`;
};

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "Meta's callbacks, for ads",
  (it) => {
    it.effect(
      "mark a Facebook user's ad network sign-ins to sign in again, then delete them with their ad accounts",
      () =>
        Effect.gen(function* reaches() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const owner = yield* signedUpUnconfirmed("meta-callbacks-ads");
          const workspaceId = yield* workspaceOf(owner, "Meta callbacks");

          // Meta scopes a user's id to the app: a synthetic one of its
          // shape, this run's own.
          const userId = `1022${String(Date.now()).slice(-12)}`;
          const grantId = uuid7();

          yield* sql`INSERT INTO ads.grants (id, workspace_id, network, platform_user_id, token, token_key_id, scopes, access, created_at, updated_at)
            VALUES (${grantId}, ${workspaceId}, 'meta', ${userId}, 'synthetic.iv.ciphertext', 'synthetic', ARRAY['ads_read'], 'working', now(), now())`;
          yield* sql`INSERT INTO ads.accounts (id, workspace_id, grant_id, network, external_id, name, currency, time_zone, status, connected_at, next_sync_at, spending_enabled)
            VALUES (${uuid7()}, ${workspaceId}, ${grantId}, 'meta', '1001', 'Synthetic account', 'EUR', 'Europe/Paris', 'active', now(), now() + interval '1 day', false)`;

          const signed = (algorithm = "HMAC-SHA256") =>
            signedRequest(
              {
                algorithm,
                issued_at: Math.floor(Date.now() / 1000),
                user_id: userId,
              },
              metaApp.appSecret
            );

          const deauthorized = yield* app.request(
            "/api/data-deletion/facebook/deauthorize",
            { form: { signed_request: signed() } }
          );

          assert.strictEqual(deauthorized.status, 204);
          assert.deepStrictEqual(
            yield* sql`SELECT access FROM ads.grants WHERE id = ${grantId}`.pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(AccessSchema))
            ),
            [{ access: "reconnectNeeded" }]
          );

          const deleted = yield* app.request("/api/data-deletion/facebook", {
            form: { signed_request: signed() },
          });

          assert.strictEqual(deleted.status, 200);

          const left = (table: "accounts" | "grants") =>
            sql`SELECT count(*)::int AS count FROM ads.${sql(table)} WHERE workspace_id = ${workspaceId}`.pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(CountSchema))
            );

          assert.deepStrictEqual(yield* left("grants"), [{ count: 0 }]);
          assert.deepStrictEqual(yield* left("accounts"), [{ count: 0 }]);
        })
    );
  }
);
