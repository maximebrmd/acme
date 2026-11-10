import { setTimeout as wait } from "node:timers/promises";

import { assert, describe, it } from "@effect/vitest";
import { Deferred, Effect, Fiber } from "effect";

import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostTags } from "#publishing/application/post-tags.ts";
import { TagStore } from "#publishing/application/tag-store.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { onPostsServerAt } from "#test/publishing/posts-server.ts";
import { actorIn, contentOf } from "#test/publishing/support.ts";

// Filing a post under tags takes turns with deleting a tag, so no post
// keeps the id of a tag deleted meanwhile.

const timeout = 60_000;

const start = "2026-06-15T07:00:00Z";

// A moment of the wall clock, whatever the test clock says.
const aMoment = Effect.promise(async () => {
  await wait(300);
});

// Whether `waiting` is still waiting a moment after it started, while the
// workspace's tags are claimed, and done once they are let go.
const heldBack = <A, E, R>(
  workspaceId: typeof WorkspaceIdSchema.Type,
  waiting: Effect.Effect<A, E, R>
) =>
  Effect.gen(function* holding() {
    const { transaction } = yield* TransactionRunner;
    const tags = yield* TagStore;
    const taken = yield* Deferred.make<boolean>();
    const release = yield* Deferred.make<boolean>();

    const holder = yield* transaction(
      tags
        .claim(workspaceId)
        .pipe(
          Effect.andThen(Deferred.succeed(taken, true)),
          Effect.andThen(Deferred.await(release))
        )
    ).pipe(Effect.forkChild);

    yield* Deferred.await(taken);

    const waiter = yield* waiting.pipe(Effect.forkChild);

    yield* aMoment;

    const early = waiter.pollUnsafe();

    yield* Deferred.succeed(release, true);
    yield* Fiber.join(holder);
    yield* Fiber.join(waiter);

    return early === undefined;
  });

describe("tagging a post", () => {
  it.effect(
    "waits for a tag being deleted, as a draft saved with tags does",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* takesTurns() {
          const drafts = yield* PostDrafts;
          const tags = yield* PostTags;
          const workspaceId = yield* newId(WorkspaceIdSchema);
          const actor = actorIn(workspaceId);

          const tag = yield* tags.create(actor, {
            colour: "blue",
            name: "Launch",
          });

          const draft = yield* drafts.create(actor, {
            channelIds: [],
            content: contentOf("Hello"),
          });

          assert.isTrue(
            yield* heldBack(
              workspaceId,
              tags.assign(actor, draft.post.id, [tag.id])
            )
          );
          assert.isTrue(
            yield* heldBack(
              workspaceId,
              drafts.update(actor, draft.post.id, {
                channelIds: [],
                content: contentOf("Hello again"),
                tagIds: [tag.id],
              })
            )
          );
          assert.isTrue(
            yield* heldBack(
              workspaceId,
              drafts.create(actor, {
                channelIds: [],
                content: contentOf("Hello"),
                tagIds: [tag.id],
              })
            )
          );
        })
      ),
    timeout
  );
});
