import { Schema } from "effect";

/** The workspace keeps as many channel sets as it may. */
export class TooManyChannelSets extends Schema.TaggedError<TooManyChannelSets>()(
  "TooManyChannelSets",
  { allowed: Schema.Int }
) {
  override get message(): string {
    return `A workspace keeps ${this.allowed} channel sets at most`;
  }
}
