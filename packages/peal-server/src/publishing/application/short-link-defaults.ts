import { Context, Effect, Layer } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";

/**
 * Whether a workspace's new posts ask for short links when they do not
 * say: the workspace's default, read when the post is made, so the post
 * keeps what it will do. False on a server without short links.
 */
export class ShortLinkDefaults extends Context.Service<
  ShortLinkDefaults,
  {
    readonly byDefault: (
      workspaceId: WorkspaceId
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/publishing/application/ShortLinkDefaults") {
  /** No default: a post asks for short links only when it says so. */
  static readonly none = Layer.succeed(
    ShortLinkDefaults,
    ShortLinkDefaults.of({ byDefault: () => Effect.succeed(false) })
  );
}
