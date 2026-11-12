import { Effect, Option, Redacted, Result, Schema, Stream } from "effect";
import type { Duration } from "effect";
import { Base64 } from "effect/encoding";
import { HttpClientRequest } from "effect/http";
import type { HttpClientResponse } from "effect/http";

import { ImageFailed } from "#assistant/application/image-failed.ts";
import type {
  ImageRequest,
  MadeImage,
} from "#assistant/application/ports/image-model.ts";
import type { ImageAspect } from "#assistant/domain/image-aspect.ts";
import { maxImageBytes } from "#assistant/domain/image-limits.ts";
import { publicHttpClientWith } from "#shared/infrastructure/platforms/public-http.ts";

// What the server's image model and a workspace's own provider share: the
// request `POST {base}/images/generations` takes, and how its answer is
// read. Each caller decides how the request is sent and what the statuses
// that refuse the settings mean.

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

/** An endpoint's settings: where it is, which model, and its key if any. */
export interface ImageEndpoint {
  /** None for an endpoint that takes requests without a key. */
  readonly apiKey: Option.Option<Redacted.Redacted>;
  /** The API's base URL, which `/images/generations` follows. */
  readonly baseUrl: string;
  readonly model: string;
}

/** Fails with ImageFailed after recording the kind of failure, never a body. */
export type FailWith = (
  kind: string,
  reason: ImageFailed["reason"]
) => Effect.Effect<never, ImageFailed>;

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

/** The image failed for this reason, with no cause. */
export const imageFailure = (reason: ImageFailed["reason"]) =>
  new ImageFailed({ reason });

// Counts the bytes read, failing once there are more than `limit`:
// nothing past it is read.
const bounded = <E>(stream: Stream.Stream<Uint8Array, E>, limit: number) => {
  let total = 0;

  return stream.pipe(
    Stream.mapError(() => imageFailure("unusableAnswer")),
    Stream.mapEffect((chunk) => {
      total += chunk.byteLength;

      return total > limit
        ? Effect.fail(imageFailure("unusableAnswer"))
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

/**
 * The statuses that say the settings are wrong: a key refused or not
 * allowed, an account that does not pay, a model or an address the
 * provider does not have. Nothing ran.
 */
export const settingsRefused: ReadonlySet<number> = new Set([
  401, 402, 403, 404,
]);

/**
 * What another status that is not a success means: a rate limit or a
 * failure of the provider, or a refusal of this request. In either case
 * no image was made.
 */
export const reasonOfStatus = (status: number): ImageFailed["reason"] =>
  status === 429 || status >= 500 ? "unreachable" : "refused";

const imageOf = (bytes: Uint8Array): Result.Result<MadeImage, ImageFailed> =>
  bytes.byteLength === 0 || bytes.byteLength > maxImageBytes
    ? Result.fail(imageFailure("unusableAnswer"))
    : Result.succeed({ bytes });

/**
 * The request for one image: a JSON body of the model, the prompt, one
 * image and its size, the key as a bearer token when there is one (the
 * only place a string is made of it), and no `response_format`, which
 * current models refuse: they answer in base64.
 */
export const imagesRequest = (
  { apiKey, baseUrl, model }: ImageEndpoint,
  { aspect, prompt }: ImageRequest
) =>
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

/**
 * Reads a successful answer into an image: its text bounded by
 * `maxAnswerBytes`, its image in base64 or at an address, which came from
 * outside and is fetched through the public HTTP client (the outbound
 * guard checks it, no redirect is followed), bounded by `maxImageBytes`.
 * Needs the HttpClient and the OutboundGuard.
 */
export const imageAnswers = ({
  timeout,
}: {
  readonly timeout: Duration.Input;
}) =>
  Effect.gen(function* readImageAnswers() {
    const guarded = yield* publicHttpClientWith({
      maxResponseBytes: maxImageBytes + 1,
      timeout,
    });

    const fetchImage = (url: string) =>
      // An address that is not absolute leads nowhere.
      URL.canParse(url)
        ? guarded.execute(HttpClientRequest.get(url)).pipe(
            Effect.withTracerEnabled(false),
            Effect.mapError(() => imageFailure("unusableAnswer")),
            Effect.flatMap((response) =>
              response.status === 200
                ? readBytes(response.stream, maxImageBytes)
                : Effect.fail(imageFailure("unusableAnswer"))
            )
          )
        : Effect.fail(imageFailure("unusableAnswer"));

    const bytesOf = (answer: string) =>
      Result.match(decodeAnswer(answer), {
        onFailure: () => Effect.fail(imageFailure("unusableAnswer")),
        onSuccess: ({ data: [first] }) => {
          if (first?.b64_json !== undefined && first.b64_json !== null) {
            return Effect.fromResult(
              Result.mapError(Base64.decode(first.b64_json), () =>
                imageFailure("unusableAnswer")
              )
            );
          }

          return first?.url === undefined || first.url === null
            ? Effect.fail(imageFailure("unusableAnswer"))
            : fetchImage(first.url);
        },
      });

    /** The image a 2xx answer holds, or `unusableAnswer` through `failWith`. */
    return (
      response: HttpClientResponse.HttpClientResponse,
      failWith: FailWith
    ): Effect.Effect<MadeImage, ImageFailed> =>
      readText(response.stream, maxAnswerBytes).pipe(
        Effect.flatMap(bytesOf),
        Effect.flatMap((bytes) => Effect.fromResult(imageOf(bytes))),
        Effect.catchTag("ImageFailed", ({ reason }) =>
          failWith("UnusableAnswer", reason)
        )
      );
  });
