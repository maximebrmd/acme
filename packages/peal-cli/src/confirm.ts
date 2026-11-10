import { Console, Effect, Stdio, Terminal } from "effect";

import { Refused } from "#refused.ts";

/** The flag that answers a confirmation beforehand. */
export const yesFlagName = "yes";

/** The code of a refusal for want of a confirmation, as --json names it. */
export const confirmationRequired = "confirmation_required";

const saysYes = (line: string): boolean => /^y(?:es)?$/iu.test(line.trim());

/**
 * What --json answers a command that would ask: it never asks, as its
 * reader is a program, so the person's agreement comes as --yes or the
 * command does nothing. Checked before any request.
 */
export const neverAsksInJson = (input: {
  readonly json: boolean;
  /** Why the command asks, as in "boosting a post spends money". */
  readonly why: string;
  readonly yes: boolean;
}) =>
  input.json && !input.yes
    ? Effect.fail(
        new Refused({
          code: confirmationRequired,
          reason: `--${yesFlagName} is required with --json: ${input.why}, and --json never asks. Nothing was done. Pass --${yesFlagName} only once the person who decides agreed to exactly this.`,
        })
      )
    : Effect.void;

// Whether the person at the terminal types yes to the question. Without
// a terminal nobody can be asked.
const asked = (question: string) =>
  Effect.gen(function* asking() {
    const stdio = yield* Stdio.Stdio;

    if (!(yield* stdio.stdinIsTerminal)) {
      return yield* new Refused({
        code: confirmationRequired,
        reason: `Nothing was done: this needs a confirmation, and the command's input is not a terminal, so nobody can be asked. Run it again with --${yesFlagName} once the person who decides agreed to exactly this.`,
      });
    }

    const terminal = yield* Terminal.Terminal;

    yield* Console.log(`${question} Type yes to confirm:`);

    // Someone who leaves without answering did not agree.
    return saysYes(
      yield* terminal.readLine.pipe(Effect.orElseSucceed(() => ""))
    );
  });

/**
 * The person's agreement to what was just printed: --yes, or `yes` typed
 * at the terminal. Without a terminal the command stops rather than go on
 * unasked.
 */
export const confirmed = (input: {
  /** What is asked, as a question. */
  readonly question: string;
  readonly yes: boolean;
}) =>
  input.yes
    ? Effect.void
    : asked(input.question).pipe(
        Effect.flatMap((agreed) =>
          agreed
            ? Effect.void
            : Effect.fail(
                new Refused({
                  code: "not_confirmed",
                  reason: "Not confirmed: nothing was done.",
                })
              )
        )
      );
