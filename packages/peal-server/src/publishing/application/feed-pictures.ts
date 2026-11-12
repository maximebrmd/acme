import { Context, Effect, Layer } from "effect";

import type { FeedPictureSkip } from "#publishing/domain/feed-item-outcome.ts";
import type { Actor } from "#shared/domain/access.ts";
import type { MediaAssetId } from "#shared/domain/ids.ts";

/** What became of an item's picture: in the library, or why not. */
export type FeedPicture =
  | { readonly _tag: "attached"; readonly mediaId: MediaAssetId }
  | { readonly _tag: "skipped"; readonly reason: FeedPictureSkip };

/**
 * Brings an item's picture into the workspace's media library, as the
 * feed's starter, for its post to show: the media context's import from
 * an address, which fetches it as any import does (the guard, the size,
 * the plan's storage). Never fails: a picture that cannot be had is
 * skipped, with why, and the post goes without it.
 */
export class FeedPictures extends Context.Service<
  FeedPictures,
  {
    readonly attach: (
      actor: Actor,
      url: string,
      altText: string
    ) => Effect.Effect<FeedPicture>;
  }
>()("peal-server/publishing/application/FeedPictures") {
  /** For tests that attach no picture: every one fails. */
  static readonly none = Layer.succeed(
    FeedPictures,
    FeedPictures.of({
      attach: () => Effect.succeed({ _tag: "skipped", reason: "failed" }),
    })
  );
}
