import { Context } from "effect";
import type { Effect, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { SitePlatform } from "#shared/domain/platform.ts";

/** A website's channel, as an article names it. */
export interface SiteChannel {
  readonly channelId: ChannelId;
  readonly platform: SitePlatform;
}

/**
 * The websites an article may go to: the channels of a site's platform
 * connected to the actor's workspace, as the channels context lists them.
 */
export class SiteChannels extends Context.Service<
  SiteChannels,
  {
    readonly lookUp: (
      actor: Actor,
      channelId: ChannelId
    ) => Effect.Effect<
      Option.Option<SiteChannel>,
      DatabaseError | MissingPermission
    >;
  }
>()("peal-server/publishing/application/SiteChannels") {}
