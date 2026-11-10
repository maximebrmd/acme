import { Context, Effect, Layer, Option, Schema } from "effect";

import { lookupNamed, queryOf } from "#publishing/domain/lookup.ts";
import type { LookupInput, LookupResult } from "#publishing/domain/lookup.ts";
import { optionLookupsOn } from "#publishing/domain/platform-capabilities.ts";
import type { OptionLookup } from "#publishing/domain/platform-capabilities.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import { ChannelIdSchema } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { ChannelConnections } from "./channel-connections.ts";
import { LookupInputRejected } from "./lookup-input-rejected.ts";
import { PlatformLookups } from "./platform-lookups.ts";
import type { LookupFailure } from "./platform-lookups.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { UnknownLookup } from "./unknown-lookup.ts";
import { WorkspaceChannels } from "./workspace-channels.ts";

const decodeChannelId = Schema.decodeUnknownOption(ChannelIdSchema);

/**
 * A channel's lookups: what its platform tells about the account that a
 * post's options refer to. `list` answers those the channel has, `run` asks
 * the platform for one. Both need channel:read, as they only read; a
 * channel the workspace does not have is UnknownChannels, a name the
 * channel's platform has not UnknownLookup, and an input the lookup does
 * not take LookupInputRejected, before the platform is asked anything.
 */
export class ChannelLookups extends Context.Service<
  ChannelLookups,
  {
    readonly list: (
      actor: Actor,
      channelId: string
    ) => Effect.Effect<
      readonly OptionLookup[],
      DatabaseError | MissingPermission | UnknownChannels
    >;
    readonly run: (
      actor: Actor,
      channelId: string,
      name: string,
      input: LookupInput
    ) => Effect.Effect<
      LookupResult,
      | DatabaseError
      | LookupFailure
      | MissingPermission
      | UnknownChannels
      | UnknownLookup
    >;
  }
>()("peal-server/publishing/application/ChannelLookups") {
  static readonly layer = Layer.effect(
    ChannelLookups,
    Effect.gen(function* ChannelLookupsLive() {
      const channels = yield* WorkspaceChannels;
      const platforms = yield* PlatformLookups;
      const connections = yield* ChannelConnections;

      const channelOf = Effect.fn("ChannelLookups.channel")(function* channelOf(
        actor: Actor,
        channelId: string
      ) {
        yield* Effect.fromResult(authorize(actor, "channel:read"));

        const id = decodeChannelId(channelId);

        if (id._tag === "None") {
          return yield* new UnknownChannels({ channelIds: [channelId] });
        }

        const [channel] = yield* channels.lookUp(actor, [id.value]);

        if (channel === undefined) {
          return yield* new UnknownChannels({ channelIds: [channelId] });
        }

        return {
          ...channel,
          connection: yield* connections.of(actor, channel.channelId),
        };
      });

      const run = Effect.fn("ChannelLookups.run")(function* run(
        actor: Actor,
        channelId: string,
        name: string,
        input: LookupInput
      ) {
        const channel = yield* channelOf(actor, channelId);
        const lookup = lookupNamed(channel.platform, name, channel.connection);

        if (Option.isNone(lookup)) {
          return yield* new UnknownLookup({ name });
        }

        const query = queryOf(lookup.value, input);

        if (Option.isNone(query)) {
          return yield* new LookupInputRejected();
        }

        return yield* platforms.run(channel.channelId, query.value);
      });

      return ChannelLookups.of({
        list: (actor, channelId) =>
          channelOf(actor, channelId).pipe(
            Effect.map(({ connection, platform }) =>
              optionLookupsOn(platform, connection)
            )
          ),
        run,
      });
    })
  );
}
