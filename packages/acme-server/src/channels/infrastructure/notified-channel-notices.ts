import { DateTime, Effect, Layer } from "effect";

import { ChannelNotices } from "#channels/application/channel-notices.ts";
import type { Channel } from "#channels/domain/channel.ts";
import { SendChannelNotice } from "#notifications/application/send-channel-notice.ts";

// The workspace's channels page in the web app, where reconnecting starts.
const channelsPage = (channel: Channel) =>
  `/app/${channel.workspaceId}/channels`;

/**
 * Channel notices through the notifications context, which emails the
 * workspace's channel managers once per key. A key names one event: the
 * channel entering `refreshNeeded` (its `updatedAt` then, which nothing
 * changes until it is reconnected), or one expiry of a token.
 */
export const NotifiedChannelNotices = Layer.effect(
  ChannelNotices,
  Effect.gen(function* NotifiedChannelNotices() {
    const notices = yield* SendChannelNotice;

    return ChannelNotices.of({
      reconnectRequired: (channel) =>
        notices.send({
          key: `channel:${channel.id}:reconnect-required:${DateTime.formatIso(channel.updatedAt)}`,
          notice: {
            _tag: "ChannelReconnectRequired",
            handle: channel.handle,
            platform: channel.platform,
          },
          path: channelsPage(channel),
          workspaceId: channel.workspaceId,
        }),
      reconnectSoon: (channel, expiresAt) =>
        notices.send({
          key: `channel:${channel.id}:reconnect-soon:${DateTime.formatIso(expiresAt)}`,
          notice: {
            _tag: "ChannelReconnectSoon",
            expiresAt,
            handle: channel.handle,
            platform: channel.platform,
          },
          path: channelsPage(channel),
          workspaceId: channel.workspaceId,
        }),
    });
  })
);
