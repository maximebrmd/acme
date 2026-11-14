import { DateTime, Effect, Layer, Option, Ref, Result } from "effect";

import { AccountDayStore } from "#billing/application/ports/account-day-store.ts";
import type { MeterReport } from "#billing/application/ports/account-day-store.ts";
import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { BillingNotices } from "#billing/application/ports/billing-notices.ts";
import { MeterUsageStore } from "#billing/application/ports/meter-usage-store.ts";
import type { MeterRow } from "#billing/application/ports/meter-usage-store.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { Subscriptions } from "#billing/application/ports/subscriptions.ts";
import { UsageBilling } from "#billing/application/ports/usage-billing.ts";
import { UsageLedger } from "#billing/application/ports/usage-ledger.ts";
import { entitlementsOf } from "#billing/domain/entitlements.ts";
import {
  decideClaim,
  defaultCeilingOf,
  includedUnits,
  meterEventIdentifier,
  meterMonthOf,
  meterResetsAt,
  ceilingSharesReached,
  meterBound,
  reasons,
  refusalOf,
  spendCapOf,
  spendOf,
  spendOfMonths,
  standingOfEntitlements,
  metersOf,
  spendGroupOf,
  unpaidSinceOf,
} from "#billing/domain/meter-claims.ts";
import type { MeterStanding } from "#billing/domain/meter-claims.ts";
import {
  billableUnits,
  rateCard,
  unconfirmedMeters,
} from "#billing/domain/rate-card.ts";
import { usageCounterOf, usageDayOf } from "#billing/domain/usage-meter.ts";
import { MeteredUsage } from "#shared/application/metered-usage.ts";
import type {
  MeterClaim,
  MeterState,
} from "#shared/application/metered-usage.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { MeterSchema } from "#shared/domain/meter.ts";
import type { Meter } from "#shared/domain/meter.ts";

// The meters whose rows a claim of `meter` holds: its group's, which one
// ceiling bounds, or itself.
const heldWith = (meter: Meter): readonly Meter[] =>
  Option.match(spendGroupOf(meter), {
    onNone: () => [meter],
    onSome: metersOf,
  });

/** Where a holder stands for its meters, and the customer that pays. */
interface Payer {
  readonly customer: Option.Option<string>;
  /** What every meter bills and is unpaid at most, until an invoice is paid. */
  readonly spendCap: Option.Option<number>;
  readonly standing: MeterStanding;
  /** What the months before this one billed since then, unpaid, in cents. */
  readonly unpaidBefore: number;
}

/**
 * The billing context's meters (`MeteredUsage`), on a server that bills:
 * each claim resolves the workspace's holder (`PlanHolders`), holds the
 * holder's rows of the meter's group for the month, decides
 * (`decideClaim`), and writes in one transaction the count, the usage
 * ledger's counter under the workspace that claimed, and, for a holder
 * whose per-account subscription entitles it, the outbox row of the units
 * past the allowance not reported yet. A unit given back is taken from
 * the count and the ledger, and reported back (a negative value) when it
 * had been reported. The claim that uses a free account's last unit of a
 * meter that has an allowance without a payment method tells its billing
 * managers, once per meter and month. A server that does not bill counts
 * nothing and refuses nothing.
 */
const BilledMeteredUsageLive = Layer.effect(
  MeteredUsage,
  Effect.gen(function* BilledMeteredUsageLive() {
    const holders = yield* PlanHolders;
    const subscriptions = yield* Subscriptions;
    const store = yield* MeterUsageStore;
    const outbox = yield* AccountDayStore;
    const ledger = yield* UsageLedger;
    const notices = yield* BillingNotices;
    const { eventNames } = yield* UsageBilling;
    const { transaction } = yield* TransactionRunner;

    // What the months before `month` billed since the subscription
    // began, while no invoice was paid: all of it is still unpaid.
    const unpaidBeforeOf = Effect.fn("MeteredUsage.unpaidBeforeOf")(
      function* unpaidBeforeOf(
        holder: WorkspaceId,
        since: Option.Option<DateTime.Utc>,
        month: DateTime.Utc
      ) {
        if (Option.isNone(since) || !DateTime.isLessThan(since.value, month)) {
          return 0;
        }

        return spendOfMonths(yield* store.between(holder, since.value, month));
      }
    );

    const payerOf = Effect.fn("MeteredUsage.payerOf")(function* payerOf(
      holder: WorkspaceId,
      month: DateTime.Utc
    ) {
      const held = yield* subscriptions.ofWorkspaces([holder]);
      const entitlements = entitlementsOf(held.get(holder) ?? []);
      const standing = standingOfEntitlements(entitlements);

      const spendCap =
        standing === "payAsYouGo"
          ? spendCapOf(entitlements.verified)
          : Option.none<number>();

      const payer: Payer = {
        // Only per-account pricing reports what passes an allowance (a
        // past due one only what is given back).
        customer:
          standing === "payAsYouGo" || standing === "pastDue"
            ? entitlements.subscription.pipe(
                Option.map(({ stripeCustomerId }) => stripeCustomerId)
              )
            : Option.none(),
        spendCap,
        standing,
        unpaidBefore: Option.isSome(spendCap)
          ? yield* unpaidBeforeOf(
              holder,
              entitlements.subscription.pipe(Option.flatMap(unpaidSinceOf)),
              month
            )
          : 0,
      };

      return payer;
    });

    // The ceiling of the meter's group, set or the rate card's; none for
    // a meter without one.
    const ceilingOf = Effect.fn("MeteredUsage.ceilingOf")(function* ceilingOf(
      holder: WorkspaceId,
      meter: Meter
    ) {
      const group = spendGroupOf(meter);

      if (Option.isNone(group)) {
        return Option.none<number>();
      }

      const set = yield* store.ceilings(holder);

      return Option.some(
        set.find((ceiling) => ceiling.group === group.value)?.cents ??
          defaultCeilingOf(group.value)
      );
    });

    // The outbox row of what changed in what the row bills, if anything.
    const reportOf = (
      holder: WorkspaceId,
      month: DateTime.Utc,
      customer: string,
      row: MeterRow,
      now: DateTime.Utc
    ): Option.Option<{
      readonly report: MeterReport;
      readonly row: MeterRow;
    }> => {
      const change = billableUnits(row.meter, row.used) - row.reported;

      if (change === 0) {
        return Option.none();
      }

      const events = row.events + 1;

      return Option.some({
        report: {
          createdAt: now,
          eventName: eventNames[row.meter],
          holder,
          identifier: meterEventIdentifier(row.meter, holder, month, events),
          occurredAt: now,
          stripeCustomerId: customer,
          value: change,
        },
        row: { ...row, events, reported: row.reported + change },
      });
    };

    // Writes the rows, and reports what each changed in what is billed
    // when the holder pays per-account pricing.
    const settle = Effect.fn("MeteredUsage.settle")(function* settle(
      holder: WorkspaceId,
      month: DateTime.Utc,
      payer: Payer,
      rows: readonly MeterRow[],
      now: DateTime.Utc
    ) {
      const reported = Option.match(payer.customer, {
        onNone: () => [],
        onSome: (customer) =>
          rows.flatMap((row) =>
            Option.toArray(reportOf(holder, month, customer, row, now))
          ),
      });

      const kept = rows.map(
        (row) =>
          reported.find((changed) => changed.row.meter === row.meter)?.row ??
          row
      );

      yield* store.save(holder, month, kept);

      if (reported.length > 0) {
        yield* outbox.enqueue(
          reported.map(({ report }) => report),
          []
        );
      }
    });

    // Tells the billing managers that X's spend reached a share of its
    // ceiling, once per share and month.
    const tellCeiling = (
      holder: WorkspaceId,
      month: DateTime.Utc,
      ceiling: number,
      percent: number
    ) =>
      notices.tell({
        key: `x-ceiling:${holder}:${DateTime.formatIsoDateUtc(month).slice(0, 7)}:${String(percent)}`,
        notice: {
          _tag: "XSpendCeiling",
          ceiling,
          percent,
          resetsAt: meterResetsAt(month),
        },
        workspaceId: holder,
      });

    const claim = Effect.fn("MeteredUsage.claim")(function* claim(
      workspaceId: WorkspaceId,
      meter: Meter,
      units: number,
      given?: DateTime.Utc
    ) {
      const at = given ?? (yield* DateTime.now);
      const month = meterMonthOf(at);

      // X's ceiling a refusal met, told once the refused claim rolled back.
      const ceilingMet = yield* Ref.make(
        Option.none<{
          readonly ceiling: number;
          readonly holder: WorkspaceId;
        }>()
      );

      return yield* transaction(
        Effect.gen(function* claiming() {
          const { freeTier, holder } = yield* holders.heldBy(workspaceId);
          const payer = yield* payerOf(holder, month);

          // Every meter's rows while a cap spans them all.
          const rows = yield* store.hold(
            holder,
            month,
            Option.isSome(payer.spendCap)
              ? MeterSchema.literals
              : heldWith(meter),
            heldWith(meter)
          );

          const ceiling = yield* ceilingOf(holder, meter);

          const decided = decideClaim({
            ceiling,
            counts: rows,
            freeTier,
            meter,
            spendCap: payer.spendCap,
            standing: payer.standing,
            units,
            unpaidBefore: payer.unpaidBefore,
          });

          const xCeiling = ceiling.pipe(
            Option.filter(
              () =>
                payer.standing === "payAsYouGo" &&
                Option.contains(spendGroupOf(meter), "x")
            )
          );

          if (Result.isFailure(decided)) {
            if (decided.failure.reason === "ceilingReached") {
              yield* Ref.set(
                ceilingMet,
                xCeiling.pipe(
                  Option.map((cents) => ({ ceiling: cents, holder }))
                )
              );
            }

            return yield* new AllowanceReached({
              ...decided.failure,
              meter,
              resetsAt: meterResetsAt(month),
            });
          }

          // X's spend crossing a share of its ceiling is told with the claim.
          yield* Effect.forEach(
            Option.toArray(xCeiling).flatMap((cents) =>
              ceilingSharesReached(
                spendOf(rows.filter((row) => row.meter === meter)),
                spendOf([{ meter, used: decided.success.used }]),
                cents
              ).map((percent) => ({ cents, percent }))
            ),
            ({ cents, percent }) => tellCeiling(holder, month, cents, percent),
            { discard: true }
          );

          yield* settle(
            holder,
            month,
            payer,
            rows.map((row) =>
              row.meter === meter ? { ...row, used: decided.success.used } : row
            ),
            at
          );

          yield* Effect.forEach(
            Option.toArray(usageCounterOf(meter)),
            (counter) =>
              ledger.add({
                record: {
                  day: usageDayOf(at),
                  dimension: "",
                  meter: counter,
                  quantity: units,
                },
                workspaceId,
              }),
            { discard: true }
          );

          // The meter pauses a free account now: its billing managers are
          // told, once a month.
          const included = includedUnits(meter, payer.standing, freeTier);

          if (
            payer.standing === "free" &&
            rateCard.meters[meter].allowanceWithout > 0 &&
            decided.success.used >= included
          ) {
            yield* notices.tell({
              key: `allowance:${holder}:${DateTime.formatIsoDateUtc(month).slice(0, 7)}:${meter}`,
              notice: {
                _tag: "AllowanceReached",
                allowed: included,
                meter,
                resetsAt: meterResetsAt(month),
              },
              workspaceId: holder,
            });
          }

          const granted: MeterClaim = { at, meter, units, workspaceId };

          return granted;
        })
      ).pipe(
        Effect.tapError(() =>
          Ref.get(ceilingMet).pipe(
            Effect.flatMap(
              Option.match({
                onNone: () => Effect.void,
                onSome: ({ ceiling, holder }) =>
                  transaction(tellCeiling(holder, month, ceiling, 100)),
              })
            )
          )
        )
      );
    });

    // Takes the units back: always for what never happened, and for a
    // failure only while the month's failures given back stay within the
    // meter's allowance (`forgiven`); past it the units count.
    const takeBack = Effect.fn("MeteredUsage.takeBack")(function* takeBack(
      given: MeterClaim,
      failure: boolean
    ) {
      const month = meterMonthOf(given.at);
      const now = yield* DateTime.now;

      yield* transaction(
        Effect.gen(function* givingBack() {
          const { holder } = yield* holders.heldBy(given.workspaceId);
          const payer = yield* payerOf(holder, month);
          const rows = yield* store.hold(holder, month, [given.meter]);
          const bound = rateCard.meters[given.meter].allowance;

          const counted = rows.some(
            (row) => failure && row.forgiven + given.units > bound
          );

          if (counted) {
            return;
          }

          yield* settle(
            holder,
            month,
            payer,
            rows.map((row) => ({
              ...row,
              forgiven: failure ? row.forgiven + given.units : row.forgiven,
              used: Math.max(0, row.used - given.units),
            })),
            now
          );

          yield* Effect.forEach(
            Option.toArray(usageCounterOf(given.meter)),
            (counter) =>
              ledger.takeBack({
                record: {
                  day: usageDayOf(given.at),
                  dimension: "",
                  meter: counter,
                  quantity: given.units,
                },
                workspaceId: given.workspaceId,
              }),
            { discard: true }
          );
        })
      );
    });

    const giveBack = (given: MeterClaim) => takeBack(given, false);

    const forgive = (given: MeterClaim) => takeBack(given, true);

    const state = Effect.fn("MeteredUsage.state")(function* state(
      workspaceId: WorkspaceId,
      meter: Meter
    ) {
      const now = yield* DateTime.now;
      const month = meterMonthOf(now);
      const { freeTier, holder } = yield* holders.heldBy(workspaceId);
      const payer = yield* payerOf(holder, month);
      const counts = yield* store.ofMonth(holder, month);
      const ceiling = yield* ceilingOf(holder, meter);

      const bound = meterBound(meter, {
        ceiling,
        counts,
        freeTier,
        spendCap: payer.spendCap,
        standing: payer.standing,
        unpaidBefore: payer.unpaidBefore,
      });

      const meterState: MeterState = {
        allowance: includedUnits(meter, payer.standing, freeTier),
        allowed: bound.pipe(Option.map(({ most }) => most)),
        ceiling: payer.standing === "payAsYouGo" ? ceiling : Option.some(0),
        meter,
        paymentMethod: payer.standing !== "free",
        pastAllowed: Option.match(bound, {
          onNone: () => reasons[payer.standing],
          onSome: (found) => refusalOf(found, payer.standing),
        }),
        price: rateCard.prices.usd.meters[meter],
        priceConfirmed: !unconfirmedMeters.includes(meter),
        resetsAt: meterResetsAt(month),
        used: counts.find((count) => count.meter === meter)?.used ?? 0,
      };

      return Option.some(meterState);
    });

    return MeteredUsage.of({ claim, forgive, giveBack, state });
  })
);

/** The meters as billing counts them, or none where the server does not bill. */
export const MeteredUsageLive = Layer.unwrap(
  BillingMode.use(({ enabled }) =>
    Effect.succeed(
      enabled ? BilledMeteredUsageLive : MeteredUsage.layerUnmetered
    )
  )
);
