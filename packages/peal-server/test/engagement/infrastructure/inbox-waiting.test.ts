import { assert, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { SqlClient } from "effect/sql";

import { InboxWaiting } from "#engagement/application/inbox-waiting.ts";
import { DrizzleInboxWaitingReads } from "#engagement/infrastructure/drizzle-inbox-waiting-reads.ts";
import { newId } from "#shared/application/ids.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { DatabaseTest, freshWorkspace } from "#test/channels/support.ts";

// The threads waiting for an answer in several workspaces at once, in
// Postgres. The workspaces are the test's own; their threads have ended,
// so no collection reads them, and are deleted after.

const WaitingTest = InboxWaiting.layer.pipe(
  Layer.provide(DrizzleInboxWaitingReads),
  Layer.provideMerge(DatabaseTest)
);

const thread = Effect.fn("test.thread")(function* thread(
  workspaceId: WorkspaceId,
  comments: number,
  unanswered: number
) {
  const sql = yield* SqlClient.SqlClient;
  const id = yield* newId(PostIdSchema);
  const channelId = yield* newId(PostIdSchema);
  const targetId = yield* newId(PostIdSchema);
  const postId = yield* newId(PostIdSchema);

  yield* sql`INSERT INTO engagement.threads (id, workspace_id, channel_id, target_id, post_id, platform_post_id, published_at, ended_at, end_reason, comment_count, unanswered_count, last_comment_at)
    VALUES (${id}, ${workspaceId}, ${channelId}, ${targetId}, ${postId}, '113000000000000001', now(), now(), 'window', ${comments}, ${unanswered}, ${comments > 0 ? new Date() : null})`;
});

const deleteIn = (workspaceIds: readonly WorkspaceId[]) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql`DELETE FROM engagement.threads WHERE workspace_id IN ${sql.in(workspaceIds)}`
  ).pipe(Effect.orDie);

layer(WaitingTest)("the threads waiting across workspaces", (it) => {
  it.effect(
    "are counted per workspace, threads not comments, and a workspace with none is left out",
    () =>
      Effect.gen(function* counted() {
        const first = yield* freshWorkspace;
        const second = yield* freshWorkspace;
        const answered = yield* freshWorkspace;
        const empty = yield* freshWorkspace;

        yield* thread(first, 3, 2);
        yield* thread(first, 1, 1);
        yield* thread(first, 2, 0);
        yield* thread(second, 5, 1);
        yield* thread(answered, 4, 0);
        // No comment at all: the inbox does not list it.
        yield* thread(answered, 0, 0);

        const waiting = yield* InboxWaiting.use((inbox) =>
          inbox.unansweredIn([first, second, answered, empty])
        ).pipe(Effect.ensuring(deleteIn([first, second, answered])));

        assert.deepStrictEqual(
          waiting,
          new Map([
            [first, 2],
            [second, 1],
          ])
        );
      })
  );
});
