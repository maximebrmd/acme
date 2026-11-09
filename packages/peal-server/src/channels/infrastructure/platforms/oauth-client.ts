import { Config, Effect, Option, Redacted } from "effect";

import type { Platform } from "#channels/domain/platform.ts";
import { InvalidPlatformClient } from "#channels/infrastructure/invalid-platform-client.ts";

/**
 * The OAuth client an operator registered for Acme on a platform: its id,
 * which the platform shows in its sign-in page's address, and its secret,
 * which only the server sends.
 */
export interface OAuthClient {
  readonly clientId: string;
  readonly clientSecret: Redacted.Redacted;
}

const nonBlank = Config.map(
  Option.filter((value: string) => value.trim() !== "")
);

const nonBlankSecret = Config.map(
  Option.filter(
    (value: Redacted.Redacted) => Redacted.value(value).trim() !== ""
  )
);

/**
 * Reads a platform's client from `<prefix>_CLIENT_ID` (or the name the
 * platform gives its id, as TikTok's `CLIENT_KEY`) and
 * `<prefix>_CLIENT_SECRET`, the secret as Config.Redacted. Both unset or
 * blank: none, and the platform is not offered. One without the other stops
 * the server at startup.
 */
export const oauthClientConfig = (
  platform: Platform,
  prefix: string,
  idSuffix = "CLIENT_ID"
) =>
  Effect.gen(function* readClient() {
    const idName = `${prefix}_${idSuffix}`;
    const secretName = `${prefix}_CLIENT_SECRET`;

    const clientId = yield* Config.option(Config.String(idName)).pipe(nonBlank);

    const clientSecret = yield* Config.option(Config.Redacted(secretName)).pipe(
      nonBlankSecret
    );

    if (Option.isSome(clientId) && Option.isSome(clientSecret)) {
      return Option.some<OAuthClient>({
        clientId: clientId.value.trim(),
        clientSecret: clientSecret.value,
      });
    }

    if (Option.isNone(clientId) && Option.isNone(clientSecret)) {
      return Option.none<OAuthClient>();
    }

    return yield* new InvalidPlatformClient({
      platform,
      reason: Option.isSome(clientId)
        ? `${idName} is set without ${secretName}`
        : `${secretName} is set without ${idName}`,
    });
  });
