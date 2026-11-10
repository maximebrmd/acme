import { Effect, Option, Schema } from "effect";
import type { Redacted } from "effect";
import { HttpClientRequest, HttpClientResponse } from "effect/http";
import type { HttpClient, HttpClientError } from "effect/http";

import { LookupInputRejected } from "#publishing/application/lookup-input-rejected.ts";
import type { LookupFailure } from "#publishing/application/platform-lookups.ts";
import type {
  LookupQueryOf,
  LookupResultOf,
} from "#publishing/domain/lookup.ts";
import { unanswered } from "#publishing/infrastructure/platforms/platform-exchange.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { TokenRejected } from "#shared/domain/token-rejected.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";

import { refusalOf } from "./youtube-refusal.ts";

/** The HTTP client YouTube's lookups send through: the public one. */
export type YouTubeHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export interface YouTubeLookupOptions {
  readonly api: YouTubeHttp;
  /** The YouTube Data API's origin: `https://www.googleapis.com`. */
  readonly apiUrl: URL;
}

type ReadFailure = LookupFailure | TokenRejected;

const VideoCategoriesSchema = Schema.Struct({
  items: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        snippet: Schema.Struct({
          assignable: Schema.optionalKey(Schema.Boolean),
          title: Schema.String,
        }),
      })
    )
  ),
});

const PlaylistsSchema = Schema.Struct({
  items: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        id: Schema.String,
        snippet: Schema.Struct({ title: Schema.String }),
        status: Schema.optionalKey(
          Schema.Struct({ privacyStatus: Schema.optionalKey(Schema.String) })
        ),
      })
    )
  ),
  nextPageToken: Schema.optionalKey(Schema.String),
});

// Google's errors are JSON with an `error` that holds its code.
const GoogleErrorSchema = Schema.Struct({
  error: Schema.Struct({ code: Schema.Number }),
});

// Whether a refusal is Google's own word, not a page of a server on the
// way.
const isGoogles = (response: HttpClientResponse.HttpClientResponse) =>
  HttpClientResponse.schemaBodyJson(GoogleErrorSchema)(response).pipe(
    Effect.as(true),
    Effect.orElseSucceed(() => false)
  );

// What YouTube's refusal of a read means. Only a 401 in Google's own error
// refuses the token: a 403 is about what the channel or the project may
// read, and must not ask to reconnect a channel that uploads. A 400
// refuses what the input asked (a region it does not know, a page token it
// never gave); any other refusal that is not a rate limit (a closed or
// suspended channel, a permission the token lacks) leaves the lookup
// without an answer, and is logged by its code.
const refused = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, ReadFailure> =>
  Effect.all([refusalOf(response), isGoogles(response)]).pipe(
    Effect.flatMap(([{ failure }, own]): Effect.Effect<never, ReadFailure> => {
      if (
        (failure._tag === "TokenRejected" && response.status === 401 && own) ||
        failure._tag === "RateLimited" ||
        failure._tag === "PlatformUnavailable"
      ) {
        return Effect.fail(failure);
      }

      if (response.status === 400) {
        return Effect.fail(new LookupInputRejected());
      }

      return Effect.logWarning("YouTube refused a lookup").pipe(
        Effect.annotateLogs({
          code: "code" in failure ? failure.code : failure._tag,
          status: response.status,
        }),
        Effect.andThen(Effect.fail(new PlatformUnavailable()))
      );
    })
  );

// A GET on the Data API with the channel's token, its 200 read as `schema`.
const reading =
  <A, I>(options: YouTubeLookupOptions, schema: Schema.Codec<A, I>) =>
  (
    path: string,
    parameters: Readonly<Record<string, string>>,
    token: Redacted.Redacted
  ): Effect.Effect<A, ReadFailure> =>
    HttpClientRequest.get(new URL(path, options.apiUrl)).pipe(
      HttpClientRequest.setUrlParams(parameters),
      HttpClientRequest.bearerToken(token),
      options.api.execute,
      Effect.flatMap(
        (
          response
        ): Effect.Effect<
          A,
          HttpClientError.HttpClientError | ReadFailure | Schema.SchemaError
        > =>
          response.status === 200
            ? HttpClientResponse.schemaBodyJson(schema)(response)
            : refused(response)
      ),
      Effect.catchTags({
        HttpClientError: unanswered,
        OutboundRequestRefused: unanswered,
        SchemaError: unanswered,
      })
    );

/**
 * YouTube's lookups on the Data API, each one call of one quota unit, with
 * the channel's token (`youtube.readonly`):
 *
 * - `videoCategories`: videoCategories.list for the region, titles in the
 *   language asked (YouTube's default otherwise). Only the categories a
 *   video can be filed under (`snippet.assignable`) are answered, since
 *   videos.insert refuses the others.
 * - `playlists`: playlists.list with `mine=true`, a page of `limit` at
 *   most (YouTube takes up to 50), the next one named by `nextPageToken`.
 */
export const youtubeLookups = (options: YouTubeLookupOptions) => {
  const readCategories = reading(options, VideoCategoriesSchema);
  const readPlaylists = reading(options, PlaylistsSchema);

  return {
    playlists: (
      query: LookupQueryOf<"youtubePlaylists">,
      token: Redacted.Redacted
    ): Effect.Effect<LookupResultOf<"youtubePlaylists">, ReadFailure> =>
      readPlaylists(
        "/youtube/v3/playlists",
        {
          maxResults: String(query.limit),
          mine: "true",
          part: "snippet,status",
          ...Option.match(query.cursor, {
            onNone: () => ({}),
            onSome: (pageToken) => ({ pageToken }),
          }),
        },
        token
      ).pipe(
        Effect.map(({ items, nextPageToken }) => ({
          _tag: "youtubePlaylists" as const,
          items: (items ?? []).map(({ id, snippet, status }) => ({
            id,
            privacy: Option.fromUndefinedOr(status?.privacyStatus),
            title: snippet.title,
          })),
          nextCursor: Option.fromUndefinedOr(nextPageToken),
        }))
      ),
    videoCategories: (
      query: LookupQueryOf<"youtubeVideoCategories">,
      token: Redacted.Redacted
    ): Effect.Effect<LookupResultOf<"youtubeVideoCategories">, ReadFailure> =>
      readCategories(
        "/youtube/v3/videoCategories",
        {
          part: "snippet",
          regionCode: query.regionCode,
          ...Option.match(query.language, {
            onNone: () => ({}),
            onSome: (hl) => ({ hl }),
          }),
        },
        token
      ).pipe(
        Effect.map(({ items }) => ({
          _tag: "youtubeVideoCategories" as const,
          items: (items ?? []).flatMap(({ id, snippet }) =>
            snippet.assignable === false ? [] : [{ id, title: snippet.title }]
          ),
          nextCursor: Option.none<string>(),
        }))
      ),
  };
};
