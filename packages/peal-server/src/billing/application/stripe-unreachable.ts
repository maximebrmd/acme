import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * Stripe did not answer, or refused, what billing asked about the
 * workspace, such as expiring its open checkouts: nothing of it was
 * deleted, and the deletion can be tried again.
 */
export class StripeUnreachable extends Schema.TaggedError<StripeUnreachable>()(
  "StripeUnreachable",
  { workspaceId: WorkspaceIdSchema }
) {}
