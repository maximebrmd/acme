import { Schema } from "effect";

/**
 * The link no longer connects anything: it was used, revoked, has expired,
 * or was started too many times; or it does not connect the platform
 * asked, which it never named or connected already (`notOffered`).
 */
export class ConnectLinkUnusable extends Schema.TaggedError<ConnectLinkUnusable>()(
  "ConnectLinkUnusable",
  {
    reason: Schema.Literals([
      "completed",
      "revoked",
      "expired",
      "exhausted",
      "notOffered",
    ]),
  }
) {}
