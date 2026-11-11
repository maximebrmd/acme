import { Schema } from "effect";

/** The workspace keeps as many queues as it may. */
export class TooManyQueues extends Schema.TaggedError<TooManyQueues>()(
  "TooManyQueues",
  { allowed: Schema.Int }
) {
  override get message(): string {
    return `A workspace keeps ${this.allowed} queues at most`;
  }
}
