import { Config, Effect, Layer, Option, Schema } from "effect";
import { Mac, SecureRandom } from "effect/crypto";

import { AdNetworks } from "#ads/application/ports/ad-network.ts";
import type { AdNetworkClient } from "#ads/application/ports/ad-network.ts";
import type { AdNetwork } from "#ads/domain/ad-network.ts";
import { AdsModeSchema } from "#ads/domain/ads-mode.ts";
import type { AdsMode } from "#ads/domain/ads-mode.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";
import { metaAppConfig } from "#shared/infrastructure/platforms/meta-apps.ts";
import { metaHosts } from "#shared/infrastructure/platforms/meta-graph.ts";
import { publicHttpClient } from "#shared/infrastructure/platforms/public-http.ts";

import { InvalidAdsSettings } from "./invalid-ads-settings.ts";
import { metaAdsClient } from "./meta/meta-ads-client.ts";

const decodeMode = Schema.decodeUnknownOption(AdsModeSchema);

/**
 * What the operator set of ads (`PEAL_ADS`): `off` when unset or blank, so
 * a server offers ads only once its operator says so. Anything else than
 * `off`, `read` or `spend` stops the server.
 */
export const adsModeConfig = Effect.gen(function* adsModeConfig() {
  const written = yield* Config.option(Config.String("PEAL_ADS"));

  const value = written.pipe(
    Option.map((text) => text.trim()),
    Option.filter((text) => text !== "")
  );

  if (Option.isNone(value)) {
    return "off" satisfies AdsMode;
  }

  return yield* Option.match(decodeMode(value.value), {
    onNone: () =>
      Effect.fail(
        new InvalidAdsSettings({ reason: "PEAL_ADS is off, read or spend" })
      ),
    onSome: (mode) => Effect.succeed(mode),
  });
});

/** The networks' clients, as a server in `mode` offers them. */
export const adNetworksOf = (
  mode: AdsMode,
  clients: readonly AdNetworkClient[]
) =>
  AdNetworks.of({
    available: mode === "off" ? [] : clients.map(({ network }) => network),
    for: (network: AdNetwork) =>
      mode === "off"
        ? Option.none()
        : Option.fromUndefinedOr(
            clients.find((client) => client.network === network)
          ),
    mode,
  });

/**
 * The ad networks this server reaches, read from its settings when it
 * starts: none while `PEAL_ADS` is off. Meta's ads run on Meta's main app
 * (`META_APP_ID`, `META_APP_SECRET`), the one Facebook Pages connect with,
 * so its data deletion and deauthorization callbacks cover the ads
 * sign-ins too; ads turned on without that app stop the server. Needs an
 * HttpClient and the OutboundGuard.
 */
export const AdNetworksLive = Layer.effect(
  AdNetworks,
  Effect.gen(function* AdNetworksLive() {
    const mode = yield* adsModeConfig;

    if (mode === "off") {
      return adNetworksOf(mode, []);
    }

    const app = yield* metaAppConfig;

    if (Option.isNone(app)) {
      return yield* new InvalidAdsSettings({
        reason: "PEAL_ADS needs META_APP_ID and META_APP_SECRET",
      });
    }

    const publicUrl = yield* publicUrlConfig;

    const meta = yield* metaAdsClient({
      app: app.value,
      hosts: metaHosts,
      http: yield* publicHttpClient,
      mode,
      publicUrl,
    });

    return adNetworksOf(mode, [meta]);
  })
).pipe(
  Layer.provide(
    Mac.layerWebCrypto.pipe(Layer.provide(SecureRandom.layerWebCrypto))
  )
);
