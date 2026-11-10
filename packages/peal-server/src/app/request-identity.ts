import { Cause, Context, Effect, Option } from "effect";
import { HttpServerError } from "effect/http";
import type { HttpServerResponse } from "effect/http";

/** The header that carries a request's id, in the request and the answer. */
export const requestIdHeader = "x-request-id";

/** The name of a request's id in log lines and on its span. */
export const requestIdAttribute = "peal.request_id";

// What a caller may send as an id: 8 to 128 letters, digits, dots, colons,
// underscores and hyphens, so it goes into a log line or a header as it is.
const wellFormed = /^[\w.:-]{8,128}$/u;

/**
 * The id of the request being answered, for what is written about it: the
 * error it is told, the activity it leaves.
 */
export class RequestId extends Context.Service<RequestId, string>()(
  "peal-server/app/RequestId"
) {}

/**
 * Answers a failure with the response it would get anyway, changed by
 * `change`, and leaves the rest of its cause as it was, so it is logged,
 * counted and traced as before.
 */
export const mapFailureResponse =
  (
    change: (
      response: HttpServerResponse.HttpServerResponse
    ) => HttpServerResponse.HttpServerResponse
  ) =>
  <E>(cause: Cause.Cause<E>) =>
    HttpServerError.causeResponse(cause).pipe(
      Effect.flatMap(([response, rest]) =>
        Effect.failCause(
          Cause.fromReasons([
            ...rest.reasons.filter(
              (reason) => !(reason._tag === "Die" && reason.defect === response)
            ),
            Cause.makeDieReason(change(response)),
          ])
        )
      )
    );

/** The id a caller sent, when it is well formed. */
export const requestIdOf = (sent: string | undefined): Option.Option<string> =>
  sent !== undefined && wellFormed.test(sent)
    ? Option.some(sent)
    : Option.none();
