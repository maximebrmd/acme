import { Schema } from "effect";

import {
  Uuid7Schema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";

import { BillingIntervalSchema } from "./billing-interval.ts";

/** An order's id: a lowercase UUIDv7. */
export const OrderIdSchema = Uuid7Schema.pipe(Schema.brand("OrderId"));

export type OrderId = typeof OrderIdSchema.Type;

/**
 * The version of the words a member agrees to when ordering (the request
 * to start at once and the withdrawal information, in each catalogue's
 * `Billing.consent`). Change it with the words, so each order records what
 * was shown.
 */
export const consentVersion = "2026-11-09";

/**
 * What a member ordered on the billing page, before Stripe's checkout: a
 * plan, paid each month or year, or its trial; and that they asked for the
 * service to start at once, knowing their right to withdraw. Checkout
 * takes it once (`usedAt`), within `orderLifetime` of `createdAt`.
 */
export class Order extends Schema.Class<Order>(
  "peal-server/billing/domain/Order"
)({
  consentVersion: Schema.NonEmptyString,
  createdAt: Schema.DateTimeUtc,
  id: OrderIdSchema,
  interval: BillingIntervalSchema,
  plan: PaidPlanSchema,
  trial: Schema.Boolean,
  userId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** How long an order waits for its checkout. */
export const orderLifetimeMinutes = 30;
