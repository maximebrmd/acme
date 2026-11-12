import {
  Effect,
  Layer,
  Option,
  Redacted,
  Result,
  Schema,
  Stream,
} from "effect";
import type { Duration } from "effect";
import { Base64 } from "effect/encoding";
import { HttpClient, HttpClientRequest } from "effect/http";
import type { HttpClientResponse } from "effect/http";

import { AssistantUnavailable } from "#assistant/application/assistant-unavailable.ts";
import { ImageFailed } from "#assistant/application/image-failed.ts";
import { ImageModel } from "#assistant/application/ports/image-model.ts";
import type {
  ImageRequest,
  MadeImage,
} from "#assistant/application/ports/image-model.ts";
import type { ImageAspect } from "#assistant/domain/image-aspect.ts";
import { maxImageBytes } from "#assistant/domain/image-limits.ts";
import { publicHttpClientWith } from "#shared/infrastructure/platforms/public-http.ts";

/**
 * How long the assistant waits for an image, the fetch of a `url` answer
 * included. The provider may have made an image it did not answer in time,
 * so such a request counts toward the quota. Whatever sits between the
 * browser and the server must wait longer (the web app's proxy waits 120
 * seconds).
 */
export const imageAnswerTimeout: Duration.Input = "90 seconds";

/**
 * The most an answer may carry: the largest image the library stores, in
 * base64 (a third more), in a JSON document, with room.
 */
export const maxAnswerBytes = 24 * 1024 * 1024;

/** The endpoint's settings, as the operator gave them. */
export interface ImageEndpoint {
  /** None for an endpoint that takes requests without a key. */
  readonly apiKey: Option.Option<Redacted.Redacted>;
  /** The API's base URL, which `/images/generations` follows. */
  readonly baseUrl: string;
  readonly model: string;
}

// The sizes current image models take, for each aspect.
const sizes: Readonly<Record<ImageAspect, string>> = {
  landscape: "1536x1024",
  portrait: "1024x1536",
  square: "1024x1024",
};

// The first image of the answer: its bytes in base64, or an address to
// fetch them from. Current models always answer in base64.
const decodeAnswer = Schema.decodeUnknownResult(
  Schema.fromJsonString(
    Schema.Struct({
      data: Schema.Array(
        Schema.Struct({
          b64_json: Schema.optionalKey(Schema.String),
          url: Schema.optionalKey(Schema.String),
        })
      ).check(Schema.isMinLength(1)),
    })
  )
);

const failure = (reason: ImageFailed["reason"]) => new ImageFailed({ reason });

// The answer's bytes, failing once there are more than `limit`: nothing
// past it is read.
const readBounded = <E>(stream: Stream.Stream<Uint8Array, E>, limit: number) =>
  stream.pipe(
    Stream.mapError(() => failure("unusableAnswer")),
    Stream.runFoldEffect(
      () => ({ chunks: new Array<Uint8Array>(), total: 0 }),
      (read, chunk) => {
        const total = read.total + chunk.byteLength;

        return total > limit
          ? Effect.fail(failure("unusableAnswer"))
          : Effect.succeed({ chunks: [...read.chunks, chunk], total });
      }
    ),
    Effect.map(({ chunks, total }) => {
      const bytes = new Uint8Array(total);
      let offset = 0;

      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }

      return bytes;
    })
  );

// What a status that is not a success means: the server's key refused
// (the operator's to fix), a rate limit or a failure of the provider, which
// ran nothing, or a refusal of this request.
const reasonOfStatus = (status: number): ImageFailed["reason"] =>
  status === 429 || status >= 500 ? "unreachable" : "refused";

const imageOf = (bytes: Uint8Array): Result.Result<MadeImage, ImageFailed> =>
  bytes.byteLength === 0 || bytes.byteLength > maxImageBytes
    ? Result.fail(failure("unusableAnswer"))
    : Result.succeed({ bytes });

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
  { apiKey, baseUrl, model }: ImageEndpoint,
  { timeout = imageAnswerTimeout }: { readonly timeout?: Duration.Input } = {}
) =>
  Layer.effect(
    ImageModel,
    Effect.gen(function* makeImageModel() {
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.transform((response) =>
          response.pipe(
            Effect.provideService(HttpClient.TracerPropagationEnabled, false)
          )
        )
      );

      // The address an answer gives came from outside: the guard checks it.
      const guarded = yield* publicHttpClientWith({
        maxResponseBytes: maxImageBytes + 1,
        timeout,
      });

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
          Effect.andThen(Effect.fail(failure(reason)))
        );

      const fetchImage = (url: string) =>
        guarded.execute(HttpClientRequest.get(url)).pipe(
          Effect.withTracerEnabled(false),
          Effect.mapError(() => failure("unusableAnswer")),
          Effect.flatMap((response) =>
            response.status === 200
              ? readBounded(response.stream, maxImageBytes)
              : Effect.fail(failure("unusableAnswer"))
          )
        );

      const bytesOf = (answer: Uint8Array) =>
        Result.match(decodeAnswer(new TextDecoder().decode(answer)), {
          onFailure: () => Effect.fail(failure("unusableAnswer")),
          onSuccess: ({ data: [first] }) => {
            if (first?.b64_json !== undefined) {
              return Effect.fromResult(
                Result.mapError(Base64.decode(first.b64_json), () =>
                  failure("unusableAnswer")
                )
              );
            }

            return first?.url === undefined
              ? Effect.fail(failure("unusableAnswer"))
              : fetchImage(first.url);
          },
        });

      const answered = (
        response: HttpClientResponse.HttpClientResponse
      ): Effect.Effect<MadeImage, AssistantUnavailable | ImageFailed> => {
        if (response.status === 401 || response.status === 403) {
          // The operator's to fix: by status alone, never the body.
          return Effect.logError(
            "The image model refused the server's credentials",
            { model, status: response.status }
          ).pipe(
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

        return readBounded(response.stream, maxAnswerBytes).pipe(
          Effect.flatMap(bytesOf),
          Effect.flatMap((bytes) => Effect.fromResult(imageOf(bytes))),
          Effect.catchTag("ImageFailed", ({ reason }) =>
            failWith("UnusableAnswer", reason)
          )
        );
      };

      const request = ({ prompt, aspect }: ImageRequest) =>
        HttpClientRequest.post(`${baseUrl}/images/generations`).pipe(
          HttpClientRequest.acceptJson,
          Option.isSome(apiKey)
            ? HttpClientRequest.bearerToken(Redacted.value(apiKey.value))
            : (unchanged) => unchanged,
          HttpClientRequest.bodyJsonUnsafe({
            model,
            n: 1,
            prompt,
            size: sizes[aspect],
          })
        );

      const generate = (made: ImageRequest) =>
        client.execute(request(made)).pipe(
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

      return ImageModel.of({ available: true, generate });
    })
  );
