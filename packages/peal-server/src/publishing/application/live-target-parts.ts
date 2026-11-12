import { Context, Effect, Layer, Option } from "effect";

import type { DatabaseError } from "#shared/application/database-error.ts";
import type { PostTargetId } from "#shared/domain/ids.ts";

import { PostRepository } from "./post-repository.ts";

/**
 * Whether a part of a post is live on its channel now, for the shortlinks
 * context, whose links answer only then: the part went out (or a member
 * found it out), and Peal has not taken the post down since.
 */
export class LiveTargetParts extends Context.Service<
  LiveTargetParts,
  {
    readonly isLive: (
      targetId: PostTargetId,
      part: number
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>()("peal-server/publishing/application/LiveTargetParts") {
  static readonly layer = Layer.effect(
    LiveTargetParts,
    Effect.gen(function* LiveTargetPartsLive() {
      const posts = yield* PostRepository;

      return LiveTargetParts.of({
        isLive: (targetId, part) =>
          posts
            .findTarget(targetId)
            .pipe(
              Effect.map(
                Option.exists(
                  (target) =>
                    target.liveParts.some(({ index }) => index === part) &&
                    !(
                      target.status._tag === "published" &&
                      target.status.removedAt !== undefined
                    )
                )
              )
            ),
      });
    })
  );
}
