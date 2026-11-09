import { Context } from "effect";
import type { Effect, Redacted } from "effect";

import type { UserId } from "#shared/domain/ids.ts";

import type { AuthUnavailable } from "./auth-unavailable.ts";
import type { TooManyPasswordAttempts } from "./too-many-password-attempts.ts";

/**
 * Checks a password against the account's, for actions that ask again, as
 * often as signing in allows: three tries within 10 seconds per account.
 */
export class PasswordCheck extends Context.Service<
  PasswordCheck,
  {
    /** Whether it is the account's password; false if it has none. */
    readonly matches: (
      userId: UserId,
      password: Redacted.Redacted
    ) => Effect.Effect<boolean, AuthUnavailable | TooManyPasswordAttempts>;
  }
>()("peal-server/workspace/application/PasswordCheck") {}
