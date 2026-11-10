import { Schema } from "effect";

/**
 * The address names a host Peal sends nothing to: one that is, or resolves
 * to, an address that is not public (`notPublic`), or that does not resolve
 * (`unknownHost`).
 */
export class UrlNotDeliverable extends Schema.TaggedError<UrlNotDeliverable>()(
  "UrlNotDeliverable",
  { reason: Schema.Literals(["notPublic", "unknownHost"]) }
) {}
