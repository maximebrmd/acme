// Billing as the other contexts see it, for their tests: every workspace on
// one plan, or on none, as on a server that does not bill.
import { Effect, Layer, Option } from "effect";

import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { Entitlements, unmetered } from "#billing/domain/entitlements.ts";
import type { Plan } from "#shared/domain/plan.ts";

/** Every workspace on `plan`, without a subscription. */
export const everyWorkspaceOn = (plan: Plan) =>
  Layer.succeed(
    WorkspaceEntitlements,
    WorkspaceEntitlements.of({
      of: () =>
        Effect.succeed(
          new Entitlements({
            plan: Option.some(plan),
            subscription: Option.none(),
          })
        ),
    })
  );

/** A server that does not bill: nothing is limited. */
export const UnmeteredTest = Layer.succeed(
  WorkspaceEntitlements,
  WorkspaceEntitlements.of({ of: () => Effect.succeed(unmetered) })
);
