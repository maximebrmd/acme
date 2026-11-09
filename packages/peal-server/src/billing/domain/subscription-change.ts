import { Schema } from "effect";

import { Subscription } from "./subscription.ts";

/**
 * What a Stripe webhook event says a subscription now is. Stripe may send an
 * event twice, and in any order: `eventId` tells a repeat, and `occurredAt`
 * an older event from a newer one.
 */
export class SubscriptionChange extends Schema.Class<SubscriptionChange>(
  "peal-server/billing/domain/SubscriptionChange"
)({
  eventId: Schema.NonEmptyString,
  occurredAt: Schema.DateTimeUtc,
  subscription: Subscription,
}) {}
