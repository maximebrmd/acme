import { Schema } from "effect";

import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";

/**
 * Posts that may still go out show the asset, so it is not deleted: they
 * would fail without it.
 */
export class MediaInUse extends Schema.TaggedError<MediaInUse>()("MediaInUse", {
  assetId: MediaAssetIdSchema,
  postIds: Schema.Array(PostIdSchema),
}) {
  override get message(): string {
    return `Media asset ${this.assetId} is shown by ${this.postIds.length} scheduled posts`;
  }
}
