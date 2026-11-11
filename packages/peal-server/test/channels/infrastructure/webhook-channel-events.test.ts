import { assert, layer } from "@effect/vitest";
import { DateTime, Effect, Layer, Option } from "effect";
import { SqlClient } from "effect/sql";
import { TestClock } from "effect/testing";

import { ChannelCredentials } from "#channels/application/channel-credentials.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import { ChannelNotices } from "#channels/application/channel-notices.ts";
import { ChannelRepository } from "#channels/application/channel-repository.ts";
import { ChannelSettings } from "#channels/application/channel-settings.ts";
import { DataDeletions } from "#channels/application/data-deletions.ts";
import { DisconnectChannel } from "#channels/application/disconnect-channel.ts";
import { PlatformAuthorizers } from "#channels/application/platform-authorizer.ts";
import { markRefreshNeeded } from "#channels/domain/channel.ts";
import { DrizzleChannelRepository } from "#channels/infrastructure/drizzle-channel-repository.ts";
import { DrizzleDataDeletions } from "#channels/infrastructure/drizzle-data-deletions.ts";
import { SqlChannelLocks } from "#channels/infrastructure/sql-channel-locks.ts";
import {
  WebhookChannelEvents,
  webhookChannelNotices,
} from "#channels/infrastructure/webhook-channel-events.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorizersOf } from "#test/channels/connect-support.ts";
import {
  freshChannel,
  syntheticCredentials,
  TokenCipherTest,
} from "#test/channels/support.ts";
import { eventsSentTo } from "#test/webhooks/fakes/event-log.ts";
import {
  freshEndpoint,
  freshOwner,
  WebhooksTest,
} from "#test/webhooks/support.ts";
import { WebhookDeliveries } from "#webhooks/application/webhook-deliveries.ts";

// The notices themselves are the notifications context's: none here.
const SilentNotices = Layer.succeed(
  ChannelNotices,
  ChannelNotices.of({
    reconnectRequired: () => Effect.void,
    reconnectSoon: () => Effect.void,
  })
);

const Test = Layer.mergeAll(
  ChannelSettings.layer,
  DisconnectChannel.layer,
  DrizzleDataDeletions,
  webhookChannelNotices(SilentNotices)
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      WebhookChannelEvents,
      SqlChannelLocks,
      TokenCipherTest,
      Layer.succeed(PlatformAuthorizers, authorizersOf())
    )
  ),
  Layer.provideMerge(DrizzleChannelRepository),
  Layer.provideMerge(WebhooksTest)
);

// An endpoint that hears about channels, and a channel saved as connecting
// one saves it: with its event, in the workspace's additions' transaction.
const connected = Effect.fn("connected")(function* connected(owner: Actor) {
  const channels = yield* ChannelRepository;
  const events = yield* ChannelEvents;

  const { endpoint } = yield* freshEndpoint(owner, {
    eventTypes: [
      "channel.connected",
      "channel.disconnected",
      "channel.reconnect_needed",
      "channel.disabled",
      "channel.enabled",
      "channel.expiring",
    ],
  });

  const channel = yield* freshChannel(owner.workspaceId);

  yield* channels.addingTo(
    owner.workspaceId,
    channels
      .insert(channel, syntheticCredentials(channel))
      .pipe(Effect.andThen(events.connected(channel, false)))
  );

  return { channel, endpointId: endpoint.id };
});

// The delivery log's retention, for one workspace only: the purge itself,
// which ends every workspace's, is tested in the webhooks context, at an
// instant no other suite's rows reach.
const forgetBefore = (workspaceId: string, before: DateTime.Utc) =>
  Effect.gen(function* forgetting() {
    const sql = yield* SqlClient.SqlClient;
    const cutoff = DateTime.formatIso(before);

    yield* sql`DELETE FROM webhooks.deliveries WHERE workspace_id = ${workspaceId} AND created_at < ${cutoff}::timestamptz`;
    yield* sql`DELETE FROM webhooks.events e WHERE e.workspace_id = ${workspaceId} AND e.occurred_at < ${cutoff}::timestamptz AND NOT EXISTS (SELECT 1 FROM webhooks.deliveries d WHERE d.event_id = e.id)`;
  });

layer(Test)("channels, to webhook endpoints", (it) => {
  it.effect(
    "say when an account is connected, and when it is disconnected",
    () =>
      Effect.gen(function* lifecycle() {
        const owner = yield* freshOwner;
        const { channel, endpointId } = yield* connected(owner);

        const data = {
          channelId: channel.id,
          platform: channel.platform,
          workspaceId: owner.workspaceId,
        };

        assert.deepStrictEqual(yield* eventsSentTo(owner, endpointId), [
          { data: { ...data, reconnected: false }, type: "channel.connected" },
        ]);

        yield* DisconnectChannel.use((disconnecting) =>
          disconnecting.disconnect(owner, channel.id)
        );

        const sent = yield* eventsSentTo(owner, endpointId);

        assert.deepStrictEqual(sent[1], { data, type: "channel.disconnected" });
        assert.lengthOf(sent, 2);
        assert.isTrue(
          Option.isNone(
            yield* ChannelRepository.use((channels) => channels.get(channel.id))
          )
        );
      })
  );

  it.effect("say nothing of a connection that rolled back", () =>
    Effect.gen(function* rolledBack() {
      const owner = yield* freshOwner;
      const channels = yield* ChannelRepository;
      const events = yield* ChannelEvents;
      const { endpointId } = yield* connected(owner);
      const other = yield* freshChannel(owner.workspaceId);

      yield* channels
        .addingTo(
          owner.workspaceId,
          channels
            .insert(other, syntheticCredentials(other))
            .pipe(
              Effect.andThen(events.connected(other, false)),
              Effect.andThen(Effect.fail("rolled back" as const))
            )
        )
        .pipe(Effect.flip);

      assert.lengthOf(yield* eventsSentTo(owner, endpointId), 1);
      assert.isTrue(Option.isNone(yield* channels.get(other.id)));
    })
  );

  it.effect(
    "say once that a channel needs reconnecting, however often it is told",
    () =>
      Effect.gen(function* reconnect() {
        const owner = yield* freshOwner;
        const notices = yield* ChannelNotices;
        const { channel, endpointId } = yield* connected(owner);
        const marked = markRefreshNeeded(channel, yield* DateTime.now);

        yield* notices.reconnectRequired(marked);
        // The daily check tells it again.
        yield* notices.reconnectRequired(marked);

        assert.deepStrictEqual(
          (yield* eventsSentTo(owner, endpointId)).map(({ type }) => type),
          ["channel.connected", "channel.reconnect_needed"]
        );
      })
  );

  it.effect(
    "say nothing more of a channel left to reconnect for longer than events are kept",
    () =>
      Effect.gen(function* left() {
        const owner = yield* freshOwner;
        const notices = yield* ChannelNotices;
        const { channel, endpointId } = yield* connected(owner);
        const now = yield* DateTime.now;

        // Marked 40 days ago: its event was sent then, and purged since
        // with its key. The daily check still tells it.
        yield* notices.reconnectRequired(
          markRefreshNeeded(channel, DateTime.subtract(now, { days: 40 }))
        );

        assert.deepStrictEqual(
          (yield* eventsSentTo(owner, endpointId)).map(({ type }) => type),
          ["channel.connected"]
        );

        // One marked days ago, whose event could not be recorded then, is
        // still told.
        yield* notices.reconnectRequired(
          markRefreshNeeded(channel, DateTime.subtract(now, { days: 6 }))
        );

        assert.deepStrictEqual(
          (yield* eventsSentTo(owner, endpointId)).map(({ type }) => type),
          ["channel.connected", "channel.reconnect_needed"]
        );
      })
  );

  it.effect(
    "say that a channel is disconnected when its platform asks for the user's data to be deleted, once",
    () =>
      Effect.gen(function* deleted() {
        const owner = yield* freshOwner;
        const channels = yield* ChannelRepository;
        const deletions = yield* DataDeletions;
        const now = yield* DateTime.now;

        const { endpoint } = yield* freshEndpoint(owner, {
          eventTypes: ["channel.disconnected"],
        });

        const userId = `1033${owner.workspaceId.replaceAll("-", "").slice(-12)}`;

        const page = yield* freshChannel(owner.workspaceId, {
          platform: "facebook",
        });

        const synthetic = syntheticCredentials(page);

        yield* channels.insert(
          page,
          new ChannelCredentials({
            accessToken: synthetic.accessToken,
            grantedBy: userId,
            refreshToken: synthetic.refreshToken,
          })
        );

        const request = {
          app: "facebook" as const,
          code: owner.workspaceId.replaceAll("-", ""),
          now,
          signedRequest: `signed.${userId}`,
          userId,
        };

        const first = yield* deletions.erase(request);
        // Meta sends the same request again: nothing more is told.
        yield* deletions.erase({ ...request, code: `${request.code}2` });

        assert.strictEqual(first.channelsDeleted, 1);
        assert.deepStrictEqual(yield* eventsSentTo(owner, endpoint.id), [
          {
            data: {
              channelId: page.id,
              platform: "facebook",
              workspaceId: owner.workspaceId,
            },
            type: "channel.disconnected",
          },
        ]);
      })
  );

  it.effect(
    "say when a member turns a channel off and back on, and nothing of a switch that changes nothing",
    () =>
      Effect.gen(function* switched() {
        const owner = yield* freshOwner;
        const settings = yield* ChannelSettings;
        const { channel, endpointId } = yield* connected(owner);

        yield* settings.turnOff(owner, channel.id);
        // Off already: nothing to tell.
        yield* settings.turnOff(owner, channel.id);
        yield* settings.turnOn(owner, channel.id);
        yield* settings.turnOn(owner, channel.id);

        const data = {
          channelId: channel.id,
          platform: channel.platform,
          workspaceId: owner.workspaceId,
        };

        assert.deepStrictEqual(
          (yield* eventsSentTo(owner, endpointId)).slice(1),
          [
            { data, type: "channel.disabled" },
            { data, type: "channel.enabled" },
          ]
        );
      })
  );

  it.effect(
    "say once that a channel's sign-in expires, across every daily check before it does",
    () =>
      Effect.gen(function* expiring() {
        const owner = yield* freshOwner;
        const notices = yield* ChannelNotices;
        const deliveries = yield* WebhookDeliveries;
        const { channel, endpointId } = yield* connected(owner);
        const start = yield* DateTime.now;
        // A token of 60 days, as a LinkedIn profile's: told for each of
        // the 61 daily checks until it ends.
        const expiresAt = DateTime.add(start, { days: 60 });
        const told = new Set<string>();

        for (let day = 0; day <= 60; day += 1) {
          yield* TestClock.setTime(
            DateTime.toEpochMillis(DateTime.add(start, { days: day }))
          );
          yield* notices.reconnectSoon(channel, expiresAt);
          // The log's retention runs between checks, keys going with it.
          yield* forgetBefore(
            owner.workspaceId,
            DateTime.add(start, { days: day - 30 })
          );

          const { items } = yield* deliveries.page(owner, endpointId, {
            after: Option.none(),
            limit: 100,
          });

          for (const { eventType, id } of items) {
            if (eventType === "channel.expiring") {
              told.add(id);
            }
          }
        }

        assert.strictEqual(told.size, 1);

        const sent = yield* eventsSentTo(owner, endpointId);

        assert.deepStrictEqual(sent.at(-1), {
          data: {
            channelId: channel.id,
            expiresAt,
            platform: channel.platform,
            workspaceId: owner.workspaceId,
          },
          type: "channel.expiring",
        });
      })
  );
});
