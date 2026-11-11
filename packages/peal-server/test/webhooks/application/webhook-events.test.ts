import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Option } from "effect";

import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import {
  ChannelIdSchema,
  MediaAssetIdSchema,
  PostIdSchema,
  PostTargetIdSchema,
} from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { StartedJobs } from "#test/webhooks/fakes/started-jobs.ts";
import {
  freshEndpoint,
  freshOwner,
  WebhooksTest,
} from "#test/webhooks/support.ts";
import { DeliveryStore } from "#webhooks/application/ports/delivery-store.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";
import { WebhookEndpoints } from "#webhooks/application/webhook-endpoints.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";
import type { EventToPublish } from "#webhooks/application/webhook-events.ts";

// A post that went live in the actor's workspace, under a key of its own,
// on a channel of its own unless one is given.
const published = Effect.fn("published")(function* published(
  actor: Actor,
  channel?: ChannelId
) {
  const targetId = yield* newId(PostTargetIdSchema);

  const request: EventToPublish = {
    event: {
      data: {
        channelId: channel ?? (yield* newId(ChannelIdSchema)),
        permalink: "https://social.example/@peal_example/1",
        platform: "mastodon",
        postId: yield* newId(PostIdSchema),
        publishedAt: yield* DateTime.now,
        round: 1,
        targetId,
        workspaceId: actor.workspaceId,
      },
      type: "post.published",
    },
    key: `post-target:${targetId}:1:published`,
  };

  return request;
});

const logOf = (actor: Actor, endpointId: string) =>
  WebhookDeliveries.use((deliveries) =>
    deliveries.page(actor, endpointId, { after: Option.none(), limit: 50 })
  ).pipe(Effect.map(({ items }) => items));

const startedAmong = (deliveryIds: readonly string[]) =>
  StartedJobs.use((jobs) => jobs.deliveries).pipe(
    Effect.map((started) => started.filter((id) => deliveryIds.includes(id)))
  );

layer(WebhooksTest)("webhook events", (it) => {
  it.effect(
    "go once to each endpoint that is on and subscribes to their type",
    () =>
      Effect.gen(function* fansOut() {
        const owner = yield* freshOwner;
        const events = yield* WebhookEvents;
        const listening = yield* freshEndpoint(owner);
        const alsoListening = yield* freshEndpoint(owner);

        const elsewhere = yield* freshEndpoint(owner, {
          eventTypes: ["media.ready"],
        });

        const off = yield* freshEndpoint(owner, { enabled: false });
        const strangerOwner = yield* freshOwner;
        const stranger = yield* freshEndpoint(strangerOwner);
        const request = yield* published(owner);

        yield* events.publish(request);
        // Told again, as by a retried job: nothing more is sent.
        yield* events.publish(request);

        const first = yield* logOf(owner, listening.endpoint.id);
        const second = yield* logOf(owner, alsoListening.endpoint.id);

        assert.lengthOf(first, 1);
        assert.lengthOf(second, 1);
        assert.strictEqual(first[0]?.eventType, "post.published");
        assert.deepStrictEqual(first[0]?.status, {
          _tag: "pending",
          nextAttemptAt: Option.none(),
        });
        // One event, which both receivers know by the same id.
        assert.strictEqual(first[0]?.eventId, second[0]?.eventId);
        assert.lengthOf(yield* logOf(owner, elsewhere.endpoint.id), 0);
        assert.lengthOf(yield* logOf(owner, off.endpoint.id), 0);
        // Another workspace's endpoint hears nothing of this one.
        assert.lengthOf(yield* logOf(strangerOwner, stranger.endpoint.id), 0);
        assert.lengthOf(
          yield* startedAmong([...first, ...second].map(({ id }) => id)),
          2
        );

        const recorded = yield* DeliveryStore.use((store) =>
          store.event(
            Option.getOrThrow(Option.fromUndefinedOr(first[0])).eventId
          )
        );

        assert.deepStrictEqual(
          Option.getOrThrow(recorded).event,
          request.event
        );
      })
  );

  it.effect("keep nothing for a workspace where nobody listens", () =>
    Effect.gen(function* nobody() {
      const owner = yield* freshOwner;
      const events = yield* WebhookEvents;
      const request = yield* published(owner);

      yield* events.publish(request);

      // An endpoint added afterwards hears nothing of what came before.
      const late = yield* freshEndpoint(owner);

      yield* events.publish(request);

      // Nothing was kept the first time, so the key is still new.
      assert.lengthOf(yield* logOf(owner, late.endpoint.id), 1);
    })
  );

  it.effect("are not sent for a fact that rolled back", () =>
    Effect.gen(function* rollsBack() {
      const owner = yield* freshOwner;
      const events = yield* WebhookEvents;
      const { transaction } = yield* TransactionRunner;
      const { endpoint } = yield* freshEndpoint(owner);
      const request = yield* published(owner);
      const before = yield* StartedJobs.use((jobs) => jobs.deliveries);

      const outcome = yield* transaction(
        events
          .publish(request)
          .pipe(Effect.andThen(Effect.fail("the fact did not commit" as const)))
      ).pipe(Effect.flip);

      assert.strictEqual(outcome, "the fact did not commit");
      assert.lengthOf(yield* logOf(owner, endpoint.id), 0);

      // The same fact, committed this time, is sent: its key was not kept.
      yield* transaction(events.publish(request));

      const log = yield* logOf(owner, endpoint.id);
      const after = yield* StartedJobs.use((jobs) => jobs.deliveries);

      assert.lengthOf(log, 1);
      // The job started in the rolled back transaction is this test's fake's
      // to count: the real one is a message in that transaction.
      assert.isAtLeast(after.length - before.length, 1);
    })
  );

  it.effect("stop reaching an endpoint once it is off or deleted", () =>
    Effect.gen(function* stops() {
      const owner = yield* freshOwner;
      const events = yield* WebhookEvents;
      const endpoints = yield* WebhookEndpoints;
      const kept = yield* freshEndpoint(owner);
      const removed = yield* freshEndpoint(owner);

      yield* endpoints.update(owner, kept.endpoint.id, { enabled: false });
      yield* endpoints.remove(owner, removed.endpoint.id);
      yield* events.publish(yield* published(owner));

      assert.lengthOf(yield* logOf(owner, kept.endpoint.id), 0);

      yield* endpoints.update(owner, kept.endpoint.id, { enabled: true });
      yield* events.publish(yield* published(owner));

      assert.lengthOf(yield* logOf(owner, kept.endpoint.id), 1);
    })
  );

  it.effect("go only to the endpoints whose filters match", () =>
    Effect.gen(function* filtered() {
      const owner = yield* freshOwner;
      const events = yield* WebhookEvents;

      const [listed, other, third] = yield* Effect.all([
        newId(ChannelIdSchema),
        newId(ChannelIdSchema),
        newId(ChannelIdSchema),
      ]);

      const everyChannel = yield* freshEndpoint(owner, {
        eventTypes: ["post.published", "post.scheduled", "media.ready"],
      });

      const someChannels = yield* freshEndpoint(owner, {
        channelIds: [listed],
        eventTypes: ["post.published", "post.scheduled", "media.ready"],
      });

      yield* events.publish(yield* published(owner, listed));
      yield* events.publish(yield* published(owner, other));

      const postId = yield* newId(PostIdSchema);

      const targets = [other, listed, third].map((channelId) => ({
        channelId,
        platform: "mastodon" as const,
        targetId: PostTargetIdSchema.make(channelId),
      }));

      // A whole post with one listed channel out of three.
      yield* events.publish({
        event: {
          data: {
            postId,
            scheduledAt: yield* DateTime.now,
            targets,
            timeZone: "Europe/Paris",
            workspaceId: owner.workspaceId,
          },
          type: "post.scheduled",
        },
        key: `post:${postId}:scheduled:1`,
      });

      // A whole post whose data names no channel: its teller does.
      yield* events.publish({
        event: {
          data: { postId, workspaceId: owner.workspaceId },
          type: "post.unscheduled",
        },
        key: `post:${postId}:unscheduled:1`,
        postChannelIds: [other, third],
      });

      // An event about no channel.
      const mediaId = yield* newId(MediaAssetIdSchema);

      yield* events.publish({
        event: {
          data: {
            contentType: "image/png",
            mediaId,
            workspaceId: owner.workspaceId,
          },
          type: "media.ready",
        },
        key: `media:${mediaId}:ready`,
      });

      const typesOf = (endpointId: string) =>
        logOf(owner, endpointId).pipe(
          Effect.map((log) => log.map(({ eventType }) => eventType).toSorted())
        );

      assert.deepStrictEqual(yield* typesOf(everyChannel.endpoint.id), [
        "media.ready",
        "post.published",
        "post.published",
        "post.scheduled",
      ]);
      assert.deepStrictEqual(yield* typesOf(someChannels.endpoint.id), [
        "media.ready",
        "post.published",
        "post.scheduled",
      ]);
    })
  );

  it.effect("keep no event when every endpoint's filter leaves it out", () =>
    Effect.gen(function* nobodyMatches() {
      const owner = yield* freshOwner;
      const events = yield* WebhookEvents;
      const elsewhere = yield* newId(ChannelIdSchema);
      const request = yield* published(owner);

      yield* freshEndpoint(owner, { channelIds: [elsewhere] });
      yield* events.publish(request);

      // Nothing was kept: a new endpoint hears the same key.
      const late = yield* freshEndpoint(owner);

      yield* events.publish(request);

      assert.lengthOf(yield* logOf(owner, late.endpoint.id), 1);
    })
  );
});
