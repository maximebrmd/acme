import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";

/**
 * The likes analytics last read of published targets, by target id: for
 * publishing's follow-up rules. Only what was read: never a platform call.
 * A target analytics does not follow, has not read, or whose platform
 * gives no likes, is left out.
 */
export class PostLikes extends Context.Service<
  PostLikes,
  {
    readonly of: (
      targetIds: readonly string[]
    ) => Effect.Effect<ReadonlyMap<string, number>, DatabaseError>;
  }
>()("peal-server/analytics/application/PostLikes") {}
