import { DateTime, Effect, Layer } from "effect";

import { StripeEventLedger } from "#billing/application/ports/stripe-event-ledger.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { stripeEvents } from "./schema.ts";

/** The Stripe events taken, in the billing schema's `stripe_events`. */
export const DrizzleStripeEventLedgerLive = Layer.effect(
  StripeEventLedger,
  Effect.gen(function* DrizzleStripeEventLedgerLive() {
    const db = yield* Drizzle;

    return StripeEventLedger.of({
      claim: (eventId, at) =>
        db
          .insert(stripeEvents)
          .values({ id: eventId, receivedAt: DateTime.toDateUtc(at) })
          .onConflictDoNothing()
          .returning({ id: stripeEvents.id })
          .pipe(
            Effect.map((kept) => kept.length > 0),
            Effect.mapError((cause) => new DatabaseError({ cause })),
            Effect.withSpan("StripeEventLedger.claim")
          ),
    });
  })
);
