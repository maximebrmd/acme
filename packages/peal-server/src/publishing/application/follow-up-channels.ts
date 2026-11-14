import { Context, Effect, Layer, Option } from "effect";

import { followUpsOn } from "#publishing/domain/follow-up-ability.ts";
import type {
  ChannelFollowUps,
  FollowUpAsk,
} from "#publishing/domain/follow-up-ability.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { ChannelGrants } from "./channel-grants.ts";
import { CountedPlatforms } from "./counted-platforms.ts";
import { CurrentThreadedPlatforms } from "./threaded-platforms.ts";

/** A channel as its follow-ups are judged: its platform and way in. */
export interface FollowUpTarget {
  readonly channelId: ChannelId;
  readonly connection: Option.Option<ChannelConnection>;
  readonly platform: Platform;
}

/**
 * What a channel can carry of what a rule asks, now: its platform's
 * support, whether the operator sends replies there, whether analytics
 * counts its likes, and the permissions its account granted.
 */
export class FollowUpChannels extends Context.Service<
  FollowUpChannels,
  {
    readonly of: (
      channel: FollowUpTarget,
      ask: FollowUpAsk
    ) => Effect.Effect<ChannelFollowUps>;
  }
>()("peal-server/publishing/application/FollowUpChannels") {
  static readonly layer = Layer.effect(
    FollowUpChannels,
    Effect.gen(function* FollowUpChannelsLive() {
      const grants = yield* ChannelGrants;
      const counted = yield* CountedPlatforms;
      const threaded = yield* CurrentThreadedPlatforms;

      return FollowUpChannels.of({
        of: Effect.fn("FollowUpChannels.of")(function* of(channel, ask) {
          const scopes = yield* grants.scopesOf(channel.channelId);

          return followUpsOn(
            {
              channelId: channel.channelId,
              counted: counted.onChannel(channel.platform, channel.connection),
              platform: channel.platform,
              scopes,
              takesParts: threaded.takesParts(channel.platform),
            },
            ask
          );
        }),
      });
    })
  );

  /** For tests: every channel carries whatever its platform supports. */
  static readonly supported = Layer.succeed(
    FollowUpChannels,
    FollowUpChannels.of({
      of: (channel, ask) =>
        Effect.succeed(
          followUpsOn(
            {
              channelId: channel.channelId,
              counted: true,
              platform: channel.platform,
              scopes: Option.none(),
              takesParts: true,
            },
            ask
          )
        ),
    })
  );
}
