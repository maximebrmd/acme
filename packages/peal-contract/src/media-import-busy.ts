import { Schema } from "effect";

/** Too many imports are under way: ask again in a moment. */
export class MediaImportBusy extends Schema.TaggedError<MediaImportBusy>()(
  "MediaImportBusy",
  {},
  {
    description:
      "The workspace already imports two files at once, or the server as many as it runs together: nothing was fetched or stored. Ask again in a moment, once one has finished.",
    httpApiStatus: 429,
  }
) {}
