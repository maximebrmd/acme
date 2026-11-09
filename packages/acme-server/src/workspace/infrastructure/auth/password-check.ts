import { Effect, Layer, Redacted } from "effect";

import { PasswordCheck } from "#workspace/application/password-check.ts";

import { attempt } from "./attempt.ts";
import { BetterAuth } from "./better-auth.ts";

// Better Auth refuses longer passwords before hashing them; so does this, as
// hashing an unbounded input would let anyone keep the server busy.
const maxPasswordLength = 128;

/**
 * Passwords checked as Better Auth checks them when someone signs in: the
 * account's credential, with its hasher.
 */
export const PasswordCheckLive = Layer.effect(
  PasswordCheck,
  Effect.gen(function* PasswordCheckLive() {
    const auth = yield* BetterAuth;
    const context = yield* Effect.promise(async () => await auth.$context);

    return PasswordCheck.of({
      matches: (userId, password) => {
        const typed = Redacted.value(password);

        return typed.length === 0 || typed.length > maxPasswordLength
          ? Effect.succeed(false)
          : attempt(async () => {
              const credential =
                await context.internalAdapter.findCredentialAccount(userId);

              const hash = credential?.password ?? null;

              return hash === null
                ? false
                : await context.password.verify({ hash, password: typed });
            }).pipe(Effect.withSpan("PasswordCheck.matches"));
      },
    });
  })
);
