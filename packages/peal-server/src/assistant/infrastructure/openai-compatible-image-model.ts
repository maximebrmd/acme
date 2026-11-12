import { Effect, Layer, Ref } from "effect";
import type { Duration } from "effect";
import { HttpClient } from "effect/http";
import type { HttpClientResponse } from "effect/http";

import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import type { ImageFailed } from "#assistant/application/image-failed.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";
import type {
  ImageRequest,
  MadeImage,
} from "#assistant/application/ports/image-model.ts";
import {
  imageAnswers,
  imageAnswerTimeout,
  imageFailure,
  imagesRequest,
  reasonOfStatus,
  settingsRefused,
} from "#assistant/infrastructure/images-api.ts";
import type { ImageEndpoint } from "#assistant/infrastructure/images-api.ts";

export type { ImageEndpoint } from "#assistant/infrastructure/images-api.ts";

export {
  imageAnswerTimeout,
  maxAnswerBytes,
} from "#assistant/infrastructure/images-api.ts";

/**
 * The assistant's ImageModel on an OpenAI-compatible endpoint: it calls
 * `POST {base}/images/generations` itself, at the host the operator named
 * (not through the outbound guard, as for the writing model), with the key
 * as a bearer token when there is one, and a JSON body of the model, the
 * prompt, one image and its size. It asks for no `response_format`, which
 * current models refuse: they answer in base64. An answer with a `url`
 * instead is fetched through the public HTTP client, the outbound guard
 * checking the address the provider gave. Every answer is bounded, the
 * whole call waits `timeout` at most, and nothing of the prompt, the image
 * or the provider's answer reaches a log or a trace: the HTTP client's
 * spans are off around the call, the provider gets no trace context, and
 * the call's own span names the provider, the model and the kind of
 * failure. Written to one provider's reference and tested on a loopback
 * fake: it has never called a real provider.
 */
export const openAiCompatibleImageModel = (
  endpoint: ImageEndpoint,
  { timeout = imageAnswerTimeout }: { readonly timeout?: Duration.Input } = {}
) =>
  Layer.effect(
    ImageModel,
    Effect.gen(function* makeImageModel() {
      const { model } = endpoint;

      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.transform((response) =>
          response.pipe(
            Effect.provideService(HttpClient.TracerPropagationEnabled, false)
          )
        )
      );

      // The address an answer gives came from outside: the guard checks it.
      const imageOf = yield* imageAnswers({ timeout });

      // Whether the provider refused the server's settings since it started.
      const refused = yield* Ref.make(false);

      const identity = {
        "gen_ai.provider.name": "openai-compatible",
        "gen_ai.request.model": model,
      };

      // The log and the span name the kind of failure, never a body.
      const failWith = (kind: string, reason: ImageFailed["reason"]) =>
        Effect.logWarning("The assistant's image model failed", {
          kind,
          model,
          reason,
        }).pipe(
          Effect.andThen(
            Effect.annotateCurrentSpan("peal.assistant.failure", kind)
          ),
          Effect.andThen(Effect.fail(imageFailure(reason)))
        );

      const answered = (
        response: HttpClientResponse.HttpClientResponse
      ): Effect.Effect<MadeImage, AssistantUnavailable | ImageFailed> => {
        if (settingsRefused.has(response.status)) {
          // The operator's to fix: by status alone, never the body. Images
          // stay off until the server restarts with other settings.
          return Ref.set(refused, true).pipe(
            Effect.andThen(
              Effect.logError(
                "The image model refused the server's settings: images are off until the server restarts",
                { model, status: response.status }
              )
            ),
            Effect.andThen(
              Effect.annotateCurrentSpan(
                "peal.assistant.failure",
                `Status${response.status}`
              )
            ),
            Effect.andThen(Effect.fail(new AssistantUnavailable()))
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

      const call = (made: ImageRequest) =>
        client.execute(imagesRequest(endpoint, made)).pipe(
          // The HTTP client's spans record what they end with.
          Effect.withTracerEnabled(false),
          Effect.catchTag("HttpClientError", () =>
            failWith("Transport", "unreachable")
          ),
          Effect.flatMap(answered),
          Effect.scoped,
          // Interrupting the call aborts its HTTP request.
          Effect.timeoutOrElse({
            duration: timeout,
            orElse: () => failWith("Timeout", "timedOut"),
          }),
          Effect.withSpan("ImageModel.generate", { attributes: identity })
        );

      const generate = (made: ImageRequest) =>
        Ref.get(refused).pipe(
          Effect.flatMap((off) =>
            off ? Effect.fail(new AssistantUnavailable()) : call(made)
          )
        );

      return ImageModel.of({
        available: Ref.get(refused).pipe(Effect.map((off) => !off)),
        generate,
      });
    })
  );
