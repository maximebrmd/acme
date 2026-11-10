import { Schema } from "effect";

/**
 * A request that changes something left, and no answer says whether the
 * network took it: the connection broke, timed out, or the network failed
 * while answering. Never a reason to send it again: the object is looked
 * up first.
 */
export class OutcomeUnknown extends Schema.TaggedError<OutcomeUnknown>()(
  "OutcomeUnknown",
  {}
) {}
