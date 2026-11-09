import { Effect, Option, Schema } from "effect";
import { HttpClientResponse } from "effect/http";

// TikTok's API v2 (open.tiktokapis.com), as the channels context signs in
// with it and publishing posts through it. Every answer but OAuth's carries
// an `error` object whose `code` is "ok" on success, whatever the HTTP
// status; `message` may quote what was sent, so it is never kept. TikTok's
// "API v2 Error Handling" and each endpoint's reference list the codes.

/** Where TikTok's API is, and its sign-in page. */
export interface TikTokHosts {
  /** The API's origin: open.tiktokapis.com, which also issues tokens. */
  readonly api: URL;
  /** The page the creator signs in and agrees on. */
  readonly authorization: URL;
}

export const tiktokHosts: TikTokHosts = {
  api: new URL("https://open.tiktokapis.com"),
  authorization: new URL("https://www.tiktok.com/v2/auth/authorize/"),
};

/** The error object of a v2 answer, read for its code only. */
export const TikTokErrorSchema = Schema.Struct({
  code: Schema.String,
});

/** A v2 answer's envelope: its data, and its error object. */
export const tiktokAnswer = <A, I>(data: Schema.Codec<A, I>) =>
  Schema.Struct({
    data: Schema.optionalKey(data),
    error: Schema.optionalKey(TikTokErrorSchema),
  });

const ErrorEnvelopeSchema = Schema.Struct({
  error: Schema.optionalKey(TikTokErrorSchema),
});

/**
 * The error code of an answer, "ok" included: none when the body says
 * nothing TikTok would, as a proxy's page.
 */
export const tiktokErrorCodeOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<Option.Option<string>> =>
  HttpClientResponse.schemaBodyJson(ErrorEnvelopeSchema)(response).pipe(
    Effect.map(({ error }) => Option.fromUndefinedOr(error?.code)),
    Effect.orElseSucceed(() => Option.none<string>())
  );

/** The codes that say the access token is no good, before anything else. */
export const tokenRefusalCodes: ReadonlySet<string> = new Set([
  "access_token_invalid",
]);

/**
 * The codes that say the token lacks a scope the call needs: the creator
 * did not grant it, and only reconnecting can.
 */
export const scopeRefusalCodes: ReadonlySet<string> = new Set([
  "scope_not_authorized",
  "scope_permission_missed",
]);
