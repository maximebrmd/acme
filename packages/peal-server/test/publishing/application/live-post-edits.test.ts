import { assert, describe, it } from "@effect/vitest";
import { Duration, Effect, Exit, Layer, Option, Result, Schema } from "effect";
import { MessageStorage } from "effect/cluster";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { LivePostChangeStore } from "#publishing/application/live-post-change-store.ts";
import { LivePostChanges } from "#publishing/application/live-post-changes.ts";
import { LivePostJobs } from "#publishing/application/live-post-jobs.ts";
import { LivePostNotChangeable } from "#publishing/application/live-post-not-changeable.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { ChannelOptions } from "#publishing/domain/channel-options.ts";
import { LivePostChangeIdSchema } from "#publishing/domain/live-post-change-id.ts";
import type { LivePostChangeId } from "#publishing/domain/live-post-change-id.ts";
import { editable, requestEdit } from "#publishing/domain/live-post-change.ts";
import { MastodonOptions } from "#publishing/domain/mastodon-options.ts";
import { PostContentRejected } from "#publishing/domain/post-content-rejected.ts";
import { PostContent, partsOn } from "#publishing/domain/post-content.ts";
import { PostPart } from "#publishing/domain/post-part.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import { ChangeLivePostV1 } from "#publishing/infrastructure/workflows/change-live-post.ts";
import { newId } from "#shared/application/ids.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { FakeRemovals } from "#test/publishing/fakes/fake-live-post-clients.ts";
import {
  eventually,
  isFinished,
  setTime,
  targetsOf,
  utc,
} from "#test/publishing/infrastructure/harness.ts";
import {
  attachableImage,
  attachableVideo,
  connect,
  onPostsServerAt,
  postsServerBehind,
} from "#test/publishing/posts-server.ts";
import {
  actorAs,
  actorIn,
  attachableMedia,
  mediaFile,
  postAllowance,
} from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Editing the text of live posts, through the use cases and their durable
// job, on an in-memory cluster driven by TestClock: a fake platform
// publishes the posts and another edits them.

const timeout = 60_000;

const start = "2026-07-01T08:00:00Z";

const freshWorkspace = newId(WorkspaceIdSchema);

// A post of `parts` parts, out now on `channels`, with `options`.
const sendNow = Effect.fn("test.sendNow")(function* sendNow(
  workspaceId: WorkspaceId,
  channels: readonly [ChannelId, ...ChannelId[]],
  parts = 1,
  options: readonly ChannelOptions[] = []
) {
  const scheduling = yield* PostScheduling;

  const { post } = yield* scheduling.send(actorIn(workspaceId), {
    channelIds: channels,
    content: new PostContent({
      followUps: Array.from(
        { length: parts - 1 },
        (_, index) =>
          new PostPart({
            delaySeconds: 0,
            media: [],
            overrides: [],
            text: `Part ${String(index + 2)} of a synthetic post.`,
          })
      ),
      media: [],
      overrides: [],
      text: "A synthetic post, with a typo.",
    }),
    idempotency: Option.none(),
    options,
    placement: { _tag: "now" },
    timeZone: TimeZoneIdSchema.make("Europe/Paris"),
  });

  yield* eventually("the post went out", isFinished(post.id));

  return post.id;
});

const targetOn = (postId: PostId, channelId: ChannelId) =>
  targetsOf(postId).pipe(
    Effect.flatMap((targets) => {
      const found = targets.find((target) => target.channelId === channelId);

      return found === undefined
        ? Effect.die("No target on the channel")
        : Effect.succeed(found);
    })
  );

// A workspace with a post of `parts` parts published on one channel of
// `platform`.
const published = Effect.fn("test.published")(function* published(
  platform: Platform,
  parts = 1
) {
  const workspaceId = yield* freshWorkspace;
  const channelId = yield* connect(workspaceId, platform);
  const postId = yield* sendNow(workspaceId, [channelId], parts);

  return {
    actor: actorIn(workspaceId),
    channelId,
    postId,
    target: yield* targetOn(postId, channelId),
  };
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

const contentOf = (postId: PostId) =>
  PostRepository.use((posts) => posts.find(postId)).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.die("The post is gone"),
        onSome: ({ post }) => Effect.succeed(post.content),
      })
    )
  );

const editedAtOf = (target: PostTarget) =>
  target.status._tag === "published"
    ? Option.fromUndefinedOr(target.status.editedAt)
    : Option.none();

// The edits the fake platform was asked for, on a channel.
const editsOn = (channelId: ChannelId) =>
  FakeRemovals.use((removals) => removals.calls).pipe(
    Effect.map((calls) =>
      calls.filter(
        ({ kind, request }) =>
          kind === "edit" && request.channelId === channelId
      )
    )
  );

const isWaiting = (changeId: LivePostChangeId) =>
  ChangeLivePostV1.executionId({ changeId }).pipe(
    Effect.flatMap((executionId) => ChangeLivePostV1.poll(executionId)),
    Effect.map(
      (result) => Option.isSome(result) && result.value._tag === "Suspended"
    )
  );

// What a change's row holds as its text, read in SQL.
const storedTextOf = (changeId: LivePostChangeId) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly text: string | null;
      }>`SELECT text FROM publishing.live_post_changes WHERE id = ${changeId}`
  ).pipe(
    Effect.orDie,
    Effect.map(([row]) => row?.text ?? null)
  );

const digestOf = (target: PostTarget) =>
  SqlClient.SqlClient.use(
    (sql) =>
      sql<{
        readonly content_digest: string | null;
      }>`SELECT content_digest FROM publishing.post_targets WHERE id = ${target.id}`
  ).pipe(
    Effect.orDie,
    Effect.map(([row]) => row?.content_digest ?? null)
  );

// Whether anything the cluster stored (messages, replies, the journal of
// envelopes, all kept encoded) holds `needle`.
const clusterHolds = (needle: string) =>
  MessageStorage.MemoryDriver.use((driver) =>
    Effect.sync(() =>
      JSON.stringify({
        journal: driver.journal,
        requests: [...driver.requests.values()],
        unprocessed: [...driver.unprocessed],
      }).includes(needle)
    )
  );

const isRefusal = Schema.is(LivePostNotChangeable);

const isRejected = Schema.is(PostContentRejected);

const failureOf = <A>(exit: Exit.Exit<A, unknown>) =>
  Exit.isFailure(exit)
    ? exit.cause.reasons
        .flatMap((reason) => (reason._tag === "Fail" ? [reason.error] : []))
        .at(0)
    : undefined;

const refusalOf = <A>(exit: Exit.Exit<A, unknown>) => {
  const failure = failureOf(exit);

  return isRefusal(failure) ? failure.reason : undefined;
};

const violationsOf = <A>(exit: Exit.Exit<A, unknown>) => {
  const failure = failureOf(exit);

  return isRejected(failure)
    ? failure.violations.map((violation) => violation._tag)
    : [];
};

describe("editing a live post", () => {
  it.effect(
    "replaces the part's text on the platform, then in Peal for that channel only",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* edits() {
          const changes = yield* LivePostChanges;
          const removals = yield* FakeRemovals;
          const workspaceId = yield* freshWorkspace;
          const actor = actorIn(workspaceId);
          const edited = yield* connect(workspaceId, "mastodon");
          const other = yield* connect(workspaceId, "mastodon");
          const postId = yield* sendNow(workspaceId, [edited, other], 2);
          const target = yield* targetOn(postId, edited);
          const before = yield* digestOf(target);

          const change = yield* changes.editTarget(actor, postId, target.id, {
            part: 1,
            text: "Part 2, corrected.",
          });

          assert.strictEqual(change.kind, "edit");
          assert.strictEqual(change.status, "pending");
          assert.deepStrictEqual(
            change.partsLeft.map(({ index }) => index),
            [1]
          );

          yield* eventually("the edit is done", hasStatus(change.id, "done"));

          const content = yield* contentOf(postId);

          assert.deepStrictEqual(
            partsOn(content, edited).map(({ text }) => text),
            ["A synthetic post, with a typo.", "Part 2, corrected."]
          );
          assert.deepStrictEqual(
            partsOn(content, other).map(({ text }) => text),
            ["A synthetic post, with a typo.", "Part 2 of a synthetic post."]
          );
          assert.deepStrictEqual(content.overrides, []);

          const done = yield* changeOf(change.id);
          const after = yield* targetOn(postId, edited);

          assert.deepStrictEqual(editedAtOf(after), done.finishedAt);
          assert.isTrue(
            Option.isNone(editedAtOf(yield* targetOn(postId, other)))
          );
          assert.strictEqual(after.status._tag, "published");
          // The text goes once the change ended, and the digest follows
          // the new text.
          assert.deepStrictEqual(done.text, Option.none());
          assert.isNull(yield* storedTextOf(change.id));
          assert.notStrictEqual(yield* digestOf(after), before);

          const calls = yield* editsOn(edited);

          assert.strictEqual(calls.length, 1);
          assert.deepStrictEqual(calls[0]?.request, {
            changeId: change.id,
            channelId: edited,
            platformPostId: Option.getOrThrow(
              after.liveParts.find(({ index }) => index === 1)
                ?.platformPostId ?? Option.none()
            ),
          });
          assert.deepStrictEqual(
            (yield* removals.told).map(({ event, part }) => [event, part]),
            [["edited", 1]]
          );

          // The job's history names the change, never its text.
          assert.isTrue(yield* clusterHolds(change.id));
          assert.isFalse(yield* clusterHolds("Part 2, corrected."));
        })
      ),
    timeout
  );

  it.effect("keeps the text storable: no NUL, no half of a pair", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* storable() {
        const changes = yield* LivePostChanges;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        const change = yield* changes.editTarget(actor, postId, target.id, {
          part: 0,
          text: `Fixed${String.fromCodePoint(0)} text ${String.fromCodePoint(0xd8_00)}`,
        });

        yield* eventually("the edit is done", hasStatus(change.id, "done"));

        assert.deepStrictEqual(
          partsOn(yield* contentOf(postId), channelId).map(({ text }) => text),
          ["Fixed text �"]
        );
      })
    )
  );

  it.effect(
    "waits as the platform asks, renews a refused token, and is not left with a job",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* retries() {
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

          const change = yield* changes.editTarget(actor, postId, target.id, {
            part: 0,
            text: "Corrected after a wait.",
          });

          yield* eventually(
            "the platform was called",
            editsOn(channelId).pipe(Effect.map((calls) => calls.length === 1))
          );
          yield* eventually("the job waits", isWaiting(change.id));
          yield* TestClock.adjust(Duration.minutes(20));
          yield* eventually("the edit is done", hasStatus(change.id, "done"));

          assert.strictEqual((yield* editsOn(channelId)).length, 2);

          const executionId = yield* ChangeLivePostV1.executionId({
            changeId: change.id,
          });

          yield* eventually(
            "the job ended",
            ChangeLivePostV1.poll(executionId).pipe(
              Effect.map(
                (result) =>
                  Option.isSome(result) && result.value._tag === "Complete"
              )
            )
          );
        })
      ),
    timeout
  );

  it.effect(
    "fails after the outage's retries, keeping the old text, and edits when asked again",
    () =>
      onPostsServerAt(
        start,
        Effect.gen(function* outage() {
          const changes = yield* LivePostChanges;
          const removals = yield* FakeRemovals;

          const { actor, channelId, postId, target } =
            yield* published("mastodon");

          yield* removals.script(
            channelId,
            Array.from({ length: 6 }, () => ({
              _tag: "fail" as const,
              failure: new PlatformUnavailable(),
            }))
          );

          const change = yield* changes.editTarget(actor, postId, target.id, {
            part: 0,
            text: "Corrected.",
          });

          for (const [index, minutes] of [1, 5, 15, 60, 60].entries()) {
            yield* eventually(
              "the platform was called again",
              editsOn(channelId).pipe(
                Effect.map((calls) => calls.length === index + 1)
              )
            );
            yield* eventually("the job waits", isWaiting(change.id));
            yield* TestClock.adjust(Duration.minutes(minutes));
          }

          yield* eventually("the edit failed", hasStatus(change.id, "failed"));

          const failed = yield* changeOf(change.id);

          assert.deepStrictEqual(
            failed.failureCode,
            Option.some("unavailable")
          );
          assert.isNull(yield* storedTextOf(change.id));
          assert.deepStrictEqual(
            partsOn(yield* contentOf(postId), channelId).map(
              ({ text }) => text
            ),
            ["A synthetic post, with a typo."]
          );
          assert.isTrue(
            Option.isNone(editedAtOf(yield* targetOn(postId, channelId)))
          );
          assert.deepStrictEqual(
            (yield* removals.told).map(({ event, part }) => [event, part]),
            [["editFailed", 0]]
          );

          const again = yield* changes.editTarget(actor, postId, target.id, {
            part: 0,
            text: "Corrected.",
          });

          yield* eventually("the edit is done", hasStatus(again.id, "done"));

          assert.deepStrictEqual(
            partsOn(yield* contentOf(postId), channelId).map(
              ({ text }) => text
            ),
            ["Corrected."]
          );
        })
      ),
    timeout
  );

  it.effect("ends at once on a refusal no retry changes", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* refused() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        yield* removals.script(channelId, [
          { _tag: "fail", failure: new BadRequest({ code: "postGone" }) },
        ]);

        const change = yield* changes.editTarget(actor, postId, target.id, {
          part: 0,
          text: "Corrected.",
        });

        yield* eventually("the edit failed", hasStatus(change.id, "failed"));

        assert.deepStrictEqual(
          (yield* changeOf(change.id)).failureCode,
          Option.some("postGone")
        );
        assert.strictEqual((yield* editsOn(channelId)).length, 1);
      })
    )
  );

  it.effect("calls again for a call a run left in flight", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* inFlight() {
        const store = yield* LivePostChangeStore;
        const jobs = yield* LivePostJobs;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        // A change whose job's first run began its call and died.
        const change = requestEdit({
          channelId,
          id: yield* newId(LivePostChangeIdSchema),
          now: utc(start),
          part: Result.getOrThrow(
            editable(target, Option.some("mastodon"), 0, Option.none())
          ),
          postId,
          requestedBy: Option.none(),
          requestedVia: Option.none(),
          targetId: target.id,
          text: "Corrected after a crash.",
          workspaceId: actor.workspaceId,
        });

        yield* store.insert(change);
        yield* store.beginCall(change.id, utc(start));

        // Its job runs again: the same text again is harmless, so it calls.
        yield* jobs.start(change.id);
        yield* eventually("the edit is done", hasStatus(change.id, "done"));

        assert.strictEqual((yield* editsOn(channelId)).length, 1);
        assert.deepStrictEqual(
          partsOn(yield* contentOf(postId), channelId).map(({ text }) => text),
          ["Corrected after a crash."]
        );
        assert.deepStrictEqual(yield* store.lockOpen(actor.workspaceId), []);
      })
    )
  );

  it.effect("edits a target whose removal failed: it is still live", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* afterFailedRemoval() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        yield* removals.script(channelId, [
          { _tag: "fail", failure: new BadRequest({ code: "http400" }) },
        ]);

        const removal = yield* changes.unpublishTarget(
          actor,
          postId,
          target.id
        );

        yield* eventually("it failed", hasStatus(removal.id, "failed"));

        const edit = yield* changes.editTarget(actor, postId, target.id, {
          part: 0,
          text: "Corrected.",
        });

        yield* eventually("the edit is done", hasStatus(edit.id, "done"));
      })
    )
  );
});

describe("asking to edit", () => {
  it.effect("makes one change of twenty requests sent together", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* together() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        // The edit stays pending until every request was answered: one
        // that ended meanwhile would let a later request make another.
        yield* removals.script(channelId, [{ _tag: "hang" }]);

        const exits = yield* Effect.all(
          Array.from({ length: 20 }, () =>
            changes
              .editTarget(actor, postId, target.id, {
                part: 0,
                text: "Corrected together.",
              })
              .pipe(Effect.exit)
          ),
          { concurrency: "unbounded" }
        );

        assert.strictEqual(exits.filter(Exit.isSuccess).length, 1);
        assert.deepStrictEqual(
          [...new Set(exits.filter(Exit.isFailure).map(refusalOf))],
          ["changeInProgress"]
        );

        const made = exits.find(Exit.isSuccess);

        yield* removals.release(channelId);

        if (made !== undefined) {
          yield* eventually(
            "the edit is done",
            hasStatus(made.value.id, "done")
          );
        }

        assert.strictEqual((yield* editsOn(channelId)).length, 1);
      })
    )
  );

  it.effect("refuses what cannot be edited, before any call", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* refusals() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;
        const scheduling = yield* PostScheduling;
        const workspaceId = yield* freshWorkspace;
        const actor = actorIn(workspaceId);
        const fix = { part: 0, text: "Corrected." };

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

        const pending = yield* targetOn(later.post.id, mastodon);

        assert.strictEqual(
          refusalOf(
            yield* changes
              .editTarget(actor, later.post.id, pending.id, fix)
              .pipe(Effect.exit)
          ),
          "notPublished"
        );

        // A platform where Peal does not edit.
        const bluesky = yield* published("bluesky");

        assert.strictEqual(
          refusalOf(
            yield* changes
              .editTarget(bluesky.actor, bluesky.postId, bluesky.target.id, fix)
              .pipe(Effect.exit)
          ),
          "notSupported"
        );

        // A part the post does not have.
        const one = yield* published("mastodon");

        assert.strictEqual(
          refusalOf(
            yield* changes
              .editTarget(one.actor, one.postId, one.target.id, {
                part: 1,
                text: "Corrected.",
              })
              .pipe(Effect.exit)
          ),
          "noPlatformId"
        );

        // Its channel was turned off.
        const off = yield* published("mastodon");

        yield* ChannelRepository.use((channels) =>
          channels.remove(off.actor.workspaceId, off.channelId)
        );

        assert.strictEqual(
          refusalOf(
            yield* changes
              .editTarget(off.actor, off.postId, off.target.id, fix)
              .pipe(Effect.exit)
          ),
          "channelUnavailable"
        );

        // Removed already.
        const removed = yield* published("mastodon");

        const removal = yield* changes.unpublishTarget(
          removed.actor,
          removed.postId,
          removed.target.id
        );

        yield* eventually("it is removed", hasStatus(removal.id, "done"));

        assert.strictEqual(
          refusalOf(
            yield* changes
              .editTarget(removed.actor, removed.postId, removed.target.id, fix)
              .pipe(Effect.exit)
          ),
          "alreadyRemoved"
        );

        // Without post:publish: a contributor, a viewer.
        for (const role of ["contributor", "viewer"] as const) {
          const exit = yield* changes
            .editTarget(
              actorIn(one.actor.workspaceId, permissionsFor(role)),
              one.postId,
              one.target.id,
              fix
            )
            .pipe(Effect.exit);

          assert.isTrue(Exit.isFailure(exit));
          assert.strictEqual(refusalOf(exit), undefined);
        }

        // Another workspace's post.
        assert.isTrue(
          Exit.isFailure(
            yield* changes
              .editTarget(actor, one.postId, one.target.id, fix)
              .pipe(Effect.exit)
          )
        );

        assert.deepStrictEqual(
          (yield* removals.calls).filter(({ kind }) => kind === "edit"),
          []
        );
      })
    )
  );

  it.effect("checks the text as scheduling checks the channel's", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* content() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;
        const { actor, postId, target } = yield* published("mastodon", 2);

        const tried = (part: number, text: string) =>
          changes
            .editTarget(actor, postId, target.id, { part, text })
            .pipe(Effect.exit);

        assert.deepStrictEqual(violationsOf(yield* tried(0, " \n ")), [
          "empty",
        ]);
        assert.deepStrictEqual(violationsOf(yield* tried(1, "x".repeat(501))), [
          "textTooLong",
        ]);

        const rejected = failureOf(yield* tried(1, "x".repeat(501)));

        assert.isTrue(
          isRejected(rejected) &&
            rejected.violations.every(
              (violation) => "part" in violation && violation.part === 1
            )
        );

        // A content warning counts with the text.
        const workspaceId = yield* freshWorkspace;
        const warned = yield* connect(workspaceId, "mastodon");

        const warnedPost = yield* sendNow(workspaceId, [warned], 1, [
          new ChannelOptions({
            channelId: warned,
            options: new MastodonOptions({ contentWarning: "w".repeat(400) }),
          }),
        ]);

        const warnedTarget = yield* targetOn(warnedPost, warned);

        assert.deepStrictEqual(
          violationsOf(
            yield* changes
              .editTarget(actorIn(workspaceId), warnedPost, warnedTarget.id, {
                part: 0,
                text: "t".repeat(150),
              })
              .pipe(Effect.exit)
          ),
          ["textTooLong"]
        );

        assert.deepStrictEqual(yield* removals.calls, []);
      })
    )
  );
});

// A member whose posts wait for an approval, and one who approves.
const heldUser = UserIdSchema.make("6c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f");

const HoldingGate = Layer.succeed(
  ApprovalGate,
  ApprovalGate.of({
    admit: () => Effect.succeed("admitted"),
    approved: () => Effect.succeed(false),
    follow: () => Effect.void,
    forgotten: () => Effect.void,
    holds: (actor) =>
      Effect.succeed(
        actor.subject._tag === "user" && actor.subject.userId === heldUser
      ),
    maySubmit: () => Effect.succeed(true),
    withdrawn: () => Effect.void,
  })
);

const HoldingServer = postsServerBehind(
  HoldingGate,
  attachableMedia([mediaFile(attachableImage), mediaFile(attachableVideo)]),
  postAllowance(),
  PostEvents.none
);

describe("editing under an approval policy", () => {
  it.effect("refuses a member whose posts wait, and lets an approver", () =>
    setTime(start).pipe(
      Effect.andThen(
        Effect.gen(function* held() {
          const changes = yield* LivePostChanges;
          const removals = yield* FakeRemovals;
          const { actor, postId, target } = yield* published("mastodon");

          const refused = yield* changes
            .editTarget(
              actorAs(heldUser, actor.workspaceId),
              postId,
              target.id,
              { part: 0, text: "Corrected." }
            )
            .pipe(Effect.exit);

          assert.strictEqual(refusalOf(refused), "approvalRequired");
          assert.deepStrictEqual(yield* removals.calls, []);

          const allowed = yield* changes.editTarget(actor, postId, target.id, {
            part: 0,
            text: "Corrected.",
          });

          yield* eventually("the edit is done", hasStatus(allowed.id, "done"));

          // Unpublishing stays open to the member held.
          const removal = yield* changes.unpublishTarget(
            actorAs(heldUser, actor.workspaceId),
            postId,
            target.id
          );

          assert.strictEqual(removal.kind, "unpublish");
          yield* eventually("it is removed", hasStatus(removal.id, "done"));
        }).pipe(Effect.provide(HoldingServer))
      )
    )
  );
});

// A token renewed once is the adapters' matter (`live-post-edits.test.ts`
// in `platforms/`); a channel the platform can no longer be called for
// ends the change, as a removal's does.
describe("an edit whose channel is gone", () => {
  it.effect("fails as the channel unavailable", () =>
    onPostsServerAt(
      start,
      Effect.gen(function* tokenGone() {
        const changes = yield* LivePostChanges;
        const removals = yield* FakeRemovals;

        const { actor, channelId, postId, target } =
          yield* published("mastodon");

        yield* removals.script(channelId, [
          {
            _tag: "fail",
            failure: new BadRequest({ code: "channelDisconnected" }),
          },
        ]);

        const change = yield* changes.editTarget(actor, postId, target.id, {
          part: 0,
          text: "Corrected.",
        });

        yield* eventually("the edit failed", hasStatus(change.id, "failed"));

        assert.deepStrictEqual(
          (yield* changeOf(change.id)).failureCode,
          Option.some("channelUnavailable")
        );
      })
    )
  );
});
