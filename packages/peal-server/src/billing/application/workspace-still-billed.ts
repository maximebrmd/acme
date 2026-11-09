import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";

/**
 * A subscription Stripe may still bill a workspace through, as billing's
 * records describe it: its plan and when the period paid for ends, each
 * none when billing does not know yet.
 */
export const BilledSubscriptionSchema = Schema.Struct({
  paidUntil: Schema.Option(Schema.DateTimeUtc),
  plan: Schema.Option(PaidPlanSchema),
});

export type BilledSubscription = typeof BilledSubscriptionSchema.Type;

/**
 * The workspace has a subscription Stripe may still bill, and its deletion
 * did not say to cancel it: nothing of it was erased. `subscriptions`
 * describes each one billing knows of, so the person can be told what
 * cancelling ends.
 */
export class WorkspaceStillBilled extends Schema.TaggedError<WorkspaceStillBilled>()(
  "WorkspaceStillBilled",
  {
    subscriptions: Schema.Array(BilledSubscriptionSchema),
    workspaceId: WorkspaceIdSchema,
  }
) {}
