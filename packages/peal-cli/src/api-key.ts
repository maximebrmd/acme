import { Config, Effect, Option, Redacted } from "effect";

import { Refused } from "#refused.ts";

/** The variable a workspace API key is read from. */
export const apiKeyVariable = "PEAL_API_KEY";

/**
 * The workspace API key the command line sends instead of a saved sign-in,
 * for runs nobody attends: read from the environment alone, never a flag,
 * which would land in the shell's history and in the list of processes. It
 * stays redacted, and is never printed. A blank value is no key.
 */
export const apiKey = Config.Redacted(apiKeyVariable).pipe(
  Config.option,
  Effect.orElseSucceed(() => Option.none<Redacted.Redacted>()),
  Effect.map(Option.filter((key) => Redacted.value(key).trim() !== ""))
);

/** Whether the run uses an API key. */
export const usesApiKey = apiKey.pipe(Effect.map(Option.isSome));

/**
 * Refuses what only a person does, before any request, when the run uses
 * an API key: a key belongs to a workspace and is nobody.
 */
export const personOnly = (what: string) =>
  usesApiKey.pipe(
    Effect.flatMap((key) =>
      key
        ? Effect.fail(
            new Refused({
              code: "person_required",
              reason: `An API key cannot ${what}: a key belongs to a workspace, not to a person. ${apiKeyVariable} is set, so this command line uses it: unset it, then sign in with peal login.`,
            })
          )
        : Effect.void
    )
  );
