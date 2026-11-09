import { Schema } from "effect";

/**
 * The channel's token was refused and could not be renewed: the request was
 * not accepted, and the user must reconnect the channel.
 */
export class TokenExpired extends Schema.TaggedError<TokenExpired>()(
  "TokenExpired",
  {}
) {}
