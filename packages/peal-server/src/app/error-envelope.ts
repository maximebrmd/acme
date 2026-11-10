import { Option, Predicate, Schema, SchemaIssue } from "effect";
import type { Cause } from "effect";
import { HttpServerResponse } from "effect/http";
import { HttpApiError } from "effect/http-api";
import { maxRequestIssues } from "peal-contract";
import type { RequestIssue } from "peal-contract";
import { errorCodeOf, errorsByTag, generalErrorOf } from "peal-contract/errors";

// Better Auth's routes and the MCP endpoint answer as their clients read
// them (Better Auth's `code` and `message`, JSON-RPC errors).
const otherAnswers = ["/api/auth/", "/api/mcp"];

/** Whether the answers to a path are the API's, in the envelope. */
export const isEnveloped = (path: string): boolean =>
  !otherAnswers.some((prefix) => path === prefix || path.startsWith(prefix));

const catalogue = errorsByTag();

// An error as its handler encoded it: its tag, its own words if it has
// some, and whatever else it says.
const ErrorBodySchema = Schema.fromJsonString(
  Schema.StructWithRest(
    Schema.Struct({
      _tag: Schema.optionalKey(Schema.String),
      message: Schema.optionalKey(Schema.String),
    }),
    [Schema.Record(Schema.String, Schema.Json)]
  )
);

type ErrorBody = typeof ErrorBodySchema.Type;

const decodeBody = Schema.decodeUnknownOption(ErrorBodySchema);

const text = new TextDecoder();

// The error an answer carries, if it carries one.
const bodyOf = (
  response: HttpServerResponse.HttpServerResponse
): Option.Option<ErrorBody> =>
  response.body._tag === "Uint8Array"
    ? decodeBody(text.decode(response.body.body))
    : Option.none();

// Where the API reads each part of a request, as clients name them.
const parts = {
  Headers: "headers",
  Params: "path",
  Payload: "body",
  Query: "query",
} as const;

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1();

const segmentOf = (
  segment: PropertyKey | { readonly key: PropertyKey }
): number | string => {
  const key = Predicate.isObject(segment) ? segment.key : segment;

  return Predicate.isNumber(key) ? key : String(key);
};

// What a schema says of a value it refused quotes the value: one line of
// it, cut short, is enough to find it.
const maxIssueMessage = 300;

const oneLine = (message: string) => {
  const line = message.replaceAll(/\s+/gu, " ").trim();

  return line.length > maxIssueMessage
    ? `${line.slice(0, maxIssueMessage - 1)}…`
    : line;
};

/**
 * What is wrong with a request the API could not decode, if that is why it
 * failed: each problem with its place. A failure to encode an answer is the
 * server's own, and lists nothing.
 */
export const requestIssuesOf = <E>(
  cause: Cause.Cause<E>
): Option.Option<readonly RequestIssue[]> => {
  for (const reason of cause.reasons) {
    if (
      reason._tag === "Die" &&
      HttpApiError.HttpApiSchemaError.is(reason.defect)
    ) {
      const { cause: refused, kind } = reason.defect;

      if (kind === "Body" || kind === "ResponseHeaders") {
        return Option.none();
      }

      return Option.some(
        formatIssues(refused.issue)
          .issues.slice(0, maxRequestIssues)
          .map((issue) => ({
            message: oneLine(issue.message),
            path: [parts[kind], ...(issue.path ?? []).map(segmentOf)],
          }))
      );
    }
  }

  return Option.none();
};

// A request that could not be read, as `InvalidRequest` says it.
const invalidRequest = (issues: readonly RequestIssue[]) => {
  const [first] = issues;

  return first === undefined
    ? { _tag: "InvalidRequest", issues }
    : { _tag: "InvalidRequest", field: first.path.join("."), issues };
};

/**
 * An error answer in the API's envelope: its own fields, then `code`,
 * `message` and `requestId`. A declared error keeps what its handler said
 * and gets its code and, unless it has words of its own, the catalogue's;
 * an answer without a body (a route that does not exist, a request that
 * could not be read, a bug) gets the general error of its status, which
 * never says more than the status does. Other answers are left alone: one
 * that is not an error, a stream, a body that is not an error of the API.
 */
export const enveloped =
  (requestId: string, issues: Option.Option<readonly RequestIssue[]>) =>
  (
    response: HttpServerResponse.HttpServerResponse
  ): HttpServerResponse.HttpServerResponse => {
    if (response.status < 400) {
      return response;
    }

    const general = generalErrorOf(response.status);
    const carried = bodyOf(response);

    if (response.body._tag !== "Empty" && Option.isNone(carried)) {
      return response;
    }

    const own = Option.match(issues, {
      onNone: () => Option.getOrElse(carried, (): ErrorBody => ({})),
      onSome: invalidRequest,
    });

    const tag = own._tag ?? general.tag;
    const known = catalogue.get(tag);
    const said = "message" in own ? own.message : undefined;

    return HttpServerResponse.setBody(
      response,
      HttpServerResponse.jsonUnsafe({
        ...own,
        _tag: tag,
        code: known?.code ?? errorCodeOf(tag),
        message:
          said === undefined || said === ""
            ? (known?.message ?? general.message)
            : said,
        requestId,
      }).body
    );
  };
