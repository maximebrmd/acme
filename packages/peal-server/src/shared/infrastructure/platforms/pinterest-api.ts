import { Config, Effect, Option, Schema } from "effect";
import { HttpClientResponse } from "effect/http";

// Pinterest's REST API v5, as the channels context signs in with it,
// publishing creates Pins through it and analytics reads their counts.
// Every refusal is a JSON object with a numeric `code` and a `message`
// (the API description's `Error`); the message may quote what was sent, so
// it is never kept. Pinterest documents one code by number, 2, for a token
// that is expired or invalid (401): everything else is read from the HTTP
// status.

/** Where Pinterest's API is, and its sign-in page. */
export interface PinterestHosts {
  /** The API's origin, which also issues and renews tokens. */
  readonly api: URL;
  /** The page the account's owner signs in and agrees on. */
  readonly authorization: URL;
}

/** Pinterest as people use it. */
export const pinterestHosts: PinterestHosts = {
  api: new URL("https://api.pinterest.com"),
  authorization: new URL("https://www.pinterest.com/oauth/"),
};

/**
 * Pinterest's Sandbox: the same API on a host of its own, whose boards and
 * Pins only their creator sees. Its tokens come from the Sandbox's token
 * endpoint and work nowhere else; people sign in on the same page.
 */
export const pinterestSandboxHosts: PinterestHosts = {
  api: new URL("https://api-sandbox.pinterest.com"),
  authorization: pinterestHosts.authorization,
};

/**
 * Reads `PINTEREST_SANDBOX`: true sends every Pinterest call to the
 * Sandbox, where an app with Trial access creates Pins that only their
 * creator sees. False when unset: an app with Standard access.
 */
export const pinterestHostsConfig = Config.Boolean("PINTEREST_SANDBOX").pipe(
  Config.withDefault(false),
  Config.map((sandbox) => (sandbox ? pinterestSandboxHosts : pinterestHosts))
);

/** Pinterest's code for an access token that is expired or invalid. */
export const pinterestTokenRefusalCode = 2;

const PinterestErrorSchema = Schema.Struct({
  code: Schema.Number,
  message: Schema.optionalKey(Schema.String),
});

/**
 * The code of a refusal: none when the body says nothing Pinterest would,
 * as a proxy's page.
 */
export const pinterestErrorCodeOf = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<Option.Option<number>> =>
  HttpClientResponse.schemaBodyJson(PinterestErrorSchema)(response).pipe(
    Effect.map(({ code }) => Option.some(code)),
    Effect.orElseSucceed(() => Option.none<number>())
  );
