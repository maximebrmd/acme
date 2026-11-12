// A workspace a partner owns is on the plan of the partner's home
// workspace.
import { assert, layer } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

import { BillingMode } from "#billing/application/ports/billing-mode.ts";
import { PlanHolders } from "#billing/application/ports/plan-holders.ts";
import { WorkspaceEntitlements } from "#billing/application/workspace-entitlements.ts";
import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { subscriptionOf, subscriptionsHolding } from "#test/billing/support.ts";

const home = WorkspaceIdSchema.make("5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60");

const owned = WorkspaceIdSchema.make("6c1d7f75-6e1a-4b8f-8b63-4a2d3e5f6071");

const alone = WorkspaceIdSchema.make("0d3f6b1a-2c4e-4f5a-8b6c-7d8e9f0a1b2c");

// The partner's home workspace holds the plan of the workspace it owns.
const HoldersTest = Layer.succeed(
  PlanHolders,
  PlanHolders.of({
    holderOf: (workspaceId) =>
      Effect.succeed(workspaceId === owned ? home : workspaceId),
    holdersOf: (workspaceIds) =>
      Effect.succeed(
        new Map(
          workspaceIds.map((workspaceId) => [
            workspaceId,
            workspaceId === owned ? home : workspaceId,
          ])
        )
      ),
  })
);

const SharedTest = WorkspaceEntitlements.layerShared.pipe(
  Layer.provide(HoldersTest),
  Layer.provide(
    subscriptionsHolding([
      subscriptionOf({ plan: "business", status: "active", workspaceId: home }),
    ])
  ),
  Layer.provide(Layer.succeed(BillingMode, BillingMode.of({ enabled: true })))
);

layer(SharedTest)("entitlements on a server with partners", (it) => {
  it.effect(
    "give a partner's workspace its home workspace's plan, and any other its own",
    () =>
      Effect.gen(function* shared() {
        const entitlements = yield* WorkspaceEntitlements;

        const plans = yield* Effect.all(
          [home, owned, alone].map((workspaceId) =>
            entitlements
              .of(workspaceId)
              .pipe(Effect.map(({ plan }) => Option.getOrNull(plan)))
          )
        );

        assert.deepStrictEqual(plans, ["business", "business", "free"]);
      })
  );
});
