import { Schema } from "effect";

import { ContentViolationSchema } from "#publishing/domain/content-violation.ts";

/**
 * What the source would say with some of a rule's text variants breaks
 * its channels' rules: each such variant, by its place from 1, with every
 * violation, as scheduling the post would answer them.
 */
export class RecyclingVariantsRejected extends Schema.TaggedError<RecyclingVariantsRejected>()(
  "RecyclingVariantsRejected",
  {
    variants: Schema.Array(
      Schema.Struct({
        variant: Schema.Int,
        violations: Schema.Array(ContentViolationSchema),
      })
    ),
  }
) {
  override get message(): string {
    return `${String(this.variants.length)} variants break their channels' rules`;
  }
}
