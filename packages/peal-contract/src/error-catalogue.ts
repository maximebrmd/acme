import { Schema } from "effect";
import { HttpApi } from "effect/http-api";

import { Api } from "./api.ts";
import { errorCodeOf } from "./error-code.ts";
import { errorEnvelope } from "./error-envelope.ts";

export { errorCodeOf } from "./error-code.ts";

/** One error of the API, as the list of codes documents it. */
export interface CatalogueEntry {
  readonly code: string;
  /** What the error means, in English: its `message` unless it has its own. */
  readonly message: string;
  readonly status: number;
  readonly tag: string;
}

/**
 * The errors any route can answer, whatever its endpoint declares: the
 * server writes them itself, in the same envelope. The first of a status
 * is what an answer of that status without a body becomes; a status
 * without an entry is answered as `http_<status>`.
 */
export const generalErrors = [
  {
    message:
      "A value in the request cannot be used here, such as a cursor that came from another list. Nothing was done.",
    status: 400,
    tag: "BadRequest",
  },
  {
    message:
      "The request does not match what the endpoint takes: `issues` says what and where. Nothing was done.",
    status: 400,
    tag: "InvalidRequest",
  },
  {
    message:
      "Sign in, or send an API key as a bearer token: the request has no valid credentials.",
    status: 401,
    tag: "Unauthenticated",
  },
  {
    message: "The credentials are valid but do not allow this request.",
    status: 403,
    tag: "Forbidden",
  },
  {
    message:
      "Nothing answers at this address for this caller: check the path, the method and the ids.",
    status: 404,
    tag: "NotFound",
  },
  {
    message: "This address does not take this method.",
    status: 405,
    tag: "MethodNotAllowed",
  },
  {
    message:
      "What this address led to was turned off: it answers no more, and will not again.",
    status: 410,
    tag: "Gone",
  },
  {
    message: "The request's body is larger than this endpoint takes.",
    status: 413,
    tag: "PayloadTooLarge",
  },
  {
    message:
      "The server failed to answer, and the failure was recorded. Quote `requestId` when reporting it. A request that changes something may or may not have been applied: read before sending it again.",
    status: 500,
    tag: "InternalError",
  },
  {
    message:
      "The server cannot answer for now. Try again shortly, with the same idempotency key where the endpoint takes one.",
    status: 503,
    tag: "ServiceUnavailable",
  },
] as const satisfies readonly {
  message: string;
  status: number;
  tag: string;
}[];

/**
 * The body of an error no endpoint declares: the envelope alone, under the
 * tag of `generalErrors`.
 */
export const GeneralErrorSchema = Schema.Struct({
  _tag: Schema.String,
  ...errorEnvelope,
}).annotate({ identifier: "GeneralError" });

const entryOf = ({
  message,
  status,
  tag,
}: (typeof generalErrors)[number]): CatalogueEntry => ({
  code: errorCodeOf(tag),
  message,
  status,
  tag,
});

/** The general error an answer of a status without a body becomes. */
export const generalErrorOf = (status: number): CatalogueEntry => {
  const known = generalErrors.find((error) => error.status === status);

  return known === undefined
    ? {
        code: `http_${status}`,
        message: "The request was not answered as asked.",
        status,
        tag: "HttpError",
      }
    : entryOf(known);
};

const DeclaredSchema = Schema.Struct({
  description: Schema.String,
  identifier: Schema.String,
});

const decodeDeclared = Schema.decodeUnknownOption(DeclaredSchema);

const declaredErrors = (): readonly CatalogueEntry[] => {
  const entries = new Map<string, CatalogueEntry>();

  HttpApi.reflect(Api, {
    onEndpoint: ({ errors }) => {
      for (const [status, schemas] of errors) {
        for (const schema of schemas) {
          const declared = decodeDeclared(schema.ast.annotations);

          // Effect's own status errors are the general ones.
          if (
            declared._tag === "Some" &&
            !declared.value.identifier.startsWith("effect/")
          ) {
            const { description, identifier } = declared.value;

            entries.set(identifier, {
              code: errorCodeOf(identifier),
              message: description,
              status,
              tag: identifier,
            });
          }
        }
      }
    },
    onGroup: () => {
      // Errors are declared on endpoints and their middlewares.
    },
  });

  return [...entries.values()];
};

/**
 * Every error the API answers: those its endpoints declare, read from the
 * contract itself, and the general ones. Sorted by code; the docs' list of
 * codes is this.
 */
export const errorCatalogue = (): readonly CatalogueEntry[] => {
  const declared = declaredErrors();
  const tags = new Set(declared.map(({ tag }) => tag));

  return [
    ...declared,
    ...generalErrors.flatMap((general) =>
      tags.has(general.tag) ? [] : [entryOf(general)]
    ),
  ].toSorted((one, other) => one.code.localeCompare(other.code));
};

/** The catalogue by tag, for the server, which fills the envelope from it. */
export const errorsByTag = (): ReadonlyMap<string, CatalogueEntry> =>
  new Map(errorCatalogue().map((entry) => [entry.tag, entry]));
