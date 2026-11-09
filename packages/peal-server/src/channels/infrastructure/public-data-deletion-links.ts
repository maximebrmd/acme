import { Effect, Layer } from "effect";

import { DataDeletionLinks } from "#channels/application/data-deletion-links.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";

/** The status page of the web app at PUBLIC_URL, read at startup. */
export const PublicDataDeletionLinks = Layer.effect(
  DataDeletionLinks,
  Effect.gen(function* PublicDataDeletionLinks() {
    const origin = yield* publicUrlConfig;

    return DataDeletionLinks.of({
      statusUrl: (code) =>
        new URL(`/data-deletion/${encodeURIComponent(code)}`, origin).href,
    });
  })
);
