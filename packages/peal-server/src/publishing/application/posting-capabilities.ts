import { Context, Effect, Layer, Schema } from "effect";

import {
  capabilitiesOf,
  everyCapabilities,
} from "#publishing/domain/platform-capabilities.ts";
import type {
  ChannelCapabilities,
  PlatformCapabilities,
} from "#publishing/domain/platform-capabilities.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { AccountStandings } from "./account-standings.ts";
import { ChannelConnections } from "./channel-connections.ts";
import { CountedPlatforms } from "./counted-platforms.ts";
import { CurrentThreadedPlatforms } from "./threaded-platforms.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

/** What a post on a channel may hold, with the channel it is about. */
export interface DescribedChannel extends ChannelCapabilities {
  readonly channelId: ChannelId;
}

/**
 * What a post may hold, told to clients as data: on every platform
 * (`platforms`), and on one channel of the workspace (`channel`), where the
 * account's own restrictions are read from the platform now, and the
 * counts and lookups are those of the way in the channel came through (a
 * LinkedIn profile has neither; a company page has both). Both need
 * channel:read; a channel the workspace does not have is UnknownChannels.
 */
export class PostingCapabilities extends Context.Service<
  PostingCapabilities,
  {
    readonly channel: (
      actor: Actor,
      channelId: string
    ) => Effect.Effect<
      DescribedChannel,
      DatabaseError | MissingPermission | UnknownChannels
    >;
    readonly platforms: (
      actor: Actor
    ) => Effect.Effect<readonly PlatformCapabilities[], MissingPermission>;
  }
>()("peal-server/publishing/application/PostingCapabilities") {
  static readonly layer = Layer.effect(
    PostingCapabilities,
    Effect.gen(function* PostingCapabilitiesLive() {
      const channels = yield* WorkspaceChannels;
      const standings = yield* AccountStandings;
      const counted = yield* CountedPlatforms;
      const connections = yield* ChannelConnections;
      const threaded = yield* CurrentThreadedPlatforms;

      const platforms = Effect.fn("PostingCapabilities.platforms")(
        function* platforms(actor: Actor) {
          yield* Effect.fromResult(authorize(actor, "channel:read"));

          return everyCapabilities(
            counted.includes,
            counted.numbers,
            threaded.takesParts
          );
        }
      );

      const channel = Effect.fn("PostingCapabilities.channel")(
        function* channel(actor: Actor, channelId: string) {
          yield* Effect.fromResult(authorize(actor, "channel:read"));

          const id = decodeChannelId(channelId);

          if (id._tag === "None") {
            return yield* new UnknownChannels({ channelIds: [channelId] });
          }

          const [found] = yield* channels.lookUp(actor, [id.value]);

          if (found === undefined) {
            return yield* new UnknownChannels({ channelIds: [channelId] });
          }

          const connection = yield* connections.of(actor, found.channelId);

          const described: DescribedChannel = {
            account: yield* standings.read(found),
            capabilities: capabilitiesOf(
              found.platform,
              counted.onChannel(found.platform, connection),
              connection,
              counted.numbersOn(found.platform, connection),
              threaded.takesParts(found.platform)
            ),
            channelId: found.channelId,
          };

          return described;
        }
      );

      return PostingCapabilities.of({ channel, platforms });
    })
  );
}
