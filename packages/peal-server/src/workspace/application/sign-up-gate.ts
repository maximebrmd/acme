import { Context, DateTime, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

import { SignUpSettings } from "./sign-up-settings.ts";
import { SignUpStore } from "./sign-up-store.ts";

/**
 * Whether an address may make an account: any, on an open server; on a
 * server by invitation, one a workspace invited and whose invitation is
 * pending, or the first account of a server that has none, so a new
 * server can be set up. Two first sign-ups at once may both pass: the
 * operator makes the first account before the address is public.
 */
export class SignUpGate extends Context.Service<
  SignUpGate,
  {
    readonly mayRegister: (
      email: string
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/workspace/application/SignUpGate") {
  static readonly layer = Layer.effect(
    SignUpGate,
    Effect.gen(function* SignUpGateLive() {
      const { mode } = yield* SignUpSettings;
      const store = yield* SignUpStore;

      const mayRegister = Effect.fn("SignUpGate.mayRegister")(
        function* mayRegister(email: string) {
          if (mode === "open") {
            return true;
          }

          // Better Auth lower-cases an address before it stores an
          // account or an invitation, and compares them so.
          const invited = yield* store.hasPendingInvitation(
            email.trim().toLowerCase(),
            yield* DateTime.now
          );

          return invited || !(yield* store.hasAccounts());
        }
      );

      return SignUpGate.of({ mayRegister });
    })
  );
}
