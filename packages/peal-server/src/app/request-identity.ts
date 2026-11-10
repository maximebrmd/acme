import { Cause, Context, Effect, Layer } from "effect";
import { SecureRandom } from "effect/crypto";
import {
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

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

/**
 * A request id on every answer, whatever answers it (the API, Better Auth,
 * the MCP endpoint, a route that does not exist, a bug): the caller's own
 * `X-Request-Id` when it is well formed, so a client that numbers its calls
 * finds them here, a UUIDv7 otherwise. The id is on every log line written
 * while the request runs and on its span, and handlers read it as
 * `RequestId`.
 */
export const RequestIdentityLive = HttpRouter.middleware(
  Effect.gen(function* requestIdentity() {
    const random = yield* SecureRandom.SecureRandom;

    return (httpEffect) =>
      Effect.gen(function* identified() {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const sent = request.headers[requestIdHeader];

        const id =
          sent !== undefined && wellFormed.test(sent)
            ? sent
            : yield* random.uuidV7().pipe(Effect.orDie);

        const named = HttpServerResponse.setHeader(requestIdHeader, id);

        yield* Effect.annotateCurrentSpan(requestIdAttribute, id);

        return yield* httpEffect.pipe(
          Effect.provideService(RequestId, id),
          Effect.map(named),
          Effect.catchCause(mapFailureResponse(named)),
          Effect.annotateLogs(requestIdAttribute, id)
        );
      });
  }),
  { global: true }
).pipe(Layer.provide(SecureRandom.layerWebCrypto));
