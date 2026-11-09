import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";
import { PaidPlanSchema } from "#shared/domain/plan.ts";

/**
 * The workspace has a subscription Stripe may still bill, and its deletion
 * did not say to cancel it, so nothing was erased. `plan` and `paidUntil`
 * describe it when billing knows them, for the person to read before they
 * agree to cancel it.
 */
export class WorkspaceSubscribed extends Schema.TaggedError<WorkspaceSubscribed>()(
  "WorkspaceSubscribed",
  {
    paidUntil: Schema.Option(Schema.DateTimeUtc),
    plan: Schema.Option(PaidPlanSchema),
    workspaceId: WorkspaceIdSchema,
  }
) {}
