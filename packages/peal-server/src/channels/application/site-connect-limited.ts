import { Schema } from "effect";

/** The workspace tried to connect websites too many times for now. */
export class SiteConnectLimited extends Schema.TaggedError<SiteConnectLimited>()(
  "SiteConnectLimited",
  {}
) {}
