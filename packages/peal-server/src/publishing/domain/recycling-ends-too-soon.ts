import { Schema } from "effect";

/**
 * A rule's ending leaves no occurrence to make: its date comes before the
 * next due instant (`firstDueAt`), or its count is already reached.
 */
export class RecyclingEndsTooSoon extends Schema.TaggedError<RecyclingEndsTooSoon>()(
  "RecyclingEndsTooSoon",
  { firstDueAt: Schema.DateTimeUtc }
) {
  override get message(): string {
    return `The rule's ending leaves no occurrence to make, the next being due at ${this.firstDueAt.toString()}`;
  }
}
