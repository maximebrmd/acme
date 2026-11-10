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

import { refusalOf } from "./pinterest-refusal.ts";

/** The HTTP client Pinterest's lookups send through: the public one. */
export type PinterestHttp = HttpClient.HttpClient.With<
  HttpClientError.HttpClientError | OutboundRequestRefused
>;

export interface PinterestLookupOptions {
  readonly api: PinterestHttp;
  /** The API's origin: `https://api.pinterest.com`, or its Sandbox's. */
  readonly apiUrl: URL;
}

type ReadFailure = LookupFailure | TokenRejected;

// A page of a list: its items, and the bookmark of the next page, if any.
const pageOf = <Item extends Schema.Top>(item: Item) =>
  Schema.Struct({
    bookmark: Schema.optionalKey(Schema.NullOr(Schema.String)),
    items: Schema.Array(item),
  });

const BoardsSchema = pageOf(
  Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    privacy: Schema.optionalKey(Schema.NullOr(Schema.String)),
  })
);

// A section may come without an id, which nothing could then refer to.
const SectionsSchema = pageOf(
  Schema.Struct({
    id: Schema.optionalKey(Schema.NullOr(Schema.String)),
    name: Schema.String,
  })
);

const nextOf = (bookmark: string | null | undefined) =>
  Option.fromNullishOr(bookmark).pipe(Option.filter((next) => next !== ""));

// What Pinterest's refusal of a read means. A 400 or a 404 refuses what
// the input asked (a bookmark it never gave, a board that is not the
// account's); any other refusal that is neither the token's nor a rate
// limit leaves the lookup without an answer, and is logged by its code.
const refused = (
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<never, ReadFailure> =>
  refusalOf(response, "pin").pipe(
    Effect.flatMap((failure): Effect.Effect<never, ReadFailure> => {
      if (
        failure._tag === "TokenRejected" ||
        failure._tag === "RateLimited" ||
        failure._tag === "PlatformUnavailable"
      ) {
        return Effect.fail(failure);
      }

      if (response.status === 400 || response.status === 404) {
        return Effect.fail(new LookupInputRejected());
      }

      return Effect.logWarning("Pinterest refused a lookup").pipe(
        Effect.annotateLogs({
          code: "code" in failure ? failure.code : failure._tag,
          status: response.status,
        }),
        Effect.andThen(Effect.fail(new PlatformUnavailable()))
      );
    })
  );

// A GET on the API with the channel's token, its 200 read as `schema`.
const reading =
  <A, I>(options: PinterestLookupOptions, schema: Schema.Codec<A, I>) =>
  (
    path: string,
    page: { readonly cursor: Option.Option<string>; readonly limit: number },
    token: Redacted.Redacted
  ): Effect.Effect<A, ReadFailure> =>
    HttpClientRequest.get(new URL(path, options.apiUrl)).pipe(
      HttpClientRequest.setUrlParams({
        page_size: String(page.limit),
        ...Option.match(page.cursor, {
          onNone: () => ({}),
          onSome: (bookmark) => ({ bookmark }),
        }),
      }),
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
 * Pinterest's lookups on API v5, each one call with the channel's token
 * (`boards:read`), a page of `limit` at most (Pinterest takes up to 250),
 * the next one named by its `bookmark`:
 *
 * - `boards`: boards/list, the account's boards and the group boards it
 *   pins to. Secret boards are left out, as Peal does not ask for their
 *   scope. A page may come empty with a bookmark, as in Pinterest's
 *   Sandbox: the next one is still worth asking for.
 * - `boardSections`: board_sections/list, the sections of one board.
 */
export const pinterestLookups = (options: PinterestLookupOptions) => {
  const readBoards = reading(options, BoardsSchema);
  const readSections = reading(options, SectionsSchema);

  return {
    boardSections: (
      query: LookupQueryOf<"pinterestBoardSections">,
      token: Redacted.Redacted
    ): Effect.Effect<LookupResultOf<"pinterestBoardSections">, ReadFailure> =>
      readSections(
        `/v5/boards/${encodeURIComponent(query.boardId)}/sections`,
        query,
        token
      ).pipe(
        Effect.map(({ bookmark, items }) => ({
          _tag: "pinterestBoardSections" as const,
          items: items.flatMap(({ id, name }) =>
            id === undefined || id === null || id === "" ? [] : [{ id, name }]
          ),
          nextCursor: nextOf(bookmark),
        }))
      ),
    boards: (
      query: LookupQueryOf<"pinterestBoards">,
      token: Redacted.Redacted
    ): Effect.Effect<LookupResultOf<"pinterestBoards">, ReadFailure> =>
      readBoards("/v5/boards", query, token).pipe(
        Effect.map(({ bookmark, items }) => ({
          _tag: "pinterestBoards" as const,
          items: items.map(({ id, name, privacy }) => ({
            id,
            name,
            privacy: Option.fromNullishOr(privacy),
          })),
          nextCursor: nextOf(bookmark),
        }))
      ),
  };
};
