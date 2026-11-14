import { Effect, Layer, Option } from "effect";

import { ListChannels } from "#channels/application/list-channels.ts";
import { SiteChannels } from "#publishing/application/site-channels.ts";
import type { SiteChannel } from "#publishing/application/site-channels.ts";
import { isSitePlatform } from "#shared/domain/platform.ts";

/**
 * The workspace's websites as the channels context lists them for the
 * actor: a channel of a site's platform, connected to the workspace.
 */
export const ListedSiteChannels = Layer.effect(
  SiteChannels,
  Effect.gen(function* ListedSiteChannels() {
    const listChannels = yield* ListChannels;

    return SiteChannels.of({
      lookUp: (actor, channelId) =>
        listChannels
          .list(actor)
          .pipe(
            Effect.map((channels) =>
              Option.fromUndefinedOr(
                channels.find(({ id }) => id === channelId)
              ).pipe(
                Option.flatMap(({ id, platform }) =>
                  isSitePlatform(platform)
                    ? Option.some<SiteChannel>({ channelId: id, platform })
                    : Option.none()
                )
              )
            )
          ),
    });
  })
);
