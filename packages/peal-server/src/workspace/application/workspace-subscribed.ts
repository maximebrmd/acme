import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * The workspace has a subscription Stripe may still bill, so it cannot be
 * erased until the subscription is cancelled.
 */
export class WorkspaceSubscribed extends Schema.TaggedError<WorkspaceSubscribed>()(
  "WorkspaceSubscribed",
  { workspaceId: WorkspaceIdSchema }
) {}
