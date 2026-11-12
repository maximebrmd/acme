import { Schema } from "effect";

/**
 * The image was made, but the media store could not be reached to keep
 * it. The request counts: the provider made the image.
 */
export class ImageNotStored extends Schema.TaggedError<ImageNotStored>()(
  "ImageNotStored",
  {}
) {}
