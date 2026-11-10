import { Effect, Layer } from "effect";

import { LinkAddresses } from "#review/application/ports/link-addresses.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";

/**
 * Review links at PUBLIC_URL: `/review#<token>`. The web app sends the page
 * in the reader's language.
 */
export const PublicLinkAddresses = Layer.effect(
  LinkAddresses,
  Effect.gen(function* PublicLinkAddresses() {
    const publicUrl = yield* publicUrlConfig;

    return LinkAddresses.of({
      of: (token) => {
        const address = new URL("/review", publicUrl);

        address.hash = token;

        return address.href;
      },
    });
  })
);
