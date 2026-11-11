import { Effect, Layer } from "effect";

import { ModerationFailed } from "#staff/application/moderation-failed.ts";
import { Moderation } from "#staff/application/ports/moderation.ts";
import { AccountModeration } from "#workspace/application/account-moderation.ts";
import type { AuthUnavailable } from "#workspace/application/auth-unavailable.ts";

const failed = Effect.mapError(
  ({ cause }: AuthUnavailable) => new ModerationFailed({ cause })
);

/** Staff's actions through the workspace context's Better Auth. */
export const AccountsModeration = Layer.effect(
  Moderation,
  Effect.gen(function* AccountsModeration() {
    const accounts = yield* AccountModeration;

    return Moderation.of({
      ban: ({ expiresAt, reason, staff, userId }) =>
        accounts
          .ban({ expiresAt, reason, staffSession: staff.session, userId })
          .pipe(failed),
      impersonate: ({ staff, userId }) =>
        accounts
          .impersonate({ staffSession: staff.session, userId })
          .pipe(failed),
      resendVerification: (account) =>
        accounts.resendVerification(account).pipe(failed),
      resetTwoStep: ({ staff, userId }) =>
        accounts
          .resetTwoStep({ staffSession: staff.session, userId })
          .pipe(failed),
      revokeSessions: ({ staff, userId }) =>
        accounts
          .revokeSessions({ staffSession: staff.session, userId })
          .pipe(failed),
      unban: ({ staff, userId }) =>
        accounts.unban({ staffSession: staff.session, userId }).pipe(failed),
    });
  })
);
