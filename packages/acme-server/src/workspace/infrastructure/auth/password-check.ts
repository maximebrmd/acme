import { Clock, Effect, Layer, Redacted, Ref } from "effect";

import type { UserId } from "#shared/domain/ids.ts";
import { PasswordCheck } from "#workspace/application/password-check.ts";
import { TooManyPasswordAttempts } from "#workspace/application/too-many-password-attempts.ts";

import { attempt } from "./attempt.ts";
import { BetterAuth } from "./better-auth.ts";
import { admitAttempt, forgetAttempts } from "./password-attempts.ts";
import type { PasswordAttempts } from "./password-attempts.ts";

// Better Auth refuses longer passwords before hashing them; so does this, as
// hashing an unbounded input would let anyone keep the server busy.
const maxPasswordLength = 128;

/**
 * Passwords checked as Better Auth checks them when someone signs in: the
 * account's credential, with its hasher, and no more often than its own
 * routes allow (`passwordAttemptLimit`), counted per account in this
 * process, so a stolen session cannot guess the password faster than the
 * sign-in form would let it.
 */
export const PasswordCheckLive = Layer.effect(
  PasswordCheck,
  Effect.gen(function* PasswordCheckLive() {
    const auth = yield* BetterAuth;
    const context = yield* Effect.promise(async () => await auth.$context);
    const attempts = yield* Ref.make<PasswordAttempts>(new Map());

    const verify = (userId: string, typed: string) =>
      typed.length === 0 || typed.length > maxPasswordLength
        ? Effect.succeed(false)
        : attempt(async () => {
            const credential =
              await context.internalAdapter.findCredentialAccount(userId);

            const hash = credential?.password ?? null;

            return hash === null
              ? false
              : await context.password.verify({ hash, password: typed });
          });

    return PasswordCheck.of({
      matches: Effect.fn("PasswordCheck.matches")(function* matches(
        userId: UserId,
        password: Redacted.Redacted
      ) {
        const now = yield* Clock.currentTimeMillis;

        const admitted = yield* Ref.modify(attempts, (tried) =>
          admitAttempt(tried, userId, now)
        );

        if (!admitted) {
          return yield* new TooManyPasswordAttempts();
        }

        const matched = yield* verify(userId, Redacted.value(password));

        if (matched) {
          yield* Ref.update(attempts, (tried) => forgetAttempts(tried, userId));
        }

        return matched;
      }),
    });
  })
);
