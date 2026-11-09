import { Schema } from "effect";

/** The members a notice is for could not be read, as when the database is down. */
export class RecipientsUnavailable extends Schema.TaggedError<RecipientsUnavailable>()(
  "RecipientsUnavailable",
  { cause: Schema.Defect() }
) {}
