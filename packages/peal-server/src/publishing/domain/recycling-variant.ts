import { Schema } from "effect";

import { PartOverridesSchema } from "./post-part.ts";
import { PostTextSchema } from "./post-text.ts";

/**
 * A text an occurrence says instead of the source's: it replaces the first
 * part's text and its texts by channel (none unless given), and leaves the
 * media, the later parts and the options as the source has them.
 */
export class RecyclingVariant extends Schema.Class<RecyclingVariant>(
  "peal-server/publishing/domain/RecyclingVariant"
)({
  overrides: PartOverridesSchema,
  text: PostTextSchema,
}) {}
