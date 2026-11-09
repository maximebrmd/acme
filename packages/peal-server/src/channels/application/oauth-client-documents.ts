import { Context } from "effect";
import type { Option } from "effect";

/** Peal's Bluesky OAuth client, as it publishes itself. */
export interface BlueskyClientMetadata {
  readonly application_type: "web";
  readonly client_id: string;
  readonly client_name: string;
  readonly client_uri: string;
  readonly dpop_bound_access_tokens: boolean;
  readonly grant_types: readonly string[];
  readonly jwks_uri: string;
  readonly redirect_uris: readonly string[];
  readonly response_types: readonly string[];
  readonly scope: string;
  readonly token_endpoint_auth_method: "private_key_jwt";
  readonly token_endpoint_auth_signing_alg: string;
}

/** One of the client's public keys, as a JSON Web Key. */
export interface PublicJwk {
  readonly alg?: string;
  readonly crv: string;
  readonly kid: string;
  readonly kty: string;
  readonly use?: string;
  readonly x: string;
  readonly y: string;
}

/**
 * The documents platforms fetch to identify Peal's OAuth clients. None when
 * this server runs a client that publishes nothing, as Bluesky's development
 * client, or none at all.
 */
export class OAuthClientDocuments extends Context.Service<
  OAuthClientDocuments,
  {
    readonly bluesky: Option.Option<{
      readonly jwks: { readonly keys: readonly PublicJwk[] };
      readonly metadata: BlueskyClientMetadata;
    }>;
  }
>()("peal-server/channels/application/OAuthClientDocuments") {}
