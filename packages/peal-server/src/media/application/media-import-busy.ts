import { Schema } from "effect";

/**
 * The workspace, or the server, already runs as many imports as it may at
 * once: nothing was fetched, and the import can be asked again in a
 * moment.
 */
export class MediaImportBusy extends Schema.TaggedError<MediaImportBusy>()(
  "MediaImportBusy",
  {}
) {}
