import { Context, DateTime, Effect, Layer } from "effect";

import { BilledElsewhere } from "#billing/domain/billed-elsewhere.ts";
import { BillingOff } from "#billing/domain/billing-off.ts";
import { CeilingNotOffered } from "#billing/domain/ceiling-not-offered.ts";
import { inPerson } from "#billing/domain/in-person.ts";
import { metersOf } from "#billing/domain/meter-claims.ts";
import type { SpendGroup } from "#billing/domain/meter-claims.ts";
import type { PersonRequired } from "#billing/domain/person-required.ts";
import { unconfirmedMeters } from "#billing/domain/rate-card.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";
import { authorize } from "#shared/domain/authorize.ts";
import type { MissingPermission } from "#shared/domain/missing-permission.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { MeterUsageStore } from "./ports/meter-usage-store.ts";
import type { SpendCeiling } from "./ports/meter-usage-store.ts";
import { PlanHolders } from "./ports/plan-holders.ts";

/**
 * What a billing account spends past a group's monthly allowances at
 * most: set on its billing workspace by a member with billing:manage, in
 * person. A ceiling may always be lowered, below what the month spent
 * too: the group's next use is then refused. A group whose prices are
 * all unconfirmed takes none (`CeilingNotOffered`). The meters read it at each
 * claim; the activity log keeps who set it.
 */
export class SpendCeilings extends Context.Service<
  SpendCeilings,
  {
    readonly set: (
      actor: Actor,
      group: SpendGroup,
      cents: number
    ) => Effect.Effect<
      SpendCeiling,
      | BilledElsewhere
      | BillingOff
      | CeilingNotOffered
      | DatabaseError
      | MissingPermission
      | PersonRequired
    >;
  }
>()("peal-server/billing/application/SpendCeilings") {
  static readonly layer = Layer.effect(
    SpendCeilings,
    Effect.gen(function* SpendCeilingsLive() {
      const { enabled } = yield* BillingMode;
      const holders = yield* PlanHolders;
      const store = yield* MeterUsageStore;

      const set = Effect.fn("SpendCeilings.set")(function* set(
        actor: Actor,
        group: SpendGroup,
        cents: number
      ) {
        yield* Effect.fromResult(authorize(actor, "billing:manage"));

        yield* Effect.fromResult(inPerson(actor));

        if (!enabled) {
          return yield* new BillingOff();
        }

        // A price not confirmed bills nothing past the allowance: no
        // ceiling would change anything.
        if (
          metersOf(group).every((meter) => unconfirmedMeters.includes(meter))
        ) {
          return yield* new CeilingNotOffered({ group });
        }

        const holder = yield* holders.holderOf(actor.workspaceId);

        if (holder !== actor.workspaceId) {
          return yield* new BilledElsewhere({ billingWorkspaceId: holder });
        }

        const ceiling: SpendCeiling = {
          cents,
          group,
          setAt: yield* DateTime.now,
        };

        yield* store.setCeiling(holder, ceiling);

        return ceiling;
      });

      return SpendCeilings.of({ set });
    })
  );
}
