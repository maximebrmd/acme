import { Effect, Option, Schema } from "effect";
import type { HttpClientResponse } from "effect/http";

import { closedJson } from "#shared/infrastructure/platforms/truncated-json.ts";

/**
 * The most of a thread Peal reads in one answer. A post with thousands of
 * replies answers with more: the read keeps what came first, which holds
 * far more comments than a thread keeps (`commentsPerThread`), and says it
 * is not all of them.
 */
export const maxThreadBytes = 8 * 1_048_576;

/** A thread as a platform answered it, and whether the answer was whole. */
export interface ThreadBody<A> {
  readonly body: A;
  /** False when the answer was cut off at `maxThreadBytes`. */
  readonly whole: boolean;
}

/**
 * Reads a thread from an answer that may have been cut off (a client with
 * `overflow: "truncate"`): whole when it parses, otherwise what it held
 * whole before the cut. None when it is not the thread at all.
 */
export const threadBodyOf = <S extends Schema.Top>(schema: S) => {
  const decode = Schema.decodeUnknownEffect(Schema.fromJsonString(schema));

  return (
    response: HttpClientResponse.HttpClientResponse
  ): Effect.Effect<
    Option.Option<ThreadBody<S["Type"]>>,
    never,
    S["DecodingServices"]
  > =>
    Effect.gen(function* readThread() {
      const text = yield* response.text;
      const whole = yield* decode(text).pipe(Effect.option);

      if (Option.isSome(whole)) {
        return Option.some({ body: whole.value, whole: true });
      }

      const closed = closedJson(text);

      if (Option.isNone(closed)) {
        return Option.none();
      }

      return (yield* decode(closed.value).pipe(Effect.option)).pipe(
        Option.map((body) => ({ body, whole: false }))
      );
    }).pipe(Effect.orElseSucceed(() => Option.none()));
};
