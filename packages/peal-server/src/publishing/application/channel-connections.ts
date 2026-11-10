import { Context, Effect, Layer, Option } from "effect";
import type { Effect as EffectType } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelConnection } from "#shared/domain/channel-connection.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

/**
 * The way in a channel of the actor's workspace came through, on the
 * platforms that have several (a LinkedIn profile or company page,
 * Instagram's two logins), as the channels context has it. What a channel
 * may hold can depend on it: only a LinkedIn company page has counts and
 * the lookup of pages to mention. None on a platform with one way in, and
 * for a channel the workspace does not have.
 */
export class ChannelConnections extends Context.Service<
  ChannelConnections,
  {
    readonly of: (
      actor: Actor,
      channelId: ChannelId
    ) => EffectType.Effect<
      Option.Option<ChannelConnection>,
      DatabaseError | MissingPermission
    >;
  }
>()("peal-server/publishing/application/ChannelConnections") {
  /** No channel names the way in it came through. */
  static readonly none = Layer.succeed(
    ChannelConnections,
    ChannelConnections.of({ of: () => Effect.succeed(Option.none()) })
  );
}
