import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { PlanLimitReached } from "#shared/domain/plan-limit-reached.ts";

/**
 * Whether a workspace's plan has room for more ad accounts: the seam where
 * pricing meets ads. No plan limits ad accounts yet, so the server's
 * adapter lets every one through (`layerUnmetered`); a price per ad
 * account is a limit checked here, with `used` the accounts connected.
 */
export class AdAllowance extends Context.Service<
  AdAllowance,
  {
    readonly ensureRoom: (request: {
      readonly adding: number;
      readonly used: number;
      readonly workspaceId: WorkspaceId;
    }) => Effect.Effect<void, DatabaseError | PlanLimitReached>;
  }
>()("peal-server/ads/application/AdAllowance") {
  /** No limit: what a server that does not bill, or bills no ads, gives. */
  static readonly layerUnmetered = Layer.succeed(
    AdAllowance,
    AdAllowance.of({ ensureRoom: () => Effect.void })
  );
}
