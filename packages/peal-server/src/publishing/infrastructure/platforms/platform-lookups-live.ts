import { Effect, Layer, Option } from "effect";
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
import { linkedinVersionConfig } from "#shared/infrastructure/platforms/linkedin-version.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";

import { linkedinLookups } from "./linkedin/linkedin-lookups.ts";
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
  /** LinkedIn's API origin. */
  readonly linkedinApi: URL;
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

      const linkedin = linkedinLookups({
        api,
        apiUrl: settings.linkedinApi,
        version: yield* linkedinVersionConfig,
      });

      const adapters: Adapters = {
        linkedinOrganizations: (channelId, query) =>
          credentials.withToken(channelId, (token) =>
            linkedin.organizations(query, token)
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
        run: (channelId, query) => {
          if (query._tag === "youtubeVideoCategories") {
            return adapters.youtubeVideoCategories(channelId, query);
          }

          if (query._tag === "linkedinOrganizations") {
            return adapters.linkedinOrganizations(channelId, query);
          }

          return query._tag === "youtubePlaylists"
            ? adapters.youtubePlaylists(channelId, query)
            : adapters.tiktokCreator(channelId, query);
        },
      });
    })
  );

/**
 * The lookups as production reaches them. Needs PlatformCredentials,
 * TikTokCreators and Dns.
 */
export const PlatformLookupsLive = platformLookupsWith({
  linkedinApi: new URL("https://api.linkedin.com"),
  youtubeApi: new URL("https://www.googleapis.com"),
}).pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer)
);
