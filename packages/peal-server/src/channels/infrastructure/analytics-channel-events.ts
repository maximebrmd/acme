import { DateTime, Effect, Layer } from "effect";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import type { DisconnectedChannel } from "#channels/application/channel-events.ts";

const followedOf = (channel: DisconnectedChannel) => ({
  accountId: channel.accountId,
  channelId: channel.id,
  platform: channel.platform,
  workspaceId: channel.workspaceId,
});

/**
 * ChannelEvents that also tell the analytics context (AnalyticsRecords),
 * in the transaction that saved or deleted the channel, after `heard`
 * were told: a channel gone is no longer read nor reported from that
 * moment and its numbers are deleted within their retention, at once when
 * its platform asked for the deletion; an account connected again takes
 * back the numbers of the channel it had. Unlike a webhook event, this is
 * part of the change: when it fails, the change is rolled back.
 */
export const analyticsChannelEvents = <E, R>(
  heard: Layer.Layer<ChannelEvents, E, R>
) =>
  Layer.effect(
    ChannelEvents,
    Effect.gen(function* AnalyticsChannelEvents() {
      const events = yield* ChannelEvents;
      const analytics = yield* AnalyticsRecords;

      return ChannelEvents.of({
        connected: (channel, reconnected) =>
          events
            .connected(channel, reconnected)
            .pipe(
              Effect.andThen(
                reconnected
                  ? Effect.void
                  : DateTime.now.pipe(
                      Effect.flatMap((now) =>
                        analytics.channelBack(followedOf(channel), now)
                      )
                    )
              )
            ),
        disconnected: (channel, cause) =>
          events.disconnected(channel, cause).pipe(
            Effect.andThen(DateTime.now),
            Effect.flatMap((at) =>
              analytics.channelGone(followedOf(channel), {
                at,
                erase: cause === "dataDeletion",
              })
            )
          ),
      });
    })
  ).pipe(Layer.provide(heard));
