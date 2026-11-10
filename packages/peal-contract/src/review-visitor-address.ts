import { Context } from "effect";

/** Where a visitor's request came from, for the limits on what they write. */
export class ReviewVisitorAddress extends Context.Service<
  ReviewVisitorAddress,
  { readonly address: string }
>()("peal-contract/ReviewVisitorAddress") {}
