import { Schema } from "effect";

/** The address to import is not one Peal fetches. */
export class MediaSourceNotPublic extends Schema.TaggedError<MediaSourceNotPublic>()(
  "MediaSourceNotPublic",
  {},
  {
    description:
      "Peal does not fetch this address: it is not an HTTPS URL on the default port, or its host is, or resolves to, an address that is not public, as does a redirect it answered with. Nothing was fetched or stored.",
    httpApiStatus: 422,
  }
) {}
