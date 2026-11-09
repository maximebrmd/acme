import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * The workspace has a subscription Stripe may still bill, so what billing
 * keeps of it cannot be erased: cancel the subscription first.
 */
export class WorkspaceStillBilled extends Schema.TaggedError<WorkspaceStillBilled>()(
  "WorkspaceStillBilled",
  { workspaceId: WorkspaceIdSchema }
) {}
