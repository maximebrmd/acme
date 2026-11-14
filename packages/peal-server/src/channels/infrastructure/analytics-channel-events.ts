import { DateTime, Effect, Layer, Option } from "effect";

import { AnalyticsRecords } from "#analytics/application/analytics-records.ts";
import { ChannelEvents } from "#channels/application/channel-events.ts";
import type { DisconnectedChannel } from "#channels/application/channel-events.ts";
import { isSocialPlatform } from "#shared/domain/platform.ts";

// What analytics follows of a channel: a social network's only, as it
// counts nothing of a website.
const followedOf = (channel: DisconnectedChannel) => {
  const { platform } = channel;

  return isSocialPlatform(platform)
    ? Option.some({
        accountId: channel.accountId,
        channelId: channel.id,
        platform,
        workspaceId: channel.workspaceId,
      })
    : Option.none();
};

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
          events.connected(channel, reconnected).pipe(
            Effect.andThen(
              reconnected
                ? Effect.void
                : Option.match(followedOf(channel), {
                    onNone: () => Effect.void,
                    onSome: (followed) =>
                      DateTime.now.pipe(
                        Effect.flatMap((now) =>
                          analytics.channelBack(followed, now)
                        )
                      ),
                  })
            )
          ),
        // Off is not gone: analytics keeps reading what it followed.
        disabled: events.disabled,
        disconnected: (channel, cause) =>
          events.disconnected(channel, cause).pipe(
            Effect.andThen(
              Option.match(followedOf(channel), {
                onNone: () => Effect.void,
                onSome: (followed) =>
                  DateTime.now.pipe(
                    Effect.flatMap((at) =>
                      analytics.channelGone(followed, {
                        at,
                        erase: cause === "dataDeletion",
                      })
                    )
                  ),
              })
            )
          ),
        enabled: events.enabled,
      });
    })
  ).pipe(Layer.provide(heard));
