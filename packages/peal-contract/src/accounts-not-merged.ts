import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** Why one billing account cannot be merged into another. */
export const MergeRefusalSchema = Schema.Literals([
  // The same account twice.
  "same",
  // A partner's account, which holds what its partner owns.
  "partner",
  // The account merged holds a subscription Stripe may still charge.
  "subscribed",
  // The account merged into is one workspace a plan subscription of its
  // own keeps alone.
  "standalone",
]).annotate({ identifier: "MergeRefusal" });

export type MergeRefusal = typeof MergeRefusalSchema.Type;

/** The accounts were not merged: nothing moved. */
export class AccountsNotMerged extends Schema.TaggedError<AccountsNotMerged>()(
  "AccountsNotMerged",
  { ...errorEnvelope, reason: MergeRefusalSchema },
  {
    description:
      "Nothing moved: the two accounts are one (`same`), one is a partner's, which holds what its partner owns (`partner`), the account merged holds a subscription Stripe may still charge, which must end first (`subscribed`), or the account merged into is one workspace a plan subscription of its own keeps alone (`standalone`).",
    httpApiStatus: 409,
  }
) {}
