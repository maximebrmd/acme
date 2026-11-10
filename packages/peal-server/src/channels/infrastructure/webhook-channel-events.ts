import { DateTime, Effect, Layer } from "effect";

import { ChannelEvents } from "#channels/application/channel-events.ts";
import type { DisconnectedChannel } from "#channels/application/channel-events.ts";
import { ChannelNotices } from "#channels/application/channel-notices.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { WebhookEvents } from "#webhooks/application/webhook-events.ts";

// What webhook endpoints hear of channels: ids and the platform, never the
// account's name or its tokens.
const dataOf = (channel: DisconnectedChannel) => ({
  channelId: channel.id,
  platform: channel.platform,
  workspaceId: channel.workspaceId,
});

// A bug in telling must never stop a connection: it is logged, and its
// savepoint rolled back. The database failing rolls the change back too.
const neverStopping = <R>(
  telling: Effect.Effect<void, DatabaseError, R>
): Effect.Effect<void, DatabaseError, R> =>
  telling.pipe(
    Effect.catchDefect((defect) =>
      Effect.logError(
        "A channel's webhook event could not be published",
        defect
      )
    )
  );

/**
 * ChannelEvents through the webhooks context, whose WebhookEvents joins the
 * transaction that saved or deleted the channel: `channel.connected`, keyed
 * by the instant the channel was last changed, so each reconnection is told
 * once, and `channel.disconnected`.
 */
export const WebhookChannelEvents = Layer.effect(
  ChannelEvents,
  Effect.gen(function* WebhookChannelEvents() {
    const webhooks = yield* WebhookEvents;

    return ChannelEvents.of({
      connected: (channel, reconnected) =>
        neverStopping(
          webhooks.publish({
            event: {
              data: { ...dataOf(channel), reconnected },
              type: "channel.connected",
            },
            key: `channel:${channel.id}:connected:${DateTime.formatIso(channel.updatedAt)}`,
          })
        ),
      disconnected: (channel) =>
        neverStopping(
          webhooks.publish({
            event: { data: dataOf(channel), type: "channel.disconnected" },
            key: `channel:${channel.id}:disconnected`,
          })
        ),
    });
  })
);

/**
 * Channel notices told through `told`, after the workspace's webhook
 * endpoints heard `channel.reconnect_needed`, under the key of the channel
 * entering `refreshNeeded` (its `updatedAt` then), so the daily check,
 * which tells it again, sends it once. Like the notice, it never fails: one
 * that could not be recorded is logged, and the daily check tells it again.
 */
export const webhookChannelNotices = <E, R>(
  told: Layer.Layer<ChannelNotices, E, R>
) =>
  Layer.effect(
    ChannelNotices,
    Effect.gen(function* WebhookChannelNotices() {
      const notices = yield* ChannelNotices;
      const webhooks = yield* WebhookEvents;

      return ChannelNotices.of({
        reconnectRequired: (channel) =>
          webhooks
            .publish({
              event: {
                data: dataOf(channel),
                type: "channel.reconnect_needed",
              },
              key: `channel:${channel.id}:reconnect-needed:${DateTime.formatIso(channel.updatedAt)}`,
            })
            .pipe(
              Effect.catchCause((cause) =>
                Effect.logError(
                  "A channel's webhook event could not be published",
                  cause
                )
              ),
              Effect.annotateLogs({ channelId: channel.id }),
              Effect.andThen(notices.reconnectRequired(channel))
            ),
        reconnectSoon: notices.reconnectSoon,
      });
    })
  ).pipe(Layer.provide(told));
