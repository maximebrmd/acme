import { assert, describe, it } from "@effect/vitest";
import { Effect, Exit, Layer, Option, Scope } from "effect";

import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import { isDropped } from "#publishing/domain/post-target.ts";
import { TextOverride } from "#publishing/domain/text-override.ts";
import { newId } from "#shared/application/ids.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { actorIn } from "#test/publishing/support.ts";

import {
  callsOn,
  eventually,
  executionOf,
  isFinished,
  isSuspended,
  newChannel,
  onServerAt,
  outcomeOf,
  restartable,
  scheduleIn,
  schedulePost,
  setTime,
  settle,
  shutDown,
  storedPost,
  targetsOf,
  targetStatuses,
} from "./harness.ts";

const timeout = 60_000;

const newWorkspace = newId(WorkspaceIdSchema).pipe(Effect.provide(IdsLive));

describe("PostScheduling.dropTarget", () => {
  it.effect(
    "takes one channel off a scheduled post, which goes out on the others",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* dropsOne() {
          const scheduling = yield* PostScheduling;
          const kept = yield* newChannel;
          const removed = yield* newChannel;

          const post = yield* schedulePost(
            [kept, removed],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));

          const job = yield* executionOf(post.id);
          const targets = yield* targetsOf(post.id);
          const target = targets.find(({ channelId }) => channelId === removed);

          assert(target !== undefined);

          const answered = yield* scheduling.dropTarget(
            actorIn(post.workspaceId),
            post.id,
            target.id
          );

          // Still scheduled, by the same job, at the same time.
          assert.strictEqual(answered.post.status._tag, "scheduled");
          assert.strictEqual(
            answered.post.scheduleRevision,
            post.scheduleRevision
          );
          assert.strictEqual(yield* executionOf(post.id), job);

          const dropped = answered.targets.find(({ id }) => id === target.id);

          assert(dropped !== undefined && isDropped(dropped));

          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* callsOn(kept), 1);
          assert.lengthOf(yield* callsOn(removed), 0);
          // The channel taken off it is none of its own.
          assert.strictEqual(yield* outcomeOf(post.id), "published");
        })
      ),
    timeout
  );

  it.effect(
    "keeps one target when two removals are sent together",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* dropsTogether() {
          const scheduling = yield* PostScheduling;
          const first = yield* newChannel;
          const second = yield* newChannel;

          const post = yield* schedulePost(
            [first, second],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          const actor = actorIn(post.workspaceId);
          const targets = yield* targetsOf(post.id);

          const exits = yield* Effect.all(
            targets.map((target) =>
              Effect.exit(scheduling.dropTarget(actor, post.id, target.id))
            ),
            { concurrency: "unbounded" }
          );

          assert.lengthOf(exits.filter(Exit.isSuccess), 1);

          const refused = exits.find(Exit.isFailure);

          assert(refused !== undefined);
          assert.include(
            JSON.stringify(Exit.findErrorOption(refused)),
            "LastTargetLeft"
          );

          const after = yield* targetsOf(post.id);

          assert.sameMembers(targetStatuses(after), ["pending", "cancelled"]);

          // Nothing is left scheduled for a dev server sharing the database.
          yield* scheduling.cancel(actor, post.id);
        })
      ),
    timeout
  );

  it.effect(
    "is refused once the job claimed the post, or sends nothing there",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* dropsWhileClaimed() {
          const scheduling = yield* PostScheduling;
          const kept = yield* newChannel;
          const removed = yield* newChannel;

          const post = yield* schedulePost(
            [kept, removed],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));

          const target = (yield* targetsOf(post.id)).find(
            ({ channelId }) => channelId === removed
          );

          assert(target !== undefined);

          // The job wakes and claims the post while the removal is asked.
          yield* setTime("2026-06-15T08:00:00Z");

          const exit = yield* Effect.exit(
            scheduling.dropTarget(actorIn(post.workspaceId), post.id, target.id)
          );

          yield* eventually("the post finishes", isFinished(post.id));

          const removedCalls = (yield* callsOn(removed)).length;

          if (Exit.isSuccess(exit)) {
            assert.strictEqual(removedCalls, 0);
          } else {
            assert.include(
              JSON.stringify(Exit.findErrorOption(exit)),
              "InvalidPostTransition"
            );
            assert.strictEqual(removedCalls, 1);
          }

          assert.lengthOf(yield* callsOn(kept), 1);
          assert.strictEqual(yield* outcomeOf(post.id), "published");
        })
      ),
    timeout
  );

  it.effect(
    "takes the channel off the draft the post goes back to",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* backToDraft() {
          const scheduling = yield* PostScheduling;
          const kept = yield* newChannel;
          const removed = yield* newChannel;

          const actor = actorIn(yield* newWorkspace);

          // A text of its own on the channel taken off, in each part.
          const { post } = yield* scheduling.schedule(actor, {
            channelIds: [kept, removed],
            content: new PostContent({
              followUps: [
                new PostPart({
                  delaySeconds: 0,
                  media: [],
                  overrides: [
                    new TextOverride({
                      channelId: removed,
                      text: "Later, there",
                    }),
                  ],
                  text: "Later",
                }),
              ],
              media: [],
              overrides: [
                new TextOverride({ channelId: removed, text: "There" }),
              ],
              text: "Everywhere",
            }),
            schedule: scheduleIn("2026-06-15T08:00:00Z"),
          });

          const target = (yield* targetsOf(post.id)).find(
            ({ channelId }) => channelId === removed
          );

          assert(target !== undefined);

          yield* scheduling.dropTarget(actor, post.id, target.id);

          const draft = yield* scheduling.unschedule(actor, post.id);

          assert.deepStrictEqual(
            draft.targets.map(({ channelId }) => channelId),
            [kept]
          );
          assert.deepStrictEqual(targetStatuses(draft.targets), ["pending"]);
          // Its texts went with it: the draft schedules as it is.
          assert.deepStrictEqual(draft.post.content.overrides, []);
          assert.deepStrictEqual(
            draft.post.content.followUps[0]?.overrides,
            []
          );

          const again = yield* scheduling.scheduleDraft(actor, post.id, {
            channelIds: [kept],
            schedule: scheduleIn("2026-06-15T09:00:00Z"),
          });

          assert.strictEqual(again.post.status._tag, "scheduled");

          yield* scheduling.cancel(actor, post.id);
        })
      ),
    timeout
  );

  it.effect(
    "leaves the channel cancelled when the post is missed",
    () =>
      Effect.gen(function* missesAfterDowntime() {
        yield* setTime("2026-06-15T07:00:00Z");

        const { platform, server } = yield* restartable;
        const before = yield* Scope.make();
        const first = yield* Layer.buildWithScope(server, before);
        const kept = yield* newChannel;
        const removed = yield* newChannel;

        const post = yield* schedulePost(
          [kept, removed],
          scheduleIn("2026-06-15T08:00:00Z")
        ).pipe(Effect.provideContext(first));

        yield* Effect.gen(function* dropsBeforeDowntime() {
          const target = (yield* targetsOf(post.id)).find(
            ({ channelId }) => channelId === removed
          );

          assert(target !== undefined);

          yield* PostScheduling.use((scheduling) =>
            scheduling.dropTarget(actorIn(post.workspaceId), post.id, target.id)
          );
          yield* eventually("the job sleeps", isSuspended(post.id));
        }).pipe(Effect.provideContext(first));

        yield* shutDown(before);

        // Down for more than the hour a post may be late.
        yield* setTime("2026-06-15T09:30:00Z");

        const after = yield* Scope.make();
        const second = yield* Layer.buildWithScope(server, after);

        yield* eventually("the post finishes", isFinished(post.id)).pipe(
          Effect.provideContext(second)
        );

        assert.lengthOf(yield* platform.calls, 0);

        const targets = yield* targetsOf(post.id).pipe(
          Effect.provideContext(second)
        );

        assert.deepStrictEqual(
          Object.fromEntries(
            targets.map((target) => [target.channelId, target.status._tag])
          ),
          { [kept]: "failed", [removed]: "cancelled" }
        );
        assert.strictEqual(
          yield* outcomeOf(post.id).pipe(Effect.provideContext(second)),
          "failed"
        );

        yield* settle().pipe(Effect.provideContext(second));
        yield* shutDown(after);
      }),
    timeout
  );
});

describe("PostScheduling.dropTarget refusals", () => {
  it.effect(
    "refuses a target of another post",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* otherPost() {
          const scheduling = yield* PostScheduling;

          const one = yield* schedulePost(
            [yield* newChannel, yield* newChannel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          const other = yield* schedulePost(
            [yield* newChannel],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          const [foreign] = yield* targetsOf(other.id);

          assert(foreign !== undefined);

          const exit = yield* Effect.exit(
            scheduling.dropTarget(actorIn(one.workspaceId), one.id, foreign.id)
          );

          assert.include(
            JSON.stringify(Exit.findErrorOption(exit)),
            "PostNotFound"
          );

          const { post } = yield* storedPost(one.id);

          assert.strictEqual(post.status._tag, "scheduled");
          assert.isTrue(Option.isSome((yield* storedPost(one.id)).execution));

          yield* scheduling.cancel(actorIn(one.workspaceId), one.id);
          yield* scheduling.cancel(actorIn(other.workspaceId), other.id);
        })
      ),
    timeout
  );
});
