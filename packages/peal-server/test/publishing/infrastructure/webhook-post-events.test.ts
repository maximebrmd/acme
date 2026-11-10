import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import type { Scope } from "effect";
import { MessageStorage } from "effect/cluster";

import { ListChannels } from "#channels/application/list-channels.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { AccountRules } from "#publishing/application/account-rules.ts";
import { PostOrigins } from "#publishing/application/post-origins.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import { publishingWith, publishingWorkers } from "#publishing/container.ts";
import { DrizzlePostRepository } from "#publishing/infrastructure/drizzle-post-repository.ts";
import {
  FakePlatform,
  FakePlatformPublisher,
} from "#publishing/infrastructure/fake-platform-publisher.ts";
import { ListedWorkspaceChannels } from "#publishing/infrastructure/listed-workspace-channels.ts";
import {
  webhookOutcomes,
  WebhookPostEvents,
} from "#publishing/infrastructure/webhook-post-events.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { connect } from "#test/publishing/posts-server.ts";
import {
  attachableMedia,
  postAllowance,
  syntheticContent,
} from "#test/publishing/support.ts";
import { eventsSentTo } from "#test/webhooks/fakes/event-log.ts";
import { FakeTransport } from "#test/webhooks/fakes/fake-transport.ts";
import { StartedJobs } from "#test/webhooks/fakes/started-jobs.ts";
import { ToldNotices } from "#test/webhooks/fakes/told-notices.ts";
import {
  freshEndpoint,
  freshOwner,
  SecretsTest,
} from "#test/webhooks/support.ts";
import { webhooksWith } from "#webhooks/container.ts";
import type { WebhookEvent } from "#webhooks/domain/webhook-event.ts";
import { DrizzleDeliveryStore } from "#webhooks/infrastructure/drizzle-delivery-store.ts";
import { DrizzleEndpointStore } from "#webhooks/infrastructure/drizzle-endpoint-store.ts";

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

// Members hear nothing here: the notices have tests of their own.
const SilentOutcomes = Layer.succeed(
  PublicationOutcomes,
  PublicationOutcomes.of({
    resolved: () => Effect.void,
    settled: () => Effect.void,
  })
);

// Publishing as the server wires it to the webhooks: what members do to a
// post's schedule and how each target ends reach the workspace's endpoints.
const PublishingTest = publishingWith(
  Layer.mergeAll(ListedWorkspaceChannels, attachableMedia(), postAllowance()),
  AccountRules.none,
  PostOrigins.unnamed,
  WebhookPostEvents
).pipe(
  Layer.provideMerge(
    webhookOutcomes(SilentOutcomes).pipe(Layer.provide(DrizzlePostRepository))
  )
);

// On an in-memory cluster driven by TestClock, with the webhooks' stores in
// Postgres and deliveries that are recorded, not sent.
const ServerTest = publishingWorkers(FakePlatformPublisher).pipe(
  Layer.provideMerge(PublishingTest),
  Layer.provideMerge(
    webhooksWith(
      Layer.mergeAll(
        DrizzleEndpointStore,
        DrizzleDeliveryStore,
        SecretsTest,
        FakeTransport.layer,
        StartedJobs.layer,
        ToldNotices.layer
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

const onServerAt = <A, E>(
  start: string,
  test: Effect.Effect<A, E, Layer.Success<typeof ServerTest> | Scope.Scope>
) => setTime(start).pipe(Effect.andThen(test.pipe(Effect.provide(ServerTest))));

const timeout = 60_000;

// An owner with an endpoint that hears everything about posts.
const listening = Effect.gen(function* listening() {
  const owner = yield* freshOwner;

  const { endpoint } = yield* freshEndpoint(owner, {
    eventTypes: [
      "post.scheduled",
      "post.unscheduled",
      "post.published",
      "post.failed",
      "post.unconfirmed",
      "post.cancelled",
    ],
  });

  return { endpointId: endpoint.id, owner };
});

// A post on the channels at 08:00.
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
  );

describe("a post's webhook events", () => {
  it.effect(
    "say it was scheduled, then how it ended on each channel, never what it says",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* outcomes() {
          const { endpointId, owner } = yield* listening;
          const live = yield* connect(owner.workspaceId, "mastodon");
          const refused = yield* connect(owner.workspaceId, "bluesky");

          yield* FakePlatform.use((platform) =>
            platform.script(refused, [
              {
                _tag: "fail",
                failure: new MediaRejected({ code: "too-large" }),
              },
            ])
          );

          const { post, targets } = yield* schedule(owner, [live, refused]);

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          const sent = yield* eventsSentTo(owner, endpointId);
          const [first] = sent;
          const settled = yield* targetsOf(post.id);

          assert.deepStrictEqual(sent.map(({ type }) => type).toSorted(), [
            "post.failed",
            "post.published",
            "post.scheduled",
          ]);

          const expected: WebhookEvent = {
            data: {
              postId: post.id,
              scheduledAt: scheduleIn("2026-06-15T08:00:00Z").at,
              targets: targets.map((target) => ({
                channelId: target.channelId,
                platform: target.channelId === live ? "mastodon" : "bluesky",
                targetId: target.id,
              })),
              timeZone: "Europe/Paris",
              workspaceId: owner.workspaceId,
            },
            type: "post.scheduled",
          };

          assert.deepStrictEqual(first, expected);

          const failed = sent.find(({ type }) => type === "post.failed");
          const published = sent.find(({ type }) => type === "post.published");

          assert(failed?.type === "post.failed");
          assert(published?.type === "post.published");
          assert.strictEqual(failed.data.reason, "mediaRejected");
          assert.strictEqual(failed.data.platform, "bluesky");
          assert.strictEqual(failed.data.round, 1);
          // How many of the post's parts are live there: one post, whole
          // or not at all.
          assert.deepStrictEqual(failed.data.parts, { count: 1, live: 0 });
          assert.deepStrictEqual(published.data.parts, { count: 1, live: 1 });
          assert.strictEqual(published.data.channelId, live);
          assert.strictEqual(
            published.data.targetId,
            settled.find(({ channelId }) => channelId === live)?.id
          );
          assert.notInclude(JSON.stringify(sent), syntheticContent.text);
        })
      ),
    timeout
  );

  it.effect(
    "say when it is moved, taken back to draft or cancelled",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* changes() {
          const { endpointId, owner } = yield* listening;
          const scheduling = yield* PostScheduling;
          const channel = yield* connect(owner.workspaceId, "mastodon");
          const moved = yield* schedule(owner, [channel]);

          yield* scheduling.reschedule(
            owner,
            moved.post.id,
            scheduleIn("2026-06-15T09:00:00Z")
          );
          yield* scheduling.cancel(owner, moved.post.id);

          const drafted = yield* schedule(owner, [channel]);

          yield* scheduling.unschedule(owner, drafted.post.id);

          const sent = yield* eventsSentTo(owner, endpointId);

          assert.deepStrictEqual(
            sent.map(({ data, type }) => [
              type,
              "postId" in data ? data.postId : null,
            ]),
            [
              ["post.scheduled", moved.post.id],
              ["post.scheduled", moved.post.id],
              ["post.cancelled", moved.post.id],
              ["post.scheduled", drafted.post.id],
              ["post.unscheduled", drafted.post.id],
            ]
          );

          const [, again, cancelled] = sent;

          assert(again?.type === "post.scheduled");
          assert(cancelled?.type === "post.cancelled");
          assert.deepStrictEqual(
            again.data.scheduledAt,
            scheduleIn("2026-06-15T09:00:00Z").at
          );
          assert.deepStrictEqual(
            cancelled.data.targets.map(({ targetId }) => targetId),
            moved.targets.map(({ id }) => id)
          );
        })
      ),
    timeout
  );

  it.effect(
    "say once that a post sent in one call was scheduled, however often its request is sent, and not who or what sent it",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* sentOnce() {
          const { endpointId, owner } = yield* listening;
          const scheduling = yield* PostScheduling;
          const channel = yield* connect(owner.workspaceId, "mastodon");

          const request = {
            at: Option.some(scheduleIn("2026-06-15T08:00:00Z").at),
            channelIds: [channel] as const,
            content: syntheticContent,
            idempotency: Option.some({
              fingerprint: "synthetic-fingerprint",
              key: "synthetic-key",
            }),
            timeZone: scheduleIn("2026-06-15T08:00:00Z").timeZone,
          };

          const first = yield* scheduling.send(owner, request);
          const again = yield* scheduling.send(owner, request);

          assert.isFalse(first.replayed);
          assert.isTrue(again.replayed);
          assert.strictEqual(again.post.id, first.post.id);

          const sent = yield* eventsSentTo(owner, endpointId);

          const expected: WebhookEvent = {
            data: {
              postId: first.post.id,
              scheduledAt: scheduleIn("2026-06-15T08:00:00Z").at,
              targets: first.targets.map((target) => ({
                channelId: channel,
                platform: "mastodon",
                targetId: target.id,
              })),
              timeZone: "Europe/Paris",
              workspaceId: owner.workspaceId,
            },
            type: "post.scheduled",
          };

          // The whole event: ids, the time and its zone, with nothing of
          // how the post was created or scheduled.
          assert.deepStrictEqual(sent, [expected]);

          yield* scheduling.cancel(owner, first.post.id);
        })
      ),
    timeout
  );
});
