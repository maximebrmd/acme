import { Schema } from "effect";

import { MediaAssetIdSchema } from "#media/domain/media-asset-id.ts";

/**
 * The asset cannot go out on a platform: the workspace has none with this
 * id (`notFound`, as when it was deleted), or its file was not checked and
 * probed yet, or was refused (`notReady`).
 */
export class MediaNotPublishable extends Schema.TaggedError<MediaNotPublishable>()(
  "MediaNotPublishable",
  {
    assetId: MediaAssetIdSchema,
    reason: Schema.Literals(["notFound", "notReady"]),
  }
) {}
