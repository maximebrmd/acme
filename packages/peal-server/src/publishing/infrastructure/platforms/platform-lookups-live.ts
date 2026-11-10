import { Effect, Layer, Match, Option } from "effect";
import { FetchHttpClient } from "effect/http";

import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import { PlatformLookups } from "#publishing/application/platform-lookups.ts";
import type { LookupFailure } from "#publishing/application/platform-lookups.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import type {
  LookupName,
  LookupQueryOf,
  LookupResultOf,
} from "#publishing/domain/lookup.ts";
import type { ChannelId } from "#shared/domain/ids.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { pinterestHostsConfig } from "#shared/infrastructure/platforms/pinterest-api.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";

import { pinterestLookups } from "./pinterest/pinterest-lookups.ts";
import { youtubeLookups } from "./youtube/youtube-lookups.ts";

/** One adapter per lookup: a name left out does not compile. */
type Adapters = {
  readonly [Name in LookupName]: (
    channelId: ChannelId,
    query: LookupQueryOf<Name>
  ) => Effect.Effect<LookupResultOf<Name>, LookupFailure>;
};

/**
 * PlatformLookups on the platforms' own APIs, through the public HTTP
 * client (the outbound guard, 20 seconds at most, answers cut off past
 * 1 MiB), with the channel's token from PlatformCredentials, renewed once
 * when the platform refuses it. A lookup is not sent through the channel's
 * gate: a member waits for it, and a gate may hold a long upload. A
 * platform added later adds its adapters to the registry below.
 */
export const platformLookupsWith = (settings: {
  /** Pinterest's API's origin. */
  readonly pinterestApi: URL;
  /** The YouTube Data API's origin. */
  readonly youtubeApi: URL;
}) =>
  Layer.effect(
    PlatformLookups,
    Effect.gen(function* PlatformLookupsLive() {
      const credentials = yield* PlatformCredentials;
      const creators = yield* TikTokCreators;
      const api = yield* publicHttpClient;
      const youtube = youtubeLookups({ api, apiUrl: settings.youtubeApi });

      const pinterest = pinterestLookups({
        api,
        apiUrl: settings.pinterestApi,
      });

      const adapters: Adapters = {
        pinterestBoardSections: (channelId, query) =>
          credentials.withToken(channelId, ({ accessToken }) =>
            pinterest.boardSections(query, accessToken)
          ),
        pinterestBoards: (channelId, query) =>
          credentials.withToken(channelId, ({ accessToken }) =>
            pinterest.boards(query, accessToken)
          ),
        tiktokCreator: (channelId) =>
          creators.read(channelId).pipe(
            Effect.map((posting) => ({
              _tag: "tiktokCreator" as const,
              items: [{ posting, takesPhotos: creators.takesPhotos }],
              nextCursor: Option.none(),
            }))
          ),
        youtubePlaylists: (channelId, query) =>
          credentials.withToken(channelId, ({ accessToken }) =>
            youtube.playlists(query, accessToken)
          ),
        youtubeVideoCategories: (channelId, query) =>
          credentials.withToken(channelId, ({ accessToken }) =>
            youtube.videoCategories(query, accessToken)
          ),
      };

      return PlatformLookups.of({
        run: (channelId, query) =>
          Match.valueTags(query, {
            pinterestBoardSections: (sections) =>
              adapters.pinterestBoardSections(channelId, sections),
            pinterestBoards: (boards) =>
              adapters.pinterestBoards(channelId, boards),
            tiktokCreator: (creator) =>
              adapters.tiktokCreator(channelId, creator),
            youtubePlaylists: (playlists) =>
              adapters.youtubePlaylists(channelId, playlists),
            youtubeVideoCategories: (categories) =>
              adapters.youtubeVideoCategories(channelId, categories),
          }),
      });
    })
  );

/**
 * The lookups as production reaches them, Pinterest's on its Sandbox when
 * the server is set to it. Needs PlatformCredentials, TikTokCreators and
 * Dns.
 */
export const PlatformLookupsLive = Layer.unwrap(
  pinterestHostsConfig.pipe(
    Effect.map((pinterest) =>
      platformLookupsWith({
        pinterestApi: pinterest.api,
        youtubeApi: new URL("https://www.googleapis.com"),
      })
    )
  )
).pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer)
);
