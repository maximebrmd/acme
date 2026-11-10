import { Schema } from "effect";

/**
 * The link no longer connects anything: it was used, revoked, has expired,
 * or was started too many times.
 */
export class ConnectLinkUnusable extends Schema.TaggedError<ConnectLinkUnusable>()(
  "ConnectLinkUnusable",
  { reason: Schema.Literals(["completed", "revoked", "expired", "exhausted"]) }
) {}
