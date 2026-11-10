import { Schema } from "effect";

/**
 * No such link: unknown to the workspace, or a token that opens nothing.
 * Every miss reads the same, so a guess learns nothing.
 */
export class ConnectLinkNotFound extends Schema.TaggedError<ConnectLinkNotFound>()(
  "ConnectLinkNotFound",
  {}
) {}
