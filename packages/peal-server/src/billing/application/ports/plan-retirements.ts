import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/** A legacy plan's subscription, with where its retirement stands. */
export interface RetiringSubscription {
  readonly subscription: Subscription;
  /** The day its retirement set it to end, once applied. */
  readonly retiresAt: Option.Option<DateTime.Utc>;
  /** When its billing managers were told, once. */
  readonly toldAt: Option.Option<DateTime.Utc>;
}

/**
 * The retirement of the legacy plans, kept on their subscriptions'
 * rows: which still entitle, the day each was set to end, and whether
 * their billing managers were told.
 */
export class PlanRetirements extends Context.Service<
  PlanRetirements,
  {
    /**
     * Every subscription to a legacy plan that may still give its plan
     * (active, past due or trialing), by id.
     */
    readonly legacy: Effect.Effect<
      readonly RetiringSubscription[],
      DatabaseError
    >;
    /**
     * Keeps the day it is retired to, before Stripe is asked: a day kept
     * already stays, and is the one answered.
     */
    readonly retire: (
      subscriptionId: string,
      retiresAt: DateTime.Utc
    ) => Effect.Effect<DateTime.Utc, DatabaseError>;
    /** Those retired whose billing managers were not told yet. */
    readonly untold: Effect.Effect<
      readonly RetiringSubscription[],
      DatabaseError
    >;
    /** Keeps that its billing managers were told. */
    readonly told: (
      subscriptionId: string,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
  }
>()("peal-server/billing/application/PlanRetirements") {}
