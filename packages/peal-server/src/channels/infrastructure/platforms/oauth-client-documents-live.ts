import { Effect, Layer, Option, Schema } from "effect";

import { OAuthClientDocuments } from "#channels/application/oauth-client-documents.ts";
import type { PublicJwk } from "#channels/application/oauth-client-documents.ts";

import { blueskyPaths, blueskyScope } from "./bluesky/bluesky-client.ts";
import { ChannelPlatforms } from "./channel-platform-settings.ts";

const PublicJwkSchema = Schema.Struct({
  alg: Schema.optionalKey(Schema.String),
  crv: Schema.String,
  kid: Schema.String,
  kty: Schema.String,
  use: Schema.optionalKey(Schema.String),
  x: Schema.String,
  y: Schema.String,
});

const decodePublicJwk = Schema.decodeUnknownEffect(PublicJwkSchema);

/**
 * The client documents of the confidential Bluesky client, when this server
 * runs one: its metadata at the client id, and its keys' public halves.
 */
export const OAuthClientDocumentsLive = Layer.effect(
  OAuthClientDocuments,
  Effect.gen(function* OAuthClientDocumentsLive() {
    const { bluesky } = yield* ChannelPlatforms;

    if (Option.isNone(bluesky) || bluesky.value.mode._tag !== "confidential") {
      return OAuthClientDocuments.of({ bluesky: Option.none() });
    }

    const { mode, publicUrl } = bluesky.value;
    const scope = bluesky.value.scope ?? blueskyScope;

    // The keys were parsed at startup: one without a public half is a bug.
    // The library leaves unset members as undefined, which JSON drops.
    const keys: readonly PublicJwk[] = yield* Effect.orDie(
      Effect.all(
        mode.keys.map((key) =>
          decodePublicJwk(
            Object.fromEntries(
              Object.entries(key.publicJwk ?? {}).filter(
                ([, value]) => value !== undefined
              )
            )
          )
        )
      )
    );

    return OAuthClientDocuments.of({
      bluesky: Option.some({
        jwks: { keys },
        metadata: {
          application_type: "web",
          client_id: new URL(blueskyPaths.metadata, publicUrl).href,
          client_name: "Peal",
          client_uri: publicUrl,
          dpop_bound_access_tokens: true,
          grant_types: ["authorization_code", "refresh_token"],
          jwks_uri: new URL(blueskyPaths.jwks, publicUrl).href,
          redirect_uris: [new URL(blueskyPaths.callback, publicUrl).href],
          response_types: ["code"],
          scope,
          token_endpoint_auth_method: "private_key_jwt",
          token_endpoint_auth_signing_alg: "ES256",
        },
      }),
    });
  })
);
