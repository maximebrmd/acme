import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";
import { ContentViolationSchema } from "./post-content-invalid.ts";

/** Some text variants break the rules of the source's channels. */
export class RecyclingVariantsInvalid extends Schema.TaggedError<RecyclingVariantsInvalid>()(
  "RecyclingVariantsInvalid",
  {
    ...errorEnvelope,
    variants: Schema.Array(
      Schema.Struct({
        // The variant's place in the list, from 1.
        variant: Schema.Int,
        violations: Schema.Array(ContentViolationSchema),
      })
    ),
  },
  {
    description:
      "What the source post would say with some of the text variants breaks the rules of its channels' platforms: `variants` names each by its place, from 1, with every violation, as scheduling the post would answer them. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
