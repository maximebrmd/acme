import { Context } from "effect";
import type { Effect } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostTargetId, WorkspaceId } from "#shared/domain/ids.ts";

/**
 * What a short link's redirect needs from the other contexts: whether the
 * part of the post that holds it is live on its platform (publishing), and
 * whether its workspace is still in good standing (the workspace context:
 * it exists, and staff have not banned every account that owns it).
 */
export class LinkStanding extends Context.Service<
  LinkStanding,
  {
    readonly isLive: (
      targetId: PostTargetId,
      part: number
    ) => Effect.Effect<boolean, DatabaseError>;
    readonly isWorkspaceActive: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/shortlinks/application/LinkStanding") {}
