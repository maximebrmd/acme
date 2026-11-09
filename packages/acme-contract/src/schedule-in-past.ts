import { Schema } from "effect";

/** The time asked for has passed. */
export class ScheduleInPast extends Schema.TaggedError<ScheduleInPast>()(
  "ScheduleInPast",
  {},
  {
    description:
      "The time asked for has passed. A time up to a minute ago publishes now.",
    httpApiStatus: 422,
  }
) {}
