import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The workspace already has a tag of this name. */
export class TagNameTaken extends Schema.TaggedError<TagNameTaken>()(
  "TagNameTaken",
  { ...errorEnvelope },
  {
    description:
      "The workspace already has a tag of this name, whatever its case. Nothing was changed.",
    httpApiStatus: 409,
  }
) {}
