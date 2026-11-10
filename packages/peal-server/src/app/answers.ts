import { Effect, Layer, Option } from "effect";
import { SecureRandom } from "effect/crypto";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import type { HttpApi, HttpApiGroup } from "effect/http-api";
import { Api } from "peal-contract";

import { deprecatedRoutes, deprecationOf } from "#app/deprecations.ts";
import {
  enveloped,
  isEnveloped,
  requestIssuesOf,
} from "#app/error-envelope.ts";
import {
  mapFailureResponse,
  requestIdAttribute,
  requestIdHeader,
  requestIdOf,
} from "#app/request-identity.ts";
import { AnswerHeaders } from "#shared/api/answer-headers.ts";
import { RequestId } from "#shared/api/request-id.ts";

const pathOf = (url: string) => url.split(/[?#]/u, 1)[0] ?? url;

/**
 * What every answer of the server has, whatever answers it (the API,
 * Better Auth, the MCP endpoint, a route that does not exist, a bug):
 *
 * - a request id, in `X-Request-Id`: the caller's own when it is well
 *   formed, so a client that numbers its calls finds them here, a UUIDv7
 *   otherwise. It is on every log line written while the request runs and
 *   on its span, and handlers read it as `RequestId`.
 * - the headers its handler and middlewares left for it (`AnswerHeaders`):
 *   a challenge, the limits that apply.
 * - on a deprecated endpoint of `api`, the headers that say so
 *   (`#app/deprecations.ts`).
 * - for an error of the API, the envelope (`#app/error-envelope.ts`):
 *   `code`, `message` and `requestId` beside the error's own fields.
 *
 * A failure keeps its cause, so it is logged, counted and traced as before.
 */
export const apiAnswers = <
  Id extends string,
  Groups extends HttpApiGroup.Constraint,
>(
  api: HttpApi.HttpApi<Id, Groups>
) =>
  HttpRouter.middleware(
    Effect.gen(function* answers() {
      const random = yield* SecureRandom.SecureRandom;
      const deprecations = deprecatedRoutes(api);

      return (httpEffect) =>
        Effect.gen(function* answered() {
          const request = yield* HttpServerRequest.HttpServerRequest;

          const id = yield* requestIdOf(request.headers[requestIdHeader]).pipe(
            Option.match({
              onNone: () => random.uuidV7().pipe(Effect.orDie),
              onSome: Effect.succeed,
            })
          );

          // What handlers and middlewares leave for the answer, error or not.
          const left = new Map<string, string>();

          const path = pathOf(request.url);

          const named = (response: HttpServerResponse.HttpServerResponse) =>
            HttpServerResponse.setHeaders(response, {
              ...deprecationOf(deprecations, request.method, path),
              ...Object.fromEntries(left),
              [requestIdHeader]: id,
            });

          const toldAs = isEnveloped(path)
            ? enveloped
            : () => (response: HttpServerResponse.HttpServerResponse) =>
                response;

          yield* Effect.annotateCurrentSpan(requestIdAttribute, id);

          return yield* httpEffect.pipe(
            Effect.provideService(RequestId, id),
            Effect.provideService(
              AnswerHeaders,
              AnswerHeaders.of({
                set: (name, value) =>
                  Effect.sync(() => {
                    left.set(name, value);
                  }),
              })
            ),
            Effect.map((response) =>
              named(toldAs(id, Option.none())(response))
            ),
            Effect.catchCause((cause) =>
              mapFailureResponse((response) =>
                named(toldAs(id, requestIssuesOf(cause))(response))
              )(cause)
            ),
            Effect.annotateLogs(requestIdAttribute, id)
          );
        });
    }),
    { global: true }
  ).pipe(Layer.provide(SecureRandom.layerWebCrypto));

/** What every answer of Peal's server has: `apiAnswers`, for its API. */
export const ApiAnswersLive = apiAnswers(Api);
