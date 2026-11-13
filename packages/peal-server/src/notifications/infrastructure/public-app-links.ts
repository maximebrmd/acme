import { Effect, Layer } from "effect";

import { AppLinks } from "#notifications/application/app-links.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";

/**
 * Links to the web app at PUBLIC_URL. English pages have no prefix, and
 * French ones are under /fr, as the web app routes them.
 */
export const PublicAppLinks = Layer.effect(
  AppLinks,
  Effect.gen(function* PublicAppLinks() {
    const publicUrl = yield* publicUrlConfig;

    return AppLinks.of({
      // The web app forwards `/api/*` to the server, so both share it.
      api: (path) => new URL(path, publicUrl).href,
      url: (path, locale) =>
        new URL(locale === "en" ? path : `/${locale}${path}`, publicUrl).href,
    });
  })
);
