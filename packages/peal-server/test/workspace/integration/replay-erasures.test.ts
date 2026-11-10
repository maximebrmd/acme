// A restore of the database brings back what was erased since its backup.
// Here a workspace is deleted and an account closed through the app, the
// rows a restore would bring back are put back, and the ledger kept in the
// object store (the development stack's SeaweedFS) is replayed: both are
// erased again, and nothing else is touched.
import { randomUUID } from "node:crypto";

import { assert, layer } from "@effect/vitest";
import { ConfigProvider, Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";

import { ErasureReplayServicesLive } from "#app/server.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { SqlLive } from "#shared/infrastructure/database.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { storageSettings } from "#test/media/support.ts";
import { ErasureLedger } from "#workspace/application/erasure-ledger.ts";
import { ReplayErasures } from "#workspace/application/replay-erasures.ts";
import { erasureOf } from "#workspace/application/workspace-erasure.ts";
import { S3ErasureLedger } from "#workspace/infrastructure/s3-erasure-ledger.ts";

import { password, signedUp, TestApp, workspaceOf } from "./harness.ts";
import { countOf } from "./seed.ts";

// A ledger of this run's own, and a server French law has keep who held a
// closed account, so the replay holds it again.
const settings = {
  PEAL_LEGAL_RETENTION: "true",
  PEAL_S3_KEY_PREFIX: `tests/replay/${randomUUID()}/`,
};

const own = ConfigProvider.layerAdd(ConfigProvider.fromUnknown(settings), {
  asPrimary: true,
});

const ReplayTest = Layer.mergeAll(
  TestApp.layerWith(settings),
  ErasureReplayServicesLive.pipe(Layer.provide(storageSettings)),
  S3ErasureLedger.pipe(Layer.provide(storageSettings)),
  IdsLive,
  SqlLive
).pipe(Layer.provide(own));

// The tables a restore is simulated on: what names the workspace or the
// account, kept aside before the erasure and put back after it.
const kept = [
  ["auth", "organization", "id"],
  ["auth", "member", "organization_id"],
  ["publishing", "posts", "workspace_id"],
  ["publishing", "idempotency_keys", "workspace_id"],
  ["webhooks", "endpoints", "workspace_id"],
  ["billing", "contract_references", "workspace_id"],
  ["billing", "contract_requests", "workspace_id"],
] as const;

// What an erasure keeps without its workspace, as proof of a contract: a
// restore puts the backup's row in its place.
const outlasting = [
  ["billing", "contract_references", "reference"],
  ["billing", "contract_requests", "id"],
] as const;

// What each workspace holds in those tables, the workspace itself included.
const held = kept.length - 1;

const aside = (table: string) =>
  `restore_${table}_${settings.PEAL_S3_KEY_PREFIX.replaceAll(/\W/gu, "").slice(-12)}`;

// A random UUID with the version digit of v7 reads as a post's id.
const uuid7 = () => {
  const random = randomUUID();

  return `${random.slice(0, 14)}7${random.slice(15)}`;
};

const HeldSchema = Schema.Array(
  Schema.Struct({ closed_at: Schema.Date, email: Schema.String })
);

layer(ReplayTest, { excludeTestServices: true, timeout: "180 seconds" })(
  "replaying the erasure ledger after a restore",
  (it) => {
    it.effect(
      "erases again the workspace and the account a restore brought back, once, and leaves the rest",
      () =>
        Effect.gen(function* appliesAgain() {
          const app = yield* TestApp;
          const sql = yield* SqlClient.SqlClient;
          const replays = yield* ReplayErasures;
          const ledger = yield* ErasureLedger;

          const ana = yield* signedUp("replay-ana");
          const bea = yield* signedUp("replay-bea");
          const cleo = yield* signedUp("replay-cleo");
          const closed = UserIdSchema.make(bea.id);

          const harbour = WorkspaceIdSchema.make(
            yield* workspaceOf(ana, "Harbour")
          );

          const studio = WorkspaceIdSchema.make(
            yield* workspaceOf(bea, "Studio")
          );

          const garden = WorkspaceIdSchema.make(
            yield* workspaceOf(cleo, "Garden")
          );

          // A draft, the key of a request that made a post, a webhook
          // endpoint, a contract's number and a request to cancel it.
          for (const workspaceId of [harbour, studio, garden]) {
            const postId = uuid7();

            yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text)
              VALUES (${postId}, ${workspaceId}, 'draft', 'A synthetic draft a restore brings back.')`;
            yield* sql`INSERT INTO publishing.idempotency_keys (workspace_id, key_digest, request_digest, post_id, created_at)
              VALUES (${workspaceId}, ${randomUUID()}, 'synthetic-request-digest', ${postId}, now())`;
            yield* sql`INSERT INTO webhooks.endpoints (id, workspace_id, url, description, event_types, status, secret, created_at, updated_at)
              VALUES (${uuid7()}, ${workspaceId}, 'https://hooks.example.com/replay', '', ARRAY['post.published'], 'enabled', 'synthetic.iv.ciphertext', now(), now())`;
            yield* sql`INSERT INTO billing.contract_references (reference, stripe_subscription_id, workspace_id, issued_at)
              VALUES (${`PEAL-${randomUUID()}`}, ${`sub_synthetic_${randomUUID()}`}, ${workspaceId}, now())`;
            yield* sql`INSERT INTO billing.contract_requests (id, kind, channel, status, acknowledgement, locale, received_at, workspace_id)
              VALUES (${uuid7()}, 'cancellation', 'session', 'applied', 'sent', 'en', now(), ${workspaceId})`;
          }

          // The backup: what the database held before the erasures.
          for (const [schema, table, column] of kept) {
            yield* sql`CREATE TABLE ${sql(aside(table))} AS SELECT * FROM ${sql(schema)}.${sql(table)} WHERE ${sql(column)} IN (${harbour}, ${studio})`;
          }

          yield* sql`CREATE TABLE ${sql(aside("user"))} AS SELECT * FROM auth."user" WHERE id = ${bea.id}`;
          yield* sql`CREATE TABLE ${sql(aside("account"))} AS SELECT * FROM auth.account WHERE user_id = ${bea.id}`;

          // Ana deletes her workspace; Bea closes her account, which
          // deletes the workspace she had alone.
          assert.strictEqual(
            (yield* app.request(`/api/workspaces/${harbour}`, {
              body: { name: "Harbour" },
              headers: { cookie: ana.cookies },
              method: "DELETE",
            })).status,
            204
          );
          assert.strictEqual(
            (yield* app.request("/api/me", {
              body: { password },
              headers: { cookie: bea.cookies },
              method: "DELETE",
            })).status,
            204
          );

          // The ledger holds both, by id, confirmed, and nothing more.
          const entries = yield* ledger.entries;

          assert.deepStrictEqual(
            entries.map(({ confirmed, userId, workspaceIds }) => ({
              confirmed,
              userId,
              workspaceIds,
            })),
            [
              { confirmed: true, userId: null, workspaceIds: [harbour] },
              { confirmed: true, userId: closed, workspaceIds: [studio] },
            ]
          );
          assert.notInclude(JSON.stringify(entries), bea.email);

          const closure =
            yield* sql`SELECT closed_at, email FROM legal.identification_holds WHERE user_id = ${bea.id}`.pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(HeldSchema))
            );

          // How many rows still name the workspace, in every table kept
          // aside but its members'.
          const left = (workspaceId: string) =>
            Effect.forEach(
              kept.filter(([, table]) => table !== "member"),
              ([schema, table, column]) =>
                sql`SELECT count(*)::int AS count FROM ${sql(schema)}.${sql(table)} WHERE ${sql(column)} = ${workspaceId}`.pipe(
                  Effect.flatMap(countOf)
                )
            ).pipe(
              Effect.map((counts) =>
                counts.reduce((sum, count) => sum + count, 0)
              )
            );

          const accounts = (userId: string) =>
            sql`SELECT count(*)::int AS count FROM auth."user" WHERE id = ${userId}`.pipe(
              Effect.flatMap(countOf)
            );

          assert.strictEqual(yield* left(harbour), 0);
          assert.strictEqual(yield* accounts(bea.id), 0);

          // The restore: the backup's rows are back, and what the database
          // recorded since is gone, the identity held for the law included.
          yield* sql`INSERT INTO auth."user" SELECT * FROM ${sql(aside("user"))}`;
          yield* sql`INSERT INTO auth.account SELECT * FROM ${sql(aside("account"))}`;

          for (const [schema, table, key] of outlasting) {
            yield* sql`DELETE FROM ${sql(schema)}.${sql(table)} WHERE ${sql(key)} IN (SELECT ${sql(key)} FROM ${sql(aside(table))})`;
          }

          for (const [schema, table] of kept) {
            yield* sql`INSERT INTO ${sql(schema)}.${sql(table)} SELECT * FROM ${sql(aside(table))}`;
          }

          yield* sql`DELETE FROM legal.identification_holds WHERE user_id = ${bea.id}`;

          assert.strictEqual(yield* left(harbour), held);
          assert.strictEqual(yield* left(studio), held);
          assert.strictEqual(yield* accounts(bea.id), 1);

          const report = yield* replays.replay({ applyUnconfirmed: false });

          assert.strictEqual(report.entries, 2);
          assert.deepStrictEqual(
            report.erased.map(({ account, workspaces }) => ({
              account,
              workspaces,
            })),
            [
              { account: null, workspaces: [harbour] },
              { account: closed, workspaces: [studio] },
            ]
          );
          assert.deepStrictEqual(report.failed, []);
          assert.deepStrictEqual(report.unconfirmed, []);

          assert.strictEqual(yield* left(harbour), 0);
          assert.strictEqual(yield* left(studio), 0);
          assert.strictEqual(yield* accounts(bea.id), 0);

          // Who held the account is held again, as closed when it was.
          assert.deepStrictEqual(
            yield* sql`SELECT closed_at, email FROM legal.identification_holds WHERE user_id = ${bea.id}`.pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(HeldSchema))
            ),
            closure
          );

          // What nobody erased is untouched.
          assert.strictEqual(yield* accounts(ana.id), 1);
          assert.strictEqual(yield* left(garden), held);

          // Again: nothing is left to erase.
          const again = yield* replays.replay({ applyUnconfirmed: false });

          assert.deepStrictEqual(again.erased, []);
          assert.strictEqual(again.alreadyGone, 2);

          // An erasure whose end the server never saw is reported and
          // left, unless the replay is told to apply it too.
          const unseen = yield* erasureOf(null, [garden]);

          yield* ledger.record(unseen);

          const careful = yield* replays.replay({ applyUnconfirmed: false });

          assert.deepStrictEqual(
            careful.unconfirmed.map(({ id }) => id),
            [unseen.id]
          );
          assert.strictEqual(yield* left(garden), held);

          const told = yield* replays.replay({ applyUnconfirmed: true });

          assert.deepStrictEqual(
            told.erased.map(({ workspaces }) => workspaces),
            [[garden]]
          );
          assert.strictEqual(yield* left(garden), 0);

          for (const table of [
            ...kept.map(([, name]) => name),
            "user",
            "account",
          ]) {
            yield* sql`DROP TABLE ${sql(aside(table))}`;
          }

          yield* ledger.expire((yield* ledger.entries).at(-1)?.at ?? unseen.at);
        })
    );
  }
);
