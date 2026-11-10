import { Schema } from "effect";

import { MediaAssetIdSchema } from "#shared/domain/ids.ts";

/**
 * The file types the media context stores, as browsers and S3 name them.
 * Which platform takes which is in platform-rules.ts.
 */
export const MediaContentTypeSchema = Schema.Literals([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
]);

export type MediaContentType = typeof MediaContentTypeSchema.Type;

export type MediaKind = "document" | "image" | "video";

const kinds: Readonly<Record<MediaContentType, MediaKind>> = {
  "application/pdf": "document",
  "image/gif": "image",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
};

const PixelsSchema = Schema.Int.check(Schema.isGreaterThan(0));

/** Width and height in pixels, as the media is displayed. */
export const DimensionsSchema = Schema.Struct({
  height: PixelsSchema,
  width: PixelsSchema,
});

export type Dimensions = typeof DimensionsSchema.Type;

/**
 * An image, a video or a document (a PDF) a post may show, as the media context stored and
 * probed it: what the platforms' media rules are checked against. A fact
 * the probe did not find is none, and the rules that need it wait for the
 * platform to check them.
 */
export class MediaFile extends Schema.Class<MediaFile>(
  "peal-server/publishing/domain/MediaFile"
)({
  byteSize: Schema.Int.check(Schema.isGreaterThan(0)),
  contentType: MediaContentTypeSchema,
  dimensions: Schema.Option(DimensionsSchema),
  duration: Schema.Option(Schema.Duration),
  mediaId: MediaAssetIdSchema,
}) {
  get kind(): MediaKind {
    return kinds[this.contentType];
  }
}
