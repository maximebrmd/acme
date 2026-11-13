import { Context } from "effect";
import type { DateTime, Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * The Stripe events taken, by id, so one delivered again changes nothing
 * (`billing.stripe_events`, which subscription events share: ids only).
 */
export class StripeEventLedger extends Context.Service<
  StripeEventLedger,
  {
    /**
     * Keeps the event's id, in the caller's transaction: false when it was
     * kept before.
     */
    readonly claim: (
      eventId: string,
      at: DateTime.Utc
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/billing/application/StripeEventLedger") {}
