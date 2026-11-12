import { Schema } from "effect";

/**
 * The image provider's address names a host Peal sends nothing to: one
 * that is, or resolves to, an address that is not public (`notPublic`),
 * or a name that does not resolve (`unknownHost`).
 */
export class ProviderAddressNotPublic extends Schema.TaggedError<ProviderAddressNotPublic>()(
  "ProviderAddressNotPublic",
  { reason: Schema.Literals(["notPublic", "unknownHost"]) }
) {}
