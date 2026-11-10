import { Context, Effect, Layer, Option } from "effect";

import { originOf } from "#publishing/domain/post-origin.ts";
import type { PostOrigin } from "#publishing/domain/post-origin.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { Actor } from "#shared/domain/access.ts";

/**
 * How an actor reached Peal, for a post to keep: the web app, or the API
 * key or OAuth application they act through, named as the workspace
 * context names it now.
 */
export class PostOrigins extends Context.Service<
  PostOrigins,
  {
    readonly of: (actor: Actor) => Effect.Effect<PostOrigin, DatabaseError>;
  }
>()("peal-server/publishing/application/PostOrigins") {
  /** Origins without the names of keys and applications, for tests. */
  static readonly unnamed = Layer.succeed(
    PostOrigins,
    PostOrigins.of({
      of: (actor) => Effect.succeed(originOf(actor, Option.none())),
    })
  );
}
