import { Context } from "effect";
import type { Effect, Redacted } from "effect";

import type { UserId } from "#shared/domain/ids.ts";

import type { AuthUnavailable } from "./auth-unavailable.ts";

/** Checks a password against the account's, for actions that ask again. */
export class PasswordCheck extends Context.Service<
  PasswordCheck,
  {
    /** Whether it is the account's password; false if it has none. */
    readonly matches: (
      userId: UserId,
      password: Redacted.Redacted
    ) => Effect.Effect<boolean, AuthUnavailable>;
  }
>()("acme-server/workspace/application/PasswordCheck") {}
