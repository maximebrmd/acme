// A workspace's plan limits the posts going out in each calendar month
// (UTC). Here the plan allows two. Drafts take no room, and a post counts
// once, however often a channel of it is sent again.
import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option, Ref, Result } from "effect";
import type { Scope } from "effect";

import { PostAllowance } from "#publishing/application/post-allowance.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PostUsage } from "#publishing/application/post-usage.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { newId } from "#shared/application/ids.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";
import {
  eventually,
  isFinished,
  isSuspended,
  scheduleIn,
  setTime,
  targetsOf,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, postsServerWith } from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
} from "#test/publishing/support.ts";

const allowed = 2;

const TwoPostsServer = postsServerWith(
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () => Effect.succeed({ allowed: Option.none(), connected: 0 }),
      members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
      scheduledPerMonth: () => Effect.succeed(Option.some(allowed)),
    })
  )
);

// A plan whose allowance the test changes, as moving to a smaller plan does.
const changingAllowance = Ref.makeUnsafe(3);

const ChangingPlanServer = postsServerWith(
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () => Effect.succeed({ allowed: Option.none(), connected: 0 }),
      members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
      scheduledPerMonth: () =>
        Ref.get(changingAllowance).pipe(Effect.map(Option.some)),
    })
  )
);

// A workspace with four channels on a plan of three, as after its trial.
const OverChannelsServer = postsServerWith(
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () => Effect.succeed({ allowed: Option.some(3), connected: 4 }),
      members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
      scheduledPerMonth: () => Effect.succeed(Option.none()),
    })
  )
);

// A workspace whose channels the test puts over its plan, as when its
// trial ends with posts already scheduled.
const connectedChannels = Ref.makeUnsafe(3);

const TrialEndingServer = postsServerWith(
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () =>
        Ref.get(connectedChannels).pipe(
          Effect.map((connected) => ({ allowed: Option.some(3), connected }))
        ),
      members: () => Effect.succeed({ allowed: Option.none(), taken: 1 }),
      scheduledPerMonth: () => Effect.succeed(Option.none()),
    })
  )
);

// A workspace with five members on a plan of two, as after its trial.
const OverMembersServer = postsServerWith(
  attachableMedia(),
  Layer.succeed(
    PostAllowance,
    PostAllowance.of({
      channels: () => Effect.succeed({ allowed: Option.some(3), connected: 3 }),
      members: () => Effect.succeed({ allowed: Option.some(2), taken: 5 }),
      scheduledPerMonth: () => Effect.succeed(Option.none()),
    })
  )
);

const onServerAt = <A, E>(
  start: string,
  test: Effect.Effect<A, E, Layer.Success<typeof TwoPostsServer> | Scope.Scope>
) =>
  setTime(start).pipe(
    Effect.andThen(test.pipe(Effect.provide(TwoPostsServer)))
  );

const onChangingPlanAt = <A, E>(
  start: string,
  test: Effect.Effect<
    A,
    E,
    Layer.Success<typeof ChangingPlanServer> | Scope.Scope
  >
) =>
  setTime(start).pipe(
    Effect.andThen(test.pipe(Effect.provide(ChangingPlanServer)))
  );

const freshWorkspace = newId(WorkspaceIdSchema);

const limitReached = new PlanLimitReached({
  allowed,
  limit: "scheduledPosts",
  needed: allowed + 1,
  used: allowed,
});

// A draft scheduled on the channel at `iso`.
const scheduledAt = Effect.fn("scheduledAt")(function* scheduledAt(
  workspaceId: WorkspaceId,
  channelId: ChannelId,
  iso: string
) {
  const actor = actorIn(workspaceId);

  const { post } = yield* PostDrafts.use((drafts) =>
    drafts.create(actor, { channelIds: [channelId], content: contentOf("Hi") })
  ).pipe(Effect.orDie);

  const scheduled = yield* PostScheduling.use((scheduling) =>
    scheduling.scheduleDraft(actor, post.id, {
      channelIds: [channelId],
      schedule: scheduleIn(iso),
    })
  ).pipe(Effect.result);

  return { failure: Result.getFailure(scheduled), postId: post.id };
});

describe("the monthly post limit", () => {
  it.effect(
    "counts the posts going out in a month, without the cancelled ones",
    () =>
      onServerAt(
        "2026-06-10T07:00:00Z",
        Effect.gen(function* month() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const channel = yield* connect(workspaceId, "mastodon");

          const first = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-20T08:00:00Z"
          );

          const second = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-30T23:30:00Z"
          );

          assert.deepStrictEqual(
            [first.failure, second.failure],
            [Option.none(), Option.none()]
          );

          const refused = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-21T08:00:00Z"
          );

          assert.deepStrictEqual(refused.failure, Option.some(limitReached));

          // Moving a post within its month takes no more room.
          yield* scheduling.reschedule(
            actor,
            first.postId,
            scheduleIn("2026-06-25T08:00:00Z")
          );

          // July has room; moving it back to June does not.
          yield* scheduling.reschedule(
            actor,
            refused.postId,
            scheduleIn("2026-07-01T00:00:00Z")
          );

          const back = yield* scheduling
            .reschedule(
              actor,
              refused.postId,
              scheduleIn("2026-06-29T08:00:00Z")
            )
            .pipe(Effect.flip);

          assert.deepStrictEqual(back, limitReached);

          const usage = yield* PostUsage.use((posts) =>
            posts.thisMonth(workspaceId)
          );

          assert.strictEqual(usage.scheduled, allowed);
          assert.deepStrictEqual(usage.resetsAt, utc("2026-07-01T00:00:00Z"));

          // A cancelled post gives its room back.
          yield* scheduling.cancel(actor, second.postId);

          yield* scheduling.reschedule(
            actor,
            refused.postId,
            scheduleIn("2026-06-29T08:00:00Z")
          );

          yield* scheduling.cancel(actor, first.postId);
          yield* scheduling.cancel(actor, refused.postId);
        })
      ),
    60_000
  );

  it.effect(
    "leaves drafts out until they are scheduled, and frees a post's room when it goes back to draft",
    () =>
      onServerAt(
        "2026-06-10T07:00:00Z",
        Effect.gen(function* drafts() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const channel = yield* connect(workspaceId, "mastodon");

          const goingOut = PostUsage.use((posts) =>
            posts.thisMonth(workspaceId)
          ).pipe(Effect.map(({ scheduled }) => scheduled));

          // Drafts take no room, however many there are.
          for (const text of ["One", "Two", "Three"]) {
            yield* PostDrafts.use((saved) =>
              saved.create(actor, {
                channelIds: [channel],
                content: contentOf(text),
              })
            );
          }

          assert.strictEqual(yield* goingOut, 0);

          const first = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-20T08:00:00Z"
          );

          const second = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-21T08:00:00Z"
          );

          const third = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-22T08:00:00Z"
          );

          assert.deepStrictEqual(
            [first.failure, second.failure, third.failure],
            [Option.none(), Option.none(), Option.some(limitReached)]
          );
          assert.strictEqual(yield* goingOut, allowed);

          // Back to draft, a post gives its room back, and needs it again
          // to be scheduled.
          yield* scheduling.unschedule(actor, first.postId);

          assert.strictEqual(yield* goingOut, 1);

          yield* scheduling.reschedule(
            actor,
            third.postId,
            scheduleIn("2026-06-22T08:00:00Z")
          );

          const again = yield* scheduling
            .reschedule(actor, first.postId, scheduleIn("2026-06-20T08:00:00Z"))
            .pipe(Effect.flip);

          assert.deepStrictEqual(again, limitReached);

          for (const { postId } of [second, third]) {
            yield* scheduling.cancel(actor, postId);
          }
        })
      ),
    60_000
  );

  it.effect(
    "counts a post once when a channel of it is sent again",
    () =>
      onServerAt(
        "2026-06-10T07:00:00Z",
        Effect.gen(function* reposted() {
          const scheduling = yield* PostScheduling;
          const followUp = yield* PostFollowUp;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const channel = yield* connect(workspaceId, "mastodon");

          const goingOut = PostUsage.use((posts) =>
            posts.thisMonth(workspaceId)
          ).pipe(Effect.map(({ scheduled }) => scheduled));

          yield* FakePlatform.use((platform) =>
            platform.script(channel, [
              {
                _tag: "fail",
                failure: new BadRequest({ code: "duplicate" }),
              },
            ])
          );

          const failing = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-10T08:00:00Z"
          );

          yield* eventually("the job sleeps", isSuspended(failing.postId));
          yield* setTime("2026-06-10T08:00:00Z");
          yield* eventually("the post fails", isFinished(failing.postId));

          const other = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-20T08:00:00Z"
          );

          const refused = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-21T08:00:00Z"
          );

          assert.deepStrictEqual(
            [other.failure, refused.failure],
            [Option.none(), Option.some(limitReached)]
          );

          // The month is full, yet sending the failed channel again takes no
          // more room: the post already counts.
          const [target] = yield* targetsOf(failing.postId);

          assert(target !== undefined);

          yield* followUp.repost(actor, failing.postId, target.id);

          assert.strictEqual(yield* goingOut, allowed);

          yield* eventually("the repost finishes", isFinished(failing.postId));

          assert.strictEqual(yield* goingOut, allowed);

          yield* scheduling.cancel(actor, other.postId);
        })
      ),
    60_000
  );

  it.effect(
    "lets a month past a smaller plan's allowance keep and move its posts",
    () =>
      onChangingPlanAt(
        "2026-06-10T07:00:00Z",
        Effect.gen(function* smaller() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const channel = yield* connect(workspaceId, "mastodon");

          yield* Ref.set(changingAllowance, 3);

          const first = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-20T08:00:00Z"
          );

          const second = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-21T08:00:00Z"
          );

          const third = yield* scheduledAt(
            workspaceId,
            channel,
            "2026-06-22T08:00:00Z"
          );

          assert.deepStrictEqual(
            [first.failure, second.failure, third.failure],
            [Option.none(), Option.none(), Option.none()]
          );

          // The workspace moves to a plan that allows two.
          yield* Ref.set(changingAllowance, 2);

          // Moving one within June adds nothing to it.
          yield* scheduling.reschedule(
            actor,
            first.postId,
            scheduleIn("2026-06-25T08:00:00Z")
          );

          // Out of June, then back while June still has two: refused.
          yield* scheduling.reschedule(
            actor,
            second.postId,
            scheduleIn("2026-07-02T08:00:00Z")
          );

          const back = yield* scheduling
            .reschedule(
              actor,
              second.postId,
              scheduleIn("2026-06-26T08:00:00Z")
            )
            .pipe(Effect.flip);

          assert.deepStrictEqual(back, limitReached);

          for (const { postId } of [first, second, third]) {
            yield* scheduling.cancel(actor, postId);
          }
        })
      ),
    60_000
  );

  it.effect(
    "lets no more posts into a month than it allows, scheduled all at once",
    () =>
      onServerAt(
        "2026-06-10T07:00:00Z",
        Effect.gen(function* together() {
          const scheduling = yield* PostScheduling;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const channel = yield* connect(workspaceId, "mastodon");

          const drafts = yield* Effect.forEach([1, 2, 3, 4, 5], () =>
            PostDrafts.use((posts) =>
              posts.create(actor, {
                channelIds: [channel],
                content: contentOf("Hi"),
              })
            ).pipe(Effect.orDie)
          );

          // Sent together, as from several tabs: each counts the month
          // before any is saved.
          const results = yield* Effect.forEach(
            drafts,
            ({ post }) =>
              scheduling
                .scheduleDraft(actor, post.id, {
                  channelIds: [channel],
                  schedule: scheduleIn("2026-06-20T08:00:00Z"),
                })
                .pipe(Effect.result),
            { concurrency: "unbounded" }
          );

          assert.strictEqual(results.filter(Result.isSuccess).length, allowed);
          assert.deepStrictEqual(
            results.flatMap((result) =>
              Result.isFailure(result) ? [result.failure] : []
            ),
            [limitReached, limitReached, limitReached]
          );

          for (const { post } of drafts) {
            yield* scheduling.cancel(actor, post.id).pipe(Effect.ignore);
          }
        })
      ),
    60_000
  );
});

describe("the channel limit", () => {
  it.effect(
    "lets a workspace over its plan's channels schedule nothing until it disconnects some",
    () =>
      setTime("2026-06-10T07:00:00Z").pipe(
        Effect.andThen(
          Effect.gen(function* overChannels() {
            const workspaceId = yield* freshWorkspace;
            const channel = yield* connect(workspaceId, "mastodon");

            const { failure } = yield* scheduledAt(
              workspaceId,
              channel,
              "2026-06-20T08:00:00Z"
            );

            assert.deepStrictEqual(
              failure,
              Option.some(
                new PlanLimitReached({
                  allowed: 3,
                  limit: "channels",
                  needed: 4,
                  used: 4,
                })
              )
            );
          }).pipe(Effect.provide(OverChannelsServer))
        )
      )
  );

  it.effect(
    "lets a workspace over its plan's members schedule nothing until some leave",
    () =>
      setTime("2026-06-10T07:00:00Z").pipe(
        Effect.andThen(
          Effect.gen(function* overMembers() {
            const workspaceId = yield* freshWorkspace;
            const channel = yield* connect(workspaceId, "mastodon");

            const { failure } = yield* scheduledAt(
              workspaceId,
              channel,
              "2026-06-20T08:00:00Z"
            );

            assert.deepStrictEqual(
              failure,
              Option.some(
                new PlanLimitReached({
                  allowed: 2,
                  limit: "members",
                  needed: 5,
                  used: 5,
                })
              )
            );
          }).pipe(Effect.provide(OverMembersServer))
        )
      )
  );

  it.effect(
    "lets it send nothing in one call either, now or later, and keeps no idempotency key for what it refused",
    () =>
      setTime("2026-06-10T07:00:00Z").pipe(
        Effect.andThen(
          Effect.gen(function* sendOverChannels() {
            const workspaceId = yield* freshWorkspace;
            const channel = yield* connect(workspaceId, "mastodon");
            const scheduling = yield* PostScheduling;
            const actor = actorIn(workspaceId);

            const over = new PlanLimitReached({
              allowed: 3,
              limit: "channels",
              needed: 4,
              used: 4,
            });

            const request = {
              channelIds: [channel] as const,
              content: contentOf("Hi"),
              idempotency: Option.some({
                fingerprint: "synthetic-fingerprint",
                key: "synthetic-over-plan",
              }),
              timeZone: scheduleIn("2026-06-20T08:00:00Z").timeZone,
            };

            for (const at of [
              Option.none(),
              Option.some(scheduleIn("2026-06-20T08:00:00Z").at),
            ]) {
              // Sent again with its key, it is refused again: the first
              // refusal made no post for the key to answer.
              assert.deepStrictEqual(
                yield* scheduling
                  .send(actor, { ...request, at })
                  .pipe(Effect.flip),
                over
              );
            }
          }).pipe(Effect.provide(OverChannelsServer))
        )
      )
  );

  it.effect(
    "moves nothing either while it is over, even within the month a post was scheduled in",
    () =>
      setTime("2026-06-10T07:00:00Z").pipe(
        Effect.andThen(
          Effect.gen(function* moveOverChannels() {
            yield* Ref.set(connectedChannels, 3);

            const workspaceId = yield* freshWorkspace;
            const channel = yield* connect(workspaceId, "mastodon");
            const scheduling = yield* PostScheduling;
            const actor = actorIn(workspaceId);

            const { postId } = yield* scheduledAt(
              workspaceId,
              channel,
              "2026-06-20T08:00:00Z"
            );

            // A fourth channel on a plan of three, as when a trial ends.
            yield* Ref.set(connectedChannels, 4);

            const moved = yield* scheduling
              .reschedule(actor, postId, scheduleIn("2026-06-21T08:00:00Z"))
              .pipe(Effect.flip);

            assert.deepStrictEqual(
              moved,
              new PlanLimitReached({
                allowed: 3,
                limit: "channels",
                needed: 4,
                used: 4,
              })
            );

            yield* Ref.set(connectedChannels, 3);
            yield* scheduling.cancel(actor, postId);
          }).pipe(Effect.provide(TrialEndingServer))
        )
      )
  );
});
