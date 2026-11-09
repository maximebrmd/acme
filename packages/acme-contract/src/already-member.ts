import { Schema } from "effect";

/** The address invited belongs to a member of the workspace already. */
export class AlreadyMember extends Schema.TaggedError<AlreadyMember>()(
  "AlreadyMember",
  {},
  {
    description:
      "The address belongs to a member of the workspace already: nobody was invited.",
    httpApiStatus: 409,
  }
) {}
