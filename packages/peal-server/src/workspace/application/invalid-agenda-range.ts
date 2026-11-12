import { Schema } from "effect";

/** The agenda's range ends before it starts, or spans more than 31 days. */
export class InvalidAgendaRange extends Schema.TaggedError<InvalidAgendaRange>()(
  "InvalidAgendaRange",
  {}
) {}
