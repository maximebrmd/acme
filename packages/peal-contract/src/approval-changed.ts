import { Schema } from "effect";

/** The post waits for an approval, but not the one this decision names: it was asked again, or says something else since. Read it again, then decide. */
export class ApprovalChanged extends Schema.TaggedError<ApprovalChanged>()(
  "ApprovalChanged",
  {},
  {
    description:
      "The post waits for an approval, but not the one this decision names: it was asked again, or says something else since. Read it again, then decide.",
    httpApiStatus: 409,
  }
) {}
