import { Schema } from "effect";

/** No such connect link. */
export class ConnectLinkNotFound extends Schema.TaggedError<ConnectLinkNotFound>()(
  "ConnectLinkNotFound",
  {},
  {
    description:
      "No such connect link: the workspace has none with this id, or the token opens nothing. Every miss reads the same.",
    httpApiStatus: 404,
  }
) {}
