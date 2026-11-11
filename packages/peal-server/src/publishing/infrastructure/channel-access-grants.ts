import { Effect, Layer, Option } from "effect";

import { ChannelAccess } from "#channels/application/channel-access.ts";
import { ChannelGrants } from "#publishing/application/channel-grants.ts";

/**
 * Each channel's scopes as the channels context keeps them. A channel that
 * cannot post, or that could not be read, has none known.
 */
export const ChannelAccessGrants = Layer.effect(
  ChannelGrants,
  Effect.gen(function* ChannelAccessGrants() {
    const access = yield* ChannelAccess;

    return ChannelGrants.of({
      scopesOf: (channelId) =>
        access.account(channelId).pipe(
          Effect.map(({ scopes }) => Option.some(scopes)),
          Effect.orElseSucceed(() => Option.none<readonly string[]>())
        ),
    });
  })
);
