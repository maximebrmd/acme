import { Context, Effect, Layer, Option } from "effect";
import type { Redacted } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { planClosure } from "#workspace/domain/account-closure.ts";
import type { LastOwner } from "#workspace/domain/last-owner.ts";
import { ownSession } from "#workspace/domain/own-session.ts";
import type { SessionRequired } from "#workspace/domain/session-required.ts";
import type { UserPrincipal } from "#workspace/domain/user-principal.ts";

import { AccountMail } from "./account-mail.ts";
import { AccountStore } from "./account-store.ts";
import type { AuthUnavailable } from "./auth-unavailable.ts";
import type { BillingUnavailable } from "./billing-unavailable.ts";
import { ContextRecords } from "./context-records.ts";
import type { WorkspaceErasureOptions } from "./context-records.ts";
import type { ErasureLedgerUnavailable } from "./erasure-ledger-unavailable.ts";
import type { ErasureLedger } from "./erasure-ledger.ts";
import type { ErasureIncomplete } from "./erasure-incomplete.ts";
import { IncorrectPassword } from "./incorrect-password.ts";
import { NotSignedIn } from "./not-signed-in.ts";
import { PasswordCheck } from "./password-check.ts";
import type { TooManyPasswordAttempts } from "./too-many-password-attempts.ts";
import type { WorkspaceBusy } from "./workspace-busy.ts";
import {
  confirmErasure,
  discardOnFailure,
  eraseWorkspace,
  erasureOf,
  recordErasure,
  removeWorkspaceFiles,
  reportCancelledFirst,
} from "./workspace-erasure.ts";
import type { WorkspaceSubscribed } from "./workspace-subscribed.ts";

/**
 * The right to erasure: deletes the account of the user, in person, once
 * their password confirms it is them. The workspaces where they are the only
 * member go with everything in them, they leave the others, where the posts
 * they wrote stay without an author, and their notices, preferences,
 * sessions and OAuth grants go too, in one transaction. It is refused while
 * they are the only owner of a workspace others still use (`planClosure`),
 * and while Stripe cannot be reached. A subscription Stripe may still bill
 * one of the workspaces it deletes through is cancelled at once, when
 * `options` says the user agreed to, before the transaction and once
 * nothing else refuses; otherwise the closure is refused
 * (`WorkspaceSubscribed`, listing what cancelling would end in each).
 * On a server that keeps what the law has a host keep, only that is left,
 * apart from everything else and readable only on a legal request: who
 * held the account, 5 years, and how they signed in and paid, 1 year
 * (`holdIdentification`); with the connections that made content, each
 * kept a year since it was made. A confirmation is emailed to the address
 * the account had, in its language, saying what stays, if anything
 * (`legalRemains`).
 */
export class CloseAccount extends Context.Service<
  CloseAccount,
  {
    readonly close: (
      principal: UserPrincipal,
      password: Redacted.Redacted,
      options: WorkspaceErasureOptions
    ) => Effect.Effect<
      void,
      | AuthUnavailable
      | BillingUnavailable
      | DatabaseError
      | ErasureLedgerUnavailable
      | IncorrectPassword
      | LastOwner
      | NotSignedIn
      | SessionRequired
      | TooManyPasswordAttempts
      | ErasureIncomplete
      | WorkspaceBusy
      | WorkspaceSubscribed
    >;
  }
>()("peal-server/workspace/application/CloseAccount") {
  static readonly layer = Layer.effect(
    CloseAccount,
    Effect.gen(function* CloseAccountLive() {
      const ports = yield* Effect.context<
        AccountStore | ContextRecords | ErasureLedger | Ids | TransactionRunner
      >();

      const store = yield* AccountStore;
      const records = yield* ContextRecords;
      const passwords = yield* PasswordCheck;
      const mail = yield* AccountMail;
      const { transaction } = yield* TransactionRunner;

      const close = Effect.fn("CloseAccount.close")(function* close(
        principal: UserPrincipal,
        password: Redacted.Redacted,
        options: WorkspaceErasureOptions
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

        // What it would delete, so Stripe's side, which cannot be undone,
        // is settled first, once nothing else refuses.
        const planned = yield* Effect.fromResult(
          planClosure(yield* store.standings(userId))
        );

        const { subscriptionsCancelled } = yield* records.settleWorkspaces(
          planned.deleted,
          options
        );

        // What the confirmation says stays, read while the account is there.
        const legalHold = yield* records.legalRemains(userId);

        // The ledger's entry, completed with the workspaces deleted once
        // the transaction knows them.
        const closing = yield* erasureOf(userId, []);

        const erasure = yield* transaction(
          Effect.gen(function* closeInTransaction() {
            // Again, under the workspaces' locks: a workspace someone
            // joined meanwhile is left rather than deleted.
            const plan = yield* Effect.fromResult(
              planClosure(yield* store.standings(userId))
            );

            // Who held the account, as the law has Peal keep it, read
            // before anything goes: the Stripe customers of the
            // workspaces it deletes included.
            const identification = yield* store.identification(
              userId,
              plan.deleted
            );

            yield* Effect.forEach(plan.deleted, eraseWorkspace, {
              discard: true,
            });

            yield* records.eraseUser(userId, user.email);
            yield* store.deleteUser(userId);

            yield* Effect.forEach(
              Option.toArray(identification),
              // As closed at the instant the ledger gives, so applying the
              // closure again after a restore holds the same record.
              (held) => records.holdIdentification(held, closing.at),
              { discard: true }
            );

            // Last: nothing is committed that the ledger does not hold.
            const entry = { ...closing, workspaceIds: plan.deleted };

            yield* recordErasure(entry);

            return entry;
          })
        ).pipe(
          discardOnFailure(closing),
          reportCancelledFirst(subscriptionsCancelled)
        );

        yield* confirmErasure(erasure);

        const deleted = erasure.workspaceIds;

        yield* Effect.forEach(deleted, removeWorkspaceFiles, { discard: true });

        // Ids only, as the ledger holds them.
        yield* Effect.logInfo("Closed an account").pipe(
          Effect.annotateLogs({
            "event.name": "peal.erasure",
            subscriptionsCancelled,
            userId,
            workspaceIds: deleted.join(","),
          })
        );

        yield* mail.deleted({
          email: user.email,
          legalHold,
          locale: user.locale,
          subscriptionsCancelled,
        });
      }, Effect.provideContext(ports));

      return CloseAccount.of({ close });
    })
  );
}
