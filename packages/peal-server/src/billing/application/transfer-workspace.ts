import { Context, DateTime, Effect, Layer, Option } from "effect";

import {
  AccountTransfer,
  AccountTransferIdSchema,
  transferLifetime,
} from "#billing/domain/account-transfer.ts";
import type { BillingAccount } from "#billing/domain/billing-account.ts";
import { BillingOff } from "#billing/domain/billing-off.ts";
import { entitlementsOf } from "#billing/domain/entitlements.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { stillBills } from "#billing/domain/subscription.ts";
import { TransferNotFound } from "#billing/domain/transfer-not-found.ts";
import { TransferRefused } from "#billing/domain/transfer-refused.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Ids } from "#shared/application/ids.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Actor } from "#shared/domain/access.ts";
import { roomFor } from "#shared/domain/allowance.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

import { BillingAccounts } from "./billing-accounts.ts";
import { AccountChannels } from "./ports/account-channels.ts";
import { AccountPayers } from "./ports/account-payers.ts";
import { BillingAccountStore } from "./ports/billing-account-store.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { StartAccountDays } from "./start-account-days.ts";

type Refusals = BillingOff | DatabaseError | MissingPermission | PersonRequired;

const sum = (counts: ReadonlyMap<WorkspaceId, number>): number =>
  [...counts.values()].reduce((total, count) => total + count, 0);

/**
 * Hands a workspace to another payer: its payer, in person, offers it to
 * another of its owners, who takes it over in person within 7 days
 * (`transferLifetime`). Taking it moves the workspace to their billing
 * account, made with it as billing workspace if they have none, under the
 * person's hold and both accounts' (in the order of their ids), so offers
 * that cross each other take turns. It is refused when the account taking
 * it has no room for its channels, whatever its plan (never above what is
 * paid for), and while the workspace bills its account with a
 * subscription Stripe may still charge. A partner's workspaces are not
 * handed over. Only on a server that bills.
 */
export class TransferWorkspace extends Context.Service<
  TransferWorkspace,
  {
    readonly offer: (
      actor: Actor,
      toUserId: UserId
    ) => Effect.Effect<AccountTransfer, Refusals | TransferRefused>;
    readonly accept: (
      actor: Actor
    ) => Effect.Effect<
      BillingAccount,
      Refusals | PlanLimitReached | TransferNotFound | TransferRefused
    >;
    /** Withdraws the offer, as its payer, or declines it, as its owner. */
    readonly withdraw: (
      actor: Actor
    ) => Effect.Effect<void, Refusals | TransferNotFound>;
  }
>()("peal-server/billing/application/TransferWorkspace") {
  static readonly layer = Layer.effect(
    TransferWorkspace,
    Effect.gen(function* TransferWorkspaceLive() {
      const { enabled } = yield* BillingMode;
      const accounts = yield* BillingAccounts;
      const store = yield* BillingAccountStore;
      const payers = yield* AccountPayers;
      const subscriptions = yield* Subscriptions;
      const channels = yield* AccountChannels;
      const { transaction } = yield* TransactionRunner;
      const context = yield* Effect.context<Ids>();
      const days = yield* StartAccountDays;

      // A day not raised now is raised by the next hourly start: the move
      // stands.
      const raisedDay = (accountId: BillingAccount["id"]) =>
        days
          .raiseAccount(accountId)
          .pipe(
            Effect.catchCause((cause) =>
              Effect.logWarning(
                "Raising the day of the account a workspace moved into failed",
                cause
              )
            )
          );

      // The member in person, on a server that bills.
      const personOf = Effect.fn("TransferWorkspace.personOf")(
        function* personOf(actor: Actor) {
          if (!enabled) {
            return yield* new BillingOff();
          }

          yield* Effect.fromResult(authorize(actor, "billing:manage"));

          return yield* Effect.fromResult(inPerson(actor));
        }
      );

      // A billing workspace whose subscription Stripe may still charge
      // stays with its account until that subscription is cancelled.
      const ensureMovable = (
        workspaceId: WorkspaceId,
        account: BillingAccount
      ): Effect.Effect<void, DatabaseError | TransferRefused> => {
        if (Option.isSome(account.partnerId)) {
          return Effect.fail(
            new TransferRefused({ reason: "partnerWorkspace" })
          );
        }

        if (account.holder !== workspaceId) {
          return Effect.void;
        }

        return subscriptions
          .ofWorkspace(workspaceId)
          .pipe(
            Effect.flatMap((held) =>
              held.some(stillBills)
                ? Effect.fail(new TransferRefused({ reason: "subscribed" }))
                : Effect.void
            )
          );
      };

      const offer = Effect.fn("TransferWorkspace.offer")(function* offer(
        actor: Actor,
        toUserId: UserId
      ) {
        const userId = yield* personOf(actor);
        const { workspaceId } = actor;
        const account = yield* accounts.of(workspaceId);

        yield* ensureMovable(workspaceId, account);

        if (!Option.contains(account.payer, userId)) {
          return yield* new TransferRefused({ reason: "notPayer" });
        }

        if (toUserId === userId) {
          return yield* new TransferRefused({ reason: "samePayer" });
        }

        if (!(yield* payers.ownersOf(workspaceId)).includes(toUserId)) {
          return yield* new TransferRefused({ reason: "notAnOwner" });
        }

        const now = yield* DateTime.now;

        const offered = new AccountTransfer({
          expiresAt: DateTime.addDuration(now, transferLifetime),
          fromAccountId: account.id,
          id: yield* newId(AccountTransferIdSchema).pipe(
            Effect.provide(context)
          ),
          offeredAt: now,
          offeredBy: userId,
          toUserId,
          workspaceId,
        });

        yield* store.offer(offered);

        return offered;
      });

      // The plan the receiving account bills on: its billing workspace's
      // own subscriptions, or the workspace's when it makes the account,
      // with the account's free tier (or the person's, for an account
      // made then).
      const allowanceOf = (holder: WorkspaceId, freeTier: boolean) =>
        subscriptions.ofWorkspace(holder).pipe(
          Effect.map((held) =>
            // Per-account pricing not paid yet holds its ceiling, as a
            // connection does.
            entitlementsOf(held, freeTier).connectableAccounts()
          )
        );

      const accept = Effect.fn("TransferWorkspace.accept")(function* accept(
        actor: Actor
      ) {
        const userId = yield* personOf(actor);
        const { workspaceId } = actor;

        return yield* transaction(
          Effect.gen(function* accepting() {
            yield* store.holdPayer(userId);

            const offered = yield* store.transferOf(workspaceId);
            const now = yield* DateTime.now;

            if (
              Option.isNone(offered) ||
              offered.value.toUserId !== userId ||
              DateTime.isLessThanOrEqualTo(offered.value.expiresAt, now)
            ) {
              return yield* new TransferNotFound();
            }

            const from = yield* store.get(offered.value.fromAccountId);
            const to = yield* store.personalOf(userId);

            // Both accounts held, in the order of their ids.
            yield* Effect.forEach(
              [
                offered.value.fromAccountId,
                ...Option.toArray(to).map(({ id }) => id),
              ].toSorted(),
              (id) => store.holdAccount(id),
              { discard: true }
            );

            const current = yield* store.accountOf(workspaceId);

            if (
              Option.isNone(from) ||
              !Option.exists(current, ({ id }) => id === from.value.id)
            ) {
              return yield* new TransferNotFound();
            }

            yield* ensureMovable(workspaceId, from.value);

            if (!(yield* payers.ownersOf(workspaceId)).includes(userId)) {
              return yield* new TransferRefused({ reason: "notAnOwner" });
            }

            if (Option.contains(from.value.payer, userId)) {
              return yield* new TransferRefused({ reason: "samePayer" });
            }

            const theirs = Option.isSome(to)
              ? yield* store.workspacesOf(to.value.id)
              : [];

            const [held, moving] = yield* Effect.all([
              channels.ownIn(theirs),
              channels.ownIn([workspaceId]),
            ]);

            yield* Effect.fromResult(
              roomFor(
                "channels",
                yield* Option.match(to, {
                  onNone: () =>
                    store
                      .requiresPayment(userId, Option.none())
                      .pipe(
                        Effect.flatMap((required) =>
                          allowanceOf(workspaceId, !required)
                        )
                      ),
                  onSome: ({ freeTier, holder }) =>
                    allowanceOf(holder, freeTier),
                }),
                sum(held),
                sum(moving)
              )
            );

            return yield* accounts.moveTo(workspaceId, from.value, userId);
          })
        ).pipe(
          // The receiving account holds the workspace's accounts from
          // today: its day is raised to them.
          Effect.tap((taken) => raisedDay(taken.id))
        );
      });

      const withdraw = Effect.fn("TransferWorkspace.withdraw")(
        function* withdraw(actor: Actor) {
          const userId = yield* personOf(actor);

          const offered = yield* store.transferOf(actor.workspaceId);

          if (
            Option.isNone(offered) ||
            (offered.value.offeredBy !== userId &&
              offered.value.toUserId !== userId)
          ) {
            return yield* new TransferNotFound();
          }

          return yield* store.deleteTransfer(offered.value.id);
        }
      );

      return TransferWorkspace.of({ accept, offer, withdraw });
    })
  );
}
