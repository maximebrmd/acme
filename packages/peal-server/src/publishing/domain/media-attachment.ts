import { Schema } from "effect";

import { MediaAssetIdSchema } from "#shared/domain/ids.ts";

import { isWithoutNul } from "./post-text.ts";

/** The most alt text an attachment keeps, far above what platforms show. */
export const maxAltTextLength = 5000;

/**
 * An image or a video of the media context attached to a post, with the
 * text that describes it to people who cannot see it. Empty when the user
 * wrote none.
 */
export class MediaAttachment extends Schema.Class<MediaAttachment>(
  "peal-server/publishing/domain/MediaAttachment"
)({
  altText: Schema.String.check(
    Schema.isMaxLength(maxAltTextLength),
    isWithoutNul
  ),
  mediaId: MediaAssetIdSchema,
}) {}
