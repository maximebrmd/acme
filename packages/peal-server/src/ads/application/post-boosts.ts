import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostId, PostTargetId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * The boosts of a published post, for the contexts that change the post
 * itself: publishing asks before it deletes one from its platform, as an
 * ad that shows a post gone would keep spending on nothing.
 */
export class PostBoosts extends Context.Service<
  PostBoosts,
  {
    /**
     * How many boosts of the target are not over: being made, active,
     * paused (it can run again) or unconfirmed (it may be spending).
     * Ended, stopped and failed ones do not count.
     */
    readonly notOverOn: (target: {
      readonly postId: PostId;
      readonly targetId: PostTargetId;
      readonly workspaceId: WorkspaceId;
    }) => Effect.Effect<number, DatabaseError>;
  }
>()("peal-server/ads/application/PostBoosts") {}
