import { Schema } from "effect";

/**
 * The workspace, or the server, already makes as many images as it may at
 * once: nothing was asked or counted, and the request can be sent again in
 * a moment.
 */
export class ImagesBusy extends Schema.TaggedError<ImagesBusy>()(
  "ImagesBusy",
  {}
) {}
