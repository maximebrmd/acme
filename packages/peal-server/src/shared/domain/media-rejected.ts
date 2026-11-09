import { Schema } from "effect";

/**
 * The platform refused an image or a video, for its format, size or length.
 * `code` is the platform's reason, kept for support; it never holds content.
 */
export class MediaRejected extends Schema.TaggedError<MediaRejected>()(
  "MediaRejected",
  { code: Schema.String }
) {}
