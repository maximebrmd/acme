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

  // The same, for a set of workspaces: their holders in one read, then
  // the holders' subscriptions in one more.
  const ofEach = Effect.fn("WorkspaceEntitlements.ofEach")(function* ofEach(
    workspaceIds: readonly WorkspaceId[]
  ) {
    if (!enabled || workspaceIds.length === 0) {
      return new Map<WorkspaceId, Entitlements>(
        workspaceIds.map((id) => [id, unmetered])
      );
    }

    const holderOf = yield* holders.holdersOf(workspaceIds);

    const held = yield* subscriptions.ofWorkspaces([
      ...new Set(holderOf.values()),
    ]);

    return new Map<WorkspaceId, Entitlements>(
      workspaceIds.map((id) => [
        id,
        entitlementsOf(held.get(holderOf.get(id) ?? id) ?? []),
      ])
    );
  });

  return { of, ofEach };
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
    /** What each of these workspaces' plans allows, as `of` answers it. */
    readonly ofEach: (
      workspaceIds: readonly WorkspaceId[]
    ) => Effect.Effect<ReadonlyMap<WorkspaceId, Entitlements>, DatabaseError>;
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
