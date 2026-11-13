import { Schema } from "effect";

/**
 * The media folder's owner marker is not the one the claim wrote, once
 * written: another writer came in between. Nothing is noted as claimed.
 */
export class MediaFolderNotClaimed extends Schema.TaggedError<MediaFolderNotClaimed>()(
  "MediaFolderNotClaimed",
  {}
) {}
