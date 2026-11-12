import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The rule's ending leaves no occurrence to make. */
export class RecyclingEndsTooSoon extends Schema.TaggedError<RecyclingEndsTooSoon>()(
  "RecyclingEndsTooSoon",
  { ...errorEnvelope, firstDueAt: Schema.DateTimeUtc },
  {
    description:
      "The rule's ending leaves no post to make: its `until` date comes before the next post is due (`firstDueAt`), or its `count` is already reached. Nothing was changed.",
    httpApiStatus: 422,
  }
) {}
