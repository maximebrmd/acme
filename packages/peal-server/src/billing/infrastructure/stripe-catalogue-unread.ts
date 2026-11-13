import { Schema } from "effect";

/**
 * Stripe did not answer what the catalogue asked, refused it, or answered
 * what cannot be read: `reason` says which, `during` what was being done.
 * What Stripe said of a refusal is its error's type and code only, never
 * its message, which may quote the key.
 */
export class StripeCatalogueUnread extends Schema.TaggedError<StripeCatalogueUnread>()(
  "StripeCatalogueUnread",
  {
    during: Schema.String,
    reason: Schema.Literals(["unanswered", "refused", "unreadable"]),
    refusal: Schema.optionalKey(Schema.String),
  }
) {
  override get message(): string {
    const what = {
      refused: `Stripe refused it${this.refusal === undefined ? "" : ` (${this.refusal})`}: check STRIPE_SECRET_KEY and what the key may do`,
      unanswered: "Stripe did not answer: try again later",
      unreadable: "Stripe's answer could not be read",
    }[this.reason];

    return `Stripe's catalogue could not be read or changed while ${this.during}. ${what}.`;
  }
}
