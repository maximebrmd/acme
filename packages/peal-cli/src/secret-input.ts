import { Effect, Redacted, Stdio, Stream } from "effect";
import { Prompt } from "effect/cli";

import { Refused } from "#refused.ts";

// The most a secret read from standard input may be: what the API takes,
// with room for a line break.
const maxSecretBytes = 4096;

const tooLong = new Refused({
  reason: `What standard input holds is longer than ${String(maxSecretBytes)} bytes: give the key alone. Nothing was saved.`,
});

// Standard input as text, read until it ends and refused past
// `maxSecretBytes`: a secret piped in.
const piped = Effect.gen(function* piped() {
  const stdio = yield* Stdio.Stdio;
  const decoder = new TextDecoder();
  let size = 0;

  const parts = yield* stdio.stdin.pipe(
    Stream.mapError(
      () =>
        new Refused({
          reason: "Standard input could not be read: nothing was saved.",
        })
    ),
    Stream.mapEffect((chunk) => {
      size += chunk.byteLength;

      return size > maxSecretBytes
        ? Effect.fail(tooLong)
        : Effect.succeed(decoder.decode(chunk, { stream: true }));
    }),
    Stream.runCollect
  );

  return [...parts, decoder.decode()].join("");
});

/**
 * A secret the command line never takes as an argument, which the shell's
 * history and the list of processes keep: typed at a terminal, without
 * echo, or read from standard input when it is not one (the key piped in,
 * its final line break dropped). Kept `Redacted`; blank is refused.
 */
export const readSecret = (question: string) =>
  Effect.gen(function* readingSecret() {
    const stdio = yield* Stdio.Stdio;

    const text = (yield* stdio.stdinIsTerminal)
      ? Redacted.value(
          yield* Prompt.run(Prompt.Hidden({ message: question })).pipe(
            Effect.catchTag("QuitError", () =>
              Effect.fail(
                new Refused({ reason: "Nothing was typed: nothing was saved." })
              )
            )
          )
        )
      : yield* piped;

    const secret = text.replace(/\r?\n$/u, "");

    if (secret.trim() === "") {
      return yield* new Refused({
        reason:
          "The key is empty: type it when asked, or pipe it on standard input. Nothing was saved.",
      });
    }

    return Redacted.make(secret);
  });
