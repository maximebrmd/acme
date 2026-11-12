import { Context, DateTime, Effect, Layer, Option, Schema } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { SignUpMode } from "#workspace/domain/sign-up-mode.ts";

import { SignUpSettings } from "./sign-up-settings.ts";
import { SignUpStore } from "./sign-up-store.ts";

const decodeInvitationId = Schema.decodeUnknownOption(
  Schema.String.check(Schema.isUUID())
);

/**
 * Whether someone may make an account: anyone, on an open server; on a
 * server by invitation, whoever names a pending invitation (the id only its
 * emailed or copied link carries) with the address it went to, or the
 * first account of a server that has none, so a new server can be set up.
 * An address alone never passes, so the answer never tells an invited
 * address from another. Two first sign-ups at once may both pass, and the
 * rule opens again should every account be deleted: the operator makes the
 * first account before the address is public.
 */
export class SignUpGate extends Context.Service<
  SignUpGate,
  {
    readonly mayRegister: (
      email: string,
      invitationId: Option.Option<string>
    ) => Effect.Effect<boolean, DatabaseError>;
    /**
     * Who may sign up now, as the sign-up page shows it: anyone on a
     * server by invitation that has no account yet, as its first may be
     * made.
     */
    readonly modeNow: () => Effect.Effect<SignUpMode, DatabaseError>;
  }
>()("peal-server/workspace/application/SignUpGate") {
  /** For tests that sign nobody up, or on an open server: anyone. */
  static readonly anyone = Layer.succeed(
    SignUpGate,
    SignUpGate.of({
      mayRegister: () => Effect.succeed(true),
      modeNow: () => Effect.succeed("open"),
    })
  );

  static readonly layer = Layer.effect(
    SignUpGate,
    Effect.gen(function* SignUpGateLive() {
      const { mode } = yield* SignUpSettings;
      const store = yield* SignUpStore;

      const invited = Effect.fn("SignUpGate.invited")(function* invited(
        email: string,
        invitationId: Option.Option<string>
      ) {
        const id = invitationId.pipe(Option.flatMap(decodeInvitationId));

        if (Option.isNone(id)) {
          return false;
        }

        // Better Auth lower-cases an address before it stores an account or
        // an invitation, and nothing else: the address checked is the one
        // the account would hold.
        return yield* store.invitationTo(
          id.value,
          email.toLowerCase(),
          yield* DateTime.now
        );
      });

      const mayRegister = Effect.fn("SignUpGate.mayRegister")(
        function* mayRegister(
          email: string,
          invitationId: Option.Option<string>
        ) {
          if (mode === "open") {
            return true;
          }

          return (
            (yield* invited(email, invitationId)) ||
            !(yield* store.hasAccounts())
          );
        }
      );

      const modeNow = Effect.fn("SignUpGate.modeNow")(function* modeNow() {
        if (mode === "open") {
          return mode;
        }

        return (yield* store.hasAccounts()) ? mode : "open";
      });

      return SignUpGate.of({ mayRegister, modeNow });
    })
  );
}
