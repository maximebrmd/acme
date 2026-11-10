import { Effect, Layer, Option, Redacted } from "effect";

import { ConnectLinkAddresses } from "#channels/application/connect-link-addresses.ts";
import { defaultLocale } from "#shared/domain/locale.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";

/**
 * The hosted pages of the web app at PUBLIC_URL, read at startup: English
 * without a prefix, any other language under its own, as the web app
 * routes them. A link without a language opens in the visitor's.
 */
export const PublicConnectLinkAddresses = Layer.effect(
  ConnectLinkAddresses,
  Effect.gen(function* PublicConnectLinkAddresses() {
    const origin = yield* publicUrlConfig;

    return ConnectLinkAddresses.of({
      pageOf: (token, locale) => {
        const prefix = Option.match(locale, {
          onNone: () => "",
          onSome: (chosen) => (chosen === defaultLocale ? "" : `/${chosen}`),
        });

        // After the #: a browser keeps a fragment to itself, so the token
        // reaches no server's log, no proxy and no other site's Referer.
        return new URL(
          `${prefix}/connect/link#${encodeURIComponent(Redacted.value(token))}`,
          origin
        ).href;
      },
      secure: new URL(origin).protocol === "https:",
    });
  })
);
