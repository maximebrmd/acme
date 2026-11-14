import { Context } from "effect";
import type { DateTime, Effect, Option } from "effect";

import type { Subscription } from "#billing/domain/subscription.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";

/** A legacy plan's subscription, with where its retirement stands. */
export interface RetiringSubscription {
  readonly subscription: Subscription;
  /** The day Stripe was set to end it, once it accepted. */
  readonly retiresAt: Option.Option<DateTime.Utc>;
  /** When the retirement was first applied. */
  readonly retiredAt: Option.Option<DateTime.Utc>;
  /** When its billing managers were told, once. */
  readonly toldAt: Option.Option<DateTime.Utc>;
}

/**
 * The retirement of the legacy plans, kept on their subscriptions'
 * rows: which still entitle, the day each was set to end at Stripe, and
 * whether their billing managers were told.
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
     * Keeps the day Stripe accepted to end it on, and, the first time,
     * when the retirement was applied.
     */
    readonly retire: (
      subscriptionId: string,
      retiresAt: DateTime.Utc,
      at: DateTime.Utc
    ) => Effect.Effect<void, DatabaseError>;
    /** The day it was retired to, whatever its status now. */
    readonly retiresAt: (
      subscriptionId: string
    ) => Effect.Effect<Option.Option<DateTime.Utc>, DatabaseError>;
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
