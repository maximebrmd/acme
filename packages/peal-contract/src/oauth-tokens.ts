import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

// The device authorization grant (RFC 8628), token renewal and revocation,
// in the field names the RFCs give.

/** RFC 8628 §3.1: a device authorization request. */
export const DeviceAuthorizationRequestSchema = Schema.Struct({
  client_id: Schema.String,
  resource: Schema.optionalKey(Schema.String),
  scope: Schema.optionalKey(Schema.String),
}).annotate({ identifier: "DeviceAuthorizationRequest" });

/** RFC 8628 §3.2: the codes the user and the device use. */
export const DeviceAuthorizationSchema = Schema.Struct({
  device_code: Schema.String,
  expires_in: Schema.Number,
  // Seconds to wait between two token requests.
  interval: Schema.optional(Schema.Number),
  user_code: Schema.String,
  verification_uri: Schema.String,
  verification_uri_complete: Schema.optional(Schema.String),
}).annotate({ identifier: "DeviceAuthorization" });

export type DeviceAuthorization = typeof DeviceAuthorizationSchema.Type;

export const deviceCodeGrantType =
  "urn:ietf:params:oauth:grant-type:device_code";

/**
 * A token request: for the device code once the user approved it (RFC 8628
 * §3.4), or to renew tokens (RFC 6749 §6).
 */
export const TokenRequestSchema = Schema.Struct({
  client_id: Schema.String,
  device_code: Schema.optionalKey(Schema.String),
  grant_type: Schema.Literals([deviceCodeGrantType, "refresh_token"]),
  refresh_token: Schema.optionalKey(Schema.String),
  resource: Schema.optionalKey(Schema.String),
}).annotate({ identifier: "TokenRequest" });

export type TokenRequest = typeof TokenRequestSchema.Type;

/** RFC 6749 §5.1: the tokens issued. */
export const TokenSchema = Schema.Struct({
  access_token: Schema.String,
  // Seconds the access token lasts.
  expires_in: Schema.Number,
  refresh_token: Schema.optional(Schema.String),
  scope: Schema.optional(Schema.String),
  token_type: Schema.String,
}).annotate({ identifier: "Token" });

export type Token = typeof TokenSchema.Type;

/** RFC 7009: revokes a token. */
export const RevocationRequestSchema = Schema.Struct({
  client_id: Schema.String,
  token: Schema.String,
  token_type_hint: Schema.optionalKey(
    Schema.Literals(["access_token", "refresh_token"])
  ),
}).annotate({ identifier: "RevocationRequest" });

const oauthErrorFields = {
  // RFC 6749 §5.2 and RFC 8628 §3.5: authorization_pending, slow_down,
  // access_denied, expired_token, invalid_grant, invalid_client…
  error: Schema.String,
  error_description: Schema.optional(Schema.String),
};

/** An OAuth error the request caused (RFC 6749 §5.2). */
export const OAuthErrorSchema = Schema.Struct(oauthErrorFields)
  .annotate({ identifier: "OAuthError" })
  .pipe(HttpApiSchema.status(400));

export type OAuthError = typeof OAuthErrorSchema.Type;

/** An OAuth error about the client itself (RFC 6749 §5.2, invalid_client). */
export const OAuthClientErrorSchema = Schema.Struct(oauthErrorFields)
  .annotate({ identifier: "OAuthClientError" })
  .pipe(HttpApiSchema.status(401));

/** The device authorization grant, and the tokens it issues. */
export class OAuthTokensApi extends HttpApiGroup.make("tokens").add(
  HttpApiEndpoint.post("deviceAuthorization", "/api/auth/device/code", {
    error: [OAuthErrorSchema, OAuthClientErrorSchema],
    payload: DeviceAuthorizationRequestSchema.pipe(
      HttpApiSchema.asFormUrlEncoded()
    ),
    success: DeviceAuthorizationSchema,
  }).annotateMerge(
    OpenApi.annotations({ summary: "Start a device authorization" })
  ),
  HttpApiEndpoint.post("token", "/api/auth/oauth2/token", {
    error: [OAuthErrorSchema, OAuthClientErrorSchema],
    payload: TokenRequestSchema.pipe(HttpApiSchema.asFormUrlEncoded()),
    success: TokenSchema,
  }).annotateMerge(OpenApi.annotations({ summary: "Issue tokens" })),
  HttpApiEndpoint.post("revoke", "/api/auth/oauth2/revoke", {
    error: [OAuthErrorSchema, OAuthClientErrorSchema],
    payload: RevocationRequestSchema.pipe(HttpApiSchema.asFormUrlEncoded()),
    // RFC 7009 §2.2: an empty 200, revoked or not.
    success: HttpApiSchema.Empty(200),
  }).annotateMerge(OpenApi.annotations({ summary: "Revoke a token" }))
) {}
