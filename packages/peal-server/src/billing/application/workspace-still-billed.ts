import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";

/**
 * The workspace has a subscription Stripe may still bill, and its deletion
 * did not say to cancel it: nothing of it was erased. `plan` and
 * `paidUntil` describe the subscription when billing's records know it,
 * so the person can be told what cancelling ends.
 */
export class WorkspaceStillBilled extends Schema.TaggedError<WorkspaceStillBilled>()(
  "WorkspaceStillBilled",
  {
    paidUntil: Schema.Option(Schema.DateTimeUtc),
    plan: Schema.Option(PaidPlanSchema),
    workspaceId: WorkspaceIdSchema,
  }
) {}
