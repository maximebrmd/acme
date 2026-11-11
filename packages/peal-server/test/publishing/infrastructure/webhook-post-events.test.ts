import { assert, describe, it } from "@effect/vitest";
import {
  Context,
  DateTime,
  Effect,
  Layer,
  Option,
  Ref,
  Result,
  Schema,
} from "effect";
import type { Scope } from "effect";
import { MessageStorage } from "effect/cluster";

import { ListChannels } from "#channels/application/list-channels.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { AccountRules } from "#publishing/application/account-rules.ts";
import { PostBatches } from "#publishing/application/post-batches.ts";
import { PostFollowUp } from "#publishing/application/post-follow-up.ts";
import { PostOrigins } from "#publishing/application/post-origins.ts";
import { claimPostRun } from "#publishing/application/post-publication.ts";
import { PostRepository } from "#publishing/application/post-repository.ts";
import { PostScheduling } from "#publishing/application/post-scheduling.ts";
import { PublicationOutcomes } from "#publishing/application/publication-outcomes.ts";
import { publishingWith, publishingWorkers } from "#publishing/container.ts";
import { repostTarget } from "#publishing/domain/post-target.ts";
import { reopenPost } from "#publishing/domain/post.ts";
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
import { BadRequest } from "#shared/domain/bad-request.ts";
import type { ChannelId, PostId, WorkspaceId } from "#shared/domain/ids.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";
import { IdsLive } from "#shared/infrastructure/secure-random-ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { connect } from "#test/publishing/posts-server.ts";
import {
  attachableMedia,
  contentOf,
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
import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import { EventOrigins } from "#webhooks/application/ports/event-origins.ts";
import type { EventOrigin } from "#webhooks/application/ports/event-origins.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { webhooksWith } from "#webhooks/container.ts";
import { bodyOf } from "#webhooks/domain/recorded-event.ts";
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
  storedPost,
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

// Whose each workspace is, as a test says: none is a partner's until then.
class Owned extends Context.Service<
  Owned,
  Ref.Ref<ReadonlyMap<WorkspaceId, EventOrigin>>
>()("test/publishing/Owned") {
  static readonly layer = Layer.effect(
    Owned,
    Ref.make<ReadonlyMap<WorkspaceId, EventOrigin>>(new Map())
  );
}

const OriginsTest = Layer.effect(
  EventOrigins,
  Effect.gen(function* OriginsTest() {
    const owned = yield* Owned;

    return EventOrigins.of({
      isPartnerHome: (workspaceId) =>
        Ref.get(owned).pipe(
          Effect.map((origins) =>
            [...origins.values()].some(
              ({ homeWorkspaceId }) => homeWorkspaceId === workspaceId
            )
          )
        ),
      of: (workspaceId) =>
        Ref.get(owned).pipe(
          Effect.map((origins) =>
            Option.fromUndefinedOr(origins.get(workspaceId))
          )
        ),
    });
  })
).pipe(Layer.provideMerge(Owned.layer));

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
        ToldNotices.layer,
        OriginsTest
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

// What a receiver reads of an event, as far as these tests look.
const PayloadSchema = Schema.fromJsonString(
  Schema.Struct({
    data: Schema.Struct({
      postId: Schema.String,
      workspaceId: Schema.String,
    }),
    type: Schema.String,
    workspaceExternalId: Schema.NullOr(Schema.String),
  })
);

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
            channelIds: [channel] as const,
            content: syntheticContent,
            idempotency: Option.some({
              fingerprint: "synthetic-fingerprint",
              key: "synthetic-key",
            }),
            placement: {
              _tag: "at" as const,
              at: scheduleIn("2026-06-15T08:00:00Z").at,
            },
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

  it.effect(
    "tell a partner each post a batch made in a workspace it owns, once, with its own id for the workspace",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* batches() {
          const home = yield* freshOwner;
          const customer = yield* freshOwner;
          const channel = yield* connect(customer.workspaceId, "mastodon");

          yield* Owned.use((owned) =>
            Ref.update(owned, (origins) =>
              new Map(origins).set(customer.workspaceId, {
                externalId: Option.some("cus_batch"),
                homeWorkspaceId: home.workspaceId,
              })
            )
          );

          const partnerWide = yield* freshEndpoint(home, {
            eventTypes: ["post.scheduled"],
            scope: "partner",
          });

          const request = (text: string, key: string) => {
            const { at, timeZone } = scheduleIn("2026-06-16T08:00:00Z");

            return {
              channelIds: [channel] as const,
              content: contentOf(text),
              idempotency: Option.some({ fingerprint: text, key }),
              placement: { _tag: "at" as const, at },
              timeZone,
            };
          };

          const requests = [
            request("A synthetic post, one of several.", "batch-key-1"),
            request("Another synthetic post of the batch.", "batch-key-2"),
            // The first again, under another key: refused as a duplicate.
            request("A synthetic post, one of several.", "batch-key-3"),
          ];

          const batchesOf = yield* PostBatches;
          const first = yield* batchesOf.send(customer, requests);
          // The same request sent again answers the posts it made.
          const again = yield* batchesOf.send(customer, requests);

          for (const outcomes of [first, again]) {
            assert.deepStrictEqual(
              outcomes.map(({ _tag }) => _tag),
              ["Success", "Success", "Failure"]
            );
          }

          const deliveries = yield* WebhookDeliveries.use((log) =>
            log.page(home, partnerWide.endpoint.id, {
              after: Option.none(),
              limit: 50,
            })
          );

          const store = yield* DeliveryStore;

          const payloads = yield* Effect.all(
            deliveries.items.map(({ eventId }) =>
              store.event(eventId).pipe(
                Effect.flatMap(Effect.fromOption),
                Effect.flatMap((recorded) =>
                  Schema.decodeUnknownEffect(PayloadSchema)(bodyOf(recorded))
                )
              )
            )
          );

          // One event a post made, none for the refused one or the replay.
          const made = first.flatMap((outcome) =>
            outcome._tag === "Success" ? [outcome.success.post.id] : []
          );

          assert.lengthOf(made, 2);
          assert.deepStrictEqual(
            payloads.map(({ data }) => data.postId).toSorted(),
            made.map(String).toSorted()
          );

          for (const payload of payloads) {
            assert.strictEqual(payload.type, "post.scheduled");
            assert.strictEqual(payload.workspaceExternalId, "cus_batch");
            assert.strictEqual(payload.data.workspaceId, customer.workspaceId);
          }
        })
      ),
    timeout
  );
});

// The post.finished events an endpoint was sent, as round, outcome and
// each channel's status.
const finishedSentTo = Effect.fn("test.finishedSentTo")(
  function* finishedSentTo(owner: Actor, endpointId: string) {
    const sent = yield* eventsSentTo(owner, endpointId);

    return sent.flatMap((event) =>
      event.type === "post.finished"
        ? [
            {
              outcome: event.data.outcome,
              round: event.data.round,
              statuses: event.data.targets.map(({ status }) => status),
            },
          ]
        : []
    );
  }
);

// A post on the channels at 08:00, finished once its job ran.
const finishedAt8 = Effect.fn("test.finishedAt8")(function* finishedAt8(
  actor: Actor,
  channelIds: readonly [ChannelId, ...ChannelId[]]
) {
  const { post } = yield* schedule(actor, channelIds);

  yield* eventually("the job sleeps", isSuspended(post.id));
  yield* setTime("2026-06-15T08:00:00Z");
  yield* eventually("the post at 8 finishes", isFinished(post.id));

  return post.id;
});

const targetOn = (postId: PostId, channelId: ChannelId) =>
  targetsOf(postId).pipe(
    Effect.map((targets) =>
      Option.getOrThrow(
        Option.fromUndefinedOr(
          targets.find((target) => target.channelId === channelId)
        )
      )
    )
  );

const refuseOnce = (channelId: ChannelId) =>
  FakePlatform.use((platform) =>
    platform.script(channelId, [
      { _tag: "fail", failure: new BadRequest({ code: "duplicate" }) },
    ])
  );

describe("a post's post.finished event", () => {
  it.effect(
    "says once every channel has its result, with each one's, never what the post says",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* finishes() {
          const owner = yield* freshOwner;
          const live = yield* connect(owner.workspaceId, "mastodon");
          const refused = yield* connect(owner.workspaceId, "bluesky");
          const quiet = yield* connect(owner.workspaceId, "x");

          const all = yield* freshEndpoint(owner, {
            eventTypes: ["post.finished"],
          });

          // Heard by any of its channels.
          const ofRefused = yield* freshEndpoint(owner, {
            channelIds: [refused],
            eventTypes: ["post.finished"],
          });

          const ofOther = yield* freshEndpoint(owner, {
            channelIds: [quiet],
            eventTypes: ["post.finished"],
          });

          yield* FakePlatform.use((platform) =>
            platform.script(refused, [
              {
                _tag: "fail",
                failure: new MediaRejected({ code: "too-large" }),
              },
            ])
          );

          const postId = yield* finishedAt8(owner, [live, refused]);
          const { post } = yield* storedPost(postId);
          const targets = yield* targetsOf(postId);
          const sent = yield* eventsSentTo(owner, all.endpoint.id);

          assert(post.status._tag === "finished");

          const expected: WebhookEvent = {
            data: {
              finishedAt: post.status.finishedAt,
              outcome: "partiallyPublished",
              postId,
              round: 1,
              targets: targets.map((target) => ({
                channelId: target.channelId,
                failureReason:
                  target.status._tag === "failed" ? target.status.reason : null,
                permalink:
                  target.status._tag === "published"
                    ? Option.getOrNull(target.status.permalink)
                    : null,
                platform: target.channelId === live ? "mastodon" : "bluesky",
                status: target.channelId === live ? "published" : "failed",
                targetId: target.id,
              })),
              workspaceId: owner.workspaceId,
            },
            type: "post.finished",
          };

          assert.deepStrictEqual(sent, [expected]);
          assert.deepStrictEqual(
            yield* finishedSentTo(owner, ofRefused.endpoint.id),
            [
              {
                outcome: "partiallyPublished",
                round: 1,
                statuses: ["published", "failed"],
              },
            ]
          );
          assert.deepStrictEqual(
            yield* eventsSentTo(owner, ofOther.endpoint.id),
            []
          );
          assert.notInclude(JSON.stringify(sent), syntheticContent.text);
        })
      ),
    timeout
  );

  it.effect(
    "says it again when a repost ends, once a round",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* reposted() {
          const owner = yield* freshOwner;
          const fine = yield* connect(owner.workspaceId, "mastodon");
          const refused = yield* connect(owner.workspaceId, "bluesky");

          const { endpoint } = yield* freshEndpoint(owner, {
            eventTypes: ["post.finished"],
          });

          yield* refuseOnce(refused);

          const postId = yield* finishedAt8(owner, [fine, refused]);
          const failed = yield* targetOn(postId, refused);

          yield* PostFollowUp.use((followUp) =>
            followUp.repost(owner, postId, failed.id)
          );
          yield* eventually("the repost finishes", isFinished(postId));

          assert.deepStrictEqual(yield* finishedSentTo(owner, endpoint.id), [
            {
              outcome: "partiallyPublished",
              round: 1,
              statuses: ["published", "failed"],
            },
            {
              outcome: "published",
              round: 2,
              statuses: ["published", "published"],
            },
          ]);
        })
      ),
    timeout
  );

  it.effect(
    "says it again when a member's confirmation changes the outcome, and only then",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* confirmed() {
          const owner = yield* freshOwner;
          const followUp = yield* PostFollowUp;
          const lost = yield* connect(owner.workspaceId, "mastodon");
          const missing = yield* connect(owner.workspaceId, "bluesky");

          const { endpoint } = yield* freshEndpoint(owner, {
            eventTypes: ["post.finished"],
          });

          yield* Effect.forEach([lost, missing], (channelId) =>
            FakePlatform.use((platform) =>
              platform.script(channelId, [{ _tag: "loseResponse" }])
            )
          );

          const postId = yield* finishedAt8(owner, [lost, missing]);
          const found = yield* targetOn(postId, lost);
          const notFound = yield* targetOn(postId, missing);

          // Still unconfirmed on the other channel: the outcome stays.
          yield* followUp.confirm(owner, postId, found.id, {
            _tag: "published",
            permalink: Option.none(),
          });
          yield* followUp.confirm(owner, postId, notFound.id, {
            _tag: "notPublished",
          });

          assert.deepStrictEqual(yield* finishedSentTo(owner, endpoint.id), [
            {
              outcome: "unconfirmed",
              round: 1,
              statuses: ["unconfirmed", "unconfirmed"],
            },
            {
              outcome: "partiallyPublished",
              round: 1,
              statuses: ["published", "failed"],
            },
          ]);
        })
      ),
    timeout
  );

  it.effect(
    "says it of a post cancelled with nothing left to send",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* cancelled() {
          const owner = yield* freshOwner;
          const posts = yield* PostRepository;
          const fine = yield* connect(owner.workspaceId, "mastodon");
          const refused = yield* connect(owner.workspaceId, "bluesky");

          const { endpoint } = yield* freshEndpoint(owner, {
            eventTypes: ["post.finished"],
          });

          yield* refuseOnce(refused);

          const postId = yield* finishedAt8(owner, [fine, refused]);
          const failed = yield* targetOn(postId, refused);
          const { post: finished } = yield* storedPost(postId);

          // As a repost leaves them, before its job claims the target.
          assert(
            yield* posts.updateTarget(
              Result.getOrThrow(repostTarget(failed)),
              failed
            )
          );
          assert(
            yield* posts.update(
              Result.getOrThrow(
                reopenPost(
                  finished,
                  DateTime.makeUnsafe("2026-06-15T09:00:00Z")
                )
              ),
              finished
            )
          );

          yield* PostScheduling.use((scheduling) =>
            scheduling.cancel(owner, postId)
          );

          const sent = yield* eventsSentTo(owner, endpoint.id);

          assert.deepStrictEqual(
            sent.map((event) =>
              event.type === "post.finished"
                ? [event.data.postId, event.data.round, event.data.outcome]
                : []
            ),
            [
              [postId, 1, "partiallyPublished"],
              [postId, 2, "partiallyPublished"],
            ]
          );
        })
      ),
    timeout
  );
});

describe("a missed post's post.finished event", () => {
  it.effect(
    "says every channel missed it when the job wakes too late",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* missed() {
          const owner = yield* freshOwner;
          const channel = yield* connect(owner.workspaceId, "mastodon");

          const { endpoint } = yield* freshEndpoint(owner, {
            eventTypes: ["post.finished"],
          });

          const { post } = yield* schedule(owner, [channel]);

          yield* eventually("the job sleeps", isSuspended(post.id));
          // More than the hour a post may be late, as when the server was
          // down: the job's claim marks every target missed.
          yield* setTime("2026-06-15T09:30:00Z");

          assert.deepStrictEqual(
            yield* claimPostRun(post.id, post.scheduleRevision),
            { _tag: "missed" }
          );

          assert.deepStrictEqual(yield* finishedSentTo(owner, endpoint.id), [
            { outcome: "failed", round: 1, statuses: ["failed"] },
          ]);
        })
      ),
    timeout
  );
});
