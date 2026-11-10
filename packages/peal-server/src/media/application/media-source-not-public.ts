import { Schema } from "effect";

/**
 * Peal does not fetch the address a file was to be imported from: it is
 * not an HTTPS URL on the default port, or its host is, or resolves to, an
 * address that is not public, or one of its redirects is.
 */
export class MediaSourceNotPublic extends Schema.TaggedError<MediaSourceNotPublic>()(
  "MediaSourceNotPublic",
  {}
) {}
