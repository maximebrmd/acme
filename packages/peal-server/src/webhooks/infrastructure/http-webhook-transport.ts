import { Cause, Clock, Effect, Layer, Match } from "effect";
import type { Duration } from "effect";
import { HttpClientRequest } from "effect/http";
import type { HttpClientError, HttpClientResponse } from "effect/http";

import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { publicHttpClientWith } from "#shared/infrastructure/platforms/public-http.ts";
import { WebhookTransport } from "#webhooks/application/ports/webhook-transport.ts";
import type { WebhookRequest } from "#webhooks/application/ports/webhook-transport.ts";
import { UrlNotDeliverable } from "#webhooks/application/url-not-deliverable.ts";
import type { AttemptOutcome } from "#webhooks/domain/delivery-attempt.ts";
import { requestTimeout } from "#webhooks/domain/delivery-policy.ts";
import { excerptOf } from "#webhooks/domain/response-excerpt.ts";

const unanswered = (
  reason: Extract<AttemptOutcome, { readonly _tag: "unanswered" }>["reason"]
): AttemptOutcome => ({ _tag: "unanswered", reason });

const timedOut = (failure: HttpClientError.HttpClientError) =>
  failure.reason._tag === "TransportError" &&
  Cause.isTimeoutError(failure.reason.cause);

// Why no answer came: the guard refused the host before anything was sent,
// the time ran out, or the connection could not be made or broke.
const failureOf = (
  failure: HttpClientError.HttpClientError | OutboundRequestRefused
): AttemptOutcome =>
  Match.valueTags(failure, {
    HttpClientError: (failed) =>
      unanswered(timedOut(failed) ? "timeout" : "connection"),
    OutboundRequestRefused: () => unanswered("refused"),
  });

const recovered = (
  failure: HttpClientError.HttpClientError | OutboundRequestRefused
) => Effect.succeed(failureOf(failure));

// A host that cannot be looked up for the moment passes: each delivery
// checks again.
const undeliverable = (refused: OutboundRequestRefused) =>
  refused.reason === "lookupFailed"
    ? Effect.void
    : Effect.fail(
        new UrlNotDeliverable({
          reason:
            refused.reason === "unknownHost" ? "unknownHost" : "notPublic",
        })
      );

// What is kept of an answer: its status, and of one that is not a success
// the start of its body, cleaned. A body that cannot be read leaves none.
const answerOf = (response: HttpClientResponse.HttpClientResponse) =>
  response.status >= 200 && response.status < 300
    ? Effect.succeed<AttemptOutcome>({
        _tag: "answered",
        excerpt: excerptOf(""),
        status: response.status,
      })
    : response.text.pipe(
        Effect.catch(() => Effect.succeed("")),
        Effect.map((text): AttemptOutcome => ({
          _tag: "answered",
          excerpt: excerptOf(text),
          status: response.status,
        }))
      );

/**
 * The transport on the public HTTP client: every request is checked by the
 * outbound guard first, no redirect is followed, the answer is cut off
 * past a megabyte, and the receiver gets none of Peal's trace context. The
 * whole exchange, reading a refusal's body included, has `timeout`.
 *
 * Its spans are off: the HTTP client's would record the address, whose
 * path or query may hold a secret of the receiver's. Nothing here logs the
 * address, the body, the headers or the answer.
 */
export const httpWebhookTransport = (options: {
  readonly timeout: Duration.Input;
}) =>
  Layer.effect(
    WebhookTransport,
    Effect.gen(function* HttpWebhookTransport() {
      const guard = yield* OutboundGuard;
      const client = yield* publicHttpClientWith(options);

      const exchange = ({ body, headers, url }: WebhookRequest) =>
        client
          .execute(
            HttpClientRequest.post(url).pipe(
              HttpClientRequest.setHeaders(headers),
              HttpClientRequest.bodyText(body, headers["content-type"])
            )
          )
          .pipe(
            Effect.flatMap(answerOf),
            Effect.catch(recovered),
            Effect.timeoutOrElse({
              duration: options.timeout,
              orElse: () => Effect.succeed(unanswered("timeout")),
            }),
            Effect.withTracerEnabled(false)
          );

      return WebhookTransport.of({
        check: (url) =>
          guard
            .check(new URL(url))
            .pipe(Effect.catch(undeliverable), Effect.withTracerEnabled(false)),
        send: Effect.fnUntraced(function* send(request: WebhookRequest) {
          const started = yield* Clock.currentTimeMillis;
          const outcome = yield* exchange(request);
          const ended = yield* Clock.currentTimeMillis;

          return { durationMs: Math.max(0, ended - started), outcome };
        }),
      });
    })
  );

/** The transport as the server runs it, waiting `requestTimeout`. */
export const HttpWebhookTransport = httpWebhookTransport({
  timeout: requestTimeout,
});
