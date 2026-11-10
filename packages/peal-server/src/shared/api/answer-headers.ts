import { Context, Effect, Option } from "effect";

/**
 * Headers for the answer to the request being handled, whatever it turns
 * out to be: an error is encoded after its handler and middlewares ran, so
 * they leave here what its answer must carry (a challenge, the limits that
 * apply). The server's answers middleware provides it and writes them.
 */
export class AnswerHeaders extends Context.Service<
  AnswerHeaders,
  {
    readonly set: (name: string, value: string) => Effect.Effect<void>;
  }
>()("peal-server/shared/api/AnswerHeaders") {}

/**
 * Sets a header on the answer, where answers take them: nothing happens in
 * a test that serves handlers alone.
 */
export const setAnswerHeader = (name: string, value: string) =>
  Effect.serviceOption(AnswerHeaders).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (headers) => headers.set(name, value),
      })
    )
  );
