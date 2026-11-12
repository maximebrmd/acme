import { Config, Effect, Layer, Option, Schema } from "effect";

import { CurrentInboxPlatforms } from "#shared/application/current-inbox-platforms.ts";
import { OptionalInboxPlatformSchema } from "#shared/domain/inbox-platform.ts";
import type {
  InboxPlatforms,
  OptionalInboxPlatform,
} from "#shared/domain/inbox-platform.ts";

import { InvalidInboxSettings } from "./invalid-inbox-settings.ts";
import { instagramAppConfig, metaAppConfig } from "./platforms/meta-apps.ts";

const decodePlatform = Schema.decodeUnknownOption(OptionalInboxPlatformSchema);

// The names the setting takes, as a sentence: "a, b and c".
const takenNames = (() => {
  const names = [...OptionalInboxPlatformSchema.literals];
  const last = names.pop();

  return names.length === 0
    ? String(last)
    : `${names.join(", ")} and ${String(last)}`;
})();

const nonBlank = (name: string) =>
  Config.option(Config.String(name)).pipe(
    Config.map(Option.filter((value) => value.trim() !== ""))
  );

// Whether YouTube's OAuth client is set, its secret with it: the channels
// context reads it (`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`), and
// refuses one without the other.
const youtubeClientSet = Effect.gen(function* youtubeClient() {
  const id = yield* nonBlank("YOUTUBE_CLIENT_ID");
  const secret = yield* nonBlank("YOUTUBE_CLIENT_SECRET");

  return Option.isSome(id) && Option.isSome(secret);
});

/**
 * `PEAL_INBOX_PLATFORMS`: the optional platforms the inbox reads comments
 * on, comma-separated among `facebook`, `instagram` and `youtube`; none
 * when unset or blank. Any other name stops the server, as does a
 * platform without the app it signs in with: Facebook Pages need Meta's
 * main app (`META_APP_ID`, `META_APP_SECRET`), Instagram either of its
 * ways in (Meta's main app, or `INSTAGRAM_APP_ID` and
 * `INSTAGRAM_APP_SECRET`), YouTube its OAuth client (`YOUTUBE_CLIENT_ID`,
 * `YOUTUBE_CLIENT_SECRET`).
 */
export const inboxPlatformsConfig = Effect.gen(function* inboxPlatforms() {
  const written = yield* Config.option(Config.String("PEAL_INBOX_PLATFORMS"));

  const names = Option.getOrElse(written, () => "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");

  const platforms = new Set<OptionalInboxPlatform>();

  for (const name of names) {
    const platform = decodePlatform(name);

    if (Option.isNone(platform)) {
      return yield* new InvalidInboxSettings({
        reason: `PEAL_INBOX_PLATFORMS takes ${takenNames} only`,
      });
    }

    platforms.add(platform.value);
  }

  const meta = yield* metaAppConfig;

  if (platforms.has("facebook") && Option.isNone(meta)) {
    return yield* new InvalidInboxSettings({
      reason:
        "facebook in PEAL_INBOX_PLATFORMS needs META_APP_ID and META_APP_SECRET",
    });
  }

  if (
    platforms.has("instagram") &&
    Option.isNone(meta) &&
    Option.isNone(yield* instagramAppConfig)
  ) {
    return yield* new InvalidInboxSettings({
      reason:
        "instagram in PEAL_INBOX_PLATFORMS needs META_APP_ID and META_APP_SECRET, or INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET",
    });
  }

  if (platforms.has("youtube") && !(yield* youtubeClientSet)) {
    return yield* new InvalidInboxSettings({
      reason:
        "youtube in PEAL_INBOX_PLATFORMS needs YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET",
    });
  }

  const read: InboxPlatforms = platforms;

  return read;
});

/** The optional platforms the inbox reads, as the operator set them. */
export const InboxPlatformsLive = Layer.effect(
  CurrentInboxPlatforms,
  inboxPlatformsConfig
);
