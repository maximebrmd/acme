import type { Redacted } from "effect";
import { HttpClientRequest } from "effect/http";

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
 * percent-encoded, as every character outside the unreserved set.
 */
export const encodedUrn = (urn: string): string => encodeURIComponent(urn);

/** Whether the account is a company page: its id is the page's URN. */
export const isOrganization = (accountId: string): boolean =>
  accountId.startsWith("urn:li:organization:");

/**
 * The URN a channel's posts and uploads are by: a page's own, which the
 * channels context keeps as the account's id, or the person URN a member's
 * OpenID Connect subject takes.
 */
export const authorUrnOf = (accountId: string): string =>
  isOrganization(accountId) ? accountId : `urn:li:person:${accountId}`;
