import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { FollowUpChannels } from "#publishing/application/follow-up-channels.ts";
import { FollowUpRules } from "#publishing/application/follow-up-rules.ts";
import type { StartFollowUpRequest } from "#publishing/application/follow-up-rules.ts";
import { FollowUps } from "#publishing/application/follow-ups.ts";
import { PlatformClients } from "#publishing/application/platform-client.ts";
import type { OutgoingPost } from "#publishing/application/platform-client.ts";
import { PlatformReposts } from "#publishing/application/platform-reposts.ts";
import type { OutgoingRepost } from "#publishing/application/platform-reposts.ts";
import { PostEvents } from "#publishing/application/post-events.ts";
import { PostMeter } from "#publishing/application/post-meter.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import type { SchedulePostRequest } from "#publishing/application/post-scheduling.ts";
import { RoutedFollowUpPublisher } from "#publishing/application/routed-follow-up-publisher.ts";
import { ShortLinkDefaults } from "#publishing/application/short-link-defaults.ts";
import { FeedsUnused } from "#publishing/container.ts";
import { FollowUpRuleIdSchema } from "#publishing/domain/follow-up-rule-id.ts";
import { DrizzleFollowUpStore } from "#publishing/infrastructure/drizzle-follow-up-store.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { newId } from "#shared/application/ids.ts";
import { can } from "#shared/domain/access.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  FakeFollowUpCounts,
  FakeFollowUpPublisher,
  followUpCalls,
  followUpsAnswer,
  likesOf,
  resetFollowUps,
} from "#test/publishing/fakes/fake-follow-ups.ts";
import { RepositoryCredentials } from "#test/publishing/fakes/fake-live-post-clients.ts";
import {
  FakeRecycling,
  resetRecycling,
  startersAre,
} from "#test/publishing/fakes/fake-recycling.ts";
import {
  eventually,
  isFinished,
  isSuspended,
  setTime,
} from "#test/publishing/infrastructure/harness.ts";
import { connect, postsServerBehind } from "#test/publishing/posts-server.ts";
import {
  actorIn,
  attachableMedia,
  contentOf,
  postAllowance,
} from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

// Follow-up rules on Postgres, with the use cases and jobs as the server
// runs them: a rule armed on a published post, set out by the run once
// analytics counted enough likes, carried out once by its job through the
// gate's side (a fake platform), and refused where no channel can carry
// it.

const timeout = 90_000;

const start = "2026-07-06T07:00:00Z";
const paris = TimeZoneIdSchema.make("Europe/Paris");

// The workspaces a test made, whose rules it deletes when it ends: other
// tests' runs would carry their follow-ups out otherwise.
const tracked = Ref.makeUnsafe<readonly WorkspaceId[]>([]);

const freshWorkspace = newId(WorkspaceIdSchema).pipe(
  Effect.tap((workspaceId) =>
    Ref.update(tracked, (ids) => [...ids, workspaceId])
  )
);

const forgetRules = Effect.gen(function* forgetRules() {
  const sql = yield* SqlClient.SqlClient;

  for (const workspaceId of yield* Ref.getAndSet(tracked, [])) {
    yield* sql`DELETE FROM publishing.follow_up_rules WHERE workspace_id = ${workspaceId}`;
  }
}).pipe(Effect.orDie);

// A gate that lets every post through, and says a member who may not
// approve posts would wait for an approval: so a contributor's rule waits.
const HoldingContributors = Layer.succeed(
  ApprovalGate,
  ApprovalGate.of({
    admit: () => Effect.succeed("admitted"),
    approved: () => Effect.succeed(false),
    follow: () => Effect.void,
    forgotten: () => Effect.void,
    holds: (actor) => Effect.succeed(!can(actor, "post:approve")),
    maySubmit: () => Effect.succeed(true),
    withdrawn: () => Effect.void,
  })
);

const serverBehind = (gate: Layer.Layer<ApprovalGate>) =>
  postsServerBehind(
    gate,
    attachableMedia(),
    postAllowance(),
    PostEvents.none,
    FakeRecycling,
    FeedsUnused,
    ShortLinkDefaults.none,
    Layer.mergeAll(
      FollowUpChannels.supported,
      FakeFollowUpCounts,
      FakeFollowUpPublisher
    )
  );

const FollowUpServer = serverBehind(ApprovalGate.open);

// What the platforms' clients were handed, as the gates' side builds it.
const sentPosts = Ref.makeUnsafe<readonly OutgoingPost[]>([]);
const sentReposts = Ref.makeUnsafe<readonly OutgoingRepost[]>([]);

const answered = (platformPostId: string): PublishResult => ({
  _tag: "published",
  platformPostId: PlatformPostIdSchema.make(platformPostId),
});

const RecordingClients = Layer.mergeAll(
  Layer.succeed(
    PlatformClients,
    PlatformClients.of({
      for: (platform) =>
        Option.some({
          platform,
          publish: (post) =>
            Ref.update(sentPosts, (sent) => [...sent, post]).pipe(
              Effect.as(answered(`reply-${post.idempotencyKey}`))
            ),
          resume: (post) =>
            Effect.succeed(answered(`reply-${post.idempotencyKey}`)),
        }),
    })
  ),
  Layer.succeed(
    PlatformReposts,
    PlatformReposts.of({
      for: (platform) =>
        Option.some({
          platform,
          repost: (repost) =>
            Ref.update(sentReposts, (sent) => [...sent, repost]).pipe(
              Effect.as(answered(`repost-${repost.idempotencyKey}`))
            ),
          resume: (repost) =>
            Effect.succeed(answered(`repost-${repost.idempotencyKey}`)),
        }),
    })
  )
);

// The server whose gates carry follow-ups out as the server does, through
// the routed publisher, to platform clients that record what they get.
const RoutedServer = postsServerBehind(
  ApprovalGate.open,
  attachableMedia(),
  postAllowance(),
  PostEvents.none,
  FakeRecycling,
  FeedsUnused,
  ShortLinkDefaults.none,
  Layer.mergeAll(
    FollowUpChannels.supported,
    FakeFollowUpCounts,
    RoutedFollowUpPublisher.pipe(
      Layer.provide(
        Layer.mergeAll(
          RecordingClients,
          PostMeter.unmetered,
          DrizzleFollowUpStore,
          DrizzlePostRepository,
          RepositoryCredentials
        )
      )
    )
  )
);

const HoldingServer = serverBehind(HoldingContributors);

const onServer = <A, E>(
  test: Effect.Effect<A, E, Layer.Success<typeof FollowUpServer>>,
  server: typeof FollowUpServer = FollowUpServer
) =>
  setTime(start).pipe(
    Effect.andThen(resetRecycling),
    Effect.andThen(resetFollowUps),
    Effect.andThen(
      test.pipe(Effect.ensuring(forgetRules), Effect.provide(server))
    )
  );

// A post that went out on the channels, a minute from now.
const published = Effect.fn("test.published")(function* published(
  workspaceId: WorkspaceId,
  channelIds: SchedulePostRequest["channelIds"],
  text?: string
) {
  const now = yield* DateTime.now;
  const at = DateTime.add(now, { minutes: 1 });

  const sent = yield* PostScheduling.use((scheduling) =>
    scheduling.send(actorIn(workspaceId), {
      channelIds,
      content: contentOf(text ?? "Our summer opening hours."),
      idempotency: Option.none(),
      placement: { _tag: "at", at },
      timeZone: paris,
    })
  );

  yield* eventually("the post waits", isSuspended(sent.post.id));
  yield* TestClock.setTime(
    DateTime.toEpochMillis(DateTime.add(at, { minutes: 1 }))
  );
  yield* eventually("the post went out", isFinished(sent.post.id));

  return sent.post.id;
});

const targetsOf = (postId: PostId) =>
  PostRepository.use((posts) => posts.targets(postId));

const onPost = (
  postId: PostId,
  more: Partial<StartFollowUpRequest> = {}
): StartFollowUpRequest => ({
  comment: Option.some("Thank you all for reading!"),
  likes: 10,
  repost: true,
  scope: { _tag: "post", postId },
  ...more,
});

const runDue = FollowUps.use((followUps) => followUps.runDue);

const ruleNow = (workspaceId: WorkspaceId, ruleId: string) =>
  FollowUpRules.use((rules) =>
    rules.get(actorIn(workspaceId), FollowUpRuleIdSchema.make(ruleId))
  );

const connected = (workspaceId: WorkspaceId, platform: Platform) =>
  connect(workspaceId, platform);

describe("follow-up rules", () => {
  it.effect(
    "follow a post up once it has enough likes, once",
    () =>
      onServer(
        Effect.gen(function* followsUp() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const postId = yield* published(workspaceId, [mastodon]);
          const [target] = yield* targetsOf(postId);

          assert.isDefined(target);

          const started = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId))
          );

          assert.deepStrictEqual(started.channels, [
            {
              channelId: mastodon,
              comment: "available",
              platform: "mastodon",
              repost: "available",
            },
          ]);
          assert.deepStrictEqual(
            started.followUps.map(({ kind, status }) => [kind, status._tag]),
            // Newest first.
            [
              ["repost", "armed"],
              ["comment", "armed"],
            ]
          );

          // Below the threshold: nothing goes.
          yield* likesOf(target.id, 9);
          assert.strictEqual((yield* runDue).triggered, 0);

          yield* likesOf(target.id, 12);
          assert.strictEqual((yield* runDue).triggered, 2);

          yield* eventually(
            "both follow-ups went out",
            ruleNow(workspaceId, started.rule.id).pipe(
              Effect.map(({ followUps }) =>
                followUps.every(({ status }) => status._tag === "sent")
              )
            )
          );

          assert.strictEqual((yield* followUpCalls).length, 2);

          // Never twice: a later run finds nothing armed.
          yield* likesOf(target.id, 40);
          assert.strictEqual((yield* runDue).triggered, 0);
          assert.strictEqual((yield* followUpCalls).length, 2);
        })
      ),
    timeout
  );

  it.effect(
    "act only on the channels that can carry them, and refuse a rule none can",
    () =>
      onServer(
        Effect.gen(function* refuses() {
          const workspaceId = yield* freshWorkspace;
          const x = yield* connected(workspaceId, "x");
          const linkedin = yield* connected(workspaceId, "linkedin");
          const postId = yield* published(workspaceId, [x, linkedin]);

          const listed = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId))
          );

          assert.deepStrictEqual(
            listed.channels.map(({ comment, platform, repost }) => [
              platform,
              comment,
              repost,
            ]),
            [
              ["x", "available", "notBuilt"],
              ["linkedin", "notAllowed", "notAllowed"],
            ]
          );
          assert.deepStrictEqual(
            listed.followUps.map(({ channelId, kind }) => [channelId, kind]),
            [[x, "comment"]]
          );

          const other = yield* published(
            workspaceId,
            [linkedin],
            "Our winter hours."
          );

          const refused = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(other))
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "FollowUpNotPossible");

          const empty = yield* FollowUpRules.use((rules) =>
            rules.start(
              actorIn(workspaceId),
              onPost(other, { comment: Option.none(), repost: false })
            )
          ).pipe(Effect.flip);

          assert.deepStrictEqual(
            empty._tag === "FollowUpNotPossible" ? empty.reason : empty._tag,
            "noAction"
          );

          const taken = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId))
          ).pipe(Effect.flip);

          assert.strictEqual(taken._tag, "FollowUpRuleTaken");
        })
      ),
    timeout
  );

  it.effect(
    "refuse a comment longer than a channel that could carry it takes",
    () =>
      onServer(
        Effect.gen(function* tooLong() {
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connected(workspaceId, "bluesky");
          const postId = yield* published(workspaceId, [bluesky]);

          const refused = yield* FollowUpRules.use((rules) =>
            rules.start(
              actorIn(workspaceId),
              onPost(postId, { comment: Option.some("a".repeat(301)) })
            )
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "FollowUpNotPossible");
          assert.deepStrictEqual(
            refused._tag === "FollowUpNotPossible"
              ? refused.channels.map(({ comment }) => comment)
              : [],
            ["textTooLong"]
          );
        })
      ),
    timeout
  );

  it.effect(
    "wait for an approval where the starter's posts would, and act once approved",
    () =>
      onServer(
        Effect.gen(function* approval() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const postId = yield* published(workspaceId, [mastodon]);
          const [target] = yield* targetsOf(postId);

          assert.isDefined(target);

          const contributor = actorIn(
            workspaceId,
            permissionsFor("contributor")
          );

          yield* startersAre(() => ({ _tag: "acting", actor: contributor }));

          const started = yield* FollowUpRules.use((rules) =>
            rules.start(contributor, onPost(postId, { repost: false }))
          );

          assert.strictEqual(started.rule.approval._tag, "pending");

          yield* likesOf(target.id, 50);

          const waiting = yield* runDue;

          assert.strictEqual(waiting.triggered, 0);
          assert.strictEqual(waiting.left, 1);

          // A contributor approves nothing.
          const refused = yield* FollowUpRules.use((rules) =>
            rules.approve(contributor, started.rule.id)
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "MissingPermission");

          const approved = yield* FollowUpRules.use((rules) =>
            rules.approve(actorIn(workspaceId), started.rule.id)
          );

          assert.strictEqual(approved.rule.approval._tag, "approved");
          assert.strictEqual((yield* runDue).triggered, 1);
        }),
        HoldingServer
      ),
    timeout
  );

  it.effect(
    "give up what a stopped rule armed, and fail a follow-up the platform refuses",
    () =>
      onServer(
        Effect.gen(function* stopped() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const bluesky = yield* connected(workspaceId, "bluesky");
          const first = yield* published(workspaceId, [mastodon]);

          const second = yield* published(
            workspaceId,
            [bluesky],
            "Our winter hours."
          );

          const stopping = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(first))
          );

          yield* FollowUpRules.use((rules) =>
            rules.stop(actorIn(workspaceId), stopping.rule.id)
          );

          const after = yield* ruleNow(workspaceId, stopping.rule.id);

          assert.strictEqual(after.rule.status._tag, "ended");
          assert.isTrue(
            after.followUps.every(({ status }) => status._tag === "cancelled")
          );

          yield* followUpsAnswer(() =>
            Effect.fail(new BadRequest({ code: "unprocessable" }))
          );

          const refusing = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(second, { repost: false }))
          );

          const [target] = yield* targetsOf(second);

          assert.isDefined(target);
          yield* likesOf(target.id, 10);
          assert.strictEqual((yield* runDue).triggered, 1);

          yield* eventually(
            "the follow-up failed",
            ruleNow(workspaceId, refusing.rule.id).pipe(
              Effect.map(({ followUps }) =>
                followUps.every(({ status }) => status._tag === "failed")
              )
            )
          );
        })
      ),
    timeout
  );

  it.effect(
    "carry a comment out as the account's reply to the post's last part, keyed by the follow-up",
    () =>
      setTime(start).pipe(
        Effect.andThen(resetRecycling),
        Effect.andThen(resetFollowUps),
        Effect.andThen(Ref.set(sentPosts, [])),
        Effect.andThen(Ref.set(sentReposts, [])),
        Effect.andThen(
          Effect.gen(function* routed() {
            const workspaceId = yield* freshWorkspace;
            const mastodon = yield* connected(workspaceId, "mastodon");
            const postId = yield* published(workspaceId, [mastodon]);
            const [target] = yield* targetsOf(postId);

            assert.isDefined(target);

            const started = yield* FollowUpRules.use((rules) =>
              rules.start(actorIn(workspaceId), onPost(postId))
            );

            yield* likesOf(target.id, 10);
            assert.strictEqual((yield* runDue).triggered, 2);

            yield* eventually(
              "both follow-ups went out",
              ruleNow(workspaceId, started.rule.id).pipe(
                Effect.map(({ followUps }) =>
                  followUps.every(({ status }) => status._tag === "sent")
                )
              )
            );

            const [comment] = yield* Ref.get(sentPosts);
            const [repost] = yield* Ref.get(sentReposts);
            const [live] = target.liveParts;

            const commentId = started.followUps.find(
              ({ kind }) => kind === "comment"
            )?.id;

            assert.isDefined(live);
            assert.strictEqual(comment?.text, "Thank you all for reading!");
            assert.strictEqual(comment?.idempotencyKey, commentId);
            assert.strictEqual(comment?.part, 1);
            assert.deepStrictEqual(comment?.media, []);
            assert.deepStrictEqual(
              comment?.replyTo,
              Option.some({
                parent: Option.getOrThrow(live.platformPostId),
                root: Option.getOrThrow(live.platformPostId),
              })
            );
            assert.strictEqual(
              repost?.platformPostId,
              Option.getOrThrow(live.platformPostId)
            );
          }).pipe(Effect.ensuring(forgetRules), Effect.provide(RoutedServer))
        )
      ),
    timeout
  );
});
