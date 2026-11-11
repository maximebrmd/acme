import { Context, Effect, Layer, Option } from "effect";

import type { ChannelId } from "#shared/domain/ids.ts";

/**
 * What a channel's account allowed Peal to do, in its platform's own words
 * (its OAuth scopes), as the channels context stored them when it was last
 * connected or renewed. None when the channel cannot post now, or the
 * scopes cannot be read: what needs one is then let through, and its
 * adapter finds out.
 */
export class ChannelGrants extends Context.Service<
  ChannelGrants,
  {
    readonly scopesOf: (
      channelId: ChannelId
    ) => Effect.Effect<Option.Option<readonly string[]>>;
  }
>()("peal-server/publishing/application/ChannelGrants") {
  /** No channel's scopes are known. */
  static readonly none = Layer.succeed(
    ChannelGrants,
    ChannelGrants.of({ scopesOf: () => Effect.succeed(Option.none()) })
  );

  /** Every channel granted `scopes`. */
  static readonly granting = (scopes: readonly string[]) =>
    Layer.succeed(
      ChannelGrants,
      ChannelGrants.of({ scopesOf: () => Effect.succeed(Option.some(scopes)) })
    );
}
