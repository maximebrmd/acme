import { Cause, Option, Schema } from "effect";

// A channel analytics follows from its first reading of accounts, within
// the hour after it is connected: until then it has nothing to show.
const isNotFollowed = Schema.is(
  Schema.Struct({ _tag: Schema.Literal("ChannelNotFound") })
);

export const notFollowed = (cause: Cause.Cause<unknown>) =>
  Cause.findErrorOption(cause).pipe(Option.exists(isNotFollowed));
