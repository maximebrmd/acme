import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** A feed's template Peal cannot write posts from. */
export class FeedTemplateInvalid extends Schema.TaggedError<FeedTemplateInvalid>()(
  "FeedTemplateInvalid",
  {
    ...errorEnvelope,
    // The placeholder it does not know, for `unknownPlaceholder`.
    placeholder: Schema.optionalKey(Schema.String),
    // It names a placeholder other than {title}, {link} and {summary}
    // (`unknownPlaceholder`), is longer than allowed (`tooLong`), or says
    // nothing (`empty`).
    reason: Schema.Literals(["empty", "tooLong", "unknownPlaceholder"]),
  },
  {
    description:
      "The template cannot write posts: it names a placeholder other than `{title}`, `{link}` and `{summary}`, is longer than 1000 characters, or is empty. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
