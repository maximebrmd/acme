import { assert, describe, it } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import type { Scope } from "effect";
import { MessageStorage } from "effect/cluster";

import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ListChannels } from "#channels/application/list-channels.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { NoticeInbox } from "#notifications/application/notice-inbox.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";
import { NotificationsWorkersLive } from "#notifications/container.ts";
import { WorkflowNoticeDelivery } from "#notifications/infrastructure/workflow-notice-delivery.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import { PublishingLive, publishingWorkers } from "#publishing/container.ts";
import type { PostTargetStatus } from "#publishing/domain/post-target-status.ts";
import { PostTarget } from "#publishing/domain/post-target.ts";
import {
  FakePlatform,
  FakePlatformPublisher,
} from "#publishing/infrastructure/fake-platform-publisher.ts";
import type { ChannelId, UserId, WorkspaceId } from "#shared/domain/ids.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { freshWorkspace } from "#test/channels/support.ts";
import {
  freshUser,
  noticesWith,
  readerOf,
  sentTo,
} from "#test/notifications/support.ts";
import { TestDirectory } from "#test/notifications/test-directory.ts";
import { connect } from "#test/publishing/posts-server.ts";
import { actorIn, syntheticContent } from "#test/publishing/support.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

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

// Publishing and notices as the server wires them, on an in-memory cluster
// driven by TestClock: posts go to channels stored in Postgres, a fake
// platform publishes them, and the notices' emails go out through their own
// workflow to a test mailer.
const ServerTest = Layer.mergeAll(
  publishingWorkers(FakePlatformPublisher),
  NotificationsWorkersLive
).pipe(
  Layer.provideMerge(PublishingLive),
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

  return { email, userId, workspaceId };
});

const noticesOf = (userId: UserId) =>
  NoticeInbox.use((inbox) =>
    inbox.page(readerOf(userId), { after: Option.none(), limit: 50 })
  ).pipe(Effect.map(({ items }) => items));

const schedule = (
  workspaceId: WorkspaceId,
  channelIds: readonly [ChannelId, ...ChannelId[]]
) =>
  PostScheduling.use((scheduling) =>
    scheduling.schedule(actorIn(workspaceId), {
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
          const { email, userId, workspaceId } = yield* workspaceWithEditor;
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

          const post = yield* schedule(workspaceId, [published, failed]);

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
              handle: "@acme_example",
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
            ["A post did not go out on Bluesky (@acme_example)"]
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
    "tell an outcome once per round, and name a channel gone as none",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* perRound() {
          const { userId, workspaceId } = yield* workspaceWithEditor;
          const channelId = yield* connect(workspaceId, "mastodon");
          const post = yield* schedule(workspaceId, [channelId]);
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
});
