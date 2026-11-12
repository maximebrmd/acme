import { Config, Effect, Layer, Option } from "effect";

import { isProduction } from "#shared/infrastructure/environment.ts";
import { ShortLinkBase } from "#shortlinks/application/short-link-base.ts";

import { InvalidShortLinkSettings } from "./invalid-short-link-settings.ts";

const invalid = new InvalidShortLinkSettings({
  reason:
    "PEAL_SHORT_LINK_BASE is an absolute https address ending in / (http outside production), without a query, a fragment, a user or a password",
});

/**
 * Where short links live (`PEAL_SHORT_LINK_BASE`), read when the server
 * starts: an absolute `https` address ending in `/` (`http` allowed
 * outside production), as `https://go.example.com/` behind a proxy that
 * sends `/<code>` to `/api/l/<code>`, or `PUBLIC_URL` followed by
 * `/api/l/`. Unset or blank, the feature is off; anything else stops the
 * server.
 */
export const shortLinkBaseConfig = Effect.gen(function* shortLinkBaseConfig() {
  const written = yield* Config.option(Config.String("PEAL_SHORT_LINK_BASE"));
  const production = yield* isProduction;

  const value = written.pipe(
    Option.map((text) => text.trim()),
    Option.filter((text) => text !== "")
  );

  if (Option.isNone(value)) {
    return Option.none<URL>();
  }

  const url = URL.parse(value.value);

  const allowed =
    url !== null &&
    (url.protocol === "https:" || (!production && url.protocol === "http:")) &&
    url.href === value.value &&
    url.href.endsWith("/") &&
    url.search === "" &&
    url.hash === "" &&
    url.username === "" &&
    url.password === "";

  return allowed ? Option.some(url) : yield* invalid;
});

/** ShortLinkBase from `PEAL_SHORT_LINK_BASE`, read when the server starts. */
export const ShortLinkBaseLive = Layer.effect(
  ShortLinkBase,
  shortLinkBaseConfig.pipe(Effect.map((base) => ShortLinkBase.of({ base })))
);
