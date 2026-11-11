import { Schema } from "effect";

import { LivePostRefusalSchema } from "#publishing/domain/live-post-change.ts";
import { PostTargetIdSchema } from "#publishing/domain/post-target-id.ts";

/**
 * The post cannot be changed on that channel now: `reason` says why
 * (`#publishing/domain/live-post-change.ts`).
 */
export class LivePostNotChangeable extends Schema.TaggedError<LivePostNotChangeable>()(
  "LivePostNotChangeable",
  { reason: LivePostRefusalSchema, targetId: PostTargetIdSchema }
) {}
