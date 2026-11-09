import { Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";

import { PlatformCredentials } from "#publishing/application/platform-credentials.ts";
import { TikTokCreators } from "#publishing/application/tiktok-creators.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { tiktokHosts } from "#shared/infrastructure/platforms/tiktok-api.ts";

import { queryCreator } from "./tiktok-creator-info.ts";
import { tiktokMediaUrlConfig } from "./tiktok-settings.ts";

/**
 * TikTokCreators on TikTok's creator info, with the channel's token from
 * PlatformCredentials, renewed once if TikTok refuses it. `pullFrom` is the
 * verified prefix photos are pulled from, if the server has one.
 */
export const tiktokCreatorsWith = (settings: {
  readonly apiUrl: URL;
  readonly pullFrom: Option.Option<URL>;
}) =>
  Layer.effect(
    TikTokCreators,
    Effect.gen(function* TikTokCreatorsLive() {
      const credentials = yield* PlatformCredentials;
      const api = yield* publicHttpClient;
      const readCreator = queryCreator({ api, apiUrl: settings.apiUrl });

      return TikTokCreators.of({
        read: (channelId) =>
          credentials.withToken(channelId, ({ accessToken }) =>
            readCreator(accessToken)
          ),
        takesPhotos: Option.isSome(settings.pullFrom),
      });
    })
  );

/**
 * TikTok's creators as production reaches them, with the verified prefix
 * read when the server starts. Needs PlatformCredentials and Dns.
 */
export const TikTokCreatorsLive = Layer.unwrap(
  tiktokMediaUrlConfig.pipe(
    Effect.map((pullFrom) =>
      tiktokCreatorsWith({ apiUrl: tiktokHosts.api, pullFrom })
    )
  )
).pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer)
);
