import { DateTime, Schema } from "effect";

/** A range of time that ends before it starts, or spans too long. */
export class InvalidTimeRange extends Schema.TaggedError<InvalidTimeRange>()(
  "InvalidTimeRange",
  { from: Schema.DateTimeUtc, to: Schema.DateTimeUtc }
) {
  override get message(): string {
    return `Cannot list posts from ${DateTime.formatIso(this.from)} to ${DateTime.formatIso(this.to)}`;
  }
}
