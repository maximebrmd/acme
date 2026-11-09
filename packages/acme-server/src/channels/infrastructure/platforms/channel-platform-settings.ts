import { JoseKey } from "@atproto/oauth-client-node";
import {
  Config,
  Context,
  Effect,
  Layer,
  Option,
  Redacted,
  Result,
} from "effect";
import { Base64Url } from "effect/encoding";

import { InvalidBlueskySettings } from "#channels/infrastructure/invalid-bluesky-settings.ts";
import {
  isProduction,
  publicUrlConfig,
} from "#shared/infrastructure/environment.ts";

import type { BlueskyAuthorizerOptions } from "./bluesky/bluesky-authorizer.ts";
import type { BlueskyClientMode } from "./bluesky/bluesky-client.ts";
import { oauthClientConfig } from "./oauth-client.ts";
import type { OAuthClient } from "./oauth-client.ts";

/** How this server connects each platform. */
export interface ChannelPlatformSettings {
  /** None when this server cannot connect Bluesky accounts. */
  readonly bluesky: Option.Option<BlueskyAuthorizerOptions>;
  /** Acme's LinkedIn app, if the operator registered one. */
  readonly linkedin: Option.Option<OAuthClient>;
  /** The web app's origin, where the platforms send members back. */
  readonly publicUrl: string;
  /** Acme's X app, if the operator registered one. */
  readonly x: Option.Option<OAuthClient>;
}

export class ChannelPlatforms extends Context.Service<
  ChannelPlatforms,
  ChannelPlatformSettings
>()("acme-server/channels/infrastructure/ChannelPlatforms") {}

// The AT Protocol's public services, which a self-hosted server uses too.
const blueskyDefaults = {
  allowHttp: false,
  appViewUrl: "https://public.api.bsky.app",
  defaultService: "https://bsky.social",
  handleResolver: Option.none<string>(),
  plcDirectoryUrl: "https://plc.directory",
} as const;

const invalid = (reason: string) => new InvalidBlueskySettings({ reason });

const decoder = new TextDecoder();

const keyIdPattern = /^[\w-]{1,64}$/u;

// One "keyId:base64url(private JWK)" entry, as `scripts/bluesky-key.ts`
// prints it: an ES256 (P-256) key.
const parseKey = Effect.fnUntraced(function* parseKey(
  entry: string,
  position: number
) {
  const separator = entry.indexOf(":");
  const kid = entry.slice(0, Math.max(separator, 0)).trim();

  if (separator === -1 || !keyIdPattern.test(kid)) {
    return yield* invalid(`entry ${position} is not keyId:base64url(jwk)`);
  }

  const bytes = Base64Url.decode(entry.slice(separator + 1).trim());

  if (Result.isFailure(bytes)) {
    return yield* invalid(`key ${kid} is not base64url`);
  }

  const key = yield* Effect.tryPromise({
    catch: () => invalid(`key ${kid} is not a private JWK`),
    try: async () => await JoseKey.fromJWK(decoder.decode(bytes.success), kid),
  });

  if (!key.isPrivate || !key.algorithms.includes("ES256")) {
    return yield* invalid(`key ${kid} is not a private ES256 key`);
  }

  return key;
});

// A confidential client's metadata lives at its client id, which must be an
// HTTPS URL without a port.
const checkConfidentialUrl = (publicUrl: string) => {
  const url = new URL(publicUrl);

  return url.protocol === "https:" && url.port === ""
    ? Effect.void
    : Effect.fail(
        invalid("PUBLIC_URL must be HTTPS without a port to use client keys")
      );
};

const loopbackHosts: ReadonlySet<string> = new Set(["localhost", "127.0.0.1"]);

// With keys, a confidential client; without, the development client on a
// local server outside production, and no client anywhere else.
const blueskyModeOf = Effect.fnUntraced(function* blueskyModeOf(settings: {
  readonly keys: Option.Option<Redacted.Redacted>;
  readonly production: boolean;
  readonly publicUrl: string;
}) {
  const { keys, production, publicUrl } = settings;

  if (Option.isSome(keys)) {
    yield* checkConfidentialUrl(publicUrl);

    const parsed = yield* Effect.all(
      Redacted.value(keys.value)
        .split(",")
        .map((entry, index) => parseKey(entry, index + 1))
    );

    return Option.some<BlueskyClientMode>({
      _tag: "confidential",
      keys: parsed,
    });
  }

  if (!production && loopbackHosts.has(new URL(publicUrl).hostname)) {
    return Option.some<BlueskyClientMode>({ _tag: "loopback" });
  }

  return Option.none<BlueskyClientMode>();
});

/**
 * Reads the platforms' settings from the environment:
 *
 * - `PUBLIC_URL`: the web app's origin.
 * - `BLUESKY_CLIENT_KEYS`: comma-separated `keyId:base64url(private JWK)`
 *   ES256 keys, from `bun nx run acme-server:bluesky-key`. With them, Acme
 *   runs a confidential Bluesky client, which needs PUBLIC_URL on HTTPS.
 *   Without them, a server on localhost runs the development client, and any
 *   other server cannot connect Bluesky.
 * - `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`, `X_CLIENT_ID` and
 *   `X_CLIENT_SECRET`: the apps the operator registered on LinkedIn and X.
 *   Without them, the platform is not offered; one half alone stops the
 *   server.
 */
export const channelPlatformsConfig = Effect.gen(function* settings() {
  const publicUrl = yield* publicUrlConfig;
  const production = yield* isProduction;

  const keys = yield* Config.option(
    Config.Redacted("BLUESKY_CLIENT_KEYS")
  ).pipe(
    Config.map(Option.filter((value) => Redacted.value(value).trim() !== ""))
  );

  const mode = yield* blueskyModeOf({ keys, production, publicUrl });
  const linkedin = yield* oauthClientConfig("linkedin", "LINKEDIN");
  const x = yield* oauthClientConfig("x", "X");

  const platforms: ChannelPlatformSettings = {
    bluesky: mode.pipe(
      Option.map((clientMode) => ({
        ...blueskyDefaults,
        mode: clientMode,
        publicUrl,
      }))
    ),
    linkedin,
    publicUrl,
    x,
  };

  return platforms;
});

/** The settings, read from the environment when the server starts. */
export const ChannelPlatformsLive = Layer.effect(
  ChannelPlatforms,
  channelPlatformsConfig
);
