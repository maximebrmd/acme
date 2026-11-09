import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * Stripe could not be reached to expire the workspace's open checkouts, so
 * nothing of it was erased: try again later.
 */
export class BillingUnavailable extends Schema.TaggedError<BillingUnavailable>()(
  "BillingUnavailable",
  { workspaceId: WorkspaceIdSchema }
) {}
