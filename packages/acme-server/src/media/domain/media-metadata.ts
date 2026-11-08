import { Option, Schema } from "effect";

const PixelsSchema = Schema.Int.check(Schema.isGreaterThan(0));

/** Width and height in pixels, as the media is displayed. */
export const DimensionsSchema = Schema.Struct({
  height: PixelsSchema,
  width: PixelsSchema,
});

export type Dimensions = typeof DimensionsSchema.Type;

/**
 * What probing a file found out. Each fact is known or not: an image has no
 * duration, and a file stays unprobed when no probe is installed.
 */
export class MediaMetadata extends Schema.Class<MediaMetadata>(
  "acme-server/media/domain/MediaMetadata"
)({
  // The video codec, as ffprobe names it (h264, hevc…).
  codec: Schema.Option(Schema.NonEmptyString),
  dimensions: Schema.Option(DimensionsSchema),
  duration: Schema.Option(Schema.Duration),
}) {
  /** Nothing known yet. */
  static readonly unknown = new MediaMetadata({
    codec: Option.none(),
    dimensions: Option.none(),
    duration: Option.none(),
  });
}
