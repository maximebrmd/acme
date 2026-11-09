import { Context, Effect, Layer } from "effect";

import { entitlementsOf, unmetered } from "#billing/domain/entitlements.ts";
import type { Entitlements } from "#billing/domain/entitlements.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

import { BillingMode } from "./ports/billing-mode.ts";
import { Subscriptions } from "./ports/subscriptions.ts";

/**
 * What each workspace's plan allows, for the contexts that check a limit
 * before adding something (a channel, a member, a scheduled post, an
 * assistant request). They act for a member who already passed their own
 * permission checks, so this checks none. On a server that does not bill,
 * every workspace is `unmetered`, without reading anything.
 */
export class WorkspaceEntitlements extends Context.Service<
  WorkspaceEntitlements,
  {
    readonly of: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<Entitlements, DatabaseError>;
  }
>()("peal-server/billing/application/WorkspaceEntitlements") {
  static readonly layer = Layer.effect(
    WorkspaceEntitlements,
    Effect.gen(function* WorkspaceEntitlementsLive() {
      const { enabled } = yield* BillingMode;
      const subscriptions = yield* Subscriptions;

      const of = Effect.fn("WorkspaceEntitlements.of")(function* of(
        workspaceId: WorkspaceId
      ) {
        if (!enabled) {
          return unmetered;
        }

        return entitlementsOf(yield* subscriptions.ofWorkspace(workspaceId));
      });

      return WorkspaceEntitlements.of({ of });
    })
  );
}
