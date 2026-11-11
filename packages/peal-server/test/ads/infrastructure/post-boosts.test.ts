import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { PostBoosts } from "#ads/application/post-boosts.ts";
import { DrizzlePostBoosts } from "#ads/infrastructure/drizzle-post-boosts.ts";
import { newId } from "#shared/application/ids.ts";
import {
  ChannelIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The boosts a published post has, as publishing asks before deleting it,
// in Postgres, under a workspace of the test's own.

const BoostsTest = DrizzlePostBoosts.pipe(Layer.provideMerge(DatabaseTest));

const forget = (workspaceId: WorkspaceId) =>
  SqlClient.SqlClient.use(
    (sql) => sql`DELETE FROM ads.boosts WHERE workspace_id = ${workspaceId}`
  ).pipe(Effect.orDie);

layer(BoostsTest)("the boosts of a post", (it) => {
  it.effect("count those not over, on the target asked of only", () =>
    Effect.gen(function* counts() {
      const sql = yield* SqlClient.SqlClient;
      const boosts = yield* PostBoosts;
      const workspaceId = yield* freshWorkspace;
      const postId = yield* newId(PostIdSchema);
      const targetId = yield* newId(PostTargetIdSchema);
      const other = yield* newId(PostTargetIdSchema);
      const channelId = yield* newId(ChannelIdSchema);

      const boost = (on: string, state: string, key: string) =>
        Effect.gen(function* insert() {
          const id = yield* newId(PostIdSchema);

          yield* sql`
            INSERT INTO ads.boosts (
              id, workspace_id, post_id, target_id, channel_id, platform,
              account_id, account_external_id, account_network, audience,
              budget_amount, budget_kind, committed, currency, objective,
              idempotency_key, state, state_at, starts_at, ends_at,
              created_at, updated_at, failure_reason
            ) VALUES (
              ${id}, ${workspaceId}, ${postId}, ${on}, ${channelId},
              'facebook', ${id}, 'act_synthetic', 'meta', '{}'::jsonb, 1000,
              'total', 0, 'EUR', 'engagement', ${key}, ${state},
              '2044-06-01T00:00:00Z', '2044-06-01T00:00:00Z',
              '2044-06-08T00:00:00Z', '2044-06-01T00:00:00Z',
              '2044-06-01T00:00:00Z',
              ${state === "failed" ? "networkRefused" : null}
            )
          `;
        });

      yield* Effect.gen(function* checks() {
        const asked = { postId, targetId, workspaceId };

        assert.strictEqual(yield* boosts.notOverOn(asked), 0);

        for (const [index, state] of ["ended", "stopped", "failed"].entries()) {
          yield* boost(targetId, state, `over-${String(index)}`);
        }

        assert.strictEqual(yield* boosts.notOverOn(asked), 0);

        yield* boost(other, "active", "other-target");

        assert.strictEqual(yield* boosts.notOverOn(asked), 0);

        for (const [index, state] of [
          "requested",
          "active",
          "paused",
          "unconfirmed",
        ].entries()) {
          yield* boost(targetId, state, `running-${String(index)}`);
        }

        assert.strictEqual(yield* boosts.notOverOn(asked), 4);
      }).pipe(Effect.ensuring(forget(workspaceId)));
    })
  );
});
