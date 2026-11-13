import { Effect, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";

// LinkedIn's versioned REST API, as every context that calls it does
// (publishing, analytics, engagement).

/**
 * A call to LinkedIn's versioned REST API with the channel's token: every
 * one names the API version (`Linkedin-Version`, without which LinkedIn
 * answers 400, and 426 once the version is retired) and Rest.li 2.0.
 */
export const restCall =
  (version: string) =>
  (
    request: HttpClientRequest.HttpClientRequest,
    token: Redacted.Redacted
  ): HttpClientRequest.HttpClientRequest =>
    request.pipe(
      HttpClientRequest.bearerToken(token),
      HttpClientRequest.setHeaders({
        "Linkedin-Version": version,
        "X-Restli-Protocol-Version": "2.0.0",
      })
    );

/**
 * A URN as Rest.li 2.0 takes one in a path or as a query value: its colons
 * percent-encoded, as every character outside the unreserved set, the
 * parentheses and commas of a composite URN (a comment's,
 * `urn:li:comment:(<thread>,<id>)`) included.
 */
export const encodedUrn = (urn: string): string =>
  encodeURIComponent(urn).replaceAll("(", "%28").replaceAll(")", "%29");

/** Whether the account is a company page: its id is the page's URN. */
export const isOrganization = (accountId: string): boolean =>
  accountId.startsWith("urn:li:organization:");

// LinkedIn's errors are JSON that repeats the HTTP status.
const LinkedInErrorSchema = Schema.Struct({ status: Schema.Number });

/**
 * Whether a refusal is LinkedIn's own word, not the page of a server on
 * the way, which says nothing of the token.
 */
export const isLinkedInError = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<boolean> =>
  HttpClientResponse.schemaBodyJson(LinkedInErrorSchema)(response).pipe(
    Effect.map(({ status }) => status === response.status),
    Effect.orElseSucceed(() => false)
  );
