import { randomUUID } from "node:crypto";

import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { LinkStanding } from "#shortlinks/application/link-standing.ts";
import { signedUp, workspaceOf } from "#test/workspace/integration/harness.ts";
import { seedChannel } from "#test/workspace/integration/seed.ts";

/** Every link's part live, and every workspace in good standing. */
export const OpenLinkStanding = Layer.succeed(
  LinkStanding,
  LinkStanding.of({
    isLive: () => Effect.succeed(true),
    isWorkspaceActive: () => Effect.succeed(true),
  })
);

// A random UUID with the version digit of v7 reads as one.
const uuid7 = () => {
  const random = randomUUID();

  return `${random.slice(0, 14)}7${random.slice(15)}`;
};

/**
 * A workspace of a new owner, with a post whose target on a channel has
 * its first part live, or none (`live` false), for links to point at.
 */
export const liveTarget = Effect.fn("liveTarget")(function* liveTarget(
  label: string,
  live: boolean
) {
  const sql = yield* SqlClient.SqlClient;
  const owner = yield* signedUp(label);
  const workspaceId = yield* workspaceOf(owner, `Links ${label}`);
  const channelId = yield* seedChannel(workspaceId, `@${label}@social.example`);
  const postId = uuid7();
  const targetId = uuid7();

  const liveParts = live
    ? JSON.stringify([
        {
          index: 0,
          permalink: { _tag: "None" },
          platformPostId: { _tag: "Some", value: "synthetic-1" },
          publishedAt: "2026-11-12T08:00:00.000Z",
          round: 1,
        },
      ])
    : "[]";

  yield* sql`INSERT INTO publishing.posts (id, workspace_id, status, text) VALUES (${postId}, ${workspaceId}, 'publishing', 'A synthetic post with a link')`.pipe(
    Effect.orDie
  );
  yield* sql`INSERT INTO publishing.post_targets (id, post_id, channel_id, status, started_at, live_parts) VALUES (${targetId}, ${postId}, ${channelId}, 'publishing', now(), ${liveParts}::jsonb)`.pipe(
    Effect.orDie
  );

  return { channelId, owner, postId, targetId, workspaceId };
});
