import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";

/**
 * A subscription a deletion would cancel: the workspace it bills, and its
 * plan and the end of the period paid for when billing knows them.
 */
export const SubscriptionToCancelSchema = Schema.Struct({
  paidUntil: Schema.Option(Schema.DateTimeUtc),
  plan: Schema.Option(PaidPlanSchema),
  workspaceId: WorkspaceIdSchema,
});

export type SubscriptionToCancel = typeof SubscriptionToCancelSchema.Type;

/**
 * A workspace the deletion would erase has a subscription Stripe may still
 * bill, and the deletion did not say to cancel it, so nothing was erased.
 * `subscriptions` lists each one, of every workspace it would erase, for
 * the person to read before they agree to cancel them all.
 */
export class WorkspaceSubscribed extends Schema.TaggedError<WorkspaceSubscribed>()(
  "WorkspaceSubscribed",
  { subscriptions: Schema.Array(SubscriptionToCancelSchema) }
) {}
