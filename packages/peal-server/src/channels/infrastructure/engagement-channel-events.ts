import { DateTime, Effect, Layer } from "effect";

import { ChannelEvents } from "#channels/application/channel-events.ts";
import { EngagementRecords } from "#engagement/application/engagement-records.ts";

/**
 * ChannelEvents that also tell the engagement context (EngagementRecords),
 * in the transaction that deleted the channel, after `heard` were told: a
 * channel gone, disconnected by a member or at its platform's request,
 * takes with it at once the comments a platform that bounds how long they
 * are kept gave under its posts (YouTube's policies ask it within seven
 * days of a revocation made in the app). Its other threads end at their
 * next read, and stay for their retention. Unlike a webhook event, this is
 * part of the change: when it fails, the change is rolled back.
 */
export const engagementChannelEvents = <E, R>(
  heard: Layer.Layer<ChannelEvents, E, R>
) =>
  Layer.effect(
    ChannelEvents,
    Effect.gen(function* EngagementChannelEvents() {
      const events = yield* ChannelEvents;
      const engagement = yield* EngagementRecords;

      return ChannelEvents.of({
        connected: events.connected,
        disabled: events.disabled,
        disconnected: (channel, cause) =>
          events.disconnected(channel, cause).pipe(
            Effect.andThen(DateTime.now),
            Effect.flatMap((at) =>
              engagement.channelGone(channel.id, channel.platform, at)
            )
          ),
        enabled: events.enabled,
      });
    })
  ).pipe(Layer.provide(heard));
