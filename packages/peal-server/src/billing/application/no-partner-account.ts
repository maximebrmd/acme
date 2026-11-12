import { Schema } from "effect";

/**
 * There is no partner account to report on: the workspace is no partner's
 * home, or the key's account was closed.
 */
export class NoPartnerAccount extends Schema.TaggedError<NoPartnerAccount>()(
  "NoPartnerAccount",
  {}
) {}
