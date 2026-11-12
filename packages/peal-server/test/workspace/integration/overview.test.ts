import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { AgendaPageSchema, OverviewSchema } from "peal-contract";

import { newId } from "#shared/application/ids.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { commandLineToken } from "#test/workspace/support.ts";

import {
  apiKeyOf,
  bodyOf,
  MigratedSqlLive,
  signedUpUnconfirmed,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "./harness.ts";

// The view across a person's workspaces on the whole app: a session, the
// command line's token and a workspace's key, a workspace that requires
// two-step verification of a person without it, and posts written as
// publishing writes them. The posts wait for an approval or have
// finished, so no job publishes them, and are deleted after.

// Accounts work before their email is confirmed: nothing here reads one.
const OverviewLive = Layer.mergeAll(MigratedSqlLive, IdsLive).pipe(
  Layer.provideMerge(TestApp.layerWith(unconfirmedEmails))
);

const hours = (count: number) => new Date(Date.now() + count * 60 * 60 * 1000);

const RefusalSchema = Schema.Struct({ reason: Schema.String });

// The answers as JSON carries them.
const OverviewJsonSchema = Schema.toCodecJson(OverviewSchema);

const AgendaJsonSchema = Schema.toCodecJson(AgendaPageSchema);

layer(OverviewLive)("the overview across workspaces", (it) => {
  it.effect(
    "shows each workspace what the role reads, nothing of one that refuses the person, and refuses keys",
    () =>
      Effect.gen(function* overview() {
        const app = yield* TestApp;
        const sql = yield* SqlClient.SqlClient;
        const person = yield* signedUpUnconfirmed("overview-person");
        const other = yield* signedUpUnconfirmed("overview-other");
        const own = yield* workspaceOf(person, "Alpha");
        const strict = yield* workspaceOf(other, "Bravo");

        // The person is an editor of the other's workspace, which then
        // requires two-step verification their account does not have on.
        yield* sql`INSERT INTO auth.member (organization_id, user_id, role, created_at) VALUES (${strict}, ${person.id}, 'editor', now())`;

        yield* sql`INSERT INTO workspace.security_policies (workspace_id, two_step_required, updated_at) VALUES (${strict}, true, now())`;

        const waiting = yield* newId(PostIdSchema);
        const failed = yield* newId(PostIdSchema);

        yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text, scheduled_at, schedule_zone) VALUES (${waiting}, ${own}, 'awaitingApproval', ${"A synthetic post that waits for an approval"}, ${hours(24)}, 'Europe/Paris')`;

        yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text, scheduled_at, schedule_zone, started_at, finished_at, outcome) VALUES (${failed}, ${own}, 'finished', 'A synthetic post that failed', ${hours(-3)}, 'Europe/Paris', ${hours(-3)}, ${hours(-2)}, 'failed')`;

        const cleanUp = sql`DELETE FROM publishing.posts WHERE id IN (${waiting}, ${failed})`;

        yield* Effect.gen(function* reads() {
          const answered = yield* bodyOf(
            OverviewJsonSchema,
            yield* app.request("/api/me/overview", {
              headers: { cookie: person.cookies },
            })
          );

          const alpha = answered.workspaces.find(({ id }) => id === own);
          const bravo = answered.workspaces.find(({ id }) => id === strict);

          assert.isDefined(alpha);
          assert.isDefined(bravo);
          assert.isNull(alpha.refused);
          assert.deepStrictEqual(alpha.posts, {
            awaitingApproval: 1,
            failedLast7Days: 1,
            mayApprove: true,
            scheduledNext7Days: 0,
            unconfirmedLast7Days: 0,
          });
          assert.deepStrictEqual(alpha.channels, {
            connected: 0,
            off: 0,
            toReconnect: 0,
          });
          assert.deepStrictEqual(alpha.inbox, { unanswered: 0 });
          assert.strictEqual(alpha.overPlan, false);
          assert.deepStrictEqual(bravo, {
            channels: null,
            id: strict,
            inbox: null,
            name: "Bravo",
            overPlan: null,
            posts: null,
            refused: "twoStepRequired",
            role: "editor",
            slug: bravo.slug,
          });

          const from = hours(-1).toISOString();
          const to = hours(48).toISOString();

          const agenda = yield* bodyOf(
            AgendaJsonSchema,
            yield* app.request(`/api/me/agenda?from=${from}&to=${to}`, {
              headers: { cookie: person.cookies },
            })
          );

          assert.deepStrictEqual(
            agenda.items.map(({ excerpt, postId, status, workspaceId }) => ({
              excerpt,
              postId,
              status,
              workspaceId,
            })),
            [
              {
                excerpt: "A synthetic post that waits for an approval",
                postId: waiting,
                status: "awaitingApproval",
                workspaceId: own,
              },
            ]
          );

          // The command line's token, bound to no workspace, reads it too.
          const token = yield* commandLineToken(person.cookies);

          const throughCommandLine = yield* app.request("/api/me/overview", {
            headers: { authorization: `Bearer ${token}` },
          });

          assert.strictEqual(throughCommandLine.status, 200);

          // A workspace's key belongs to no one.
          const { key } = yield* apiKeyOf(person, own, ["post:read"]);

          for (const path of [
            "/api/me/overview",
            `/api/me/agenda?from=${from}&to=${to}`,
          ]) {
            const refused = yield* app.request(path, {
              headers: { authorization: `Bearer ${key}` },
            });

            assert.strictEqual(refused.status, 403, path);
            assert.strictEqual(
              (yield* bodyOf(RefusalSchema, refused)).reason,
              "personRequired"
            );
          }
        }).pipe(Effect.ensuring(cleanUp.pipe(Effect.orDie)));
      }),
    { timeout: 60_000 }
  );
});
