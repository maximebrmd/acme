import { Schema } from "effect";

/**
 * Why the workspace's contract cannot be withdrawn from: no subscription
 * that can (`notSubscribed`), its 14 days are over (`expired`), or the
 * customer buys as a business, with a verified VAT number (`business`).
 */
export class WithdrawalUnavailable extends Schema.TaggedError<WithdrawalUnavailable>()(
  "WithdrawalUnavailable",
  { reason: Schema.Literals(["notSubscribed", "expired", "business"]) }
) {
  override get message(): string {
    return `The subscription cannot be withdrawn from: ${this.reason}`;
  }
}
