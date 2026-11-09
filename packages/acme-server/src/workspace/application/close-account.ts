import { Context, Effect, Layer, Option } from "effect";
import type { Redacted } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { planClosure } from "#workspace/domain/account-closure.ts";
import type { LastOwner } from "#workspace/domain/last-owner.ts";
import { ownSession } from "#workspace/domain/own-session.ts";
import type { SessionRequired } from "#workspace/domain/session-required.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AccountMail } from "./account-mail.ts";
import { AccountStore } from "./account-store.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import { ContextRecords } from "./context-records.ts";
import { IncorrectPassword } from "./incorrect-password.ts";
import { NotSignedIn } from "./not-signed-in.ts";
import { PasswordCheck } from "./password-check.ts";
import type { TooManyPasswordAttempts } from "./too-many-password-attempts.ts";
import type { BillingUnavailable } from "./billing-unavailable.ts";
import type { WorkspaceBusy } from "./workspace-busy.ts";
import { eraseWorkspace, removeWorkspaceFiles } from "./workspace-erasure.ts";
import type { WorkspaceSubscribed } from "./workspace-subscribed.ts";

/**
 * The right to erasure: deletes the account of the user, in person, once
 * their password confirms it is them. The workspaces where they are the only
 * member go with everything in them, they leave the others, where the posts
 * they wrote stay without an author, and their notices, preferences,
 * sessions and OAuth grants go too, in one transaction. It is refused while
 * they are the only owner of a workspace others still use (`planClosure`),
 * and while one of the workspaces it would delete has a subscription Stripe
 * may still bill, or Stripe cannot be reached to expire its open checkouts.
 * A confirmation is emailed to the address the account had,
 * in its language.
 */
export class CloseAccount extends Context.Service<
  CloseAccount,
  {
    readonly close: (
      principal: UserPrincipal,
      password: Redacted.Redacted
    ) => Effect.Effect<
      void,
      | AuthUnavailable
      | BillingUnavailable
      | DatabaseError
      | IncorrectPassword
      | LastOwner
      | NotSignedIn
      | SessionRequired
      | TooManyPasswordAttempts
      | WorkspaceBusy
      | WorkspaceSubscribed
    >;
  }
>()("acme-server/workspace/application/CloseAccount") {
  static readonly layer = Layer.effect(
    CloseAccount,
    Effect.gen(function* CloseAccountLive() {
      const ports = yield* Effect.context<
        AccountStore | ContextRecords | TransactionRunner
      >();

      const store = yield* AccountStore;
      const records = yield* ContextRecords;
      const passwords = yield* PasswordCheck;
      const mail = yield* AccountMail;
      const { transaction } = yield* TransactionRunner;

      const close = Effect.fn("CloseAccount.close")(function* close(
        principal: UserPrincipal,
        password: Redacted.Redacted
      ) {
        const userId = yield* Effect.fromResult(ownSession(principal));

        if (!(yield* passwords.matches(userId, password))) {
          yield* new IncorrectPassword();
        }

        const { user } = yield* store.records(userId).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new NotSignedIn()),
              onSome: Effect.succeed,
            })
          )
        );

        const deleted = yield* transaction(
          Effect.gen(function* closeInTransaction() {
            const plan = yield* Effect.fromResult(
              planClosure(yield* store.standings(userId))
            );

            yield* Effect.forEach(plan.deleted, eraseWorkspace, {
              discard: true,
            });

            yield* records.eraseUser(userId);
            yield* store.deleteUser(userId);

            return plan.deleted;
          })
        );

        yield* Effect.forEach(deleted, removeWorkspaceFiles, { discard: true });
        yield* mail.deleted({ email: user.email, locale: user.locale });
      }, Effect.provideContext(ports));

      return CloseAccount.of({ close });
    })
  );
}
