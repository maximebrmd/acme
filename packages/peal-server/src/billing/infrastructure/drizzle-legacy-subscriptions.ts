import { and, inArray, ne } from "drizzle-orm";
import { Effect, Layer } from "effect";

import { LegacySubscriptions } from "#billing/application/ports/legacy-subscriptions.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { Drizzle } from "#shared/infrastructure/database.ts";

import { subscriptions } from "./schema.ts";

/** Legacy subscriptions in `billing.subscriptions`, as `entitles` reads them. */
export const DrizzleLegacySubscriptionsLive = Layer.effect(
  LegacySubscriptions,
  Effect.gen(function* DrizzleLegacySubscriptionsLive() {
    const db = yield* Drizzle;

    return LegacySubscriptions.of({
      entitling: db
        .select({ id: subscriptions.stripeSubscriptionId })
        .from(subscriptions)
        .where(
          and(
            ne(subscriptions.plan, "payAsYouGo"),
            inArray(subscriptions.status, ["active", "trialing", "past_due"])
          )
        )
        .limit(1)
        .pipe(
          Effect.map((rows) => rows.length > 0),
          Effect.mapError((cause) => new DatabaseError({ cause })),
          Effect.withSpan("LegacySubscriptions.entitling")
        ),
    });
  })
);
