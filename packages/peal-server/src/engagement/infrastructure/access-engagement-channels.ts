import { Effect, Layer, Option } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ChannelUnreadable } from "#engagement/application/channel-unreadable.ts";
import { EngagementChannels } from "#engagement/application/ports/engagement-channels.ts";

/** The channels, as the channels context knows them (ChannelAccess). */
export const AccessEngagementChannels = Layer.effect(
  EngagementChannels,
  Effect.gen(function* AccessEngagementChannels() {
    const access = yield* ChannelAccess;

    return EngagementChannels.of({
      belongs: (channelId, workspaceId) =>
        access
          .workspaceOf(channelId)
          .pipe(Effect.map(Option.contains(workspaceId))),
      describe: (channelId) =>
        access.account(channelId).pipe(
          Effect.map(({ platform, scopes }) => ({ platform, scopes })),
          Effect.catchTags({
            ChannelUnusable: ({ reason }) =>
              Effect.fail(
                new ChannelUnreadable({
                  reason: reason === "notFound" ? "disconnected" : "paused",
                })
              ),
            TokenExpired: () =>
              Effect.fail(new ChannelUnreadable({ reason: "paused" })),
          })
        ),
    });
  })
);
