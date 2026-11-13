import { Context, DateTime, Effect, Layer, Option, Ref } from "effect";

import { MeteredUsage } from "#shared/application/metered-usage.ts";
import type { MeterClaim } from "#shared/application/metered-usage.ts";
import { AllowanceReached } from "#shared/domain/allowance-reached.ts";
import type { Meter } from "#shared/domain/meter.ts";

/** What the fake meters counted: units in use, every claim, give-back and forgiven failure. */
export interface MetersLedger {
  readonly claims: readonly MeterClaim[];
  /** Failures taken back (`forgive`). */
  readonly forgiven: readonly MeterClaim[];
  readonly givenBack: readonly MeterClaim[];
  readonly used: ReadonlyMap<Meter, number>;
}

/** The fake meters' ledger, to read what a test claimed and gave back. */
export class FakeMetersLedger extends Context.Service<
  FakeMetersLedger,
  Ref.Ref<MetersLedger>
>()("peal-server/test/FakeMetersLedger") {}

/**
 * Meters as a billing server answers them, in memory: each meter grants
 * up to `allowed` units this month (none: no end), and past them refuses
 * with `reason` (`paymentMethodRequired` without a payment method).
 */
export const fakeMeters = ({
  allowed,
  paymentMethod = true,
}: {
  readonly allowed: Option.Option<number>;
  readonly paymentMethod?: boolean;
}) =>
  Layer.effectContext(
    Effect.gen(function* metersInMemory() {
      const ledger = yield* Ref.make<MetersLedger>({
        claims: [],
        forgiven: [],
        givenBack: [],
        used: new Map(),
      });

      const usedOf = (meter: Meter) =>
        Ref.get(ledger).pipe(Effect.map(({ used }) => used.get(meter) ?? 0));

      const resetsAt = DateTime.now.pipe(
        Effect.map((now) =>
          DateTime.add(DateTime.startOf(now, "month"), { months: 1 })
        )
      );

      const meters = MeteredUsage.of({
        claim: Effect.fn("FakeMeters.claim")(
          function* claim(workspaceId, meter, units, given) {
            const used = yield* usedOf(meter);

            if (Option.isSome(allowed) && used + units > allowed.value) {
              return yield* new AllowanceReached({
                allowed: allowed.value,
                meter,
                reason: paymentMethod
                  ? "ceilingReached"
                  : "paymentMethodRequired",
                resetsAt: yield* resetsAt,
                used,
              });
            }

            const at = given ?? (yield* DateTime.now);
            const made: MeterClaim = { at, meter, units, workspaceId };

            yield* Ref.update(ledger, (now) => ({
              ...now,
              claims: [...now.claims, made],
              used: new Map([...now.used, [meter, used + units]]),
            }));

            return made;
          }
        ),
        forgive: (given) =>
          Ref.update(ledger, (now) => ({
            ...now,
            forgiven: [...now.forgiven, given],
            used: new Map([
              ...now.used,
              [
                given.meter,
                Math.max(0, (now.used.get(given.meter) ?? 0) - given.units),
              ],
            ]),
          })),
        giveBack: (given) =>
          Ref.update(ledger, (now) => ({
            ...now,
            givenBack: [...now.givenBack, given],
            used: new Map([
              ...now.used,
              [
                given.meter,
                Math.max(0, (now.used.get(given.meter) ?? 0) - given.units),
              ],
            ]),
          })),
        state: (_workspaceId, meter) =>
          Effect.gen(function* state() {
            return Option.some({
              allowance: Option.getOrElse(allowed, () => 0),
              allowed,
              ceiling: Option.some(0),
              meter,
              paymentMethod,
              pastAllowed: paymentMethod
                ? ("ceilingReached" as const)
                : ("paymentMethodRequired" as const),
              price: { cents: 1, per: 1 },
              priceConfirmed: false,
              resetsAt: yield* resetsAt,
              used: yield* usedOf(meter),
            });
          }),
      });

      return Context.make(MeteredUsage, meters).pipe(
        Context.add(FakeMetersLedger, ledger)
      );
    })
  );
