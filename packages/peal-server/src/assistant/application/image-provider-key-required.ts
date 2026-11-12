import { Schema } from "effect";

/**
 * Saving a workspace's image provider needs its key: the workspace has
 * none stored that opens, or the new address is on another origin than
 * the one the stored key was typed for, and a key is never sent to
 * another origin.
 */
export class ImageProviderKeyRequired extends Schema.TaggedError<ImageProviderKeyRequired>()(
  "ImageProviderKeyRequired",
  {}
) {}
