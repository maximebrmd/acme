import { Schema } from "effect";

/**
 * Stripe's catalogue is not the one the rate card gives: with `--check`,
 * what would change; otherwise what the command cannot change itself, as
 * a meter that counts otherwise, before it changed anything.
 */
export class StripeCatalogueDiffers extends Schema.TaggedError<StripeCatalogueDiffers>()(
  "StripeCatalogueDiffers",
  { problems: Schema.Array(Schema.String) }
) {
  override get message(): string {
    return [
      "Stripe's catalogue is not the one the rate card gives (billing/domain/rate-card.ts):",
      ...this.problems.map((problem) => `- ${problem}`),
    ].join("\n");
  }
}
