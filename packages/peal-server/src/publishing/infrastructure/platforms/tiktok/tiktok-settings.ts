import { Config, Effect, Option } from "effect";

import { InvalidTikTokSettings } from "./invalid-tiktok-settings.ts";

/**
 * Reads `TIKTOK_MEDIA_URL_PREFIX`: the URL prefix (or `https://` and a
 * domain, with a `/`) the operator verified for the app at TikTok, under
 * which the media store serves its files publicly
 * (`PEAL_MEDIA_PUBLIC_BASE_URL`). With it, TikTok pulls videos and photos
 * from the store; without it, videos go up in chunks and photo posts
 * cannot go out, as TikTok takes photos from verified addresses only.
 * Unset or blank: none. Anything but an HTTPS URL stops the server.
 */
export const tiktokMediaUrlConfig = Effect.gen(function* tiktokMediaUrl() {
  const raw = yield* Config.option(
    Config.String("TIKTOK_MEDIA_URL_PREFIX")
  ).pipe(Config.map(Option.filter((value) => value.trim() !== "")));

  if (Option.isNone(raw)) {
    return Option.none<URL>();
  }

  const parsed = URL.parse(raw.value.trim());

  if (parsed === null || parsed.protocol !== "https:") {
    return yield* new InvalidTikTokSettings({
      reason: "TIKTOK_MEDIA_URL_PREFIX is not an HTTPS URL",
    });
  }

  return Option.some(parsed);
});
