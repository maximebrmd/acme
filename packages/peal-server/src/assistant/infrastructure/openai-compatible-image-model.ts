import {
  Effect,
  Layer,
  Option,
  Redacted,
  Ref,
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
          // Some servers write both fields, the one left out as null.
          b64_json: Schema.optionalKey(Schema.NullOr(Schema.String)),
          url: Schema.optionalKey(Schema.NullOr(Schema.String)),
        })
      ).check(Schema.isMinLength(1)),
    })
  )
);

const failure = (reason: ImageFailed["reason"]) => new ImageFailed({ reason });

// Counts the bytes read, failing once there are more than `limit`:
// nothing past it is read.
const bounded = <E>(stream: Stream.Stream<Uint8Array, E>, limit: number) => {
  let total = 0;

  return stream.pipe(
    Stream.mapError(() => failure("unusableAnswer")),
    Stream.mapEffect((chunk) => {
      total += chunk.byteLength;

      return total > limit
        ? Effect.fail(failure("unusableAnswer"))
        : Effect.succeed(chunk);
    })
  );
};

// A file's bytes, in one array once read.
const readBytes = <E>(stream: Stream.Stream<Uint8Array, E>, limit: number) =>
  bounded(stream, limit).pipe(
    Stream.runCollect,
    Effect.map((chunks) => {
      const bytes = new Uint8Array(
        chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
      );

      let offset = 0;

      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }

      return bytes;
    })
  );

// An answer's text, decoded as it arrives: its bytes are not kept beside
// it.
const readText = <E>(stream: Stream.Stream<Uint8Array, E>, limit: number) => {
  const decoder = new TextDecoder();

  return bounded(stream, limit).pipe(
    Stream.map((chunk) => decoder.decode(chunk, { stream: true })),
    Stream.runCollect,
    Effect.map((parts) => [...parts, decoder.decode()].join(""))
  );
};

// The statuses that say the operator's settings are wrong: a key refused
// or not allowed, an account that does not pay, a model or an address
// the provider does not have. Nothing ran, and nothing will until the
// operator fixes them.
const settingsRefused: ReadonlySet<number> = new Set([401, 402, 403, 404]);

// What another status that is not a success means: a rate limit or a
// failure of the provider, or a refusal of this request. In either case
// no image was made.
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
          Effect.andThen(Effect.fail(failure(reason)))
        );

      const fetchImage = (url: string) =>
        // An address that is not absolute leads nowhere.
        URL.canParse(url)
          ? guarded.execute(HttpClientRequest.get(url)).pipe(
              Effect.withTracerEnabled(false),
              Effect.mapError(() => failure("unusableAnswer")),
              Effect.flatMap((response) =>
                response.status === 200
                  ? readBytes(response.stream, maxImageBytes)
                  : Effect.fail(failure("unusableAnswer"))
              )
            )
          : Effect.fail(failure("unusableAnswer"));

      const bytesOf = (answer: string) =>
        Result.match(decodeAnswer(answer), {
          onFailure: () => Effect.fail(failure("unusableAnswer")),
          onSuccess: ({ data: [first] }) => {
            if (first?.b64_json !== undefined && first.b64_json !== null) {
              return Effect.fromResult(
                Result.mapError(Base64.decode(first.b64_json), () =>
                  failure("unusableAnswer")
                )
              );
            }

            return first?.url === undefined || first.url === null
              ? Effect.fail(failure("unusableAnswer"))
              : fetchImage(first.url);
          },
        });

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

        return readText(response.stream, maxAnswerBytes).pipe(
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

      const call = (made: ImageRequest) =>
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
