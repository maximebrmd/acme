import { Schema } from "effect";

/**
 * Saving a workspace's text provider needs its key: the workspace has none
 * stored that opens, or the new address is not the one the stored key was
 * typed for, and a key is never sent to another address.
 */
export class TextProviderKeyRequired extends Schema.TaggedError<TextProviderKeyRequired>()(
  "TextProviderKeyRequired",
  {}
) {}
