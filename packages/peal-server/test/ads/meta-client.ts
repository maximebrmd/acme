import { Effect, Layer, Redacted } from "effect";
import { Mac, SecureRandom } from "effect/crypto";
import { FetchHttpClient } from "effect/http";

import type { AdsMode } from "#ads/domain/ads-mode.ts";
import { metaAdsClient } from "#ads/infrastructure/meta/meta-ads-client.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";
import { OpenOutboundGuard } from "#test/channels/support.ts";

import {
  adsApp,
  adsToken,
  fakeMarketingApi,
} from "./fakes/fake-marketing-api.ts";
import type { FakeMarketingOptions } from "./fakes/fake-marketing-api.ts";

const HttpTest = Layer.mergeAll(FetchHttpClient.layer, OpenOutboundGuard);

/** The token the fake accepts, as the adapter is handed one. */
export const token = Redacted.make(adsToken);

/**
 * The Marketing API adapter against the fake on loopback, as a server in
 * `mode` builds it.
 */
export const metaAgainstFake = Effect.fn("test.metaAgainstFake")(
  function* metaAgainstFake(
    options: FakeMarketingOptions = {},
    mode: AdsMode = "spend"
  ) {
    const api = yield* fakeMarketingApi(options);

    const client = yield* metaAdsClient({
      app: adsApp,
      hosts: api.hosts,
      http: yield* publicHttpClient.pipe(Effect.provide(HttpTest)),
      mode,
      publicUrl: "https://peal.example",
    }).pipe(
      Effect.provide(
        Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
      )
    );

    return { api, client };
  }
);
