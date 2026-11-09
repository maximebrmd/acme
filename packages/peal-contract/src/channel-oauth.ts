import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/http-api";

import { OAuthClientNotPublished } from "./oauth-client-not-published.ts";

/**
 * Peal's Bluesky OAuth client, as the AT Protocol asks a confidential client
 * to publish it: its `client_id` is this document's own URL, and
 * authorization servers fetch it to learn the redirect URI, the scopes and
 * where the client's public keys are.
 */
export const BlueskyClientMetadataSchema = Schema.Struct({
  application_type: Schema.Literal("web"),
  client_id: Schema.String,
  client_name: Schema.String,
  client_uri: Schema.String,
  dpop_bound_access_tokens: Schema.Boolean,
  grant_types: Schema.Array(Schema.String),
  jwks_uri: Schema.String,
  redirect_uris: Schema.Array(Schema.String),
  response_types: Schema.Array(Schema.String),
  scope: Schema.String,
  token_endpoint_auth_method: Schema.Literal("private_key_jwt"),
  token_endpoint_auth_signing_alg: Schema.String,
}).annotate({ identifier: "BlueskyClientMetadata" });

export type BlueskyClientMetadata = typeof BlueskyClientMetadataSchema.Type;

/** One public key of the client, as a JSON Web Key. */
export const PublicJwkSchema = Schema.Struct({
  alg: Schema.optionalKey(Schema.String),
  crv: Schema.String,
  kid: Schema.String,
  kty: Schema.String,
  use: Schema.optionalKey(Schema.String),
  x: Schema.String,
  y: Schema.String,
}).annotate({ identifier: "PublicJwk" });

export type PublicJwk = typeof PublicJwkSchema.Type;

/** The public keys the client signs its token requests with. */
export const JwksSchema = Schema.Struct({
  keys: Schema.Array(PublicJwkSchema),
}).annotate({ identifier: "Jwks" });

export type Jwks = typeof JwksSchema.Type;

/**
 * Documents the platforms fetch to identify Peal as an OAuth client. Public,
 * like any client metadata: they hold no secret.
 */
export class ChannelOAuthApi extends HttpApiGroup.make("channelOAuth")
  .add(
    HttpApiEndpoint.get(
      "blueskyClientMetadata",
      "/bluesky/client-metadata.json",
      { error: OAuthClientNotPublished, success: BlueskyClientMetadataSchema }
    ).annotateMerge(
      OpenApi.annotations({
        description:
          "Peal's Bluesky OAuth client metadata, which Bluesky's authorization servers fetch at the client id. Answers 404 on a server without Bluesky client keys.",
        summary: "Get the Bluesky client metadata",
      })
    ),
    HttpApiEndpoint.get("blueskyJwks", "/bluesky/jwks.json", {
      error: OAuthClientNotPublished,
      success: JwksSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "The public keys of Peal's Bluesky OAuth client, which signs its token requests with the matching private keys. Answers 404 on a server without Bluesky client keys.",
        summary: "Get the Bluesky client keys",
      })
    )
  )
  .prefix("/api/channels/oauth") {}
