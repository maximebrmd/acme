import { Context, Effect, Layer } from "effect";

import { entitlementsOf, unmetered } from "#billing/domain/entitlements.ts";
import type { Entitlements } from "#billing/domain/entitlements.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { PlanHolders } from "./ports/plan-holders.ts";
import { Subscriptions } from "./ports/subscriptions.ts";

const make = Effect.gen(function* WorkspaceEntitlementsLive() {
  const { enabled } = yield* BillingMode;
  const subscriptions = yield* Subscriptions;
  const holders = yield* PlanHolders;

  const of = Effect.fn("WorkspaceEntitlements.of")(function* of(
    workspaceId: WorkspaceId
  ) {
    if (!enabled) {
      return unmetered;
    }

    const holder = yield* holders.holderOf(workspaceId);

    return entitlementsOf(yield* subscriptions.ofWorkspace(holder));
  });

  return { of };
});

/**
 * What each workspace's plan allows, for the contexts that check a limit
 * before adding something (a channel, a member, a scheduled post, an
 * assistant request). They act for a member who already passed their own
 * permission checks, so this checks none. A workspace a partner owns is on
 * the plan of the partner's home workspace (`PlanHolders`): it has no
 * subscription of its own. On a server that does not bill, every workspace
 * is `unmetered`, without reading anything.
 */
export class WorkspaceEntitlements extends Context.Service<
  WorkspaceEntitlements,
  {
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Entitlements, DatabaseError>;
  }
>()("peal-server/billing/application/WorkspaceEntitlements") {
  /**
   * Every workspace on its own plan: for servers and tests without partner
   * accounts.
   */
  static readonly layer = Layer.effect(
    WorkspaceEntitlements,
    make.pipe(Effect.provide(PlanHolders.layerOwn))
  );

  /**
   * A workspace a partner owns on the plan of the partner's home workspace
   * (`PlanHolders`), any other on its own. What the server runs.
   */
  static readonly layerShared = Layer.effect(WorkspaceEntitlements, make);
}
