import { DateTime, Effect, Option, Schema } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { LookupInputRejected } from "#publishing/application/lookup-input-rejected.ts";
import type { PublishingToken } from "#publishing/application/platform-credentials.ts";
import type { LookupFailure } from "#publishing/application/platform-lookups.ts";
import type {
  LookupQueryOf,
  LookupResultOf,
} from "#publishing/domain/lookup.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { RateLimited } from "#shared/domain/rate-limited.ts";
import { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { retryAfterOf } from "#shared/infrastructure/platforms/retry-after.ts";

import { isLinkedInError, restCall } from "./linkedin-rest.ts";

/** The HTTP client LinkedIn's lookups send through: the public one. */
export type LinkedInLookupHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export interface LinkedInLookupOptions {
  readonly api: LinkedInLookupHttp;
  /** The API's origin: `https://api.linkedin.com`. */
  readonly apiUrl: URL;
  /** The API version every call names. */
  readonly version: string;
}

type ReadFailure = LookupFailure | TokenRejected;

// What anyone may read of a page (the lookup's non-admin fields).
const OrganizationsSchema = Schema.Struct({
  elements: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        id: Schema.Int,
        localizedName: Schema.optionalKey(Schema.String),
        vanityName: Schema.optionalKey(Schema.String),
      })
    )
  ),
});

// LinkedIn's limits are daily, and reset at midnight UTC.
const rateLimited = (response: HttpClientResponse.HttpClientResponse) =>
  DateTime.now.pipe(
    Effect.flatMap((now) =>
      Effect.fail(
        new RateLimited({
          retryAfter: retryAfterOf(response.headers, now).pipe(
            Option.getOrElse(() =>
              DateTime.distance(
                now,
                now.pipe(DateTime.add({ days: 1 }), DateTime.startOf("day"))
              )
            )
          ),
        })
      )
    )
  );

// Only a token LinkedIn no longer knows (a 401 in LinkedIn's own error)
// asks to reconnect. A 403 is about what the app or the member may read,
// which reconnecting does not change, and a 401 that is not LinkedIn's
// came from a server on the way: neither must stop the channel's posts.
const refused = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, ReadFailure> =>
  isLinkedInError(response).pipe(
    Effect.flatMap((own): Effect.Effect<never, ReadFailure> => {
      if (response.status === 401 && own) {
        return Effect.fail(new TokenRejected());
      }

      if (response.status === 429) {
        return rateLimited(response);
      }

      if (response.status === 400) {
        return Effect.fail(new LookupInputRejected());
      }

      return Effect.logWarning("LinkedIn refused a lookup").pipe(
        Effect.annotateLogs({ status: response.status }),
        Effect.andThen(Effect.fail(new PlatformUnavailable()))
      );
    })
  );

/**
 * LinkedIn's lookups, on the versioned REST API:
 *
 * - `organizations`: the page whose address holds the vanity name
 *   (Organization Lookup's `q=vanityName`), for a mention: one call, which
 *   needs `rw_organization_admin`, so only a company page channel has it.
 *   A profile's token cannot read organizations: the lookup refuses its
 *   input rather than ask LinkedIn. A name no page has answers no item.
 */
export const linkedinLookups = (options: LinkedInLookupOptions) => {
  const rest = restCall(options.version);

  return {
    organizations: (
      query: LookupQueryOf<"linkedinOrganizations">,
      token: PublishingToken
    ): Effect.Effect<LookupResultOf<"linkedinOrganizations">, ReadFailure> => {
      if (!Option.contains(token.connection, "linkedinPage")) {
        return Effect.fail(new LookupInputRejected());
      }

      return options.api
        .execute(
          rest(
            HttpClientRequest.get(
              new URL("/rest/organizations", options.apiUrl)
            ).pipe(
              HttpClientRequest.setUrlParams({
                q: "vanityName",
                vanityName: query.vanityName,
              })
            ),
            token.accessToken
          )
        )
        .pipe(
          Effect.flatMap(
            (
              response
            ): Effect.Effect<
              typeof OrganizationsSchema.Type,
              HttpClientError.HttpClientError | ReadFailure | Schema.SchemaError
            > => {
              if (response.status === 404) {
                return Effect.succeed({});
              }

              return response.status === 200
                ? HttpClientResponse.schemaBodyJson(OrganizationsSchema)(
                    response
                  )
                : refused(response);
            }
          ),
          Effect.catchTags({
            HttpClientError: unanswered,
            OutboundRequestRefused: unanswered,
            SchemaError: unanswered,
          }),
          Effect.map(({ elements }) => ({
            _tag: "linkedinOrganizations" as const,
            items: (elements ?? []).flatMap((found) => {
              const name = (found.localizedName ?? "").trim();

              // A page without a name cannot be mentioned.
              return name === ""
                ? []
                : [
                    {
                      name,
                      urn: `urn:li:organization:${found.id}`,
                      vanityName: Option.fromUndefinedOr(found.vanityName),
                    },
                  ];
            }),
            nextCursor: Option.none(),
          }))
        );
    },
  };
};
