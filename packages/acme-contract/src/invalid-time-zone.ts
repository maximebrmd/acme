import { Schema } from "effect";

/** The time zone is not an IANA time zone. */
export class InvalidTimeZone extends Schema.TaggedError<InvalidTimeZone>()(
  "InvalidTimeZone",
  { timeZone: Schema.String },
  {
    description:
      "The time zone is not an IANA time zone such as Europe/Paris. Offsets such as +01:00 are refused.",
    httpApiStatus: 422,
  }
) {}
