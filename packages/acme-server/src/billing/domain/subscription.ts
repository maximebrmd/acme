import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";

/** Where a Stripe subscription stands, as Stripe names it. */
export const SubscriptionStatusSchema = Schema.Literals([
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
]);

export type SubscriptionStatus = typeof SubscriptionStatusSchema.Type;

/**
 * A workspace's Stripe subscription to a paid plan, as its last webhook
 * event described it. A workspace may have had several: an old one
 * cancelled, a new one active.
 */
export class Subscription extends Schema.Class<Subscription>(
  "acme-server/billing/domain/Subscription"
)({
  // Whether it ends when the period it was paid for does.
  cancelAtPeriodEnd: Schema.Boolean,
  // When the period it was paid for ends, and the next payment is due.
  currentPeriodEnd: Schema.Option(Schema.DateTimeUtc),
  plan: PaidPlanSchema,
  status: SubscriptionStatusSchema,
  stripeCustomerId: Schema.NonEmptyString,
  stripeSubscriptionId: Schema.NonEmptyString,
  workspaceId: WorkspaceIdSchema,
}) {}

/**
 * Whether the subscription gives its plan: paid for, in its trial, or past
 * due while Stripe retries the payment. Unpaid, paused, cancelled or never
 * completed, it gives nothing, and the workspace is on the free plan.
 */
export const entitles = ({ status }: Subscription): boolean =>
  status === "active" || status === "trialing" || status === "past_due";

/**
 * Whether Stripe may still bill it: anything but cancelled or never
 * completed, unpaid and paused included. Better Auth's Stripe plugin
 * refuses to delete a workspace with one, and so does Acme.
 */
export const stillBills = ({ status }: Subscription): boolean =>
  status !== "canceled" &&
  status !== "incomplete" &&
  status !== "incomplete_expired";

/**
 * How far along its life each status is: incomplete until the first
 * payment, then live (in its trial, active, past due, unpaid or paused,
 * back and forth), then ended for good. A subscription never goes back a
 * stage. Stripe dates events to the second and delivers them in any order,
 * so of two events of the same second, the one further along is the later:
 * `customer.subscription.created` (incomplete) and `.updated` (active)
 * often share theirs.
 */
export const lifecycleStage: Readonly<Record<SubscriptionStatus, number>> = {
  active: 1,
  canceled: 2,
  incomplete: 0,
  incomplete_expired: 2,
  past_due: 1,
  paused: 1,
  trialing: 1,
  unpaid: 1,
};
