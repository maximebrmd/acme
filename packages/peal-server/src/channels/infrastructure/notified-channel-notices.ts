import { DateTime, Effect, Layer } from "effect";

import { ChannelNotices } from "#channels/application/channel-notices.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { Notify } from "#notifications/application/notify.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";

// The account a notice names, as the channel has it now.
const account = (channel: Channel) => ({
  handle: channel.handle,
  platform: channel.platform,
});

/**
 * Channel notices through the notifications context, which tells the
 * workspace's channel managers once per key, in the app and by email. A key
 * names one event: the channel entering `refreshNeeded` (its `updatedAt`
 * then, which nothing changes until it is reconnected), or one expiry of a
 * token. A notice that could not be recorded is logged, and the daily check
 * tells it again.
 */
export const NotifiedChannelNotices = Layer.effect(
  ChannelNotices,
  Effect.gen(function* NotifiedChannelNotices() {
    const notices = yield* Notify;

    const tell = (channel: Channel, request: NoticeRequest) =>
      notices.notify(request).pipe(
        Effect.catchCause((cause) =>
          Effect.logError("A channel notice could not be sent", cause)
        ),
        Effect.annotateLogs({ channelId: channel.id })
      );

    return ChannelNotices.of({
      reconnectRequired: (channel) =>
        tell(channel, {
          event: {
            _tag: "ChannelReconnectRequired",
            channel: account(channel),
          },
          key: `channel:${channel.id}:reconnect-required:${DateTime.formatIso(channel.updatedAt)}`,
          workspaceId: channel.workspaceId,
        }),
      reconnectSoon: (channel, expiresAt) =>
        tell(channel, {
          event: {
            _tag: "ChannelReconnectSoon",
            channel: account(channel),
            expiresAt,
          },
          key: `channel:${channel.id}:reconnect-soon:${DateTime.formatIso(expiresAt)}`,
          workspaceId: channel.workspaceId,
        }),
    });
  })
);
