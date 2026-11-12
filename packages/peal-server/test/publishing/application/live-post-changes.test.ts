import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Exit, Option, Result, Schema } from "effect";
import { TestClock } from "effect/testing";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { LivePostChangeStore } from "#publishing/application/live-post-change-store.ts";
import { LivePostChanges } from "#publishing/application/live-post-changes.ts";
import { LivePostJobs } from "#publishing/application/live-post-jobs.ts";
import { LivePostNotChangeable } from "#publishing/application/live-post-not-changeable.ts";
import { PostRecords } from "#publishing/application/post-records.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SendPostRequest } from "#publishing/application/post-scheduling.ts";
import { LivePostChangeIdSchema } from "#publishing/domain/live-post-change-id.ts";
import type { LivePostChangeId } from "#publishing/domain/live-post-change-id.ts";
import {
  removable,
  requestUnpublish,
} from "#publishing/domain/live-post-change.ts";
import { PostContent } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { ChangeLivePostV1 } from "#publishing/infrastructure/workflows/change-live-post.ts";
import { newId } from "#shared/application/ids.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { TokenExpired } from "#shared/domain/token-expired.ts";
import { FakeRemovals } from "#test/publishing/fakes/fake-live-post-clients.ts";
import {
  eventually,
  isFinished,
  targetsOf,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, onPostsServerAt } from "#test/publishing/posts-server.ts";
import { actorIn } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Unpublishing live posts, through the use cases and their durable job, on
// an in-memory cluster driven by TestClock: a fake platform publishes the
// posts and another deletes them.

const timeout = 60_000;

const start = "2026-07-01T08:00:00Z";

const freshWorkspace = newId(WorkspaceIdSchema);

// A post of `parts` parts, out now on `channels`; texts differ by `tag`.
const sendNow = Effect.fn("test.sendNow")(function* sendNow(
  workspaceId: WorkspaceId,
  channels: readonly [ChannelId, ...ChannelId[]],
  tag: string,
  parts = 1
) {
  const scheduling = yield* PostScheduling;

  const request: SendPostRequest = {
    channelIds: channels,
    content: new PostContent({
      followUps: Array.from(
        { length: parts - 1 },
        (_, index) =>
          new PostPart({
            delaySeconds: 0,
            media: [],
            overrides: [],
            text: `Part ${String(index + 2)} of ${tag}.`,
          })
      ),
      media: [],
      overrides: [],
      text: `A synthetic post, ${tag}.`,
    }),
    idempotency: Option.none(),
    placement: { _tag: "now" },
    timeZone: TimeZoneIdSchema.make("Europe/Paris"),
  };

  const { post } = yield* scheduling.send(actorIn(workspaceId), request);

  yield* eventually("the post went out", isFinished(post.id));

  return post.id;
});

// A workspace with a published post on one channel of `platform`.
const published = Effect.fn("test.published")(function* published(
  platform: Platform,
  parts = 1
) {
  const workspaceId = yield* freshWorkspace;
  const channelId = yield* connect(workspaceId, platform);
  const postId = yield* sendNow(workspaceId, [channelId], platform, parts);
  const [target] = yield* targetsOf(postId);

  if (target === undefined) {
    return yield* Effect.die("The post has no target");
  }

  return { actor: actorIn(workspaceId), channelId, postId, target };
});

const changeOf = (changeId: LivePostChangeId) =>
  LivePostChangeStore.use((store) => store.find(changeId)).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.die("The change is gone"),
        onSome: Effect.succeed,
      })
    )
  );

const hasStatus = (changeId: LivePostChangeId, status: string) =>
  changeOf(changeId).pipe(Effect.map((change) => change.status === status));

const targetOf = (postId: PostId) =>
  targetsOf(postId).pipe(
    Effect.flatMap(([target]) =>
      target === undefined ? Effect.die("No target") : Effect.succeed(target)
    )
  );

const removedAtOf = (target: PostTarget) =>
  target.status._tag === "published"
    ? Option.fromUndefinedOr(target.status.removedAt)
    : Option.none();

// The ids of the parts the fake platform was asked to delete, in order.
const deletedOn = (channelId: ChannelId) =>
  FakeRemovals.use((removals) => removals.calls).pipe(
    Effect.map((calls) =>
      calls
        .filter(
          ({ kind, request }) =>
            kind === "remove" && request.channelId === channelId
        )
        .map(({ request }) => request.platformPostId)
    )
  );

// Whether the change's job is parked, on a durable clock.
const isWaiting = (changeId: LivePostChangeId) =>
  ChangeLivePostV1.executionId({ changeId }).pipe(
    Effect.flatMap((executionId) => ChangeLivePostV1.poll(executionId)),
    Effect.map(
      (result) => Option.isSome(result) && result.value._tag === "Suspended"
    )
  );

const isRefusal = Schema.is(LivePostNotChangeable);

// Why the use case refused, when it did.
const refusalOf = <A>(exit: Exit.Exit<A, unknown>) =>
  Exit.isFailure(exit)
    ? exit.cause.reasons
        .flatMap((reason) =>
          reason._tag === "Fail" && isRefusal(reason.error)
            ? [reason.error.reason]
            : []
        )
        .at(0)
    : undefined;

describe("unpublishing a live post", () => {
  it.effect(
    "deletes it from the platform and records it, the post staying published",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* single() {
          const changes = yield* LivePostChanges;

          const { actor, channelId, postId, target } =
            yield* published("mastodon");

          const change = yield* changes.unpublishTarget(
            actor,
            postId,
            target.id
          );

          assert.strictEqual(change.status, "pending");
          assert.strictEqual(change.kind, "unpublish");

          yield* eventually("the change is done", hasStatus(change.id, "done"));

          const done = yield* changeOf(change.id);
          const after = yield* targetOf(postId);

          assert.isFalse(done.alreadyGone);
          assert.deepStrictEqual(done.partsLeft, []);
          assert.isTrue(Option.isSome(done.finishedAt));
          assert.strictEqual(after.status._tag, "published");
          assert.deepStrictEqual(removedAtOf(after), done.finishedAt);
          assert.deepStrictEqual(
            yield* deletedOn(channelId),
            target.status._tag === "published"
              ? Option.toArray(target.status.platformPostId)
              : []
          );

          const told = yield* FakeRemovals.use((removals) => removals.told);

          assert.deepStrictEqual(
            told.map(({ change: { id }, event }) => [id, event]),
            [[change.id, "unpublished"]]
          );
          assert.deepStrictEqual(
            told.map(({ target: { status } }) =>
              status._tag === "published" ? status.removedAt : undefined
            ),
            [Option.getOrUndefined(done.finishedAt)]
          );

          // Its job ended: nothing is left behind.
          const executionId = yield* ChangeLivePostV1.executionId({
            changeId: change.id,
          });

          const result = yield* ChangeLivePostV1.poll(executionId);

          assert.isTrue(
            Option.isSome(result) && result.value._tag === "Complete"
          );

          // Removed once: asking again is refused.
          const again = yield* changes
            .unpublishTarget(actor, postId, target.id)
            .pipe(Effect.exit);

          assert.strictEqual(refusalOf(again), "alreadyRemoved");
        })
      ),
    timeout
  );

  it.effect(
    "deletes a thread last part first, each recorded before the next",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* thread() {
          const changes = yield* LivePostChanges;
          const removals = yield* FakeRemovals;

          const { actor, channelId, postId, target } = yield* published(
            "mastodon",
            3
          );

          const ids = target.liveParts.map(({ platformPostId }) =>
            Option.getOrThrow(platformPostId)
          );

          assert.strictEqual(ids.length, 3);

          // The second deletion waits until the test lets it answer.
          yield* removals.script(channelId, [
            { _tag: "answer", outcome: "removed" },
            { _tag: "hang" },
          ]);

          const change = yield* changes.unpublishTarget(
            actor,
            postId,
            target.id
          );

          yield* eventually(
            "the second deletion was asked",
            deletedOn(channelId).pipe(Effect.map((calls) => calls.length === 2))
          );

          // The last part is recorded gone before the next is deleted.
          const midway = yield* changeOf(change.id);

          assert.deepStrictEqual(
            midway.partsLeft.map(({ index }) => index),
            [1, 0]
          );

          yield* removals.release(channelId);
          yield* eventually("the change is done", hasStatus(change.id, "done"));

          assert.deepStrictEqual(yield* deletedOn(channelId), ids.toReversed());
          assert.isTrue(Option.isSome(removedAtOf(yield* targetOf(postId))));
        })
      ),
    timeout
  );

  it.effect("takes a post already gone from the platform as removed", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* alreadyGone() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;

        const { actor, channelId, postId, target } =
          yield* published("bluesky");

        yield* removals.script(channelId, [
          { _tag: "answer", outcome: "alreadyGone" },
        ]);

        const change = yield* changes.unpublishTarget(actor, postId, target.id);

        yield* eventually("the change is done", hasStatus(change.id, "done"));

        assert.isTrue((yield* changeOf(change.id)).alreadyGone);
      })
    )
  );

  it.effect(
    "waits as long as the platform asks, and goes on",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* rateLimited() {
          const changes = yield* LivePostChanges;
          const removals = yield* FakeRemovals;

          const { actor, channelId, postId, target } =
            yield* published("mastodon");

          yield* removals.script(channelId, [
            {
              _tag: "fail",
              failure: new RateLimited({ retryAfter: Duration.minutes(20) }),
            },
          ]);

          const change = yield* changes.unpublishTarget(
            actor,
            postId,
            target.id
          );

          yield* eventually(
            "the platform was called",
            deletedOn(channelId).pipe(Effect.map((calls) => calls.length === 1))
          );
          yield* eventually("the job waits", isWaiting(change.id));

          assert.strictEqual((yield* changeOf(change.id)).status, "pending");

          yield* TestClock.adjust(Duration.minutes(20));
          yield* eventually("the change is done", hasStatus(change.id, "done"));

          assert.strictEqual((yield* deletedOn(channelId)).length, 2);
        })
      ),
    timeout
  );

  it.effect(
    "fails after the outage's retries, keeping the parts left, and finishes when asked again",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* outage() {
          const changes = yield* LivePostChanges;
          const removals = yield* FakeRemovals;

          const { actor, channelId, postId, target } = yield* published(
            "mastodon",
            2
          );

          // The last part goes; the first meets an outage six times.
          yield* removals.script(channelId, [
            { _tag: "answer", outcome: "removed" },
            ...Array.from({ length: 6 }, () => ({
              _tag: "fail" as const,
              failure: new PlatformUnavailable(),
            })),
          ]);

          const change = yield* changes.unpublishTarget(
            actor,
            postId,
            target.id
          );

          // Each wait after a call that met the outage: the last part's
          // call, then one more each time.
          for (const [index, minutes] of [1, 5, 15, 60, 60].entries()) {
            yield* eventually(
              "the platform was called again",
              deletedOn(channelId).pipe(
                Effect.map((calls) => calls.length === index + 2)
              )
            );
            yield* eventually("the job waits", isWaiting(change.id));
            yield* TestClock.adjust(Duration.minutes(minutes));
          }

          yield* eventually(
            "the change failed",
            hasStatus(change.id, "failed")
          );

          const failed = yield* changeOf(change.id);

          assert.deepStrictEqual(
            failed.failureCode,
            Option.some("unavailable")
          );
          assert.deepStrictEqual(
            failed.partsLeft.map(({ index }) => index),
            [0]
          );
          assert.isTrue(Option.isNone(removedAtOf(yield* targetOf(postId))));
          assert.deepStrictEqual(
            (yield* removals.told).map(({ event }) => event),
            ["unpublishFailed"]
          );

          // Asked again, it deletes what was left, and only that.
          const again = yield* changes.unpublishTarget(
            actor,
            postId,
            target.id
          );

          assert.deepStrictEqual(
            again.partsLeft.map(({ index }) => index),
            [0]
          );

          yield* eventually("the change is done", hasStatus(again.id, "done"));

          assert.strictEqual((yield* deletedOn(channelId)).length, 8);
          assert.deepStrictEqual(
            (yield* changes.list(actor, postId)).map(({ id }) => id),
            [again.id, change.id]
          );
        })
      ),
    timeout
  );

  it.effect("fails at once when the channel can no longer be used", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* channelGone() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        yield* removals.script(channelId, [
          { _tag: "fail", failure: new TokenExpired() },
        ]);

        const expired = yield* changes.unpublishTarget(
          actor,
          postId,
          target.id
        );

        yield* eventually("it failed", hasStatus(expired.id, "failed"));

        assert.deepStrictEqual(
          (yield* changeOf(expired.id)).failureCode,
          Option.some("channelUnavailable")
        );

        yield* removals.script(channelId, [
          {
            _tag: "fail",
            failure: new BadRequest({ code: "channelDisconnected" }),
          },
        ]);

        const disconnected = yield* changes.unpublishTarget(
          actor,
          postId,
          target.id
        );

        yield* eventually("it failed", hasStatus(disconnected.id, "failed"));

        assert.deepStrictEqual(
          (yield* changeOf(disconnected.id)).failureCode,
          Option.some("channelUnavailable")
        );
      })
    )
  );

  it.effect("calls again for a call a run left in flight", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* inFlight() {
        const store = yield* LivePostChangeStore;
        const jobs = yield* LivePostJobs;
        const removals = yield* FakeRemovals;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        // The call in flight deleted it: the one made again finds it gone,
        // which is Peal's own deletion, not one made before.
        yield* removals.script(channelId, [
          { _tag: "answer", outcome: "alreadyGone" },
        ]);

        // A change whose job's first run began its call and died: the
        // journal says the call is in flight.
        const change = requestUnpublish({
          channelId,
          id: yield* newId(LivePostChangeIdSchema),
          now: utc(start),
          parts: Result.getOrThrow(
            removable(target, Option.some("mastodon"), Option.none())
          ),
          postId,
          requestedBy: Option.none(),
          requestedVia: Option.none(),
          targetId: target.id,
          workspaceId: actor.workspaceId,
        });

        yield* store.insert(change);
        yield* store.beginCall(change.id, utc(start));

        assert.deepStrictEqual(yield* store.lockOpen(actor.workspaceId), [
          { changeId: change.id, inFlight: true },
        ]);

        // Its job runs again: deleting twice is harmless, so it calls.
        yield* jobs.start(change.id);
        yield* eventually("the change is done", hasStatus(change.id, "done"));

        assert.strictEqual((yield* deletedOn(channelId)).length, 1);
        assert.isFalse((yield* changeOf(change.id)).alreadyGone);
        assert.deepStrictEqual(yield* store.lockOpen(actor.workspaceId), []);
      })
    )
  );
});

describe("asking to unpublish", () => {
  it.effect("makes one change of twenty requests sent together", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* together() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        yield* removals.script(channelId, [{ _tag: "hang" }]);

        const exits = yield* Effect.all(
          Array.from({ length: 20 }, () =>
            changes.unpublishTarget(actor, postId, target.id).pipe(Effect.exit)
          ),
          { concurrency: "unbounded" }
        );

        assert.strictEqual(exits.filter(Exit.isSuccess).length, 1);
        assert.deepStrictEqual(
          [...new Set(exits.filter(Exit.isFailure).map(refusalOf))],
          ["changeInProgress"]
        );

        yield* removals.release(channelId);
      })
    )
  );

  it.effect("refuses what cannot be unpublished, before any call", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* refusals() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;
        const workspaceId = yield* freshWorkspace;
        const actor = actorIn(workspaceId);
        const scheduling = yield* PostScheduling;

        // Scheduled for later: not live.
        const mastodon = yield* connect(workspaceId, "mastodon");

        const later = yield* scheduling.send(actor, {
          channelIds: [mastodon],
          content: new PostContent({
            followUps: [],
            media: [],
            overrides: [],
            text: "A synthetic post for tomorrow.",
          }),
          idempotency: Option.none(),
          placement: { _tag: "at", at: utc("2026-07-02T08:00:00Z") },
          timeZone: TimeZoneIdSchema.make("Europe/Paris"),
        });

        const pending = yield* targetOf(later.post.id);

        const notLive = yield* changes
          .unpublishTarget(actor, later.post.id, pending.id)
          .pipe(Effect.exit);

        assert.strictEqual(refusalOf(notLive), "notPublished");

        // A platform where Peal may not delete.
        const threads = yield* connect(workspaceId, "threads");
        const onThreads = yield* sendNow(workspaceId, [threads], "threads");
        const threadsTarget = yield* targetOf(onThreads);

        const notSupported = yield* changes
          .unpublishTarget(actor, onThreads, threadsTarget.id)
          .pipe(Effect.exit);

        assert.strictEqual(refusalOf(notSupported), "notSupported");

        // A boost shows it.
        const boosted = yield* published("x");

        yield* removals.hold(boosted.target.id);

        const held = yield* changes
          .unpublishTarget(boosted.actor, boosted.postId, boosted.target.id)
          .pipe(Effect.exit);

        assert.strictEqual(refusalOf(held), "boostRunning");

        // Its channel was disconnected.
        const gone = yield* published("bluesky");

        yield* ChannelRepository.use((channels) =>
          channels.remove(gone.actor.workspaceId, gone.channelId)
        );

        const disconnected = yield* changes
          .unpublishTarget(gone.actor, gone.postId, gone.target.id)
          .pipe(Effect.exit);

        assert.strictEqual(refusalOf(disconnected), "channelUnavailable");

        // Without post:publish: a contributor.
        const contributor = yield* changes
          .unpublishTarget(
            actorIn(boosted.actor.workspaceId, permissionsFor("contributor")),
            boosted.postId,
            boosted.target.id
          )
          .pipe(Effect.exit);

        assert.isTrue(Exit.isFailure(contributor));
        assert.strictEqual(refusalOf(contributor), undefined);

        // Another workspace's post, or another post's target.
        const elsewhere = yield* changes
          .unpublishTarget(actor, boosted.postId, boosted.target.id)
          .pipe(Effect.exit);

        assert.isTrue(Exit.isFailure(elsewhere));

        assert.deepStrictEqual(yield* removals.calls, []);
      })
    )
  );

  it.effect("answers a whole post channel by channel", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* wholePost() {
        const changes = yield* LivePostChanges;
        const workspaceId = yield* freshWorkspace;
        const actor = actorIn(workspaceId);
        const mastodon = yield* connect(workspaceId, "mastodon");
        const threads = yield* connect(workspaceId, "threads");

        const postId = yield* sendNow(
          workspaceId,
          [mastodon, threads],
          "on two channels"
        );

        const targets = yield* targetsOf(postId);

        const answer = yield* changes.unpublishPost(actor, postId);

        const idOn = (channelId: ChannelId) =>
          targets.find((target) => target.channelId === channelId)?.id;

        assert.deepStrictEqual(
          answer.changes.map(({ targetId }) => targetId),
          [idOn(mastodon)]
        );
        assert.deepStrictEqual(
          answer.refused.map(({ reason, targetId }) => [reason, targetId]),
          [["notSupported", idOn(threads)]]
        );

        for (const made of answer.changes) {
          yield* eventually("the change is done", hasStatus(made.id, "done"));
        }
      })
    )
  );
});

describe("erasing a workspace with a change of a live post", () => {
  it.effect("stops a change that waits, and deletes it", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* waiting() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;
        const records = yield* PostRecords;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        yield* removals.script(channelId, [
          {
            _tag: "fail",
            failure: new RateLimited({ retryAfter: Duration.hours(1) }),
          },
        ]);

        const change = yield* changes.unpublishTarget(actor, postId, target.id);

        yield* eventually(
          "the platform was called",
          deletedOn(channelId).pipe(Effect.map((calls) => calls.length === 1))
        );
        yield* eventually("the job waits", isWaiting(change.id));

        yield* records.eraseWorkspace(actor.workspaceId);

        assert.deepStrictEqual(
          yield* LivePostChangeStore.use((store) => store.find(change.id)),
          Option.none()
        );

        // Its wait ends: nothing more is deleted.
        yield* TestClock.adjust(Duration.hours(2));
        yield* TestClock.withLive(Effect.sleep(Duration.millis(200)));

        assert.strictEqual((yield* deletedOn(channelId)).length, 1);
      })
    )
  );

  it.effect("is refused while a call deletes a post", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* inFlight() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;
        const records = yield* PostRecords;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        yield* removals.script(channelId, [{ _tag: "hang" }]);

        const change = yield* changes.unpublishTarget(actor, postId, target.id);

        yield* eventually(
          "the call was made",
          deletedOn(channelId).pipe(Effect.map((calls) => calls.length === 1))
        );

        const refused = yield* records
          .eraseWorkspace(actor.workspaceId)
          .pipe(Effect.flip);

        assert.strictEqual(refused._tag, "PostsPublishing");

        yield* removals.release(channelId);
        yield* eventually("the change is done", hasStatus(change.id, "done"));
        yield* records.eraseWorkspace(actor.workspaceId);
      })
    )
  );
});
