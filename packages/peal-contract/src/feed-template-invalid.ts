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
    // (`unknownPlaceholder`), is longer than allowed or could write a post
    // longer than one holds (`tooLong`), or says nothing (`empty`).
    reason: Schema.Literals(["empty", "tooLong", "unknownPlaceholder"]),
  },
  {
    description:
      "The template cannot write posts: it names a placeholder other than `{title}`, `{link}` and `{summary}`, is longer than 1000 characters, would write a post longer than 65,536 characters with each placeholder filled to the most an item gives (a title 300, a link 2048, a summary 280), or is empty. Nothing was saved.",
    httpApiStatus: 422,
  }
) {}
