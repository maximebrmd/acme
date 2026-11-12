import { Duration, Effect, Layer, Option } from "effect";
import { FetchHttpClient } from "effect/http";
import type { HttpClientResponse } from "effect/http";

import type { ImageFailed } from "#assistant/application/image-failed.ts";
import { ImageProviderRefused } from "#assistant/application/image-provider-refused.ts";
import type { MadeImage } from "#assistant/application/ports/image-model.ts";
import { OwnImageModel } from "#assistant/application/ports/own-image-model.ts";
import {
  imageAnswers,
  imageAnswerTimeout,
  imageFailure,
  imagesRequest,
  maxAnswerBytes,
  reasonOfStatus,
  settingsRefused,
} from "#assistant/infrastructure/images-api.ts";
import { OutboundGuard } from "#shared/infrastructure/platforms/outbound-guard.ts";
import type { OutboundRequestRefused } from "#shared/infrastructure/platforms/outbound-request-refused.ts";
import { publicHttpClientWith } from "#shared/infrastructure/platforms/public-http.ts";

// What every log line and span of a workspace's provider says of it: whose
// it is, never its host or its model, which are the workspace's business.
const source = { "peal.assistant.image_source": "workspace" } as const;

const failWith = (kind: string, reason: ImageFailed["reason"]) =>
  Effect.logWarning("A workspace's image provider failed", {
    kind,
    reason,
    source: "workspace",
  }).pipe(
    Effect.andThen(Effect.annotateCurrentSpan("peal.assistant.failure", kind)),
    Effect.andThen(Effect.fail(imageFailure(reason)))
  );

const refusedWith = (
  kind: string,
  status: number | null,
  reason: ImageProviderRefused["reason"] = status === null
    ? "addressRefused"
    : "settingsRefused"
) =>
  Effect.logWarning("A workspace's image provider refused its settings", {
    kind,
    source: "workspace",
    status,
  }).pipe(
    Effect.andThen(Effect.annotateCurrentSpan("peal.assistant.failure", kind)),
    Effect.andThen(Effect.fail(new ImageProviderRefused({ reason, status })))
  );

// A host Peal sends nothing to is the workspace's to fix; one that
// cannot be looked up for now may answer later.
const guardRefused = ({ reason }: OutboundRequestRefused) =>
  reason === "lookupFailed"
    ? failWith("Lookup", "unreachable")
    : refusedWith("AddressRefused", null);

/**
 * OwnImageModel on the OpenAI images API, the endpoint the server's own
 * adapter speaks, at the address a workspace's member typed: the request
 * goes through the public HTTP client, so the outbound guard checks the
 * host before every call (HTTPS on the default port, every address
 * public), no redirect is followed and the answer is cut off past
 * `maxAnswerBytes`. A `url` answer goes through the guard as well.
 *
 * 401, 402, 403 and 404 are the workspace's settings refused
 * (ImageProviderRefused, with the status), and so is a host the guard
 * refuses (with none), but for a name that cannot be looked up for now,
 * which is `unreachable`; 429 and 5xx are `unreachable`, another status
 * `refused`. It keeps no state: the next call tries again. The key is
 * `Redacted` until the bearer header; the logs and the span say
 * `workspace`, the status and the kind of failure, nothing else.
 */
export const openAiCompatibleOwnImageModel = ({
  timeout = imageAnswerTimeout,
}: { readonly timeout?: Duration.Input } = {}) =>
  Layer.effect(
    OwnImageModel,
    Effect.gen(function* makeOwnImageModel() {
      // The whole call waits `timeout`: the client's own bound is a little
      // later, so a slow provider ends as `timedOut`.
      const client = yield* publicHttpClientWith({
        maxResponseBytes: maxAnswerBytes + 1,
        timeout: Duration.sum(
          Duration.fromInputUnsafe(timeout),
          Duration.seconds(1)
        ),
      });

      const imageOf = yield* imageAnswers({ timeout });

      const answered = (
        response: HttpClientResponse.HttpClientResponse
      ): Effect.Effect<MadeImage, ImageFailed | ImageProviderRefused> => {
        if (settingsRefused.has(response.status)) {
          return refusedWith(`Status${response.status}`, response.status);
        }

        // A redirect is never followed, as it could lead past the guard:
        // the address is not the API's own.
        if (response.status >= 300 && response.status <= 399) {
          return refusedWith(
            `Status${response.status}`,
            response.status,
            "redirected"
          );
        }

        if (response.status < 200 || response.status > 299) {
          return failWith(
            `Status${response.status}`,
            reasonOfStatus(response.status)
          );
        }

        return imageOf(response, failWith);
      };

      return OwnImageModel.of({
        generate: (endpoint, request) =>
          client
            .execute(
              imagesRequest(
                {
                  apiKey: Option.some(endpoint.apiKey),
                  baseUrl: endpoint.baseUrl,
                  model: endpoint.model,
                },
                request
              )
            )
            .pipe(
              // The HTTP client's spans record the address and what they
              // end with.
              Effect.withTracerEnabled(false),
              Effect.catchTags({
                HttpClientError: () => failWith("Transport", "unreachable"),
                OutboundRequestRefused: guardRefused,
              }),
              Effect.flatMap(answered),
              Effect.scoped,
              // Interrupting the call aborts its HTTP request.
              Effect.timeoutOrElse({
                duration: timeout,
                orElse: () => failWith("Timeout", "timedOut"),
              }),
              Effect.withSpan("OwnImageModel.generate", {
                attributes: {
                  "gen_ai.provider.name": "openai-compatible",
                  ...source,
                },
              })
            ),
      });
    })
  );

/**
 * OwnImageModel as the server runs it: the guard resolves names with the
 * runtime's Dns, which the composition root provides.
 */
export const OwnImageModelLive = openAiCompatibleOwnImageModel().pipe(
  Layer.provide(OutboundGuard.layer),
  Layer.provide(FetchHttpClient.layer)
);
