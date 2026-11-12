import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/** What deciding a sign-up reads of the accounts and invitations. */
export class SignUpStore extends Context.Service<
  SignUpStore,
  {
    /** Whether the server has any account at all. */
    readonly hasAccounts: () => Effect.Effect<boolean, DatabaseError>;
    /**
     * Whether a workspace invited this address (lower case) and the
     * invitation is still pending at `at`: neither accepted, rejected nor
     * cancelled, nor expired.
     */
    readonly hasPendingInvitation: (
      email: string,
      at: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/workspace/application/SignUpStore") {}
