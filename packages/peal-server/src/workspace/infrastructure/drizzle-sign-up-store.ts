import { and, eq, gt } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";

import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";
import { SignUpStore } from "#workspace/application/sign-up-store.ts";

import { invitation, user } from "./auth-schema.generated.ts";

const failed = (cause: unknown) => new DatabaseError({ cause });

/**
 * Better Auth's accounts and invitations, as a sign-up is decided: an
 * invitation is read by its id, its address and its status.
 */
export const DrizzleSignUpStore = Layer.effect(
  SignUpStore,
  Effect.gen(function* DrizzleSignUpStore() {
    const db = yield* Drizzle;

    const hasAccounts = Effect.fn("SignUpStore.hasAccounts")(
      function* hasAccounts() {
        const rows = yield* db
          .select({ id: user.id })
          .from(user)
          .limit(1)
          .pipe(Effect.mapError(failed));

        return rows.length > 0;
      }
    );

    const invitationTo = Effect.fn("SignUpStore.invitationTo")(
      function* invitationTo(
        invitationId: string,
        email: string,
        at: DateTime.Utc
      ) {
        const rows = yield* db
          .select({ id: invitation.id })
          .from(invitation)
          .where(
            and(
              eq(invitation.id, invitationId),
              eq(invitation.email, email),
              eq(invitation.status, "pending"),
              gt(invitation.expiresAt, DateTime.toDateUtc(at))
            )
          )
          .limit(1)
          .pipe(Effect.mapError(failed));

        return rows.length > 0;
      }
    );

    return SignUpStore.of({ hasAccounts, invitationTo });
  })
);
