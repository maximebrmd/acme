import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import type { Scope } from "effect";
import { MessageStorage } from "effect/cluster";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { NoticeInbox } from "#notifications/application/notice-inbox.ts";
import { NoticeLog } from "#notifications/application/notice-log.ts";
import { NoticeStore } from "#notifications/application/notice-store.ts";
import { Notify } from "#notifications/application/notify.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";
import { PreferenceStore } from "#notifications/application/preference-store.ts";
import { NotificationsWorkersLive } from "#notifications/container.ts";
import { DrizzleNoticeLog } from "#notifications/infrastructure/drizzle-notice-log.ts";
import { DrizzleNoticeStore } from "#notifications/infrastructure/drizzle-notice-store.ts";
import { DrizzlePreferenceStore } from "#notifications/infrastructure/drizzle-preference-store.ts";
import { WorkflowNoticeDelivery } from "#notifications/infrastructure/workflow-notice-delivery.ts";
import { PostDrafts } from "#publishing/application/post-drafts.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import { ShortLinkDefaults } from "#publishing/application/short-link-defaults.ts";
import { publishingWith, publishingWorkers } from "#publishing/container.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import {
  FakePlatform,
  FakePlatformPublisher,
} from "#publishing/infrastructure/fake-platform-publisher.ts";
import { ListedWorkspaceChannels } from "#publishing/infrastructure/listed-workspace-channels.ts";
import { NotifiedPublicationOutcomes } from "#publishing/infrastructure/notified-publication-outcomes.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId, UserId } from "#shared/domain/ids.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { PlatformPostIdSchema } from "#shared/domain/publish-result.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { freshWorkspace } from "#test/channels/support.ts";
import { StartedDeliveries } from "#test/notifications/started-deliveries.ts";
import {
  freshUser,
  noticesWith,
  readerOf,
  sentTo,
} from "#test/notifications/support.ts";
import { TestDirectory } from "#test/notifications/test-directory.ts";
import type { TestMember } from "#test/notifications/test-directory.ts";
import { connect } from "#test/publishing/posts-server.ts";
import {
  actorAs,
  apiKeyIn,
  attachableMedia,
  postAllowance,
  syntheticContent,
} from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";
import type { Role } from "#workspace/domain/roles.ts";

import {
  clusterOver,
  DatabaseTest,
  eventually,
  isFinished,
  isSuspended,
  scheduleIn,
  setTime,
  targetsOf,
} from "./harness.ts";

// Publishing as the server runs it, with no media to attach: these posts
// carry none, so the media context's library is not needed.
const PublishingTest = publishingWith(
  Layer.mergeAll(
    ListedWorkspaceChannels,
    attachableMedia(),
    postAllowance(),
    ShortLinkDefaults.none
  )
).pipe(
  Layer.provideMerge(
    NotifiedPublicationOutcomes.pipe(Layer.provide(DrizzlePostRepository))
  )
);

// Publishing and notices as the server wires them, on an in-memory cluster
// driven by TestClock: posts go to channels stored in Postgres, a fake
// platform publishes them, and the notices' emails go out through their own
// workflow to a test mailer.
const ServerTest = Layer.mergeAll(
  publishingWorkers(FakePlatformPublisher),
  NotificationsWorkersLive
).pipe(
  Layer.provideMerge(PublishingTest),
  Layer.provideMerge(noticesWith(WorkflowNoticeDelivery)),
  Layer.provideMerge(ListChannels.layer),
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive)),
  Layer.provideMerge(clusterOver(MessageStorage.layerMemory)),
  Layer.provideMerge(FakePlatformPublisher),
  Layer.provideMerge(DatabaseTest)
);

const onServerAt = <A, E>(
  start: string,
  test: Effect.Effect<A, E, Layer.Success<typeof ServerTest> | Scope.Scope>
) => setTime(start).pipe(Effect.andThen(test.pipe(Effect.provide(ServerTest))));

// Notices with a bug in saving them: it dies after Notify has claimed the
// event's key, inside the savepoint Notify runs in.
const DyingNoticeStore = Layer.effect(
  NoticeStore,
  NoticeStore.use((store) =>
    Effect.succeed(
      NoticeStore.of({
        ...store,
        add: () => Effect.die("A bug in saving notices"),
      })
    )
  )
).pipe(Layer.provide(DrizzleNoticeStore));

// The same server, telling through a Notify with that bug.
const BuggyServerTest = publishingWorkers(FakePlatformPublisher).pipe(
  Layer.provideMerge(PublishingTest),
  Layer.provideMerge(
    Notify.layer.pipe(
      Layer.provideMerge(
        Layer.mergeAll(
          DyingNoticeStore,
          DrizzleNoticeLog,
          DrizzlePreferenceStore,
          StartedDeliveries.layer,
          TestDirectory.layer
        )
      )
    )
  ),
  Layer.provideMerge(ListChannels.layer),
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(Layer.mergeAll(IdsLive, TransactionRunnerLive)),
  Layer.provideMerge(clusterOver(MessageStorage.layerMemory)),
  Layer.provideMerge(FakePlatformPublisher),
  Layer.provideMerge(DatabaseTest)
);

const timeout = 60_000;

// The target as publishing would settle it, in `round`.
const settledAs = (
  target: PostTarget,
  round: number,
  status: PostTargetStatus
) =>
  new PostTarget({
    channelId: target.channelId,
    id: target.id,
    liveParts: [],
    options: target.options,
    postId: target.postId,
    round,
    status,
  });

// A workspace whose one member schedules posts and reads English.
const workspaceWithEditor = Effect.gen(function* workspaceWithEditor() {
  const workspaceId = yield* freshWorkspace;
  const userId = yield* freshUser;
  const email = `editor+${userId}@example.test`;

  yield* TestDirectory.use((directory) =>
    directory.setMembers(workspaceId, [
      { email, locale: "en", permissions: permissionsFor("editor"), userId },
    ])
  );

  return { actor: actorAs(userId, workspaceId), email, userId, workspaceId };
});

// A member of a test workspace with the role, reading English.
const member = (userId: UserId, role: Role): TestMember => ({
  email: `${role}+${userId}@example.test`,
  locale: "en",
  permissions: permissionsFor(role),
  userId,
});

const noticesOf = (userId: UserId) =>
  NoticeInbox.use((inbox) =>
    inbox.page(readerOf(userId), { after: Option.none(), limit: 50 })
  ).pipe(Effect.map(({ items }) => items));

// A post on the channels at 08:00, which `actor` writes and schedules.
const schedule = (
  actor: Actor,
  channelIds: readonly [ChannelId, ...ChannelId[]]
) =>
  PostScheduling.use((scheduling) =>
    scheduling.schedule(actor, {
      channelIds,
      content: syntheticContent,
      schedule: scheduleIn("2026-06-15T08:00:00Z"),
    })
  ).pipe(Effect.map(({ post }) => post));

describe("the notices of a post's outcomes", () => {
  it.effect(
    "tell the workspace's editors in the app, and email a failure",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* tells() {
          const { actor, email, userId, workspaceId } =
            yield* workspaceWithEditor;

          const published = yield* connect(workspaceId, "mastodon");
          const failed = yield* connect(workspaceId, "bluesky");

          yield* FakePlatform.use((platform) =>
            platform.script(failed, [
              {
                _tag: "fail",
                failure: new MediaRejected({ code: "too-large" }),
              },
            ])
          );

          const post = yield* schedule(actor, [published, failed]);

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          const notices = yield* noticesOf(userId);

          assert.deepStrictEqual(
            notices.map(({ event }) => event._tag).toSorted(),
            ["PostFailed", "PostPublished"]
          );

          const expected: NoticeRequest["event"] = {
            _tag: "PostFailed",
            channel: Option.some({
              handle: "@peal_example",
              platform: "bluesky",
            }),
            postId: post.id,
            reason: "mediaRejected",
          };

          assert.deepStrictEqual(
            notices.find(({ event }) => event._tag === "PostFailed")?.event,
            expected
          );

          // Only the failure is emailed: published posts are not, by default.
          yield* eventually(
            "the failure is emailed",
            sentTo(email).pipe(Effect.map((sent) => sent.length > 0))
          );

          const sent = yield* sentTo(email);

          assert.deepStrictEqual(
            sent.map(({ subject }) => subject),
            ["A post did not go out on Bluesky (@peal_example)"]
          );
          assert.include(
            sent[0]?.text ?? "",
            `http://localhost:3001/app/${workspaceId}/posts/${post.id}`
          );
        })
      ),
    timeout
  );

  it.effect(
    "tell a post that is live when only its first comment failed",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* commentFailed() {
          const { actor, userId, workspaceId } = yield* workspaceWithEditor;
          const facebook = yield* connect(workspaceId, "facebook");
          const mastodon = yield* connect(workspaceId, "mastodon");
          const post = yield* schedule(actor, [facebook, mastodon]);
          const targets = yield* targetsOf(post.id);
          const now = yield* DateTime.now;
          const outcomes = yield* PublicationOutcomes;

          const failed: PostTargetStatus = {
            _tag: "failed",
            code: Option.none(),
            failedAt: now,
            reason: "contentRejected",
          };

          // Each target's post went live, and what followed did not.
          for (const target of targets) {
            yield* outcomes.settled(
              new PostTarget({
                channelId: target.channelId,
                id: target.id,
                options: target.options,
                postId: target.postId,
                round: 1,
                status: failed,
                liveParts: [
                  {
                    index: 0,
                    permalink: Option.none(),
                    platformPostId: Option.some(
                      PlatformPostIdSchema.make("synthetic-live-post")
                    ),
                    publishedAt: now,
                    round: 1,
                  },
                ],
              })
            );
          }

          const notSent = (yield* noticesOf(userId)).map(({ event }) =>
            event._tag === "PostFailed" ? event.notSent : undefined
          );

          assert.sameMembers(notSent, ["firstComment", "laterParts"]);
        })
      ),
    timeout
  );

  it.effect(
    "tell an outcome once per round, and name a channel gone as none",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* perRound() {
          const { actor, userId, workspaceId } = yield* workspaceWithEditor;
          const channelId = yield* connect(workspaceId, "mastodon");
          const post = yield* schedule(actor, [channelId]);
          const [target] = yield* targetsOf(post.id);

          assert(target !== undefined);

          yield* ChannelRepository.use((channels) =>
            channels.remove(workspaceId, channelId)
          );

          const outcomes = yield* PublicationOutcomes;
          const now = yield* DateTime.now;

          const unconfirmed: PostTargetStatus = {
            _tag: "unconfirmed",
            attemptedAt: now,
            reason: "noResponse",
          };

          yield* outcomes.settled(settledAs(target, 1, unconfirmed));
          yield* outcomes.settled(settledAs(target, 1, unconfirmed));

          // A cancelled target was someone's choice: nobody is told.
          yield* outcomes.settled(
            settledAs(target, 2, { _tag: "cancelled", cancelledAt: now })
          );

          // Reposted, the next round is told again.
          yield* outcomes.settled(settledAs(target, 3, unconfirmed));

          const notices = yield* noticesOf(userId);

          assert.lengthOf(notices, 2);
          assert.deepStrictEqual(notices[0]?.event, {
            _tag: "PostUnconfirmed",
            channel: Option.none(),
            postId: post.id,
          });

          // The post is untouched: telling reads, and writes notices only.
          const stored = yield* PostRepository.use((posts) =>
            posts.find(post.id)
          );

          assert.strictEqual(
            Option.getOrThrow(stored).post.status._tag,
            "scheduled"
          );
        })
      ),
    timeout
  );

  it.effect(
    "never stop publishing for a bug in telling, which leaves nothing behind",
    () =>
      setTime("2026-06-15T07:00:00Z").pipe(
        Effect.andThen(
          Effect.gen(function* buggyTelling() {
            const { actor, workspaceId } = yield* workspaceWithEditor;
            const channelId = yield* connect(workspaceId, "mastodon");
            const post = yield* schedule(actor, [channelId]);

            yield* eventually("the job sleeps", isSuspended(post.id));
            yield* setTime("2026-06-15T08:00:00Z");
            yield* eventually("the post finishes", isFinished(post.id));

            const [target] = yield* targetsOf(post.id);

            assert(target !== undefined);
            assert.strictEqual(target.status._tag, "published");

            // The key went with the savepoint the bug rolled back, while the
            // settlement around it committed: the event can be told again.
            const claimed = yield* NoticeLog.use((log) =>
              log.isClaimed(`post-target:${target.id}:${target.round}`)
            );

            assert.isFalse(claimed);
          }).pipe(Effect.provide(BuggyServerTest))
        )
      ),
    timeout
  );

  it.effect(
    "tell the post's author whatever their role, and the members who follow every post",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* audience() {
          const workspaceId = yield* freshWorkspace;

          const [author, follower, quiet, viewer] = yield* Effect.all(
            [freshUser, freshUser, freshUser, freshUser],
            { concurrency: 1 }
          );

          yield* TestDirectory.use((directory) =>
            directory.setMembers(workspaceId, [
              member(author, "contributor"),
              member(follower, "editor"),
              member(quiet, "editor"),
              member(viewer, "viewer"),
            ])
          );

          yield* PreferenceStore.use((store) =>
            DateTime.now.pipe(
              Effect.flatMap((now) =>
                store.change(follower, { everyPost: true }, now)
              )
            )
          );

          const channelId = yield* connect(workspaceId, "mastodon");

          // The contributor writes the draft; an editor schedules it.
          const { post } = yield* PostDrafts.use((drafts) =>
            drafts.create(
              actorAs(author, workspaceId, permissionsFor("contributor")),
              { channelIds: [channelId], content: syntheticContent }
            )
          );

          yield* PostScheduling.use((scheduling) =>
            scheduling.reschedule(
              actorAs(quiet, workspaceId),
              post.id,
              scheduleIn("2026-06-15T08:00:00Z")
            )
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          const heard = yield* Effect.forEach(
            [author, follower, quiet, viewer],
            (userId) => noticesOf(userId).pipe(Effect.map((all) => all.length))
          );

          assert.deepStrictEqual(heard, [1, 1, 0, 0]);
        })
      ),
    timeout
  );

  it.effect(
    "tell every member who may schedule posts about a post an API key made",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* withoutAuthor() {
          const { userId, workspaceId } = yield* workspaceWithEditor;
          const channelId = yield* connect(workspaceId, "mastodon");
          const post = yield* schedule(apiKeyIn(workspaceId), [channelId]);

          assert.isTrue(Option.isNone(post.authorId));

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          assert.lengthOf(yield* noticesOf(userId), 1);
        })
      ),
    timeout
  );

  it.effect(
    "mark a round's notices read once a member resolved it, and no other",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* resolves() {
          const { actor, userId, workspaceId } = yield* workspaceWithEditor;
          const channelId = yield* connect(workspaceId, "mastodon");
          const post = yield* schedule(actor, [channelId]);
          const [target] = yield* targetsOf(post.id);

          assert(target !== undefined);

          const outcomes = yield* PublicationOutcomes;
          const now = yield* DateTime.now;

          const unconfirmed: PostTargetStatus = {
            _tag: "unconfirmed",
            attemptedAt: now,
            reason: "noResponse",
          };

          yield* outcomes.settled(settledAs(target, 1, unconfirmed));
          yield* outcomes.settled(settledAs(target, 2, unconfirmed));
          yield* outcomes.resolved(settledAs(target, 1, unconfirmed));

          const notices = yield* noticesOf(userId);

          // Newest first: the second round's notice is still to read.
          assert.deepStrictEqual(
            notices.map(({ readAt }) => Option.isSome(readAt)),
            [false, true]
          );
        })
      ),
    timeout
  );
});
