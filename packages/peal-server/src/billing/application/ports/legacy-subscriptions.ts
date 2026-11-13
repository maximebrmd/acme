import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * Whether any subscription to a legacy plan (priced by tiers of channels)
 * still entitles a workspace: active, trialing or past due. While one
 * does, its prices must be the ones Peal published; once none does, a
 * Stripe account needs none of them.
 */
export class LegacySubscriptions extends Context.Service<
  LegacySubscriptions,
  { readonly entitling: Effect.Effect<boolean, DatabaseError> }
>()("peal-server/billing/application/LegacySubscriptions") {
  /** One entitles, or none, for tests. */
  static readonly layerEntitling = (entitling: boolean) =>
    Layer.succeed(
      LegacySubscriptions,
      LegacySubscriptions.of({ entitling: Effect.succeed(entitling) })
    );
}
