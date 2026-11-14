import { assert, describe, it } from "@effect/vitest";
import { DateTime, Deferred, Effect, Fiber, Layer, Option, Ref } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { FollowUpChannels } from "#publishing/application/follow-up-channels.ts";
import { FollowUpRules } from "#publishing/application/follow-up-rules.ts";
import { FollowUpStore } from "#publishing/application/follow-up-store.ts";
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
import { SendFollowUp } from "#publishing/application/send-follow-up.ts";
import { ShortLinkDefaults } from "#publishing/application/short-link-defaults.ts";
import { FeedsUnused } from "#publishing/container.ts";
import { FollowUpRuleIdSchema } from "#publishing/domain/follow-up-rule-id.ts";
import { DrizzleFollowUpStore } from "#publishing/infrastructure/drizzle-follow-up-store.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { Actor, can } from "#shared/domain/access.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
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
  whileRunning,
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
  syntheticUser,
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

// The channels whose account has not granted reposts yet, as a test sets
// them: everything else carries what its platform supports.
const withoutReposts = Ref.makeUnsafe<ReadonlySet<string>>(new Set());

const GrantingChannels = Layer.succeed(
  FollowUpChannels,
  FollowUpChannels.of({
    of: (channel, ask) =>
      Ref.get(withoutReposts).pipe(
        Effect.flatMap((missing) =>
          FollowUpChannels.use((supported) => supported.of(channel, ask)).pipe(
            Effect.provide(FollowUpChannels.supported),
            Effect.map((able) =>
              missing.has(channel.channelId) && able.repost === "available"
                ? { ...able, repost: "reconnect" as const }
                : able
            )
          )
        )
      ),
  })
);

const GrantingServer = postsServerBehind(
  ApprovalGate.open,
  attachableMedia(),
  postAllowance(),
  PostEvents.none,
  FakeRecycling,
  FeedsUnused,
  ShortLinkDefaults.none,
  Layer.mergeAll(GrantingChannels, FakeFollowUpCounts, FakeFollowUpPublisher)
);

// What the platforms' clients were handed, as the gates' side builds it.
const sentPosts = Ref.makeUnsafe<readonly OutgoingPost[]>([]);
const sentReposts = Ref.makeUnsafe<readonly OutgoingRepost[]>([]);

// How many posts the platforms put off before they answer.
const refusingPosts = Ref.makeUnsafe(0);

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
              Effect.andThen(
                Ref.getAndUpdate(refusingPosts, (left) => Math.max(left - 1, 0))
              ),
              Effect.flatMap((left) =>
                left > 0
                  ? Effect.fail(new PlatformUnavailable())
                  : Effect.succeed(answered(`reply-${post.idempotencyKey}`))
              )
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
const routedServerBehind = (gate: Layer.Layer<ApprovalGate>) =>
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
      RoutedFollowUpPublisher.pipe(
        Layer.provide(
          Layer.mergeAll(
            RecordingClients,
            PostMeter.unmetered,
            DrizzleFollowUpStore,
            DrizzlePostRepository,
            RepositoryCredentials,
            FakeRecycling,
            gate
          )
        )
      )
    )
  );

const RoutedServer = routedServerBehind(ApprovalGate.open);

const HoldingRoutedServer = routedServerBehind(HoldingContributors);

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
    "send a follow-up armed again after the platform put it off",
    () =>
      onServer(
        Effect.gen(function* rearmed() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const postId = yield* published(workspaceId, [mastodon]);
          const [target] = yield* targetsOf(postId);

          assert.isDefined(target);

          const started = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId, { repost: false }))
          );

          // Unreachable once, then answering.
          const refusals = yield* Ref.make(1);

          yield* followUpsAnswer((request) =>
            Ref.getAndUpdate(refusals, (left) => left - 1).pipe(
              Effect.flatMap((left) =>
                left > 0
                  ? Effect.fail(new PlatformUnavailable())
                  : Effect.succeed<PublishResult>({
                      _tag: "published",
                      platformPostId: PlatformPostIdSchema.make(
                        `reply-${request.followUpId}`
                      ),
                    })
              )
            )
          );

          yield* likesOf(target.id, 10);
          assert.strictEqual((yield* runDue).triggered, 1);

          yield* eventually(
            "the follow-up is armed again",
            ruleNow(workspaceId, started.rule.id).pipe(
              Effect.map(({ followUps }) =>
                followUps.every(({ status }) => status._tag === "armed")
              )
            )
          );

          // Put off for ten minutes first.
          assert.strictEqual((yield* runDue).triggered, 0);
          yield* TestClock.adjust("10 minutes");
          assert.strictEqual((yield* runDue).triggered, 1);

          yield* eventually(
            "the follow-up went out",
            ruleNow(workspaceId, started.rule.id).pipe(
              Effect.map(({ followUps }) =>
                followUps.every(({ status }) => status._tag === "sent")
              )
            )
          );

          assert.strictEqual((yield* followUpCalls).length, 2);
        })
      ),
    timeout
  );

  it.effect(
    "send nothing the starter may no longer have go out, and arm it again",
    () =>
      onServer(
        Effect.gen(function* heldAtSend() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const postId = yield* published(workspaceId, [mastodon]);
          const [target] = yield* targetsOf(postId);

          assert.isDefined(target);

          const started = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId, { repost: false }))
          );

          assert.strictEqual(started.rule.approval._tag, "notNeeded");

          // The starter may act when the run triggers it, and the policy
          // holds them by the time its job sends it.
          const asked = { times: 0 };

          yield* startersAre(() => {
            asked.times += 1;

            return {
              _tag: "acting",
              actor: actorIn(
                workspaceId,
                permissionsFor(asked.times === 1 ? "editor" : "contributor")
              ),
            };
          });

          yield* likesOf(target.id, 10);
          assert.strictEqual((yield* runDue).triggered, 1);

          yield* eventually(
            "the follow-up is armed again",
            ruleNow(workspaceId, started.rule.id).pipe(
              Effect.map(({ followUps }) =>
                followUps.every(({ status }) => status._tag === "armed")
              )
            )
          );

          assert.strictEqual((yield* followUpCalls).length, 0);
          assert.strictEqual((yield* runDue).triggered, 0);
        }),
        HoldingServer
      ),
    timeout
  );

  it.effect(
    "leave a follow-up to its own attempt's job: a stale job neither sends nor settles it",
    () =>
      onServer(
        Effect.gen(function* stale() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const postId = yield* published(workspaceId, [mastodon]);
          const [target] = yield* targetsOf(postId);

          assert.isDefined(target);

          const started = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId, { repost: false }))
          );

          // The platform holds the first attempt's call until told.
          const release = yield* Deferred.make<void>();

          yield* followUpsAnswer((request) =>
            Deferred.await(release).pipe(
              Effect.as<PublishResult>({
                _tag: "published",
                platformPostId: PlatformPostIdSchema.make(
                  `reply-${request.followUpId}`
                ),
              })
            )
          );

          yield* likesOf(target.id, 10);
          assert.strictEqual((yield* runDue).triggered, 1);
          yield* eventually(
            "the first attempt's call is on its way",
            followUpCalls.pipe(Effect.map((calls) => calls.length === 1))
          );

          const [followUp] = (yield* ruleNow(workspaceId, started.rule.id))
            .followUps;

          assert.isDefined(followUp);

          // A job of an attempt before it finds nothing of its own.
          const before = yield* SendFollowUp.use((send) =>
            send.run(followUp.id, followUp.attempt - 1)
          ).pipe(
            Effect.provide(
              SendFollowUp.layer.pipe(Layer.provide(FakeFollowUpPublisher))
            )
          );

          assert.strictEqual(before, "superseded");
          assert.strictEqual((yield* followUpCalls).length, 1);

          // The follow-up moves to a later attempt while the call runs, as
          // a hand-over and a new trigger would: the first job's answer
          // settles nothing of it.
          yield* SqlClient.SqlClient.use(
            (sql) =>
              sql`UPDATE publishing.follow_ups SET attempt = attempt + 1 WHERE id = ${followUp.id}`
          ).pipe(Effect.orDie);

          yield* Deferred.succeed(release, undefined);
          yield* TestClock.withLive(Effect.sleep("200 millis"));

          const after = yield* ruleNow(workspaceId, started.rule.id);

          assert.deepStrictEqual(
            after.followUps.map(({ attempt, status }) => [
              attempt,
              status._tag,
            ]),
            [[followUp.attempt + 1, "sending"]]
          );

          // Left as no job will settle it: a later attempt of its own.
          yield* SqlClient.SqlClient.use(
            (sql) =>
              sql`DELETE FROM publishing.follow_ups WHERE id = ${followUp.id}`
          ).pipe(Effect.orDie);
        })
      ),
    timeout
  );

  it.effect(
    "count a channel's day under its lock, waiting for whoever holds it",
    () =>
      onServer(
        Effect.gen(function* locked() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const postId = yield* published(workspaceId, [mastodon]);
          const [target] = yield* targetsOf(postId);

          assert.isDefined(target);

          yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId, { repost: false }))
          );
          yield* likesOf(target.id, 10);

          // Another transaction holds the channel's day.
          const held = yield* Deferred.make<void>();
          const release = yield* Deferred.make<void>();
          const { transaction } = yield* TransactionRunner;

          const holder = yield* transaction(
            FollowUpStore.use((store) => store.claimChannelDay(mastodon)).pipe(
              Effect.andThen(Deferred.succeed(held, undefined)),
              Effect.andThen(Deferred.await(release))
            )
          ).pipe(Effect.forkChild);

          yield* Deferred.await(held);

          const run = yield* runDue.pipe(Effect.forkChild);

          yield* TestClock.withLive(Effect.sleep("300 millis"));

          const waited = run.pollUnsafe() === undefined;

          yield* Deferred.succeed(release, undefined);
          yield* Fiber.join(holder);

          assert.isTrue(waited);
          assert.strictEqual((yield* Fiber.join(run)).triggered, 1);
        })
      ),
    timeout
  );

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
    "wait for an approval once the policy holds the starter, and expire as not approved",
    () =>
      onServer(
        Effect.gen(function* comesToNeed() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const first = yield* published(workspaceId, [mastodon]);
          const second = yield* published(workspaceId, [mastodon], "Later.");
          const editor = actorIn(workspaceId);

          const approving = yield* FollowUpRules.use((rules) =>
            rules.start(editor, onPost(first, { repost: false }))
          );

          const lapsing = yield* FollowUpRules.use((rules) =>
            rules.start(editor, onPost(second, { repost: false }))
          );

          assert.strictEqual(approving.rule.approval._tag, "notNeeded");

          // The policy now holds the starter's posts.
          yield* startersAre(() => ({
            _tag: "acting",
            actor: actorIn(workspaceId, permissionsFor("contributor")),
          }));

          for (const postId of [first, second]) {
            const [target] = yield* targetsOf(postId);

            assert.isDefined(target);
            yield* likesOf(target.id, 50);
          }

          assert.strictEqual((yield* runDue).triggered, 0);

          const approved = yield* FollowUpRules.use((rules) =>
            rules.approve(editor, approving.rule.id)
          );

          assert.strictEqual(approved.rule.approval._tag, "approved");
          assert.strictEqual((yield* runDue).triggered, 1);

          // A week later, the one nobody approved lapses as waiting for it.
          yield* TestClock.adjust("8 days");
          yield* runDue;

          const lapsed = yield* ruleNow(workspaceId, lapsing.rule.id);
          const [followUp] = lapsed.followUps;

          assert.isDefined(followUp);
          assert.deepStrictEqual(
            followUp.status._tag === "expired"
              ? followUp.status.reason
              : followUp.status._tag,
            "notApproved"
          );
        }),
        HoldingServer
      ),
    timeout
  );

  it.effect(
    "approve a held starter's rule by an approver's change, never by staff acting as them",
    () =>
      onServer(
        Effect.gen(function* changedByApprover() {
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

          const editor = actorIn(workspaceId);

          const impersonating = new Actor({
            permissions: editor.permissions,
            subject: {
              _tag: "user",
              impersonatedBy: Option.some(
                UserIdSchema.make("1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b")
              ),
              userId: syntheticUser,
            },
            workspaceId,
          });

          const refused = yield* FollowUpRules.use((rules) =>
            rules.change(impersonating, started.rule.id, {
              comment: Option.some("Written by staff."),
            })
          ).pipe(Effect.flip);

          assert.strictEqual(refused._tag, "MissingPermission");

          // Nor does staff approve it as the member.
          const notApproved = yield* FollowUpRules.use((rules) =>
            rules.approve(impersonating, started.rule.id)
          ).pipe(Effect.flip);

          assert.strictEqual(notApproved._tag, "MissingPermission");
          assert.strictEqual(
            (yield* ruleNow(workspaceId, started.rule.id)).rule.approval._tag,
            "pending"
          );

          const changed = yield* FollowUpRules.use((rules) =>
            rules.change(editor, started.rule.id, {
              comment: Option.some("Thank you, all of you!"),
            })
          );

          assert.strictEqual(changed.rule.approval._tag, "approved");

          yield* likesOf(target.id, 50);
          assert.strictEqual((yield* runDue).triggered, 1);
        }),
        HoldingServer
      ),
    timeout
  );

  it.effect(
    "arm a post again for a rule started after one stopped, and refuse one with nothing left to arm",
    () =>
      onServer(
        Effect.gen(function* startedAgain() {
          const workspaceId = yield* freshWorkspace;
          const editor = actorIn(workspaceId);
          const mastodon = yield* connected(workspaceId, "mastodon");

          const channelRule = yield* FollowUpRules.use((rules) =>
            rules.start(editor, {
              comment: Option.some("Thank you all for reading!"),
              likes: 10,
              repost: true,
              scope: { _tag: "channel", channelId: mastodon },
            })
          );

          const postId = yield* published(workspaceId, [mastodon]);
          const [target] = yield* targetsOf(postId);

          assert.isDefined(target);

          // As the settlement does on the server: the channel's rule arms
          // both kinds on the post, so a rule of the post's own would arm
          // nothing.
          yield* FollowUps.use((followUps) => followUps.arm(target));

          const refused = yield* FollowUpRules.use((rules) =>
            rules.start(editor, onPost(postId))
          ).pipe(Effect.flip);

          assert.deepStrictEqual(
            refused._tag === "FollowUpNotPossible" ? refused.reason : refused,
            "alreadyFollowedUp"
          );

          yield* FollowUpRules.use((rules) =>
            rules.stop(editor, channelRule.rule.id)
          );

          const first = yield* FollowUpRules.use((rules) =>
            rules.start(editor, onPost(postId))
          );

          assert.strictEqual(first.followUps.length, 2);

          yield* FollowUpRules.use((rules) =>
            rules.stop(editor, first.rule.id)
          );

          const second = yield* FollowUpRules.use((rules) =>
            rules.start(editor, onPost(postId, { repost: false }))
          );

          assert.deepStrictEqual(
            second.followUps.map(({ kind, status }) => [kind, status._tag]),
            [["comment", "armed"]]
          );

          // The stopped rule keeps what it gave up.
          const stopped = yield* ruleNow(workspaceId, first.rule.id);

          assert.isTrue(
            stopped.followUps.every(({ status }) => status._tag === "cancelled")
          );
          assert.strictEqual(stopped.followUps.length, 2);

          // Adding a kind arms it on what is already out.
          const changed = yield* FollowUpRules.use((rules) =>
            rules.change(editor, second.rule.id, { repost: true })
          );

          assert.sameMembers(
            changed.followUps.map(({ kind }) => kind),
            ["comment", "repost"]
          );
        })
      ),
    timeout
  );

  it.effect(
    "end a channel's rule once the channel is disconnected, giving up what it armed",
    () =>
      onServer(
        Effect.gen(function* channelGone() {
          const workspaceId = yield* freshWorkspace;
          const editor = actorIn(workspaceId);
          const mastodon = yield* connected(workspaceId, "mastodon");
          const bluesky = yield* connected(workspaceId, "bluesky");

          const startOn = (channelId: typeof mastodon) =>
            FollowUpRules.use((rules) =>
              rules.start(editor, {
                comment: Option.some("Thank you all for reading!"),
                likes: 10,
                repost: false,
                scope: { _tag: "channel", channelId },
              })
            );

          const leaving = yield* startOn(mastodon);
          const staying = yield* startOn(bluesky);
          const postId = yield* published(workspaceId, [mastodon]);
          const [target] = yield* targetsOf(postId);

          assert.isDefined(target);
          yield* FollowUps.use((followUps) => followUps.arm(target));

          yield* SqlClient.SqlClient.use(
            (sql) => sql`DELETE FROM channels.channels WHERE id = ${mastodon}`
          ).pipe(Effect.orDie);

          assert.strictEqual((yield* runDue).channelGone, 1);

          const left = yield* ruleNow(workspaceId, leaving.rule.id);

          assert.deepStrictEqual(
            left.rule.status._tag === "ended" ? left.rule.status.reason : null,
            "channelGone"
          );
          assert.isTrue(
            left.followUps.length > 0 &&
              left.followUps.every(({ status }) => status._tag === "cancelled")
          );

          const kept = yield* ruleNow(workspaceId, staying.rule.id);

          assert.strictEqual(kept.rule.status._tag, "active");
        })
      ),
    timeout
  );

  it.effect(
    "refuse a rule on a post past its seven days, which would hold its slot for nothing",
    () =>
      onServer(
        Effect.gen(function* tooLate() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const postId = yield* published(workspaceId, [mastodon]);

          yield* TestClock.adjust("8 days");

          const refused = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId))
          ).pipe(Effect.flip);

          assert.deepStrictEqual(
            refused._tag === "FollowUpNotPossible" ? refused.reason : refused,
            "windowPassed"
          );

          const listed = yield* FollowUpRules.use((rules) =>
            rules.list(actorIn(workspaceId), {
              after: Option.none(),
              limit: 10,
              postId: Option.some(postId),
              status: Option.none(),
            })
          );

          assert.strictEqual(listed.length, 0);
        })
      ),
    timeout
  );

  it.effect(
    "arm a repost on what is already out once the channel grants reposts",
    () =>
      onServer(
        Effect.gen(function* granted() {
          const workspaceId = yield* freshWorkspace;
          const bluesky = yield* connected(workspaceId, "bluesky");
          const postId = yield* published(workspaceId, [bluesky]);

          yield* Ref.set(withoutReposts, new Set([bluesky]));

          const started = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId))
          );

          assert.deepStrictEqual(
            started.followUps.map(({ kind }) => kind),
            ["comment"]
          );

          // Nothing more while the channel cannot repost.
          yield* runDue;
          assert.deepStrictEqual(
            (yield* ruleNow(workspaceId, started.rule.id)).followUps.map(
              ({ kind }) => kind
            ),
            ["comment"]
          );

          // Connected again with reposts: the next run arms the repost.
          yield* Ref.set(withoutReposts, new Set());

          assert.strictEqual((yield* runDue).armed, 1);
          assert.sameMembers(
            (yield* ruleNow(workspaceId, started.rule.id)).followUps.map(
              ({ kind }) => kind
            ),
            ["comment", "repost"]
          );
          assert.strictEqual((yield* runDue).armed, 0);
        }).pipe(Effect.ensuring(Ref.set(withoutReposts, new Set()))),
        GrantingServer
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
    "send nothing from the gate once the starter is held, as the text is read",
    () =>
      setTime(start).pipe(
        Effect.andThen(resetRecycling),
        Effect.andThen(resetFollowUps),
        Effect.andThen(Ref.set(sentPosts, [])),
        Effect.andThen(Ref.set(refusingPosts, 0)),
        Effect.andThen(
          Effect.gen(function* heldAtGate() {
            const workspaceId = yield* freshWorkspace;
            const mastodon = yield* connected(workspaceId, "mastodon");
            const postId = yield* published(workspaceId, [mastodon]);
            const [target] = yield* targetsOf(postId);

            assert.isDefined(target);

            const started = yield* FollowUpRules.use((rules) =>
              rules.start(
                actorIn(workspaceId),
                onPost(postId, { repost: false })
              )
            );

            // The run and the job find an editor; the gate, as it reads
            // the text, a contributor whose posts the policy holds.
            const asked = { times: 0 };

            yield* startersAre(() => {
              asked.times += 1;

              return {
                _tag: "acting",
                actor: actorIn(
                  workspaceId,
                  permissionsFor(asked.times <= 2 ? "editor" : "contributor")
                ),
              };
            });

            yield* likesOf(target.id, 10);
            assert.strictEqual((yield* runDue).triggered, 1);
            yield* eventually(
              "the follow-up is armed again",
              ruleNow(workspaceId, started.rule.id).pipe(
                Effect.map(({ followUps }) =>
                  followUps.every(
                    ({ attempt, status }) =>
                      status._tag === "armed" && attempt === 1
                  )
                )
              )
            );

            assert.deepStrictEqual(yield* Ref.get(sentPosts), []);
            assert.isAtLeast(asked.times, 3);
          }).pipe(
            Effect.ensuring(forgetRules),
            Effect.provide(HoldingRoutedServer)
          )
        )
      ),
    timeout
  );

  it.effect(
    "send nothing of a rule paused after its follow-up was set out",
    () =>
      onServer(
        Effect.gen(function* pausedMeanwhile() {
          const workspaceId = yield* freshWorkspace;
          const mastodon = yield* connected(workspaceId, "mastodon");
          const postId = yield* published(workspaceId, [mastodon]);
          const [target] = yield* targetsOf(postId);

          assert.isDefined(target);

          const started = yield* FollowUpRules.use((rules) =>
            rules.start(actorIn(workspaceId), onPost(postId, { repost: false }))
          );

          // A member pauses it as the run sets it out.
          const rules = yield* FollowUpRules;

          yield* whileRunning(
            rules
              .change(actorIn(workspaceId), started.rule.id, { paused: true })
              .pipe(Effect.asVoid, Effect.orDie)
          );

          yield* likesOf(target.id, 10);
          assert.strictEqual((yield* runDue).triggered, 1);
          yield* eventually(
            "the follow-up is armed again",
            ruleNow(workspaceId, started.rule.id).pipe(
              Effect.map(({ followUps }) =>
                followUps.every(({ status }) => status._tag === "armed")
              )
            )
          );

          assert.strictEqual((yield* followUpCalls).length, 0);
        })
      ),
    timeout
  );

  it.effect(
    "give a platform a new key for an attempt after one it put off",
    () =>
      setTime(start).pipe(
        Effect.andThen(resetRecycling),
        Effect.andThen(resetFollowUps),
        Effect.andThen(Ref.set(sentPosts, [])),
        Effect.andThen(Ref.set(refusingPosts, 1)),
        Effect.andThen(
          Effect.gen(function* newKey() {
            const workspaceId = yield* freshWorkspace;
            const mastodon = yield* connected(workspaceId, "mastodon");
            const postId = yield* published(workspaceId, [mastodon]);
            const [target] = yield* targetsOf(postId);

            assert.isDefined(target);

            const started = yield* FollowUpRules.use((rules) =>
              rules.start(
                actorIn(workspaceId),
                onPost(postId, { repost: false })
              )
            );

            const [followUp] = started.followUps;

            assert.isDefined(followUp);

            yield* likesOf(target.id, 10);
            assert.strictEqual((yield* runDue).triggered, 1);
            yield* eventually(
              "the follow-up is armed again",
              ruleNow(workspaceId, started.rule.id).pipe(
                Effect.map(({ followUps }) =>
                  followUps.every(({ status }) => status._tag === "armed")
                )
              )
            );
            yield* TestClock.adjust("10 minutes");
            assert.strictEqual((yield* runDue).triggered, 1);
            yield* eventually(
              "the follow-up went out",
              ruleNow(workspaceId, started.rule.id).pipe(
                Effect.map(({ followUps }) =>
                  followUps.every(({ status }) => status._tag === "sent")
                )
              )
            );

            assert.deepStrictEqual(
              (yield* Ref.get(sentPosts)).map(
                ({ idempotencyKey }) => idempotencyKey
              ),
              [followUp.id, `${followUp.id}:2`]
            );
          }).pipe(Effect.ensuring(forgetRules), Effect.provide(RoutedServer))
        )
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
