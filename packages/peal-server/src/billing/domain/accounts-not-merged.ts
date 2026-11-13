import { Schema } from "effect";

/** Why one billing account cannot be merged into another. */
export const MergeRefusalSchema = Schema.Literals([
  // The same account twice.
  "same",
  // A partner's account, which holds what its partner owns.
  "partner",
  // The account merged holds a subscription that may still bill.
  "subscribed",
  // The account merged into is one workspace a plan of its own keeps
  // alone.
  "standalone",
]);

export type MergeRefusal = typeof MergeRefusalSchema.Type;

/** The accounts were not merged: nothing moved. */
export class AccountsNotMerged extends Schema.TaggedError<AccountsNotMerged>()(
  "AccountsNotMerged",
  { reason: MergeRefusalSchema }
) {}
