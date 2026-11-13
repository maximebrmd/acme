import { Context, DateTime, Effect, Layer, Option } from "effect";

import {
  accountDayIdentifier,
  unreportedOf,
} from "#billing/domain/account-days.ts";
import type { AccountDay } from "#billing/domain/account-days.ts";
import { entitlementsOf } from "#billing/domain/entitlements.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { AccountDayStore } from "./ports/account-day-store.ts";
import type { MeterReport, PeakRaise } from "./ports/account-day-store.ts";
import { BillingMode } from "./ports/billing-mode.ts";
import { PlanHolders } from "./ports/plan-holders.ts";
import { Subscriptions } from "./ports/subscriptions.ts";
import { UsageBilling } from "./ports/usage-billing.ts";

/**
 * Each billing account's connected accounts by UTC day, on its billing
 * workspace (the holder): the most connected at once that day across its
 * workspaces, raised when a channel is added, and when the day starts
 * (the daily snapshot); a disconnection lowers nothing, so an account
 * counts for every day it was connected in. Where the holder's
 * per-account subscription entitles it, each rise puts what it adds to
 * the day's billable account-days (none on the 31st) in the outbox to
 * Stripe, in the same transaction; anywhere else the count is kept and
 * nothing is sent. A server that does not bill counts nothing and reads
 * nothing.
 */
export class AccountDays extends Context.Service<
  AccountDays,
  {
    /**
     * Raises the day of the workspace's holder to `count`, the accounts
     * its pool holds now, read only on a server that bills. Called where a
     * channel was just added, inside the pool's hold.
     */
    readonly counted: (
      workspaceId: WorkspaceId,
      count: Effect.Effect<number, DatabaseError>
    ) => Effect.Effect<void, DatabaseError>;
    /** Raises each holder's day of `now` to its count, in one transaction. */
    readonly raise: (
      now: DateTime.Utc,
      counts: readonly PeakRaise[]
    ) => Effect.Effect<readonly AccountDay[], DatabaseError>;
    /**
     * Reports the day so far of a holder whose per-account subscription
     * was just recorded: its account-days of today before it paid, which
     * the day's later rises would not send.
     */
    readonly subscribed: (
      holder: WorkspaceId
    ) => Effect.Effect<void, DatabaseError>;
    /** The holders' days of the month (UTC) `now` falls in, to today. */
    readonly ofMonth: (
      holders: readonly WorkspaceId[],
      now: DateTime.Utc
    ) => Effect.Effect<readonly AccountDay[], DatabaseError>;
    /** The holders' days from `from` to `to`, both included. */
    readonly ofDays: (
      holders: readonly WorkspaceId[],
      period: { readonly from: DateTime.Utc; readonly to: DateTime.Utc }
    ) => Effect.Effect<readonly AccountDay[], DatabaseError>;
  }
>()("peal-server/billing/application/AccountDays") {
  static readonly layer = Layer.effect(
    AccountDays,
    Effect.gen(function* AccountDaysLive() {
      const { enabled } = yield* BillingMode;
      const store = yield* AccountDayStore;
      const holders = yield* PlanHolders;
      const subscriptions = yield* Subscriptions;
      const { eventNames } = yield* UsageBilling;
      const { transaction } = yield* TransactionRunner;

      // The Stripe customer each holder's per-account subscription bills,
      // while one entitles it: the account-days of the others are counted,
      // never sent.
      const payingCustomers = Effect.fnUntraced(function* payingCustomers(
        of: readonly WorkspaceId[]
      ) {
        const held = yield* subscriptions.ofWorkspaces(of);

        return new Map(
          of.flatMap((holder) => {
            const { plan, subscription } = entitlementsOf(
              held.get(holder) ?? []
            );

            return Option.contains(plan, "payAsYouGo") &&
              Option.isSome(subscription)
              ? [[holder, subscription.value.stripeCustomerId] as const]
              : [];
          })
        );
      });

      const raise = Effect.fn("AccountDays.raise")(function* raise(
        now: DateTime.Utc,
        counts: readonly PeakRaise[]
      ) {
        const day = DateTime.startOf(now, "day");

        return yield* transaction(
          Effect.gen(function* raised() {
            const rows = yield* store.raise(day, counts);
            const rising = rows.filter((row) => unreportedOf(row) > 0);

            if (rising.length === 0) {
              return rows;
            }

            const customers = yield* payingCustomers(
              rising.map(({ holder }) => holder)
            );

            const paying = rising.flatMap((row) => {
              const customer = customers.get(row.holder);

              return customer === undefined ? [] : [{ customer, row }];
            });

            const reports = paying.map(({ customer, row }): MeterReport => ({
              createdAt: now,
              eventName: eventNames.accounts,
              holder: row.holder,
              identifier: accountDayIdentifier(row.holder, day, row.peak),
              // Inside its day: the day it bills for.
              occurredAt: now,
              stripeCustomerId: customer,
              value: unreportedOf(row),
            }));

            yield* store.enqueue(
              reports,
              paying.map(({ row }) => ({
                day,
                holder: row.holder,
                reported: row.reported + unreportedOf(row),
              }))
            );

            return rows;
          })
        );
      });

      const counted = Effect.fn("AccountDays.counted")(function* counted(
        workspaceId: WorkspaceId,
        count: Effect.Effect<number, DatabaseError>
      ) {
        if (!enabled) {
          return;
        }

        const { holder } = yield* holders.heldBy(workspaceId);

        yield* raise(yield* DateTime.now, [{ count: yield* count, holder }]);
      });

      const subscribed = Effect.fn("AccountDays.subscribed")(
        function* subscribed(holder: WorkspaceId) {
          if (!enabled) {
            return;
          }

          // The day as counted so far: a raise to nothing reads it held.
          yield* raise(yield* DateTime.now, [{ count: 0, holder }]);
        }
      );

      const ofDays = (
        held: readonly WorkspaceId[],
        period: { readonly from: DateTime.Utc; readonly to: DateTime.Utc }
      ) => store.ofHolders(held, period);

      const ofMonth = (held: readonly WorkspaceId[], now: DateTime.Utc) =>
        ofDays(held, {
          from: DateTime.startOf(now, "month"),
          to: DateTime.startOf(now, "day"),
        });

      return AccountDays.of({ counted, ofDays, ofMonth, raise, subscribed });
    })
  );
}
