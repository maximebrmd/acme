import { Schema } from "effect";

import { WorkspaceIdSchema } from "#shared/domain/ids.ts";

/**
 * Another request claimed the idempotency key while this one created its
 * workspace: the creation is rolled back, and the request answered as a
 * replay of the other.
 */
export class CreationKeyClaimed extends Schema.TaggedError<CreationKeyClaimed>()(
  "CreationKeyClaimed",
  { sameRequest: Schema.Boolean, workspaceId: WorkspaceIdSchema }
) {}
